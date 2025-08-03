// Global state management for the application

import type { Map, Popup } from 'mapbox-gl';
import type { FeatureCollection, Feature } from 'geojson';

interface AppState {
  activePopup: Popup | null;
  markersAdded: boolean;
  modelsAdded: boolean;
  mapLocations: FeatureCollection;
  activeFilters: Set<string>;
  map: Map | null;
}

// Global state object
export const state: AppState = {
  activePopup: null,
  markersAdded: false,
  modelsAdded: false,
  mapLocations: {
    type: 'FeatureCollection',
    features: [],
  },
  activeFilters: new Set<string>(),
  map: null, // Will be initialized in main app
};

// State update functions
export function setActivePopup(popup: Popup | null): void {
  state.activePopup = popup;
}

export function setMarkersAdded(value: boolean): void {
  state.markersAdded = value;
}

export function setModelsAdded(value: boolean): void {
  state.modelsAdded = value;
}

export function setMap(map: Map): void {
  state.map = map;
}

export function getActiveFilters(): Set<string> {
  return state.activeFilters;
}

export function setActiveFilters(filters: Set<string>): void {
  state.activeFilters = filters;
}