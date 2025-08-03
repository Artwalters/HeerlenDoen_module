// Map initialization module

import type { Map } from 'mapbox-gl';

import { MAP_OPTIONS, MAPBOX_ACCESS_TOKEN } from './config.js';
import { setMap } from './state.js';

// Extend global interface for mapboxgl
declare global {
  const mapboxgl: {
    accessToken: string;
    Map: new (options: any) => Map;
  };
}

// Set Mapbox access token
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Initialize and export map
export function initializeMap(): Map {
  const map = new mapboxgl.Map(MAP_OPTIONS);

  // Store map in global state
  setMap(map);

  // Store original flyTo method
  const originalFlyTo = map.flyTo.bind(map);
  (map as any)._originalFlyTo = originalFlyTo;

  // Override flyTo to add custom behavior if needed
  map.flyTo = function (options: any) {
    // Add any custom behavior here
    return originalFlyTo(options);
  };

  return map;
}
