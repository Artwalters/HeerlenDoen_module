// Marker management module

import { state } from './state.js';
import { CONFIG } from './config.js';

/**
 * Load marker icons
 */
export function loadIcons(map) {
  // Get unique icons from features
  const uniqueIcons = [...new Set(state.mapLocations.features
    .map((feature) => feature.properties.icon)
    .filter((icon) => icon) // Filter out null/undefined icons
  )];

  // Load each icon
  uniqueIcons.forEach((iconUrl) => {
    map.loadImage(iconUrl, (error, image) => {
      if (error) {
        console.warn('Failed to load icon:', iconUrl, error);
        return;
      }
      map.addImage(iconUrl, image);
    });
  });
}

/**
 * Add custom markers to map
 */
export function addMarkers(map) {
  if (state.markersAdded) return;

  console.log('Adding markers to map...');

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
      type: 'circle',
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
      type: 'symbol',
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
        'icon-anchor': 'center',
      },
      paint: {
        'icon-opacity': 0,
      },
    },
    // Label layer
    {
      id: 'location-labels',
      type: 'symbol',
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
        'text-offset': [0, 1],
        'text-anchor': 'top',
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
function animateMarkerAppearance(map) {
  let opacity = 0;
  const animateMarkers = () => {
    opacity += 0.1;
    
    // Check if layers still exist before setting paint properties
    if (map.getLayer('location-markers')) {
      map.setPaintProperty('location-markers', 'circle-opacity', opacity);
    }
    if (map.getLayer('location-icons')) {
      map.setPaintProperty('location-icons', 'icon-opacity', opacity);
    }
    if (map.getLayer('location-labels')) {
      map.setPaintProperty('location-labels', 'text-opacity', opacity);
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
function setupMarkerInteractions(map) {
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
export function updateMarkerVisibility(map, zoom) {
  console.log('Updating marker visibility for zoom:', zoom);
  
  // You can add zoom-based visibility logic here if needed
  // For now, the visibility is handled by the interpolation expressions in the layer styles
}

/**
 * Create custom marker element
 */
export function createCustomMarker(location) {
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
export function updateMarkersData(map) {
  if (map.getSource('locations')) {
    map.getSource('locations').setData(state.mapLocations);
    console.log('Markers data updated');
  }
}