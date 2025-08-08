// Filter management module

import type { Map } from 'mapbox-gl';
import { saveMapFiltersToLocalStorage } from './localStorage.js';
import { state, stateManager } from './state.js';

// Performance optimization caches
const buttonCache = new Map<string, HTMLElement>();
const layerCache = new Map<string, boolean>();
let buttonElements: HTMLElement[] = [];

/**
 * Apply active filters to map markers
 */
export function applyMapFilters(): void {
  // Get map instance from state
  const map = state.map;
  if (!map) {
    return; // Map not initialized yet
  }

  // Get current active filters from state
  const currentFilters = state.activeFilters;
  
  let filterExpression: any[] | null;

  if (!currentFilters || currentFilters.size === 0) {
    // No filter - show everything
    filterExpression = null;
  } else {
    // Combine active filters WITH markers without category
    filterExpression = [
      'any', // OR condition
      ['in', ['get', 'category'], ['literal', Array.from(currentFilters)]], // Markers with active categories
      ['!', ['has', 'category']], // Markers without category property
      ['==', ['get', 'category'], ''], // Markers with empty category
    ];
  }

  // Apply filter to all marker-related layers (if loaded)
  const layersToFilter = ['location-markers', 'location-icons', 'location-labels'];
  layersToFilter.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      try {
        map.setFilter(layerId, filterExpression);
      } catch (e) {
        // Layer might not be ready yet
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

  // Get current filters
  const currentFilters = new Set(state.activeFilters);
  
  // Update the Set
  if (currentFilters.has(category)) {
    currentFilters.delete(category);
  } else {
    currentFilters.add(category);
  }
  
  // Update state manager
  stateManager.setActiveFilters(currentFilters);

  // Apply the map filters
  applyMapFilters();
}

/**
 * Setup location filter buttons with caching
 */
export function setupLocationFilters(): void {
  // Only setup once - check if already initialized
  if (buttonElements.length > 0) {
    return; // Already initialized
  }

  // Cache button elements and add event listeners
  buttonElements = Array.from(document.querySelectorAll('.filter-btn')) as HTMLElement[];
  
  buttonElements.forEach((buttonElement) => {
    const category = (buttonElement.dataset as any).category as string;
    if (category) {
      buttonCache.set(category, buttonElement);
    }

    buttonElement.addEventListener('click', () => {
      const category = (buttonElement.dataset as any).category as string; // UPPERCASE expected
      if (!category) return; // Skip buttons without category

      // Get current filters and update
      const currentFilters = new Set(state.activeFilters);
      
      if (currentFilters.has(category)) {
        currentFilters.delete(category);
        buttonElement.classList.remove('is--active'); // Explicitly remove
      } else {
        currentFilters.add(category);
        buttonElement.classList.add('is--active'); // Explicitly add
      }
      
      // Update state manager
      stateManager.setActiveFilters(currentFilters);

      // Apply the map filters
      applyMapFilters();
    });
  });
}

/**
 * Update filter button states based on active filters - with caching
 */
export function updateFilterButtonStates(): void {
  const currentFilters = state.activeFilters;
  
  // Use cached button elements if available
  if (buttonElements.length > 0) {
    buttonElements.forEach((buttonElement) => {
      const category = (buttonElement.dataset as any).category as string;
      if (category) {
        buttonElement.classList.toggle('is--active', currentFilters.has(category));
      }
    });
  } else {
    // Fallback to DOM query if cache not initialized
    document.querySelectorAll('.filter-btn').forEach((button) => {
      const buttonElement = button as HTMLElement;
      const category = (buttonElement.dataset as any).category as string;
      if (category) {
        buttonElement.classList.toggle('is--active', currentFilters.has(category));
      }
    });
  }
}

/**
 * Clear all active filters
 */
export function clearAllFilters(): void {
  stateManager.clearFilters();
  updateFilterButtonStates();
  applyMapFilters();
}

/**
 * Set specific filters
 */
export function setFilters(categories: string[]): void {
  const newFilters = new Set(categories);
  stateManager.setActiveFilters(newFilters);
  updateFilterButtonStates();
  applyMapFilters();
}

// Make applyMapFilters available globally for localStorage module
(window as any).applyMapFilters = applyMapFilters;