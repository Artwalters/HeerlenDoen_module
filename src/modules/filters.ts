// Filter management module

import type { Map } from 'mapbox-gl';
import { saveMapFiltersToLocalStorage } from './localStorage.js';
import { state } from './state.js';

/**
 * Apply active filters to map markers
 */
export function applyMapFilters(): void {
  console.log('Applying map filters:', Array.from(state.activeFilters));
  
  let filterExpression: any[] | null;

  if (state.activeFilters.size === 0) {
    // No filter - show everything
    filterExpression = null;
  } else {
    // Combine active filters WITH markers without category
    filterExpression = [
      'any', // OR condition
      ['in', ['get', 'category'], ['literal', Array.from(state.activeFilters)]], // Markers with active categories
      ['!', ['has', 'category']], // Markers without category property
      ['==', ['get', 'category'], ''], // Markers with empty category
    ];
  }

  // Apply filter to all marker-related layers (if loaded)
  const layersToFilter = ['location-markers', 'location-icons', 'location-labels'];
  layersToFilter.forEach((layerId) => {
    if (state.map && state.map.getLayer(layerId)) {
      try {
        state.map.setFilter(layerId, filterExpression);
      } catch (e) {
        console.warn(`Could not apply filter to layer ${layerId}:`, e);
        // Can happen if layer is not fully ready yet
      }
    }
  });

  // Save filters to localStorage
  saveMapFiltersToLocalStorage();
}

/**
 * Toggle a filter category
 */
export function toggleFilter(category: string): void {
  if (!category) return; // Skip buttons without category

  // Update the Set
  if (state.activeFilters.has(category)) {
    state.activeFilters.delete(category);
  } else {
    state.activeFilters.add(category);
  }

  // Apply the map filters
  applyMapFilters();
}

/**
 * Setup location filter buttons
 */
export function setupLocationFilters(): void {
  document.querySelectorAll('.filter-btn').forEach((button) => {
    const buttonElement = button as HTMLElement;
    buttonElement.addEventListener('click', () => {
      const category = (buttonElement.dataset as any).category as string; // UPPERCASE expected
      if (!category) return; // Skip buttons without category

      // Update the Set
      if (state.activeFilters.has(category)) {
        state.activeFilters.delete(category);
        buttonElement.classList.remove('is--active'); // Explicitly remove
      } else {
        state.activeFilters.add(category);
        buttonElement.classList.add('is--active'); // Explicitly add
      }

      // Apply the map filters
      applyMapFilters();
    });
  });
}

/**
 * Update filter button states based on active filters
 */
export function updateFilterButtonStates(): void {
  document.querySelectorAll('.filter-btn').forEach((button) => {
    const buttonElement = button as HTMLElement;
    const category = (buttonElement.dataset as any).category as string;
    if (category) {
      buttonElement.classList.toggle('is--active', state.activeFilters.has(category));
    }
  });
}

/**
 * Clear all active filters
 */
export function clearAllFilters(): void {
  state.activeFilters.clear();
  updateFilterButtonStates();
  applyMapFilters();
}

/**
 * Set specific filters
 */
export function setFilters(categories: string[]): void {
  state.activeFilters.clear();
  categories.forEach(category => state.activeFilters.add(category));
  updateFilterButtonStates();
  applyMapFilters();
}

// Make applyMapFilters available globally for localStorage module
(window as any).applyMapFilters = applyMapFilters;