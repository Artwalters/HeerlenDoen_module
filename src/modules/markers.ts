// Marker management module

import type { Map } from 'mapbox-gl';
import type { Feature, Point } from 'geojson';
import { state } from './state.js';
import { CONFIG } from './config.js';
import { resourceManager } from './resourceManager.js';

interface LocationFeature extends Feature<Point> {
  properties: {
    icon?: string;
    color: string;
    name: string;
    [key: string]: any;
  };
}

// Icon loading cache and optimization
const iconCache = new Map<string, HTMLImageElement>();
const loadingIcons = new Set<string>();

/**
 * Load marker icons with batching and caching
 */
export async function loadIcons(map: Map): Promise<void> {
  // Get unique icons from features
  const uniqueIcons = [...new Set(state.mapLocations.features
    .map((feature) => feature.properties.icon)
    .filter((icon): icon is string => !!icon) // Filter out null/undefined icons and type guard
  )];

  // Filter out already loaded and currently loading icons
  const iconsToLoad = uniqueIcons.filter(iconUrl => 
    !map.hasImage(iconUrl) && !loadingIcons.has(iconUrl)
  );

  if (iconsToLoad.length === 0) return;

  // Mark icons as loading
  iconsToLoad.forEach(iconUrl => loadingIcons.add(iconUrl));

  // Load icons in parallel with proper error handling
  const loadPromises = iconsToLoad.map(iconUrl => 
    loadSingleIcon(map, iconUrl)
      .finally(() => loadingIcons.delete(iconUrl))
  );

  // Wait for all icons to load (or fail)
  await Promise.allSettled(loadPromises);
}

/**
 * Load a single icon - REVERTED to direct loading for Mapbox compatibility
 */
async function loadSingleIcon(map: Map, iconUrl: string): Promise<void> {
  try {
    // Check cache first
    if (iconCache.has(iconUrl)) {
      const cachedImage = iconCache.get(iconUrl)!;
      if (!map.hasImage(iconUrl)) {
        map.addImage(iconUrl, cachedImage);
      }
      return;
    }

    // Load image directly for Mapbox compatibility
    const image = await loadImageAsync(iconUrl);
    iconCache.set(iconUrl, image);
    
    if (!map.hasImage(iconUrl)) {
      map.addImage(iconUrl, image);
    }
  } catch (error) {
    // Failed to load icon - continue silently
  }
}

/**
 * Load image asynchronously - restored for Mapbox compatibility
 */
function loadImageAsync(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load icon: ${url}`));
    img.src = url;
  });
}

/**
 * Add custom markers to map
 */
export async function addMarkers(map: Map): Promise<void> {
  if (state.markersAdded) return;

  // Load icons first (wait for completion)
  await loadIcons(map);

  // Add source
  map.addSource('locations', {
    type: 'geojson',
    data: state.mapLocations,
  });

  // Add layers
  const layers = [
    // Circle marker layer
    {
      id: 'location-markers',
      type: 'circle' as const,
      paint: {
        'circle-color': [
          'case',
          ['==', ['get', 'type'], 'ar'],
          ['get', 'arkleur'], // Use arkleur property for AR markers
          ['get', 'color'], // Use normal color property for other markers
        ],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          CONFIG.MARKER_ZOOM.min,
          2,
          CONFIG.MARKER_ZOOM.small,
          5,
          CONFIG.MARKER_ZOOM.medium,
          8,
          CONFIG.MARKER_ZOOM.large,
          10,
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0,
      },
    },
    // Icon layer
    {
      id: 'location-icons',
      type: 'symbol' as const,
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          CONFIG.MARKER_ZOOM.min,
          0.05,
          CONFIG.MARKER_ZOOM.small,
          0.08,
          CONFIG.MARKER_ZOOM.medium,
          0.12,
          CONFIG.MARKER_ZOOM.large,
          0.15,
        ],
        'icon-allow-overlap': true,
        'icon-anchor': 'center' as const,
      },
      paint: {
        'icon-opacity': 0,
      },
    },
    // Label layer
    {
      id: 'location-labels',
      type: 'symbol' as const,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          CONFIG.MARKER_ZOOM.min,
          8,
          CONFIG.MARKER_ZOOM.small,
          10,
          CONFIG.MARKER_ZOOM.medium,
          11,
          CONFIG.MARKER_ZOOM.large,
          12,
        ],
        'text-offset': [0, 1] as [number, number],
        'text-anchor': 'top' as const,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': ['get', 'color'],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-opacity': 0,
      },
    },
  ];

  // Add each layer
  layers.forEach((layer) => map.addLayer({ ...layer, source: 'locations' }));

  // Setup marker hover effects
  setupMarkerInteractions(map);

  // Animate marker appearance
  animateMarkerAppearance(map);

  state.markersAdded = true;
}

/**
 * Animate marker appearance with frame limiting
 */
function animateMarkerAppearance(map: Map): void {
  let opacity = 0;
  let lastFrameTime = 0;
  const targetFPS = 30; // Limit to 30 FPS for better performance
  const frameInterval = 1000 / targetFPS;
  
  const animateMarkers = (currentTime: number): void => {
    // Frame limiting - only update if enough time has passed
    if (currentTime - lastFrameTime < frameInterval) {
      if (opacity < 1) {
        requestAnimationFrame(animateMarkers);
      }
      return;
    }
    
    lastFrameTime = currentTime;
    opacity += 0.08; // Slightly slower animation for smoother effect
    
    // Clamp opacity to maximum of 1.0
    const clampedOpacity = Math.min(opacity, 1.0);
    
    // Batch paint property updates for better performance
    try {
      if (map.getLayer('location-markers')) {
        map.setPaintProperty('location-markers', 'circle-opacity', clampedOpacity);
      }
      if (map.getLayer('location-icons')) {
        map.setPaintProperty('location-icons', 'icon-opacity', clampedOpacity);
      }
      if (map.getLayer('location-labels')) {
        map.setPaintProperty('location-labels', 'text-opacity', clampedOpacity);
      }
    } catch (e) {
      // Layers might have been removed during animation
      return;
    }

    if (opacity < 1) {
      requestAnimationFrame(animateMarkers);
    }
  };

  // Start animation after a short delay
  setTimeout(() => requestAnimationFrame(animateMarkers), 100);
}

/**
 * Setup marker hover effects
 */
function setupMarkerInteractions(map: Map): void {
  map.on('mouseenter', 'location-markers', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'location-markers', () => {
    map.getCanvas().style.cursor = '';
  });
}

/**
 * Update marker visibility based on zoom level
 */
export function updateMarkerVisibility(map: Map, zoom: number): void {
  
  // You can add zoom-based visibility logic here if needed
  // For now, the visibility is handled by the interpolation expressions in the layer styles
}

/**
 * Create custom marker element
 */
export function createCustomMarker(location: LocationFeature): HTMLDivElement {
  const markerEl = document.createElement('div');
  markerEl.className = 'custom-marker';
  
  // Add location-specific styling if needed
  if (location.properties.color) {
    markerEl.style.backgroundColor = location.properties.color;
  }
  
  return markerEl;
}

/**
 * Update markers data source
 */
export function updateMarkersData(map: Map): void {
  const source = map.getSource('locations');
  if (source && 'setData' in source) {
    (source as any).setData(state.mapLocations);
  }
}