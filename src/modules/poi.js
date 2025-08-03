// POI filter and interaction module

// Filter out unwanted POI labels
const excludedNames = [
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

/**
 * Setup POI filtering to hide unwanted labels
 * @param {Object} map - The mapbox map instance
 */
export function setupPOIFiltering(map) {
  // Build comprehensive filter
  map.on('idle', () => {
    // Check if the map is fully loaded
    if (!map.loaded()) return;

    // Create a filter that checks BOTH properties
    let filter = ['all'];

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

    // Apply the filter to all POI layers
    const poiLayers = [
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
  });
}