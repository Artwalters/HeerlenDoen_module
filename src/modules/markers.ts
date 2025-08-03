// Marker management module

import type { Map } from 'mapbox-gl';
import type { Feature, Point } from 'geojson';
import { state } from './state.js';
import { CONFIG } from './config.js';

interface LocationFeature extends Feature<Point> {
  properties: {
    icon?: string;
    color: string;
    name: string;
    [key: string]: any;
  };
}

/**
 * Load marker icons
 */
export function loadIcons(map: Map): void {
  // Get unique icons from features
  const uniqueIcons = [...new Set(state.mapLocations.features
    .map((feature) => feature.properties.icon)
    .filter((icon): icon is string => !!icon) // Filter out null/undefined icons and type guard
  )];

  // Load each icon
  uniqueIcons.forEach((iconUrl) => {
    // Check if image already exists
    if (map.hasImage(iconUrl)) {
      return;
    }
    
    map.loadImage(iconUrl, (error, image) => {
      if (error) {
        // Failed to load icon
        return;
      }
      if (image && !map.hasImage(iconUrl)) {
        map.addImage(iconUrl, image);
      }
    });
  });
}

/**
 * Add custom markers to map
 */
export function addMarkers(map: Map): void {
  if (state.markersAdded) return;


  // Load icons first
  loadIcons(map);

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
 * Animate marker appearance
 */
function animateMarkerAppearance(map: Map): void {
  let opacity = 0;
  const animateMarkers = (): void => {
    opacity += 0.1;
    
    // Clamp opacity to maximum of 1.0
    const clampedOpacity = Math.min(opacity, 1.0);
    
    // Check if layers still exist before setting paint properties
    if (map.getLayer('location-markers')) {
      map.setPaintProperty('location-markers', 'circle-opacity', clampedOpacity);
    }
    if (map.getLayer('location-icons')) {
      map.setPaintProperty('location-icons', 'icon-opacity', clampedOpacity);
    }
    if (map.getLayer('location-labels')) {
      map.setPaintProperty('location-labels', 'text-opacity', clampedOpacity);
    }

    if (opacity < 1) {
      requestAnimationFrame(animateMarkers);
    }
  };

  setTimeout(animateMarkers, 100);
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