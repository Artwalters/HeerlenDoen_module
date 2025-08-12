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
    tourCleanup?: () => void;
  }
}

// Language detection function
function detectLanguage(): 'nl' | 'en' | 'de' {
  const path = window.location.pathname;
  if (path.includes('/en/')) return 'en';
  if (path.includes('/de/')) return 'de';
  return 'nl'; // Default to Dutch
}

// Translations object
const translations = {
  nl: {
    welcomeMessage: 'Welkom in <strong>Heerlen</strong> deze kaart heeft veel unieke functies die ik je graag uitleg',
    startTour: 'Start tour',
    skipTour: 'Skip tour',
    helpButtonTitle: 'Start rondleiding',
    helpButtonAriaLabel: 'Start kaart rondleiding',
    tourSteps: {
      welcome: 'Ontdek <strong>Heerlen</strong> met deze interactieve kaart. We leiden je even rond!.',
      mapControls: 'Gebruik deze <strong>knoppen</strong> om in/uit te zoomen en de kaart te draaien.',
      filters: 'gebruik <strong>filters</strong> om per categorie te zoeken en te ontdekken!',
      geolocation: 'Klik hier om je <strong>locatie</strong> aan te zetten en direct te zien waar jij je bevindt op de kaart.',
      tryMarker: 'Klik op de <strong>gekleurde</strong> rondjes om meer informatie over locaties te bekijken.',
      markerInstruction: 'Een voorbeeld marker wordt automatisch geopend',
      markerHint: 'Marker wordt automatisch geopend',
      popupInfo: 'Bekijk <strong>informatie</strong> over deze plek en druk op de <strong>like-knop</strong> om deze locatie op te slaan.',
      likeHeart: 'Klik op het <strong>hartje</strong> om al je opgeslagen favoriete locaties te bekijken.',
      finish: 'Je bent nu klaar om <strong>Heerlen te verkennen</strong>! Klik op markers om locaties te ontdekken. Je kunt deze rondleiding opnieuw starten via het <strong>?</strong> icoon.'
    },
    buttons: {
      start: 'Start',
      skip: 'Skip',
      back: '←',
      next: '→',
      ready: 'Klaar'
    },
    progressBarClose: 'Sluit rondleiding'
  },
  en: {
    welcomeMessage: 'Welcome to <strong>Heerlen</strong>! This map has many unique features that I\'d like to show you',
    startTour: 'Start tour',
    skipTour: 'Skip tour',
    helpButtonTitle: 'Start tour',
    helpButtonAriaLabel: 'Start map tour',
    tourSteps: {
      welcome: 'Discover <strong>Heerlen</strong> with this interactive map. Let me show you around!',
      mapControls: 'Use these <strong>buttons</strong> to zoom in/out and rotate the map.',
      filters: 'Use <strong>filters</strong> to search and discover by category!',
      geolocation: 'Click here to enable your <strong>location</strong> and see where you are on the map.',
      tryMarker: 'Click on the <strong>colored</strong> circles to view more information about locations.',
      markerInstruction: 'A sample marker will be opened automatically',
      markerHint: 'Marker will open automatically',
      popupInfo: 'View <strong>information</strong> about this place and click the <strong>like button</strong> to save this location.',
      likeHeart: 'Click on the <strong>heart</strong> to view all your saved favorite locations.',
      finish: 'You\'re now ready to <strong>explore Heerlen</strong>! Click on markers to discover locations. You can restart this tour anytime via the <strong>?</strong> icon.'
    },
    buttons: {
      start: 'Start',
      skip: 'Skip',
      back: '←',
      next: '→',
      ready: 'Done'
    },
    progressBarClose: 'Close tour'
  },
  de: {
    welcomeMessage: 'Willkommen in <strong>Heerlen</strong>! Diese Karte hat viele einzigartige Funktionen, die ich Ihnen gerne zeigen möchte',
    startTour: 'Tour starten',
    skipTour: 'Tour überspringen',
    helpButtonTitle: 'Tour starten',
    helpButtonAriaLabel: 'Kartentour starten',
    tourSteps: {
      welcome: 'Entdecken Sie <strong>Heerlen</strong> mit dieser interaktiven Karte. Lassen Sie mich Ihnen alles zeigen!',
      mapControls: 'Verwenden Sie diese <strong>Tasten</strong> zum Zoomen und Drehen der Karte.',
      filters: 'Verwenden Sie <strong>Filter</strong>, um nach Kategorien zu suchen und zu entdecken!',
      geolocation: 'Klicken Sie hier, um Ihren <strong>Standort</strong> zu aktivieren und zu sehen, wo Sie sich auf der Karte befinden.',
      tryMarker: 'Klicken Sie auf die <strong>farbigen</strong> Kreise, um mehr Informationen über Standorte anzuzeigen.',
      markerInstruction: 'Ein Beispielmarker wird automatisch geöffnet',
      markerHint: 'Marker wird automatisch geöffnet',
      popupInfo: 'Sehen Sie sich <strong>Informationen</strong> über diesen Ort an und klicken Sie auf die <strong>Like-Schaltfläche</strong>, um diesen Ort zu speichern.',
      likeHeart: 'Klicken Sie auf das <strong>Herz</strong>, um alle Ihre gespeicherten Lieblingsorte anzuzeigen.',
      finish: 'Sie sind jetzt bereit, <strong>Heerlen zu erkunden</strong>! Klicken Sie auf Marker, um Orte zu entdecken. Sie können diese Tour jederzeit über das <strong>?</strong> Symbol neu starten.'
    },
    buttons: {
      start: 'Start',
      skip: 'Überspringen',
      back: '←',
      next: '→',
      ready: 'Fertig'
    },
    progressBarClose: 'Tour schließen'
  }
};

// Tour cleanup tracking
let tourIntervals: Set<number> = new Set();
let tourTimeouts: Set<number> = new Set();
let tourEventListeners: Array<{element: any, event: string, handler: Function}> = [];

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
        tourIntervals.delete(checkMapReady);

        // Give map additional time to render all elements properly
        const setupTimeout = setTimeout(function () {
          tourTimeouts.delete(setupTimeout);
          setupTourSystem(map);
        }, 2000);
        tourTimeouts.add(setupTimeout);
      }
    }, 500);
    tourIntervals.add(checkMapReady);
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
  const lang = detectLanguage();
  const t = translations[lang];
  
  const overlay = document.createElement('div');
  overlay.className = 'welcome-overlay';
  overlay.innerHTML = `
    <div class="welcome-card">
      <p>${t.welcomeMessage}</p>
      <div class="welcome-buttons">
        <button class="welcome-start-btn">${t.startTour}</button>
        <button class="welcome-skip-btn">${t.skipTour}</button>
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
  const lang = detectLanguage();
  const t = translations[lang];
  
  // Remove existing help button if any
  const existingButton = document.querySelector('.help-button');
  if (existingButton) {
    existingButton.remove();
  }

  const helpButton = document.createElement('button');
  helpButton.className = 'help-button';
  helpButton.innerHTML = '?';
  helpButton.title = t.helpButtonTitle;
  helpButton.setAttribute('aria-label', t.helpButtonAriaLabel);

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
  const lang = detectLanguage();
  const t = translations[lang];
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

  // Add click outside handler for tour
  const handleClickOutside = (event: MouseEvent) => {
    // Check if tour is active
    if (!tour || !tour.isActive()) return;
    
    const target = event.target as HTMLElement;
    
    // Check if click was directly on the overlay
    if (target.classList.contains('shepherd-modal-overlay-container')) {
      tour.cancel();
      return;
    }
    
    // Check if click was on tour elements
    const isShepherdElement = target.closest('.shepherd-element');
    const isHelpButton = target.closest('.help-button');
    const isProgressBar = target.closest('.shepherd-progress-bar');
    const isWelcomeOverlay = target.closest('.welcome-overlay');
    const isInsidePopup = target.closest('.shepherd-content, .shepherd-text, .shepherd-footer, .shepherd-button');
    
    // If clicked outside the actual tour popup content, cancel tour
    if (!isShepherdElement && !isHelpButton && !isProgressBar && !isWelcomeOverlay && !isInsidePopup) {
      tour.cancel();
    }
  };

  // Add drag handler to close tour
  const handleMapDrag = () => {
    if (tour && tour.isActive()) {
      tour.cancel();
    }
  };

  // Set up event listeners when tour starts
  tour.on('start', () => {
    // Add click outside listener
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    // Add map drag listener
    map.on('dragstart', handleMapDrag);
  });

  // Clean up event listeners when tour ends
  tour.on('cancel', () => {
    document.removeEventListener('click', handleClickOutside);
    map.off('dragstart', handleMapDrag);
  });

  tour.on('complete', () => {
    document.removeEventListener('click', handleClickOutside);
    map.off('dragstart', handleMapDrag);
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
      
      // Add direct click handler on overlay
      overlay.onclick = (e) => {
        // Only close if clicked directly on overlay, not on tour popup
        if (e.target === overlay) {
          tour.cancel();
        }
      };
    }
  }

  // Function to disable modal overlay
  function disableOverlay(): void {
    const overlay = document.querySelector('.shepherd-modal-overlay-container') as HTMLElement;
    if (overlay) {
      overlay.classList.remove('shepherd-modal-is-visible');
      overlay.style.pointerEvents = 'none';
      overlay.onclick = null; // Clean up click handler
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
    text: t.tourSteps.welcome,
    buttons: [
      {
        text: t.buttons.start,
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
      text: t.tourSteps.mapControls,
    },
    {
      id: 'filters',
      attachTo: safelyGetElement('.map-filter-wrap-2', '.filter-btn'),
      text: t.tourSteps.filters,
    },
    {
      id: 'geolocation',
      attachTo: safelyGetElement('.mapboxgl-ctrl-geolocate', '.mapboxgl-ctrl-bottom-right'),
      text: t.tourSteps.geolocation,
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
            text: t.buttons.back,
            action: tour.back,
            classes: 'shepherd-button-secondary',
          },
          {
            text: t.buttons.next,
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

  // Marker instruction step - automatically open a marker
  tour.addStep({
    id: 'try-marker',
    text: `
      <div class="tour-marker-instruction">
        <p>${t.tourSteps.tryMarker}</p>
      </div>
    `,
    buttons: [
      {
        text: t.buttons.back,
        action: tour.back,
        classes: 'shepherd-button-secondary',
      },
      {
        text: t.buttons.next,
        action: () => {
          tour.show('popup-info');
        },
        classes: 'shepherd-button-primary',
      },
    ],
    when: {
      show: function () {
        disableOverlay(); // Disable overlay to allow interaction

        // Automatically click a random visible marker after a short delay
        setTimeout(() => {
          // Query rendered features from the map layers
          const features = map.queryRenderedFeatures({ 
            layers: ['location-markers', 'location-icons'] 
          });
          
          if (features && features.length > 0) {
            // Filter to get only visible features (not filtered out)
            const visibleFeatures = features.filter(feature => {
              // Check if feature has valid coordinates
              return feature.geometry && 
                     feature.geometry.type === 'Point' && 
                     feature.geometry.coordinates;
            });
            
            if (visibleFeatures.length > 0) {
              // Select a random visible feature
              const randomIndex = Math.floor(Math.random() * visibleFeatures.length);
              const selectedFeature = visibleFeatures[randomIndex];
              const coordinates = selectedFeature.geometry.coordinates.slice();
              
              // Fire click event on the map at the feature's location
              // This will trigger the same popup handler as a real click
              map.fire('click', {
                lngLat: coordinates,
                point: map.project(coordinates),
                features: [selectedFeature],
                originalEvent: new MouseEvent('click')
              });
              
              // Proceed to popup info step after popup opens and flyTo completes
              setTimeout(() => {
                tour.show('popup-info');
              }, 2000); // Give time for flyTo animation
            }
          }
        }, 500);
      },
      hide: function () {
        // Remove any lingering instruction messages
        const messages = document.querySelectorAll('.tour-instruction-message');
        messages.forEach((msg) => {
          if (msg.parentNode) {
            msg.parentNode.removeChild(msg);
          }
        });
      },
    },
  });

  // Popup info step
  tour.addStep({
    id: 'popup-info',
    attachTo: function () {
      const popup = document.querySelector('.mapboxgl-popup-content');
      return popup ? { element: popup, on: 'top' } : null;
    },
    text: t.tourSteps.popupInfo,
    buttons: [
      {
        text: t.buttons.back,
        action: tour.back,
        classes: 'shepherd-button-secondary',
      },
      {
        text: t.buttons.next,
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
    text: t.tourSteps.likeHeart,
    buttons: [
      {
        text: t.buttons.back,
        action: tour.back,
        classes: 'shepherd-button-secondary',
      },
      {
        text: t.buttons.next,
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
    text: t.tourSteps.finish,
    buttons: [
      {
        text: t.buttons.ready,
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
  const lang = detectLanguage();
  const t = translations[lang];
  
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
  closeButton.setAttribute('aria-label', t.progressBarClose); // For accessibility
  closeButton.title = t.progressBarClose; // Tooltip

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
  
  // Clean up tour resources
  if (window.tourCleanup) {
    window.tourCleanup();
  }
}

/**
 * Clean up all tour resources to prevent memory leaks
 */
export function cleanupTour(): void {
  // Clear all intervals
  tourIntervals.forEach(id => clearInterval(id));
  tourIntervals.clear();
  
  // Clear all timeouts
  tourTimeouts.forEach(id => clearTimeout(id));  
  tourTimeouts.clear();
  
  // Remove all event listeners
  tourEventListeners.forEach(({element, event, handler}) => {
    element.removeEventListener(event, handler);
  });
  tourEventListeners.length = 0;
  
  // Clear global tour variables
  if (window.markerClickFallbackTimer) {
    clearTimeout(window.markerClickFallbackTimer);
    delete window.markerClickFallbackTimer;
  }
  
  if (window.activeTour) {
    try {
      window.activeTour.cancel();
    } catch (e) {
      // Tour might already be cleaned up
    }
    delete window.activeTour;
  }
  
  delete window.tourWaitingForMarkerClick;
  delete window.markerClickListener;
  delete window.tourCleanup;
}

// Set global cleanup function
window.tourCleanup = cleanupTour;