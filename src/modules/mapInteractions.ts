// Map interaction handlers module

import type { Map } from 'mapbox-gl';
import { CONFIG } from './config.js';
import { state, setActivePopup } from './state.js';
import { applyMapFilters } from './filters.js';
import { loadFiltersAndUpdateMap } from './localStorage.js';
import { loadIcons, addMarkers } from './markers.js';
import { setupLocationFilters } from './filters.js';
import { closeItem } from './popups.js';

// Global declaration for jQuery
declare global {
  interface Window {
    $: typeof import('jquery');
  }
}

const $ = window.$;

/**
 * Setup map load event handler
 * @param map - The mapbox map instance
 */
export function setupMapLoadHandler(map: Map): void {
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
    
    // Load markers asynchronously for better performance
    addMarkers(map).then(() => {
      setupLocationFilters();
      // Apply filters after markers are fully loaded
      applyMapFilters();
    }).catch((error) => {
      // Handle marker loading error gracefully
      setupLocationFilters();
    });

    // Initial animation on load - Start at station, fly to destination
    setTimeout(() => {
      const finalZoom = window.matchMedia('(max-width: 479px)').matches ? 16.5 : 17; // Iets meer ingezoomd
      const stationCoords: [number, number] = [5.975338618538545, 50.89054201081809];
      const destinationCoords: [number, number] = [5.977246733617121, 50.888996872875126];

      // Start position at station (bird's eye view)
      map.jumpTo({
        center: stationCoords,
        zoom: 14, // Iets meer ingezoomd bij start
        pitch: 0,
        bearing: 0,
      });

      // Fly to destination with camera rotation (180 degrees rotated)
      map.flyTo({
        center: destinationCoords,
        zoom: finalZoom,
        pitch: 35, // Lagere pitch voor meer bovenaanzicht
        bearing: 162.4, // -17.6 + 180 = 162.4
        duration: 6000,
        essential: true,
        easing: (t: number) => t * (2 - t), // Ease out quad
      });
    }, 5000);
  });
}

/**
 * Setup sidebar close button handler
 */
export function setupSidebarHandlers(): void {
  // Close sidebar button
  $('.close-block').on('click', () => {
    closeItem();
  });
}

/**
 * Setup map interaction handlers for hiding popups and sidebar
 * @param map - The mapbox map instance
 */
export function setupMapInteractionHandlers(map: Map): void {
  // Hide popups and sidebar on map interactions
  ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'].forEach((eventType) => {
    map.on(eventType as any, () => {
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
        const popupContent = state.activePopup.getElement().querySelector('.mapboxgl-popup-content') as HTMLElement;
        popupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        popupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
        popupContent.style.opacity = '0';

        setTimeout(() => {
          state.activePopup!.remove();
          setActivePopup(null);
        }, 400);
      }
    });
  });

  // Close popup when clicking on the map (outside popup and markers)
  map.on('click', (e) => {
    // Check if click was on a marker or popup
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['location-markers']
    });
    
    // Only close popup if we didn't click on a marker and popup exists
    if (features.length === 0 && state.activePopup) {
      // Check if the click was inside the popup element
      const popupElement = state.activePopup.getElement();
      const clickTarget = e.originalEvent.target as HTMLElement;
      
      // If click was not inside the popup, close it
      if (!popupElement.contains(clickTarget)) {
        const popupContent = popupElement.querySelector('.mapboxgl-popup-content') as HTMLElement;
        if (popupContent) {
          popupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
          popupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
          popupContent.style.opacity = '0';
        }

        setTimeout(() => {
          if (state.activePopup) {
            state.activePopup.remove();
            setActivePopup(null);
          }
        }, 400);

        // Also hide sidebar if visible
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
      }
    }
  });
}