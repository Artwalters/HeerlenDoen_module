// Centralized state management with event-driven updates

import type { Map, Popup } from 'mapbox-gl';
import type { FeatureCollection } from 'geojson';
import { eventBus, Events } from './eventBus.js';

interface AppState {
  // Map state
  map: Map | null;
  mapLoaded: boolean;
  
  // Popup state
  activePopup: Popup | null;
  
  // Marker state
  markersAdded: boolean;
  modelsAdded: boolean;
  mapLocations: FeatureCollection;
  
  // Filter state
  activeFilters: Set<string>;
}

/**
 * Centralized state manager with reactive updates
 */
class StateManager {
  private static instance: StateManager;
  private state: AppState;
  private subscribers = new Set<(state: AppState) => void>();

  private constructor() {
    this.state = {
      map: null,
      mapLoaded: false,
      activePopup: null,
      markersAdded: false,
      modelsAdded: false,
      mapLocations: {
        type: 'FeatureCollection',
        features: [],
      },
      activeFilters: new Set(),
    };
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Get current state (readonly)
   */
  getState(): Readonly<AppState> {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: AppState) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Update state and notify subscribers
   */
  private setState(updates: Partial<AppState>): void {
    const previousState = { ...this.state };
    
    // Apply updates
    Object.assign(this.state, updates);
    
    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        // Continue with other subscribers even if one fails
      }
    });

    // Emit relevant events
    this.emitStateChangeEvents(previousState, this.state);
  }

  /**
   * Emit events based on state changes
   */
  private emitStateChangeEvents(previous: AppState, current: AppState): void {
    // Map events
    if (!previous.mapLoaded && current.mapLoaded) {
      eventBus.emit(Events.MAP_LOADED, current.map);
    }

    // Popup events
    if (previous.activePopup !== current.activePopup) {
      if (current.activePopup) {
        eventBus.emit(Events.POPUP_OPENED, current.activePopup);
      } else if (previous.activePopup) {
        eventBus.emit(Events.POPUP_CLOSED, previous.activePopup);
      }
    }

    // Filter events
    if (previous.activeFilters !== current.activeFilters) {
      eventBus.emit(Events.FILTER_CHANGED, Array.from(current.activeFilters));
    }
  }

  // Public state update methods
  setMap(map: Map): void {
    this.setState({ map });
  }

  setMapLoaded(loaded: boolean): void {
    this.setState({ mapLoaded: loaded });
  }

  setActivePopup(popup: Popup | null): void {
    this.setState({ activePopup: popup });
  }

  setMarkersAdded(added: boolean): void {
    this.setState({ markersAdded: added });
  }

  setModelsAdded(added: boolean): void {
    this.setState({ modelsAdded: added });
  }

  updateMapLocations(locations: FeatureCollection): void {
    this.setState({ mapLocations: locations });
  }

  setActiveFilters(filters: Set<string>): void {
    this.setState({ activeFilters: new Set(filters) });
  }

  addFilter(filter: string): void {
    const newFilters = new Set(this.state.activeFilters);
    newFilters.add(filter);
    this.setState({ activeFilters: newFilters });
  }

  removeFilter(filter: string): void {
    const newFilters = new Set(this.state.activeFilters);
    newFilters.delete(filter);
    this.setState({ activeFilters: newFilters });
  }

  clearFilters(): void {
    this.setState({ activeFilters: new Set() });
  }

  /**
   * Reset state to initial values
   */
  reset(): void {
    this.state = {
      map: null,
      mapLoaded: false,
      activePopup: null,
      markersAdded: false,
      modelsAdded: false,
      mapLocations: {
        type: 'FeatureCollection',
        features: [],
      },
      activeFilters: new Set(),
    };
    
    // Notify subscribers of reset
    this.subscribers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        // Continue with other subscribers
      }
    });
  }

  /**
   * Clean up all subscribers
   */
  cleanup(): void {
    this.subscribers.clear();
  }
}

// Export singleton instance
export const stateManager = StateManager.getInstance();

// Export legacy compatibility functions
export const state = stateManager.getState();

export function setActivePopup(popup: Popup | null): void {
  stateManager.setActivePopup(popup);
}

export function setActiveFilters(filters: Set<string>): void {
  stateManager.setActiveFilters(filters);
}