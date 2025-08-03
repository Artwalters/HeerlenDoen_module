/**
 * Main Application - Heerlen Interactive Map
 * This is the main entry point that imports and initializes all modules
 */

// Import CSS
import './app.css';

// Import modules
import { setupBoundaryCheck } from './modules/boundaryUtils.js';
import { CONFIG } from './modules/config.js';
import { loadLocationData, updateMapSource } from './modules/dataLoader.js';
import { applyMapFilters, setupLocationFilters, toggleFilter } from './modules/filters.js';
import { GeolocationManager } from './modules/geolocation.js';
import { loadFiltersAndUpdateMap } from './modules/localStorage.js';
import { setupMapInteractionHandlers, setupMapLoadHandler, setupSidebarHandlers } from './modules/mapInteractions.js';
import { initializeMap } from './modules/mapInit.js';
import { addMarkers, updateMarkersData, updateMarkerVisibility } from './modules/markers.js';
import { setupPOIFiltering } from './modules/poi.js';
import {
  closeActivePopup,
  closeItem,
  createPopup,
  handleSnapchatLink,
  showImagePopup,
} from './modules/popups.js';
import { state } from './modules/state.js';
import { setupThreeJSLayer } from './modules/threejs.js';
import { initialize3DSettings } from './modules/toggle3D.js';
import { initializeTour } from './modules/tour.js';

// Initialize when Webflow is ready
window.Webflow ||= [];
window.Webflow.push(async () => {
  console.log('Initializing Heerlen Interactive Map...');

  try {
    // Initialize map
    const map = initializeMap();

    // Make map globally available for debugging
    window.map = map;

    // Initialize geolocation manager
    const geolocationManager = new GeolocationManager(map);
    window.geolocationManager = geolocationManager;

    // Setup all map handlers and systems
    setupMapLoadHandler(map);
    setupMapInteractionHandlers(map);
    setupSidebarHandlers();
    setupBoundaryCheck(map);
    setupPOIFiltering(map);
    setupThreeJSLayer(map);
    initialize3DSettings(map);

    // Initialize tour
    initializeTour(map);

    // Handle zoom changes
    map.on('zoom', () => {
      const currentZoom = map.getZoom();
      updateMarkerVisibility(map, currentZoom);
    });

    // Handle map clicks
    map.on('click', (e) => {
      // Check if click is on a marker
      const features = map.queryRenderedFeatures(e.point);
      if (features.length > 0) {
        const location = features[0];
        createPopup(location, map);
      } else {
        closeActivePopup();
      }
    });

    // Setup filter button handlers
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.filter-btn').forEach((button) => {
        button.addEventListener('click', () => {
          const { category } = button.dataset;
          if (category) {
            toggleFilter(category);
            button.classList.toggle('is--active');
          }
        });
      });
    });

    // Log successful initialization
    console.log('Heerlen Interactive Map initialized successfully!');
  } catch (error) {
    console.error('Error initializing map:', error);
  }
});

// Export commonly used functions for global access
window.HeerlenMap = {
  getState: () => state,
  getConfig: () => CONFIG,
  closePopup: closeActivePopup,
  toggleFilter: toggleFilter,
};

// Make popup functions globally available for HTML onclick handlers
window.handleSnapchatLink = handleSnapchatLink;
window.showImagePopup = showImagePopup;
window.closeItem = closeItem;
