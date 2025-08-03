// Global state management for the application

// Global state object
export const state = {
  activePopup: null,
  markersAdded: false,
  modelsAdded: false,
  mapLocations: {
    type: 'FeatureCollection',
    features: [],
  },
  activeFilters: new Set(),
  map: null, // Will be initialized in main app
};

// State update functions
export function setActivePopup(popup) {
  state.activePopup = popup;
}

export function setMarkersAdded(value) {
  state.markersAdded = value;
}

export function setModelsAdded(value) {
  state.modelsAdded = value;
}

export function setMap(map) {
  state.map = map;
}

export function getActiveFilters() {
  return state.activeFilters;
}

export function setActiveFilters(filters) {
  state.activeFilters = filters;
}
