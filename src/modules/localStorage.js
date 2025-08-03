// Local storage utilities for filter management

import { LOCAL_STORAGE_KEY } from './config.js';
import { setActiveFilters, state } from './state.js';

// Save current activeFilters Set to localStorage
export function saveMapFiltersToLocalStorage() {
  try {
    const filtersArray = Array.from(state.activeFilters);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtersArray));
  } catch (e) {
    console.error('Kon kaartfilters niet opslaan in localStorage:', e);
  }
}

// Update the Set, map filters and button UI based on categories array
export function updateMapState(activeCategories = []) {
  setActiveFilters(new Set(activeCategories));

  // Update visual state of buttons
  document.querySelectorAll('.filter-btn').forEach((button) => {
    const { category } = button.dataset;
    if (category) {
      button.classList.toggle('is--active', state.activeFilters.has(category));
    }
  });

  // Apply filters to map layers - this function will be imported from filters module
  if (typeof window.applyMapFilters === 'function') {
    window.applyMapFilters();
  }
}

// Load filters from localStorage and update the map
export function loadFiltersAndUpdateMap() {
  try {
    const storedFilters = localStorage.getItem(LOCAL_STORAGE_KEY);
    const activeCategories = storedFilters ? JSON.parse(storedFilters) : [];
    updateMapState(activeCategories);
  } catch (e) {
    console.error('Kon filters niet laden/parsen uit localStorage voor kaart:', e);
    updateMapState([]);
  }
}
