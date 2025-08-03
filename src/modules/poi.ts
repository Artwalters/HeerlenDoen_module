// POI filter and interaction module

import type { Map } from 'mapbox-gl';

// Filter out unwanted POI labels
const excludedNames: string[] = [
  'Brasserie Mijn Streek',
  'De Twee Gezusters',
  'SCHUNCK Bibliotheek Heerlen Glaspaleis',
  'Glaspaleis Schunck',
  'Bagels & Beans',
  'Terras Bagels & Beans',
  'Brunch Bar',
  'Berden',
  'Aroma',
  'Brasserie Goya',
  'Poppodium Nieuwe Nor',
  'Nederlands Mijnmuseum',
  'Smaak & Vermaak',
  'Café ',
  'De Kromme Toeter',
  'Café Pelt',
  'Het Romeins Museum',
  "Pat's Tosti Bar",
  'Sint-Pancratiuskerk',
  'Cafe Bluff',
  // Add more businesses here if needed
];

// Cache for optimized POI filtering
let poiFilterApplied = false;
let cachedFilter: any[] | null = null;

/**
 * Build POI filter once and cache it
 */
function buildPOIFilter(): any[] {
  if (cachedFilter) return cachedFilter;
  
  // Create a filter that checks BOTH properties
  let filter: any[] = ['all'];

  // For each name, make a NOT-condition that checks both properties
  // If either matches, the POI should be hidden
  excludedNames.forEach((name) => {
    // Add a condition that checks BOTH properties
    // If either matches, the POI should be hidden
    filter.push([
      'all',
      ['!=', ['get', 'brand'], name], // Check on brand
      ['!=', ['get', 'name'], name], // Check on name
    ]);
  });

  // Only show POIs with a name
  filter.push(['has', 'name']);
  
  cachedFilter = filter;
  return filter;
}

/**
 * Apply POI filter to all relevant layers
 */
function applyPOIFilter(map: Map): void {
  const filter = buildPOIFilter();
  const poiLayers: string[] = [
    'poi-label',
    'poi-scalerank1',
    'poi-scalerank2',
    'poi-scalerank3',
    'poi-scalerank4',
  ];
  
  poiLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, filter);
    }
  });
  
  poiFilterApplied = true;
}

/**
 * Setup POI filtering to hide unwanted labels - OPTIMIZED VERSION
 * @param {Map} map - The mapbox map instance
 */
export function setupPOIFiltering(map: Map): void {
  // Apply filter immediately if map is already loaded
  if (map.loaded() && !poiFilterApplied) {
    applyPOIFilter(map);
    return;
  }

  // Otherwise wait for first style load or idle event
  const handleMapReady = () => {
    if (map.loaded() && !poiFilterApplied) {
      applyPOIFilter(map);
      // Remove listeners after applying filter once
      map.off('style.load', handleMapReady);
      map.off('idle', handleMapReady);
    }
  };

  map.on('style.load', handleMapReady);
  map.on('idle', handleMapReady);
}