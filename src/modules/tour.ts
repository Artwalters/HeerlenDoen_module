// Tour/walkthrough module

import type { Map } from 'mapbox-gl';
import { CONFIG } from './config.js';

// Global declarations for external libraries
declare global {
  interface Window {
    mapboxgl: typeof import('mapbox-gl');
    Shepherd: any;
    activeTour?: any;
    tourWaitingForMarkerClick?: boolean;
    markerClickFallbackTimer?: number;
    markerClickListener?: () => void;
  }
}

interface TourStep {
  id: string;
  attachTo?: {
    element: Element;
    on: string;
  } | null;
  text: string;
  buttons?: Array<{
    text: string;
    action: () => void;
    classes: string;
  }>;
  when?: {
    show?: () => void;
    hide?: () => void;
  };
  canClickTarget?: boolean;
  advanceOn?: null;
}

/**
 * Initialize tour functionality
 * @param map - The mapbox map instance
 */
export function initializeTour(map: Map): void {
  // Check if mapboxgl is available
  if (typeof window.mapboxgl !== 'undefined') {
    // Load external CSS file
    loadTourStylesheet();

    // Wait for map to fully initialize using a more reliable method
    const checkMapReady = setInterval(function () {
      const mapContainer = document.getElementById('map');
      // Check if map container exists and map has been rendered
      if (mapContainer && mapContainer.querySelector('.mapboxgl-canvas') && map && map.loaded()) {
        clearInterval(checkMapReady);

        // Give map additional time to render all elements properly
        setTimeout(function () {
          setupTourSystem(map);
        }, 2000);
      }
    }, 500);
  }
}

/**
 * Load the external CSS file for tour styles
 */
function loadTourStylesheet(): void {
  if (!document.getElementById('tour-styles')) {
    const linkElem = document.createElement('link');
    linkElem.id = 'tour-styles';
    linkElem.rel = 'stylesheet';
    linkElem.type = 'text/css';
    linkElem.href = 'tour-styles.css'; // Path to your CSS file
    document.head.appendChild(linkElem);
  }
}

/**
 * Setup the tour system
 * @param map - The mapbox map instance
 */
function setupTourSystem(map: Map): void {
  // Check if guide was already shown
  const walkthroughShown = localStorage.getItem('heerlenMapWalkthroughShown');

  // Create persistent help button regardless of first visit
  addHelpButton(map);

  // Show tour on first visit or if manually triggered
  if (!walkthroughShown || window.location.hash === '#tutorial') {
    // Show a welcome message before starting tour
    showWelcomeMessage(function () {
      startTour(map);
      localStorage.setItem('heerlenMapWalkthroughShown', 'true');
    });
  }
}

/**
 * Add welcome message overlay with animation
 * @param callback - Callback function to execute after welcome
 */
function showWelcomeMessage(callback: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'welcome-overlay';
  overlay.innerHTML = `
    <div class="welcome-card">
      <p> Welkom in <strong>Heerlen</strong> deze kaart heeft veel unieke functies die ik je graag uitleg </p>
      <div class="welcome-buttons">
        <button class="welcome-start-btn">Start tour</button>
        <button class="welcome-skip-btn">Skip tour</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Animate entrance
  setTimeout(() => {
    overlay.style.opacity = '1';
    const card = overlay.querySelector('.welcome-card') as HTMLElement;
    card.style.transform = 'translateY(0)';
    card.style.opacity = '1';
  }, 100);

  // Handle button clicks
  overlay.querySelector('.welcome-start-btn')!.addEventListener('click', function () {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      callback();
    }, 500);
  });

  overlay.querySelector('.welcome-skip-btn')!.addEventListener('click', function () {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
    }, 500);
  });
}

/**
 * Add help button to trigger tour manually
 * @param map - The mapbox map instance
 */
function addHelpButton(map: Map): void {
  // Remove existing help button if any
  const existingButton = document.querySelector('.help-button');
  if (existingButton) {
    existingButton.remove();
  }

  const helpButton = document.createElement('button');
  helpButton.className = 'help-button';
  helpButton.innerHTML = '?';
  helpButton.title = 'Start rondleiding';
  helpButton.setAttribute('aria-label', 'Start kaart rondleiding');

  helpButton.addEventListener('click', () => {
    if (window.activeTour && window.activeTour.isActive()) {
      // If tour is already active, resume it
      const currentStep = window.activeTour.getCurrentStep();
      if (currentStep) {
        window.activeTour.show(currentStep.id);
      } else {
        window.activeTour.start();
      }
    } else {
      // Start a new tour
      startTour(map);
    }
  });

  // Place next to other controls with better positioning
  const controlContainer = document.querySelector('.mapboxgl-ctrl-top-right');
  if (controlContainer) {
    const helpControl = document.createElement('div');
    helpControl.className = 'mapboxgl-ctrl mapboxgl-ctrl-group help-button-container';
    helpControl.appendChild(helpButton);
    controlContainer.appendChild(helpControl);
  }
}

/**
 * Main tour function
 * @param map - The mapbox map instance
 */
export function startTour(map: Map): void {
  // Create tour with enhanced options
  const tour = new window.Shepherd.Tour({
    useModalOverlay: false,
    defaultStepOptions: {
      cancelIcon: {
        enabled: true,
      },
      classes: 'shepherd-theme-heerlen',
      scrollTo: false,
      title: null, // No titles, just content
      popperOptions: {
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 12],
            },
          },
          {
            name: 'preventOverflow',
            options: {
              boundary: document.body,
              padding: 10,
            },
          },
        ],
      },
    },
  });

  // Store tour reference globally
  window.activeTour = tour;

  // Function to enable modal overlay with enhanced animation
  function enableOverlay(): void {
    const overlay = document.querySelector('.shepherd-modal-overlay-container') as HTMLElement;
    if (overlay) {
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.classList.add('shepherd-modal-is-visible');
      overlay.style.pointerEvents = 'auto';
    }
  }

  // Function to disable modal overlay
  function disableOverlay(): void {
    const overlay = document.querySelector('.shepherd-modal-overlay-container') as HTMLElement;
    if (overlay) {
      overlay.classList.remove('shepherd-modal-is-visible');
      overlay.style.pointerEvents = 'none';
    }
  }

  // Enhanced element targeting function that handles cases where elements don't exist
  function safelyGetElement(selector: string, fallbackSelector?: string): { element: Element; on: string } | null {
    const element = document.querySelector(selector);
    if (element) {
      return { element, on: 'bottom' };
    }
    if (fallbackSelector) {
      const fallback = document.querySelector(fallbackSelector);
      if (fallback) {
        return { element: fallback, on: 'bottom' };
      }
    }
    // If no element found, return null and skip attachment
    return null;
  }

  // Step 1: Welcome (with overlay) - no title
  tour.addStep({
    id: 'welcome',
    text: 'Ontdek <strong>Heerlen</strong> met deze interactieve kaart. We leiden je even rond!.',
    buttons: [
      {
        text: 'Start',
        action: tour.next,
        classes: 'shepherd-button-primary',
      },
    ],
    when: {
      show: enableOverlay,
    },
  });

  // Steps with proper element targeting and fallbacks - minimalist style without titles
  const tourSteps: Array<{
    id: string;
    attachTo: { element: Element; on: string } | null;
    text: string;
  }> = [
    {
      id: 'map-controls',
      attachTo: safelyGetElement('.mapboxgl-ctrl-top-right', '.mapboxgl-ctrl-group'),
      text: 'Gebruik deze <strong>knoppen</strong> om in/uit te zoomen en de kaart te draaien.',
    },
    {
      id: 'filters',
      attachTo: safelyGetElement('.map-filter-wrap-2', '.filter-btn'),
      text: ' gebruik <strong>filters</strong> om per categorie te zoeken en te ontdekken!',
    },
    {
      id: 'geolocation',
      attachTo: safelyGetElement('.mapboxgl-ctrl-geolocate', '.mapboxgl-ctrl-bottom-right'),
      text: 'Klik hier om je <strong>locatie</strong> aan te zetten en direct te zien waar jij je bevindt op de kaart.',
    },
  ];

  // Add each step with proper error handling
  tourSteps.forEach((stepConfig) => {
    // Skip steps with attachments that couldn't be found
    if (stepConfig.attachTo) {
      tour.addStep({
        ...stepConfig,
        buttons: [
          {
            text: '←',
            action: tour.back,
            classes: 'shepherd-button-secondary',
          },
          {
            text: '→',
            action: tour.next,
            classes: 'shepherd-button-primary',
          },
        ],
        when: {
          show: enableOverlay,
          hide: () => {
            // Pulse the target element when showing the step
            const target = stepConfig.attachTo?.element;
            if (target) {
              target.classList.add('tour-highlight-pulse');

              // Remove pulse after animation completes
              setTimeout(() => {
                target.classList.remove('tour-highlight-pulse');
              }, 1000);
            }
          },
        },
      });
    }
  });

  // Marker instruction step with minimalist design
  tour.addStep({
    id: 'try-marker',
    text: `
      <div class="tour-marker-instruction">
        <p>klik op een van de <strong>gekleurde</strong> rondjes.</p>
        <div class="marker-animation">
          <span class="pulse-dot"></span>
          <span class="instruction-arrow">↓</span>
        </div>
      </div>
    `,
    buttons: [
      {
        text: '←',
        action: tour.back,
        classes: 'shepherd-button-secondary',
      },
      {
        text: 'Skip',
        action: () => {
          window.tourWaitingForMarkerClick = false;
          tour.show('popup-info');
        },
        classes: 'shepherd-button-secondary',
      },
    ],
    when: {
      show: function () {
        disableOverlay(); // Disable overlay to allow marker clicking

        // Show floating message to encourage clicking a marker
        const message = document.createElement('div');
        message.className = 'tour-instruction-message';
        message.textContent = 'Klik op een marker om door te gaan';
        document.body.appendChild(message);

        // Set a timeout to remove the message after animation completes
        setTimeout(() => {
          if (message.parentNode) {
            message.parentNode.removeChild(message);
          }
        }, 4000);

        // Mark this step as waiting for marker click
        window.tourWaitingForMarkerClick = true;

        // Create a fallback to next step in case the user can't find a marker to click
        window.markerClickFallbackTimer = window.setTimeout(() => {
          if (window.tourWaitingForMarkerClick) {
            // If user hasn't clicked after 15 seconds, show hint message
            const hintMessage = document.createElement('div');
            hintMessage.className = 'tour-instruction-message';
            hintMessage.textContent = 'Klik op "Skip" als je geen marker kunt vinden';
            document.body.appendChild(hintMessage);

            setTimeout(() => {
              if (hintMessage.parentNode) {
                hintMessage.parentNode.removeChild(hintMessage);
              }
            }, 5000);
          }
        }, 15000);
      },
      hide: function () {
        // Clear any fallback timers when leaving this step
        if (window.markerClickFallbackTimer) {
          clearTimeout(window.markerClickFallbackTimer);
        }

        // Remove any lingering instruction messages
        const messages = document.querySelectorAll('.tour-instruction-message');
        messages.forEach((msg) => {
          if (msg.parentNode) {
            msg.parentNode.removeChild(msg);
          }
        });
      },
    },
    // Prevent advancing with keyboard navigation
    canClickTarget: false,
    advanceOn: null,
  });

  // Popup info step
  tour.addStep({
    id: 'popup-info',
    attachTo: function () {
      const popup = document.querySelector('.mapboxgl-popup-content');
      return popup ? { element: popup, on: 'top' } : null;
    },
    text: 'Bekijk <strong>informatie</strong> over deze plek en druk op de <strong>like-knop</strong> om deze locatie op te slaan.',
    buttons: [
      {
        text: '←',
        action: tour.back,
        classes: 'shepherd-button-secondary',
      },
      {
        text: '→',
        action: tour.next,
        classes: 'shepherd-button-primary',
      },
    ],
    when: {
      show: function () {
        enableOverlay();

        // If popup doesn't exist, try to create one automatically
        if (!document.querySelector('.mapboxgl-popup-content') && map) {
          // Find a visible marker and simulate a click
          const marker = document.querySelector('.mapboxgl-marker, .mapboxgl-user-location-dot');
          if (marker) {
            // Try to simulate a click on this marker
            (marker as HTMLElement).click();

            // If that didn't work, try plan B:
            setTimeout(() => {
              // If still no popup, use a fallback approach
              if (
                !document.querySelector('.mapboxgl-popup-content') &&
                map.getLayer('location-markers')
              ) {
                const features = map.queryRenderedFeatures({ layers: ['location-markers'] });
                if (features.length > 0) {
                  const feature = features[0];
                  map.fire('click', {
                    lngLat: feature.geometry.coordinates,
                    point: map.project(feature.geometry.coordinates as [number, number]),
                    features: [feature],
                  } as any);
                }
              }
            }, 300);
          }
        }
      },
    },
  });

  // Add the heart favorites step - minimalist style
  tour.addStep({
    id: 'like-heart-svg',
    attachTo: safelyGetElement('.heart-svg.w-embed', '.like-heart-svg'),
    text: 'Klik op het <strong>hartje</strong> om al je opgeslagen favoriete locaties te bekijken.',
    buttons: [
      {
        text: '←',
        action: tour.back,
        classes: 'shepherd-button-secondary',
      },
      {
        text: '→',
        action: tour.next,
        classes: 'shepherd-button-primary',
      },
    ],
    when: {
      show: enableOverlay,
      hide: () => {
        // Pulse the target element when showing the step
        const target = document.querySelector('.heart-svg.w-embed');
        if (target) {
          target.classList.add('tour-highlight-pulse');

          // Remove pulse after animation completes
          setTimeout(() => {
            target.classList.remove('tour-highlight-pulse');
          }, 1000);
        }
      },
    },
  });

  // Final step - minimalist style
  tour.addStep({
    id: 'finish',
    text: 'Je bent nu klaar om <strong>Heerlen te verkennen</strong>! Klik op markers om locaties te ontdekken. Je kunt deze rondleiding opnieuw starten via het <strong>?</strong> icoon.',
    buttons: [
      {
        text: 'Klaar',
        action: tour.complete,
        classes: 'shepherd-button-primary',
      },
    ],
    when: { show: enableOverlay },
  });

  // Progress bar for better user understanding of tour length
  tour.on('start', () => {
    addProgressBar(tour);
  });

  // Setup marker click listener to advance tour if needed
  function setupMarkerClickListener(): void {
    // Remove previous listener if it exists
    if (window.markerClickListener) {
      map.off('click', 'location-markers', window.markerClickListener);
    }

    // Create new listener
    window.markerClickListener = () => {
      if (window.tourWaitingForMarkerClick) {
        window.tourWaitingForMarkerClick = false;
        clearTimeout(window.markerClickFallbackTimer!);

        // Give time for popup to appear
        setTimeout(() => {
          if (tour.getCurrentStep() && tour.getCurrentStep().id === 'try-marker') {
            enableOverlay(); // Re-enable overlay for next steps
            tour.show('popup-info');
          }
        }, 500);
      }
    };

    // Add listener
    map.on('click', 'location-markers', window.markerClickListener);
  }

  // Setup the marker click listener
  setupMarkerClickListener();

  // Clean up when tour completes or is cancelled
  function cleanupTour(): void {
    window.tourWaitingForMarkerClick = false;
    if (window.markerClickFallbackTimer) {
      clearTimeout(window.markerClickFallbackTimer);
    }

    const messages = document.querySelectorAll('.tour-instruction-message');
    messages.forEach((msg) => {
      if (msg.parentNode) {
        msg.parentNode.removeChild(msg);
      }
    });

    const progressBar = document.querySelector('.shepherd-progress-bar');
    if (progressBar && progressBar.parentNode) {
      progressBar.parentNode.removeChild(progressBar);
    }
  }

  tour.on('complete', cleanupTour);
  tour.on('cancel', cleanupTour);

  // Start the tour
  tour.start();
}

/**
 * Add progress bar to show tour progress
 * @param tour - The tour instance
 */
function addProgressBar(tour: any): void {
  // Remove existing progress bar if any
  const existingBar = document.querySelector('.shepherd-progress-bar');
  if (existingBar) {
    existingBar.remove();
  }

  // Create progress bar container
  const progressContainer = document.createElement('div');
  progressContainer.className = 'shepherd-progress-bar'; // Keep the flexbox layout

  // Create the inner progress bar element
  const progressInner = document.createElement('div');
  progressInner.className = 'progress-inner';
  progressInner.innerHTML = `<div class="progress-fill"></div>`; // Only the bar itself

  // Create the close button
  const closeButton = document.createElement('button');
  closeButton.className = 'progress-bar-close-btn'; // Use your existing CSS class
  closeButton.innerHTML = '×'; // The 'x' symbol (HTML entity)
  closeButton.setAttribute('aria-label', 'Sluit rondleiding'); // For accessibility
  closeButton.title = 'Sluit rondleiding'; // Tooltip

  // Add click event listener to cancel the tour
  closeButton.addEventListener('click', () => {
    tour.cancel(); // Or tour.complete() if you prefer that
  });

  // Append the inner progress bar AND the close button to the container
  progressContainer.appendChild(progressInner); // First the bar
  progressContainer.appendChild(closeButton); // Then the button next to it (thanks to flexbox)

  // Append the whole container to the body
  document.body.appendChild(progressContainer);

  // Update progress bar when step changes - minimalist with no text
  function updateProgress(): void {
    const currentStep = tour.getCurrentStep();
    if (!currentStep) return;

    const stepIndex = tour.steps.indexOf(currentStep);
    const totalSteps = tour.steps.length;
    // Small adjustment for better progression: start at 0% for the first step
    const progress = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 100;

    const fill = progressContainer.querySelector('.progress-fill') as HTMLElement;
    // Make sure fill exists before adjusting style
    if (fill) {
      fill.style.width = `${progress}%`;
    }
  }

  // Add event listeners for progress updates
  tour.on('show', updateProgress);

  // Initial update
  updateProgress();
}

export function endTour(): void {
  localStorage.setItem('heerlen-tour-completed', 'true');
}