// Legacy state module - now uses centralized state manager for better performance

// Re-export from the new state manager for backward compatibility
export { stateManager, setActivePopup, setActiveFilters } from './stateManager.js';

// Import the new state manager
import { stateManager } from './stateManager.js';

// Simple state getter that returns current state - SIMPLIFIED for reliability
export const state = {
  get map() { return stateManager.getState().map; },
  get activePopup() { return stateManager.getState().activePopup; },
  get markersAdded() { return stateManager.getState().markersAdded; },
  get modelsAdded() { return stateManager.getState().modelsAdded; },
  get mapLocations() { return stateManager.getState().mapLocations; },
  get activeFilters() { return stateManager.getState().activeFilters; },
  
  // Allow direct setting for compatibility
  set map(value: any) { stateManager.setMap(value); },
  set activePopup(value: any) { stateManager.setActivePopup(value); },
  set markersAdded(value: boolean) { stateManager.setMarkersAdded(value); },
  set modelsAdded(value: boolean) { stateManager.setModelsAdded(value); },
  set mapLocations(value: any) { stateManager.updateMapLocations(value); },
  set activeFilters(value: Set<string>) { stateManager.setActiveFilters(value); }
};

// Legacy compatibility functions
export function setMarkersAdded(value: boolean): void {
  stateManager.setMarkersAdded(value);
}

export function setModelsAdded(value: boolean): void {
  stateManager.setModelsAdded(value);
}

export function setMap(map: any): void {
  stateManager.setMap(map);
}

export function getActiveFilters(): Set<string> {
  return stateManager.getState().activeFilters;
}