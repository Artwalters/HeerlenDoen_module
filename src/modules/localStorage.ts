// Local storage utilities for filter management

import { LOCAL_STORAGE_KEY } from './config.js';
import { setActiveFilters, state, stateManager } from './state.js';

// Extend Window interface for global functions
declare global {
  interface Window {
    applyMapFilters?: () => void;
  }
}

// Save current activeFilters Set to localStorage
export function saveMapFiltersToLocalStorage(): void {
  try {
    const filtersArray = Array.from(state.activeFilters);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtersArray));
  } catch (e) {
    // Could not save map filters to localStorage
  }
}

// Update the Set, map filters and button UI based on categories array
export function updateMapState(activeCategories: string[] = []): void {
  const newFilters = new Set(activeCategories);
  stateManager.setActiveFilters(newFilters);

  // Update visual state of buttons
  document.querySelectorAll<HTMLElement>('.filter-btn').forEach((button) => {
    const { category } = button.dataset;
    if (category) {
      button.classList.toggle('is--active', newFilters.has(category));
    }
  });

  // Apply filters to map layers - this function will be imported from filters module
  if (typeof window.applyMapFilters === 'function') {
    window.applyMapFilters();
  }
}

// Load filters from localStorage and update the map
export function loadFiltersAndUpdateMap(): void {
  try {
    const storedFilters = localStorage.getItem(LOCAL_STORAGE_KEY);
    const activeCategories: string[] = storedFilters ? JSON.parse(storedFilters) : [];
    updateMapState(activeCategories);
  } catch (e) {
    updateMapState([]);
  }
}
