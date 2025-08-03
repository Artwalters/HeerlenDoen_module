// Data loading module - loads location data from Webflow

import { state } from './state.js';

/**
 * Helper function to safely get a value from an element within a parent.
 * Logs warnings if elements or properties are missing.
 */
function getRobustValue(
  parentElement,
  selector,
  property = 'value',
  defaultValue = null,
  isRequired = false,
  itemIndex = -1,
  itemType = 'item'
) {
  if (!parentElement) {
    console.warn(`[getRobustValue] Invalid parentElement provided for selector '${selector}'`);
    return defaultValue;
  }

  const targetElement = parentElement.querySelector(selector);

  if (targetElement) {
    // Check if the specific property exists (e.g., 'value' for input, 'innerHTML' for div)
    if (property in targetElement) {
      return targetElement[property];
    }
    // Log if the property doesn't exist on the found element
    console.warn(
      `[Data Loading] Property '${property}' not found on element with selector '${selector}' in ${itemType} item ${itemIndex}. Using default.`
    );
    return defaultValue;
  }
  // Log if a required element is missing
  if (isRequired) {
    console.warn(
      `[Data Loading] Required element with selector '${selector}' not found in ${itemType} item ${itemIndex}. Cannot process fully.`
    );
  }
  // Return default even if not required, just don't log unless required
  return defaultValue;
}

/**
 * Load location data from CMS DOM elements robustly.
 * Skips items with invalid coordinates.
 */
export function getGeoData() {
  console.log('[Data Loading] Starting getGeoData...');
  const locationList = document.getElementById('location-list');
  let loadedCount = 0;
  let skippedCount = 0;

  if (!locationList) {
    console.error(
      "[Data Loading] CRITICAL: Element with ID 'location-list' not found. Cannot load geo data."
    );
    return; // Stop if the main container is missing
  }

  // Filter out non-element nodes (like text nodes, comments)
  Array.from(locationList.childNodes)
    .filter((node) => node.nodeType === Node.ELEMENT_NODE)
    .forEach((element, index) => {
      // --- Get Essential Data First ---
      const rawLat = getRobustValue(
        element,
        '#locationLatitude',
        'value',
        null,
        true,
        index,
        'location'
      );
      const rawLong = getRobustValue(
        element,
        '#locationLongitude',
        'value',
        null,
        true,
        index,
        'location'
      );
      const locationID = getRobustValue(
        element,
        '#locationID',
        'value',
        `missing-id-${index}`,
        true,
        index,
        'location'
      ); // ID is usually important

      // --- Validate Essential Data ---
      const locationLat = parseFloat(rawLat);
      const locationLong = parseFloat(rawLong);

      if (isNaN(locationLat) || isNaN(locationLong)) {
        console.warn(
          `[Data Loading] Skipping location item ${index} (Attempted ID: ${locationID}) due to invalid or missing coordinates. Lat='${rawLat}', Long='${rawLong}'`
        );
        skippedCount++;
        return; // Go to the next iteration/element
      }

      // --- Get Optional/Other Data Safely ---
      const locationData = {
        // Essential (already validated)
        locationLat: locationLat,
        locationLong: locationLong,
        locationID: locationID, // Use the validated/defaulted ID
        // Other data with defaults
        name: getRobustValue(element, '#name', 'value', 'Naamloos', false, index, 'location'),
        locationInfo: getRobustValue(
          element,
          '.locations-map_card',
          'innerHTML',
          '<p>Geen informatie beschikbaar</p>',
          false,
          index,
          'location'
        ),
        ondernemerkleur: getRobustValue(
          element,
          '#ondernemerkleur',
          'value',
          '#A0A0A0',
          false,
          index,
          'location'
        ), // Grey default color
        descriptionv2: getRobustValue(
          element,
          '#descriptionv2',
          'value',
          '',
          false,
          index,
          'location'
        ),
        icon: getRobustValue(element, '#icon', 'value', null, false, index, 'location'), // Let Mapbox handle missing icon later if needed
        image: getRobustValue(element, '#image', 'value', null, false, index, 'location'),
        category: getRobustValue(element, '#category', 'value', 'Overig', false, index, 'location'), // Default category
        telefoonummer: getRobustValue(
          element,
          '#telefoonnummer',
          'value',
          '',
          false,
          index,
          'location'
        ),
        locatie: getRobustValue(element, '#locatie', 'value', '', false, index, 'location'),
        maps: getRobustValue(element, '#maps', 'value', null, false, index, 'location'),
        website: getRobustValue(element, '#website', 'value', null, false, index, 'location'),
        instagram: getRobustValue(element, '#instagram', 'value', null, false, index, 'location'),
        facebook: getRobustValue(element, '#facebook', 'value', null, false, index, 'location'),
      };

      // --- Create Feature ---
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [locationData.locationLong, locationData.locationLat], // Use validated coords
        },
        properties: {
          id: locationData.locationID,
          description: locationData.locationInfo,
          arrayID: index, // Keep original index for potential reference
          color: locationData.ondernemerkleur,
          name: locationData.name,
          icon: locationData.icon,
          image: locationData.image,
          category: locationData.category,
          telefoonummer: locationData.telefoonummer,
          locatie: locationData.locatie,
          maps: locationData.maps,
          website: locationData.website,
          descriptionv2: locationData.descriptionv2,
          instagram: locationData.instagram,
          facebook: locationData.facebook,
        },
      };

      // --- Add Feature (if not duplicate ID) ---
      if (
        !state.mapLocations.features.some((feat) => feat.properties.id === locationData.locationID)
      ) {
        state.mapLocations.features.push(feature);
        loadedCount++;
      } else {
        console.warn(
          `[Data Loading] Duplicate location ID found and skipped: ${locationData.locationID} at index ${index}`
        );
        skippedCount++;
      }
    });

  console.log(
    `[Data Loading] getGeoData finished. Loaded: ${loadedCount}, Skipped (invalid/duplicate): ${skippedCount}`
  );
}

/**
 * Load AR location data from CMS DOM elements robustly.
 * Skips items with invalid coordinates.
 */
export function getARData() {
  console.log('[Data Loading] Starting getARData...');
  const arLocationList = document.getElementById('location-ar-list');
  let loadedCount = 0;
  let skippedCount = 0;
  const startIndex = state.mapLocations.features.length; // Start index after regular locations

  if (!arLocationList) {
    console.error(
      "[Data Loading] CRITICAL: Element with ID 'location-ar-list' not found. Cannot load AR data."
    );
    return; // Stop if the main container is missing
  }

  // Filter out non-element nodes
  Array.from(arLocationList.childNodes)
    .filter((node) => node.nodeType === Node.ELEMENT_NODE)
    .forEach((element, index) => {
      const itemIndexForLog = index; // Use original index for logging

      // --- Get Essential Data First ---
      const rawLat = getRobustValue(
        element,
        '#latitude_ar',
        'value',
        null,
        true,
        itemIndexForLog,
        'AR'
      );
      const rawLong = getRobustValue(
        element,
        '#longitude_ar',
        'value',
        null,
        true,
        itemIndexForLog,
        'AR'
      );
      const name_ar = getRobustValue(
        element,
        '#name_ar',
        'value',
        `AR Item ${itemIndexForLog}`,
        true,
        itemIndexForLog,
        'AR'
      ); // Name is likely important

      // --- Validate Essential Data ---
      const latitude_ar = parseFloat(rawLat);
      const longitude_ar = parseFloat(rawLong);

      if (isNaN(latitude_ar) || isNaN(longitude_ar)) {
        console.warn(
          `[Data Loading] Skipping AR item ${itemIndexForLog} (Name: ${name_ar}) due to invalid or missing coordinates. Lat='${rawLat}', Long='${rawLong}'`
        );
        skippedCount++;
        return; // Go to the next iteration/element
      }

      // --- Get Optional/Other Data Safely ---
      const arData = {
        // Essential (already validated)
        latitude_ar: latitude_ar,
        longitude_ar: longitude_ar,
        name_ar: name_ar,
        // Other data with defaults
        slug_ar: getRobustValue(element, '#slug_ar', 'value', '', false, itemIndexForLog, 'AR'),
        image_ar: getRobustValue(element, '#image_ar', 'value', null, false, itemIndexForLog, 'AR'),
        description_ar: getRobustValue(
          element,
          '#description_ar',
          'value',
          'Geen beschrijving.',
          false,
          itemIndexForLog,
          'AR'
        ),
        arkleur: getRobustValue(element, '#arkleur', 'value', '#A0A0A0', false, index, 'location'), // Grey default color
        icon_ar: getRobustValue(element, '#icon_ar', 'value', null, false, itemIndexForLog, 'AR'), // Default icon?
        // Nieuwe velden
        instructie: getRobustValue(
          element,
          '#instructie',
          'value',
          'Geen instructie beschikbaar.',
          false,
          itemIndexForLog,
          'AR'
        ),
        link_ar_mobile: getRobustValue(
          element,
          '#link_ar_mobile',
          'value',
          null,
          false,
          itemIndexForLog,
          'AR'
        ),
        link_ar_desktop: getRobustValue(
          element,
          '#link_ar_desktop',
          'value',
          null,
          false,
          itemIndexForLog,
          'AR'
        ),
        category: getRobustValue(element, '#category', 'value', null, false, itemIndexForLog, 'AR'),
      };

      // Check if required AR links are present
      if (!arData.link_ar_mobile && !arData.link_ar_desktop) {
        console.warn(
          `[Data Loading] Skipping AR item ${itemIndexForLog} (Name: ${name_ar}) due to missing required AR links (both mobile and desktop).`
        );
        skippedCount++;
        return;
      }

      // --- Create Feature ---
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [arData.longitude_ar, arData.latitude_ar], // Use validated coords
        },
        properties: {
          type: 'ar', // Mark as AR type
          name: arData.name_ar,
          slug: arData.slug_ar,
          description: arData.description_ar,
          arrayID: startIndex + index, // Ensure unique arrayID across both lists
          image: arData.image_ar,
          arkleur: arData.arkleur,
          icon: arData.icon_ar,
          // Nieuwe velden
          instructie: arData.instructie,
          link_ar_mobile: arData.link_ar_mobile,
          link_ar_desktop: arData.link_ar_desktop,
          category: arData.category,
        },
      };

      // --- Add Feature ---
      state.mapLocations.features.push(feature);
      loadedCount++;
    });

  console.log(
    `[Data Loading] getARData finished. Loaded: ${loadedCount}, Skipped (invalid/missing required): ${skippedCount}`
  );
}

/**
 * Main function to load all location data
 */
export async function loadLocationData() {
  console.log('[Data Loading] Starting location data loading...');

  // Reset mapLocations in case this script runs multiple times
  state.mapLocations.features = [];

  // Load both types of data
  getGeoData();
  getARData();

  console.log('[Data Loading] Location data loading completed');

  // Return the loaded data
  return state.mapLocations;
}

/**
 * Update map source with loaded data
 */
export function updateMapSource(map) {
  // Optional: After loading, update the map source if it exists
  if (map.getSource('locations')) {
    map.getSource('locations').setData(state.mapLocations);
    console.log("[Data Loading] Map source 'locations' updated.");
  } else {
    console.log("[Data Loading] Map source 'locations' not found yet, will be added later.");
  }
}

// Initialize data loading when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadLocationData();
});
