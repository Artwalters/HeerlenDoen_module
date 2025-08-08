// Simple 3D toggle module

import type { Map } from 'mapbox-gl';

// Global declaration for the map variable
declare global {
  interface Window {
    map: Map;
  }
}

// Simple state
let is3DEnabled = true;
let cachedBuildingLayers: string[] = [];

/**
 * Toggle 3D layers visibility
 * @param enable - Whether to enable 3D layers
 */
export function toggle3DLayers(enable: boolean): void {
  is3DEnabled = enable;
  
  // Save setting
  localStorage.setItem('heerlen_map_3d_enabled', enable.toString());
  
  // Update button appearance
  updateToggleButtonState();
  
  // Cache 3D layers if not already done
  if (cachedBuildingLayers.length === 0) {
    cacheThreeDLayers();
  }
  
  // Toggle main 3D models layer
  if (window.map.getLayer('3d-models')) {
    window.map.setLayoutProperty('3d-models', 'visibility', enable ? 'visible' : 'none');
  }
  
  // Toggle building extrusion layers
  cachedBuildingLayers.forEach((layerId) => {
    window.map.setLayoutProperty(layerId, 'visibility', enable ? 'visible' : 'none');
  });
}

/**
 * Cache 3D layer IDs
 */
function cacheThreeDLayers(): void {
  const { layers } = window.map.getStyle();
  cachedBuildingLayers = layers
    .filter(
      (layer) =>
        layer.type === 'fill-extrusion' &&
        (layer.id.includes('building') || layer.id.includes('3d'))
    )
    .map((layer) => layer.id);
}

/**
 * Update button state based on current settings
 */
function updateToggleButtonState(): void {
  const toggleButton = document.querySelector('.toggle-3d-button') as HTMLButtonElement;
  if (!toggleButton) return;
  
  toggleButton.classList.toggle('is-active', is3DEnabled);
  toggleButton.setAttribute('aria-pressed', is3DEnabled.toString());
  toggleButton.title = is3DEnabled ? '3D uit' : '3D aan';
  
  // Simple 3D icon
  toggleButton.innerHTML = is3DEnabled
    ? `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9M12 4.15l-6.04 3.4 6.04 3.4 6.04-3.4L12 4.15Z"/></svg>`
    : `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9M12 4.15l-6.04 3.4 6.04 3.4 6.04-3.4L12 4.15Z"/></svg>`;
}

/**
 * Load settings from localStorage
 */
function loadSettings(): void {
  const stored = localStorage.getItem('heerlen_map_3d_enabled');
  if (stored !== null) {
    is3DEnabled = stored !== 'false';
  }
}

/**
 * Create and add the 3D toggle control
 * @param map - The mapbox map instance
 */
function add3DToggleControl(map: Map): void {
  // Remove existing control if any
  const existingControl = document.querySelector('.mapboxgl-ctrl-group .toggle-3d-button');
  if (existingControl) {
    const parentGroup = existingControl.closest('.mapboxgl-ctrl-group');
    if (parentGroup) parentGroup.remove();
  }
  
  const container = document.createElement('div');
  container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
  
  const button = document.createElement('button');
  button.className = 'mapboxgl-ctrl-icon toggle-3d-button';
  button.type = 'button';
  button.setAttribute('aria-label', '3D aan/uit');
  
  // Set initial state
  updateToggleButtonState();
  
  // Add click handler
  button.addEventListener('click', () => {
    toggle3DLayers(!is3DEnabled);
  });
  
  container.appendChild(button);
  const controlContainer = document.querySelector('.mapboxgl-ctrl-top-right');
  if (controlContainer) {
    controlContainer.appendChild(container);
  }
}

/**
 * Initialize 3D settings
 * @param map - The mapbox map instance
 */
export function initialize3DSettings(map: Map): void {
  // Make map available to other functions
  window.map = map;
  
  // Load settings
  loadSettings();
  
  // Add control when map is ready
  map.once('load', () => {
    add3DToggleControl(map);
    
    // Handle layer loading
    const styleHandler = (): void => {
      if (map.getLayer('3d-models')) {
        cacheThreeDLayers();
        toggle3DLayers(is3DEnabled);
        map.off('styledata', styleHandler);
      }
    };
    
    map.on('styledata', styleHandler);
    
    // Try immediately in case layers are already loaded
    if (map.getLayer('3d-models')) {
      cacheThreeDLayers();
      toggle3DLayers(is3DEnabled);
    }
  });
}