// Toggle 3D layers visibility module - optimized version

import type { Map } from 'mapbox-gl';

interface PerformanceSettings {
  is3DEnabled: boolean;
  lowPerformanceDetected: boolean;
  frameRatePopupShown: boolean;
}

interface LayerConfig {
  threeDModelsLayer: string;
  buildingLayers: string[];
}

interface PerformanceConfig {
  settings: PerformanceSettings;
  layers: LayerConfig;
  originalPaintProperties: Record<string, Record<string, any>>;
  frameRateMonitor: { stop: () => void } | null;
  previousPitch: number | null;
}

// Global declaration for the map variable
declare global {
  interface Window {
    map: Map;
  }
}

// Consolidated state object for better organization
const PERFORMANCE_CONFIG: PerformanceConfig = {
  settings: {
    is3DEnabled: true,
    lowPerformanceDetected: false,
    frameRatePopupShown: false,
  },
  // Cache for 3D layer IDs to avoid repeated searches
  layers: {
    threeDModelsLayer: '3d-models',
    buildingLayers: [],
  },
  // Cache for original paint properties
  originalPaintProperties: {},
  frameRateMonitor: null,
  previousPitch: null,
};

/**
 * Toggle 3D layers visibility
 * @param enable - Whether to enable 3D layers
 */
export function toggle3DLayers(enable: boolean): void {
  // Update state
  PERFORMANCE_CONFIG.settings.is3DEnabled = enable;

  // Save all settings at once
  savePerformanceSettings();

  // Update button appearance
  updateToggleButtonState();

  // Cache 3D layers if not already done
  if (PERFORMANCE_CONFIG.layers.buildingLayers.length === 0) {
    cacheThreeDLayers();
  }

  // Toggle main 3D models layer
  const modelLayer = PERFORMANCE_CONFIG.layers.threeDModelsLayer;
  if (window.map.getLayer(modelLayer)) {
    window.map.setLayoutProperty(modelLayer, 'visibility', enable ? 'visible' : 'none');
  }

  // Toggle building extrusion layers using cached list
  PERFORMANCE_CONFIG.layers.buildingLayers.forEach((layerId) => {
    if (enable) {
      window.map.setLayoutProperty(layerId, 'visibility', 'visible');
      // Restore original paint properties
      if (PERFORMANCE_CONFIG.originalPaintProperties[layerId]) {
        const props = PERFORMANCE_CONFIG.originalPaintProperties[layerId];
        Object.entries(props).forEach(([prop, value]) => {
          window.map.setPaintProperty(layerId, prop, value);
        });
      }
    } else {
      // Store original paint properties if not already cached
      if (!PERFORMANCE_CONFIG.originalPaintProperties[layerId]) {
        PERFORMANCE_CONFIG.originalPaintProperties[layerId] = {
          'fill-extrusion-height': window.map.getPaintProperty(layerId, 'fill-extrusion-height'),
          'fill-extrusion-base': window.map.getPaintProperty(layerId, 'fill-extrusion-base'),
        };
      }
      // Hide the layer for performance
      window.map.setLayoutProperty(layerId, 'visibility', 'none');
    }
  });

  // Handle map pitch changes
  handleMapPitch(enable);
}

/**
 * Cache 3D layer IDs for better performance
 */
function cacheThreeDLayers(): void {
  const { layers } = window.map.getStyle();
  PERFORMANCE_CONFIG.layers.buildingLayers = layers
    .filter(
      (layer) =>
        layer.type === 'fill-extrusion' &&
        (layer.id.includes('building') || layer.id.includes('3d'))
    )
    .map((layer) => layer.id);
}

/**
 * Handle map pitch based on 3D mode
 * @param enable - Whether 3D is enabled
 */
function handleMapPitch(enable: boolean): void {
  if (!enable && window.map.getPitch() > 0) {
    PERFORMANCE_CONFIG.previousPitch = window.map.getPitch();
    savePerformanceSettings();
    window.map.easeTo({ pitch: 0, duration: 500 });
  } else if (enable && !PERFORMANCE_CONFIG.settings.lowPerformanceDetected) {
    const previousPitch = PERFORMANCE_CONFIG.previousPitch || 45;
    window.map.easeTo({ pitch: previousPitch, duration: 500 });
  }
}

/**
 * Update button state based on current settings
 */
function updateToggleButtonState(): void {
  const toggleButton = document.querySelector('.toggle-3d-button') as HTMLButtonElement;
  if (!toggleButton) return;

  const enable = PERFORMANCE_CONFIG.settings.is3DEnabled;
  toggleButton.classList.toggle('is-active', enable);
  toggleButton.setAttribute('aria-pressed', enable.toString());
  toggleButton.title = enable ? 'Schakel Performance Mode uit' : 'Schakel Performance Mode in';

  // Filled version vs outline version of the same icon
  toggleButton.innerHTML = enable
    ? `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9M12 4.15l-6.04 3.4 6.04 3.4 6.04-3.4L12 4.15Z"/></svg>`
    : `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9M12 4.15l-6.04 3.4 6.04 3.4 6.04-3.4L12 4.15Z"/></svg>`;
}

/**
 * Save all settings in one operation
 */
function savePerformanceSettings(): void {
  localStorage.setItem(
    'heerlen_map_performance',
    JSON.stringify({
      is3DEnabled: PERFORMANCE_CONFIG.settings.is3DEnabled,
      previousPitch: PERFORMANCE_CONFIG.previousPitch || 45,
      tooltipShown: PERFORMANCE_CONFIG.settings.frameRatePopupShown,
      warningShown: localStorage.getItem('performance_warning_shown') === 'true',
    })
  );
}

/**
 * Load settings from localStorage
 */
function loadPerformanceSettings(): void {
  try {
    const stored = localStorage.getItem('heerlen_map_performance');
    if (stored) {
      const parsed = JSON.parse(stored);
      PERFORMANCE_CONFIG.settings.is3DEnabled = parsed.is3DEnabled !== false;
      PERFORMANCE_CONFIG.previousPitch = parsed.previousPitch;
      PERFORMANCE_CONFIG.settings.frameRatePopupShown = parsed.tooltipShown === true;
      if (parsed.warningShown) localStorage.setItem('performance_warning_shown', 'true');
    } else {
      // Legacy support for old storage format
      PERFORMANCE_CONFIG.settings.is3DEnabled =
        localStorage.getItem('heerlen_map_3d_enabled') !== 'false';
      PERFORMANCE_CONFIG.settings.frameRatePopupShown =
        localStorage.getItem('performance_tooltip_shown') === 'true';
    }
  } catch (e) {
    console.warn('Failed to load performance settings');
  }
}

/**
 * Optimized performance monitoring
 */
function startFrameRateMonitor(): void {
  if (PERFORMANCE_CONFIG.frameRateMonitor) return;

  let lastTime = performance.now();
  let frames = 0;
  let measurements = 0;
  let totalFps = 0;
  let monitorActive = true;
  let rafId: number | null = null;

  // Use throttling for measurements
  const MEASURE_INTERVAL = 2000; // Check every 2 seconds instead of continuously

  const measure = (): void => {
    if (!monitorActive) return;

    frames++;
    const now = performance.now();

    if (now - lastTime >= MEASURE_INTERVAL) {
      const fps = Math.round((frames * 1000) / (now - lastTime));
      totalFps += fps;
      measurements++;

      // Detect performance issues with fewer measurements
      if (measurements >= 3) {
        const avgFps = totalFps / measurements;

        if (avgFps < 20) {
          PERFORMANCE_CONFIG.settings.lowPerformanceDetected = true;

          // Show recommendation if needed
          const button = document.querySelector('.toggle-3d-button') as HTMLButtonElement;
          if (
            PERFORMANCE_CONFIG.settings.is3DEnabled &&
            button &&
            !PERFORMANCE_CONFIG.settings.frameRatePopupShown
          ) {
            showPerformanceTooltip(button);
          }

          stopMonitoring();
          return;
        }
        if (measurements >= 5) {
          // Stop after 5 good measurements
          stopMonitoring();
          return;
        }
      }

      // Reset for next interval
      frames = 0;
      lastTime = now;
    }

    if (monitorActive) {
      rafId = requestAnimationFrame(measure);
    }
  };

  const stopMonitoring = (): void => {
    monitorActive = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    PERFORMANCE_CONFIG.frameRateMonitor = null;
  };

  // Start monitoring
  rafId = requestAnimationFrame(measure);
  PERFORMANCE_CONFIG.frameRateMonitor = { stop: stopMonitoring };

  // Safety timeout - never monitor longer than 30 seconds
  setTimeout(stopMonitoring, 30000);
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
  button.setAttribute('aria-label', '3D gebouwen aan/uit');

  // Set initial state
  updateToggleButtonState();

  // Add event listeners
  button.addEventListener('click', () => {
    toggle3DLayers(!PERFORMANCE_CONFIG.settings.is3DEnabled);

    if (
      PERFORMANCE_CONFIG.settings.is3DEnabled &&
      PERFORMANCE_CONFIG.settings.lowPerformanceDetected &&
      localStorage.getItem('performance_warning_shown') !== 'true'
    ) {
      showPerformanceWarning();
    }
  });

  button.addEventListener('mouseenter', () => {
    if (
      PERFORMANCE_CONFIG.settings.lowPerformanceDetected &&
      !PERFORMANCE_CONFIG.settings.frameRatePopupShown
    ) {
      showPerformanceTooltip(button);
    }
  });

  container.appendChild(button);
  const controlContainer = document.querySelector('.mapboxgl-ctrl-top-right');
  if (controlContainer) {
    controlContainer.appendChild(container);
  }
}

/**
 * Initialize 3D settings with optimized loading
 * @param map - The mapbox map instance
 */
export function initialize3DSettings(map: Map): void {
  // Make map available to other functions
  window.map = map;

  // Load settings once
  loadPerformanceSettings();

  // Add control when map is ready
  map.once('load', () => {
    add3DToggleControl(map);

    // Start performance monitoring after a delay
    setTimeout(startFrameRateMonitor, 5000);

    // More efficient layer handling with single event listener
    const styleHandler = (): void => {
      if (map.getLayer(PERFORMANCE_CONFIG.layers.threeDModelsLayer)) {
        cacheThreeDLayers();
        toggle3DLayers(PERFORMANCE_CONFIG.settings.is3DEnabled);
        map.off('styledata', styleHandler);
      }
    };

    map.on('styledata', styleHandler);

    // Try immediately in case layers are already loaded
    if (map.getLayer(PERFORMANCE_CONFIG.layers.threeDModelsLayer)) {
      cacheThreeDLayers();
      toggle3DLayers(PERFORMANCE_CONFIG.settings.is3DEnabled);
    }
  });
}

// Placeholder functions for tooltips and warnings - these would need implementation
function showPerformanceTooltip(button: HTMLButtonElement): void {
  console.log('Performance tooltip should be shown');
  // Implementation would show a tooltip about performance
}

function showPerformanceWarning(): void {
  console.log('Performance warning should be shown');
  // Implementation would show a warning about low performance
}