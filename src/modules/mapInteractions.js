// Map interaction handlers module

import { CONFIG } from './config.js';
import { state, setActivePopup } from './state.js';
import { applyMapFilters } from './filters.js';
import { loadFiltersAndUpdateMap } from './localStorage.js';
import { loadIcons, addMarkers } from './markers.js';
import { setupLocationFilters } from './filters.js';
import { closeItem } from './popups.js';

/**
 * Setup map load event handler
 * @param {Object} map - The mapbox map instance
 */
export function setupMapLoadHandler(map) {
  map.on('load', () => {
    // Wait until map is fully loaded
    map.once('idle', () => {
      // Check if poi-label layer exists
      const firstSymbolLayerId = map
        .getStyle()
        .layers.find((layer) => layer.type === 'symbol' && layer.id.includes('label'))?.id;

      // Add building extrusions BEFORE the first symbol layer
      // This ensures all labels (including POI) appear on top of buildings
      map.addLayer(
        {
          id: 'heerlen-buildings',
          type: 'fill-extrusion',
          source: 'composite',
          'source-layer': 'building',
          filter: ['!=', ['get', 'type'], 'underground'],
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#e8e0cc',
            'fill-extrusion-height': [
              'case',
              ['has', 'height'],
              ['get', 'height'],
              ['has', 'min_height'],
              ['get', 'min_height'],
              3,
            ],
            'fill-extrusion-base': ['case', ['has', 'min_height'], ['get', 'min_height'], 0],
            'fill-extrusion-opacity': 1.0,
            'fill-extrusion-vertical-gradient': true,
          },
        },
        firstSymbolLayerId
      ); // Important: place before first symbol layer
    });

    loadFiltersAndUpdateMap();
    loadIcons(map);
    addMarkers(map);
    setupLocationFilters();

    // Apply filters again after markers are added
    // This is extra security, especially if addMarkers is async
    if (state.markersAdded) {
      applyMapFilters();
    } else {
      // If markers are not ready yet, try after a short delay
      // or within addMarkers itself at the end
      map.once('idle', applyMapFilters);
    }

    // Initial animation on load
    setTimeout(() => {
      const finalZoom = window.matchMedia('(max-width: 479px)').matches ? 17 : 18;

      map.jumpTo({
        center: CONFIG.MAP.center,
        zoom: 15,
        pitch: 0,
        bearing: 0,
      });

      map.flyTo({
        center: CONFIG.MAP.center,
        zoom: finalZoom,
        pitch: 55,
        bearing: -17.6,
        duration: 6000,
        essential: true,
        easing: (t) => t * (2 - t), // Ease out quad
      });
    }, 5000);
  });
}

/**
 * Setup sidebar close button handler
 */
export function setupSidebarHandlers() {
  // Close sidebar button
  $('.close-block').on('click', () => {
    closeItem();
  });
}

/**
 * Setup map interaction handlers for hiding popups and sidebar
 * @param {Object} map - The mapbox map instance
 */
export function setupMapInteractionHandlers(map) {
  // Hide popups and sidebar on map interactions
  ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'].forEach((eventType) => {
    map.on(eventType, () => {
      // Hide sidebar if visible
      const visibleItem = $('.locations-map_item.is--show');
      if (visibleItem.length) {
        visibleItem.css({
          opacity: '0',
          transform: 'translateY(40px) scale(0.6)',
          transition: 'all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        });

        setTimeout(() => {
          visibleItem.removeClass('is--show');
        }, 400);
      }

      // Hide popup if visible
      if (state.activePopup) {
        const popupContent = state.activePopup.getElement().querySelector('.mapboxgl-popup-content');
        popupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        popupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
        popupContent.style.opacity = '0';

        setTimeout(() => {
          state.activePopup.remove();
          setActivePopup(null);
        }, 400);
      }
    });
  });
}