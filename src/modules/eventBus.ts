// Event bus for decoupled communication between modules

type EventHandler = (data?: any) => void;

/**
 * Simple event bus for decoupled module communication
 */
class EventBus {
  private static instance: EventBus;
  private listeners = new Map<string, Set<EventHandler>>();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * Subscribe to an event that will only fire once
   */
  once(event: string, handler: EventHandler): () => void {
    const wrappedHandler = (data?: any) => {
      handler(data);
      this.off(event, wrappedHandler);
    };
    
    return this.on(event, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: string, data?: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          // Continue with other handlers even if one fails
        }
      });
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Clean up all listeners - useful for preventing memory leaks
   */
  cleanup(): void {
    this.listeners.clear();
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();

// Common event constants to prevent typos
export const Events = {
  // Map events
  MAP_LOADED: 'map:loaded',
  MAP_STYLE_CHANGED: 'map:styleChanged',
  
  // Popup events
  POPUP_OPENED: 'popup:opened',
  POPUP_CLOSED: 'popup:closed',
  POPUP_FLIPPED: 'popup:flipped',
  
  // Filter events
  FILTER_CHANGED: 'filter:changed',
  FILTER_CLEARED: 'filter:cleared',
  
  // Marker events
  MARKER_CLICKED: 'marker:clicked',
  MARKER_HOVERED: 'marker:hovered',
  
  // Tour events
  TOUR_STARTED: 'tour:started',
  TOUR_ENDED: 'tour:ended',
  TOUR_STEP_CHANGED: 'tour:stepChanged',
  
  // Geolocation events
  LOCATION_FOUND: 'location:found',
  LOCATION_ERROR: 'location:error',
  BOUNDARY_ENTERED: 'location:boundaryEntered',
  BOUNDARY_EXITED: 'location:boundaryExited',
  
  // Performance events
  PERFORMANCE_WARNING: 'performance:warning',
  RESOURCE_LOADED: 'resource:loaded',
  RESOURCE_ERROR: 'resource:error',
} as const;