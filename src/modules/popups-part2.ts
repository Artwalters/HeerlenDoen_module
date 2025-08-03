// Popup management module - Part 2
// This contains the remaining functions from the original popup.js

import type { Map, Popup } from 'mapbox-gl';

import { setActivePopup, state } from './state.js';

/**
 * Beheer top en bottom fade gradients op basis van scroll positie
 * @param description - Het scrollbare element (popup-description)
 * @param topFade - Het fade gradient element bovenaan
 * @param bottomFade - Het fade gradient element onderaan
 */
function manageDoubleFadeGradient(
  description: HTMLElement,
  topFade: HTMLElement | null,
  bottomFade: HTMLElement | null
): (() => void) | undefined {
  if (!description) return;

  // Zorg ervoor dat fade elementen een CSS transitie hebben
  if (topFade) (topFade as HTMLElement).style.transition = 'opacity 0.3s ease';
  if (bottomFade) (bottomFade as HTMLElement).style.transition = 'opacity 0.3s ease';

  // Functie om de fades te updaten op basis van scroll positie
  const updateFades = (): void => {
    // Bereken scroll parameters
    const maxScroll = description.scrollHeight - description.clientHeight;

    // Als er niets te scrollen valt, verberg beide fades
    if (maxScroll <= 5) {
      if (topFade) (topFade as HTMLElement).style.opacity = '0';
      if (bottomFade) (bottomFade as HTMLElement).style.opacity = '0';
      return;
    }

    // Bereken relatieve scroll positie (0 tot 1)
    const scrollPercentage = description.scrollTop / maxScroll;

    // Beheer de BOTTOM fade (zoals eerder)
    if (bottomFade) {
      // Begin bottom fade te laten verdwijnen bij 75% scroll
      let bottomOpacity = 1;
      if (scrollPercentage > 0.75) {
        bottomOpacity = 1 - (scrollPercentage - 0.75) / 0.25;
      }
      (bottomFade as HTMLElement).style.opacity = Math.max(0, Math.min(1, bottomOpacity)).toFixed(
        2
      );
    }

    // Beheer de TOP fade
    if (topFade) {
      // Top fade moet verdwijnen als we helemaal bovenaan zijn
      // en geleidelijk verschijnen als we naar beneden scrollen
      let topOpacity = 0;
      if (scrollPercentage > 0) {
        // Laat top fade zichtbaar worden bij 25% van maximale scroll area
        topOpacity = Math.min(1, scrollPercentage * 4);
      }
      (topFade as HTMLElement).style.opacity = Math.max(0, Math.min(1, topOpacity)).toFixed(2);
    }
  };

  // Luister naar scroll events
  description.addEventListener('scroll', updateFades);

  // Controleer ook bij resize events
  window.addEventListener('resize', updateFades);

  // Voer direct een initiële check uit
  updateFades();

  // Return cleanup functie voor event listeners
  return () => {
    description.removeEventListener('scroll', updateFades);
    window.removeEventListener('resize', updateFades);
  };
}

export function setupPopupInteractions(popup: Popup, properties: any, coordinates: any): void {
  const popupElement = popup.getElement();
  const popupContent = popupElement.querySelector('.mapboxgl-popup-content') as HTMLElement;
  const popupWrapper = popupElement.querySelector('.popup-wrapper') as HTMLElement;
  const frontContent = popupElement.querySelector('.popup-front .content-wrapper') as HTMLElement;
  const backContent = popupElement.querySelector('.popup-back .content-wrapper') as HTMLElement;
  const description = popupElement.querySelector('.popup-description') as HTMLElement;
  const gradient = popupElement.querySelector('#paint0_linear_3248_5') as any;

  // Zoek alle fade elementen
  const topFade = popupElement.querySelector('.popup-front .fade-top') as HTMLElement;
  const bottomFade = popupElement.querySelector('.popup-front .fade-bottom') as HTMLElement;

  // Setup voor fade gradients
  if (description) {
    const cleanupFade = manageDoubleFadeGradient(description, topFade, bottomFade);

    // Beheer ook fades op de achterkant
    const backDescription = popupElement.querySelector(
      '.popup-back .popup-descriptionv2'
    ) as HTMLElement;
    const backTopFade = popupElement.querySelector('.popup-back .fade-top') as HTMLElement;
    const backBottomFade = popupElement.querySelector('.popup-back .fade-bottom') as HTMLElement;

    if (backDescription) {
      const cleanupBackFade = manageDoubleFadeGradient(
        backDescription,
        backTopFade,
        backBottomFade
      );

      // Zorg dat beide fade managers worden opgeruimd bij sluiten
      const closeButton = popupElement.querySelector('.close-button') as HTMLElement;
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          if (typeof cleanupFade === 'function') cleanupFade();
          if (typeof cleanupBackFade === 'function') cleanupBackFade();
        });
      }
    } else {
      // Alleen front fades opruimen
      const closeButton = popupElement.querySelector('.close-button') as HTMLElement;
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          if (typeof cleanupFade === 'function') cleanupFade();
        });
      }
    }

    // Update fades bij flip
    popupElement.querySelectorAll('.more-info-button').forEach((button) => {
      button.addEventListener('click', () => {
        // Geef wat tijd voor de flip animatie
        setTimeout(() => {
          // Update de zichtbare fades
          const isFlipped = popupWrapper.classList.contains('is-flipped');
          const visibleDescription = isFlipped ? backDescription : description;

          if (visibleDescription) {
            const maxScroll = visibleDescription.scrollHeight - visibleDescription.clientHeight;
            if (maxScroll > 5) {
              const scrollPercent = visibleDescription.scrollTop / maxScroll;

              // Update juiste fades afhankelijk van welke kant zichtbaar is
              if (isFlipped) {
                if (backTopFade)
                  (backTopFade as HTMLElement).style.opacity =
                    scrollPercent > 0 ? Math.min(1, scrollPercent * 4).toFixed(2) : '0';
                if (backBottomFade)
                  (backBottomFade as HTMLElement).style.opacity =
                    scrollPercent > 0.75 ? (1 - (scrollPercent - 0.75) / 0.25).toFixed(2) : '1';
              } else {
                if (topFade)
                  (topFade as HTMLElement).style.opacity =
                    scrollPercent > 0 ? Math.min(1, scrollPercent * 4).toFixed(2) : '0';
                if (bottomFade)
                  (bottomFade as HTMLElement).style.opacity =
                    scrollPercent > 0.75 ? (1 - (scrollPercent - 0.75) / 0.25).toFixed(2) : '1';
              }
            }
          }
        }, 50);
      });
    });
  }

  /**
   * Animate gradient stops
   */
  function animateGradient(newY1: number, newY2: number, gradient: any): void {
    const startY1 = parseFloat(gradient.y1.baseVal.value);
    const startY2 = parseFloat(gradient.y2.baseVal.value);
    const startTime = Date.now();

    function step(): void {
      const progress = Math.min((Date.now() - startTime) / 800, 1);
      gradient.y1.baseVal.value = startY1 + (newY1 - startY1) * progress;
      gradient.y2.baseVal.value = startY2 + (newY2 - startY2) * progress;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  /**
   * Adjust popup height to content
   */
  function adjustPopupHeight(): void {
    const contentHeight = Math.max(frontContent.offsetHeight, backContent.offsetHeight);
    popupWrapper.style.height = `${contentHeight}px`;

    popupElement.querySelectorAll('.popup-side').forEach((side) => {
      (side as HTMLElement).style.height = `${contentHeight}px`;
    });
  }

  // Set up hover effect on gradient
  if (gradient) {
    popupWrapper.addEventListener('mouseenter', () => {
      animateGradient(30, 282, gradient);
    });

    popupWrapper.addEventListener('mouseleave', () => {
      animateGradient(0, 252, gradient);
    });
  }

  // Adjust height
  setTimeout(adjustPopupHeight, 10);

  // Animate popup appearance
  popupContent.style.opacity = '0';
  popupContent.style.transform = 'rotate(8deg) translateY(40px) scale(0.4)';

  requestAnimationFrame(() => {
    popupContent.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    popupContent.style.opacity = '1';
    popupContent.style.transform = 'rotate(0deg) translateY(0) scale(1)';
  });

  // Handle scrollable description
  if (description) {
    // Wheel event
    description.addEventListener(
      'wheel',
      (event) => {
        event.stopPropagation();
        event.preventDefault();
        description.scrollTop += event.deltaY;
      },
      { passive: false }
    );

    // Mouse interactions
    description.addEventListener('mouseenter', () => {
      (window as any).map.dragPan.disable();
      (window as any).map.scrollZoom.disable();
    });

    description.addEventListener('mouseleave', () => {
      (window as any).map.dragPan.enable();
      (window as any).map.scrollZoom.enable();
    });

    // Mouse drag to scroll
    let isDragging = false;
    let startY: number, startScrollTop: number;

    description.addEventListener('mousedown', (event) => {
      isDragging = true;
      startY = event.pageY;
      startScrollTop = description.scrollTop;
      description.style.cursor = 'grabbing';
      event.preventDefault();
      event.stopPropagation();
    });

    description.addEventListener('mousemove', (event) => {
      if (!isDragging) return;

      event.preventDefault();
      event.stopPropagation();

      const deltaY = event.pageY - startY;
      description.scrollTop = startScrollTop - deltaY;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      description.style.cursor = 'grab';
    });

    description.addEventListener('mouseleave', () => {
      isDragging = false;
      description.style.cursor = 'grab';
    });

    // Touch interactions
    let touchStartY = 0;
    let touchStartScrollTop = 0;

    description.addEventListener('touchstart', (event) => {
      touchStartY = event.touches[0].clientY;
      touchStartScrollTop = description.scrollTop;
      event.stopPropagation();
    });

    description.addEventListener(
      'touchmove',
      (event) => {
        const deltaY = touchStartY - event.touches[0].clientY;
        description.scrollTop = touchStartScrollTop + deltaY;
        event.stopPropagation();
        event.preventDefault();
      },
      { passive: false }
    );
  }

  // Handle impressie button click
  if (properties.image && popupElement.querySelector('.impressie-button')) {
    const impressieButton = popupElement.querySelector('.impressie-button') as HTMLElement;
    impressieButton.addEventListener('click', () => {
      // Image popup should only be shown from the main popup, not from AR popups
      if (!properties.link_ar) {
        popupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        popupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
        popupContent.style.opacity = '0';

        setTimeout(() => {
          const contentHeight = Math.max(frontContent.offsetHeight, backContent.offsetHeight);
          popup.remove();
          setActivePopup(null);
          showImagePopup(properties, coordinates, contentHeight);
        }, 400);
      }
    });
  }

  // Handle info button click (flip card)
  popupElement.querySelectorAll('.more-info-button').forEach((button) => {
    button.addEventListener('click', () => {
      popupWrapper.classList.toggle('is-flipped');
    });
  });

  // Update this code in the setupPopupInteractions function:
  popupElement.querySelectorAll('.close-button').forEach((button) => {
    button.addEventListener('click', () => {
      popupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      popupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
      popupContent.style.opacity = '0';

      // Close any open sidebar items with animation
      const visibleItem = window.$('.locations-map_item.is--show');
      if (visibleItem.length) {
        visibleItem.css({
          opacity: '0',
          transform: 'translateY(40px) scale(0.6)',
          transition: 'all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        });
      }

      setTimeout(() => {
        popup.remove();
        setActivePopup(null);

        // Also remove the is--show class after animation completes
        window.$('.locations-map_item').removeClass('is--show');

        // Make sure to update geolocation manager state
        if (window.geolocationManager) {
          window.geolocationManager.isPopupOpen = false;

          // Restore tracking if it was active before
          if (window.geolocationManager.wasTracking) {
            window.geolocationManager.resumeTracking();
          }
        }
      }, 400);
    });
  });

  // Update height on window resize
  window.addEventListener('resize', adjustPopupHeight);
}

/**
 * Show a fullscreen image popup
 */
export function showImagePopup(properties: any, coordinates: any, contentHeight: number): void {
  const isMobile = window.matchMedia('(max-width: 479px)').matches;

  const popup = new window.mapboxgl.Popup({
    offset: {
      bottom: [0, -5],
      top: [0, 0],
      left: [0, 0],
      right: [0, 0],
    },
    className: 'custom-popup',
    closeButton: false,
    maxWidth: '300px',
    closeOnClick: false,
    anchor: 'bottom',
  });

  // Create popup content
  const html = `
    <style>
      .popup-wrapper {
        height: ${contentHeight}px;
      }

      .popup-side {
        background-color: ${properties.color || '#6B46C1'};
        clip-path: polygon(calc(100% - 0px) 26.5px, calc(100% - 0px) calc(100% - 26.5px), calc(100% - 0px) calc(100% - 26.5px), calc(100% - 0.34671999999995px) calc(100% - 22.20048px), calc(100% - 1.3505599999999px) calc(100% - 18.12224px), calc(100% - 2.95704px) calc(100% - 14.31976px), calc(100% - 5.11168px) calc(100% - 10.84752px), calc(100% - 7.76px) calc(100% - 7.76px), calc(100% - 10.84752px) calc(100% - 5.11168px), calc(100% - 14.31976px) calc(100% - 2.9570399999999px), calc(100% - 18.12224px) calc(100% - 1.35056px), calc(100% - 22.20048px) calc(100% - 0.34672px), calc(100% - 26.5px) calc(100% - 0px), calc(50% - -32.6px) calc(100% - 0px), calc(50% - -32.6px) calc(100% - 0px), calc(50% - -31.57121px) calc(100% - 0.057139999999947px), calc(50% - -30.56648px) calc(100% - 0.2255199999999px), calc(50% - -29.59427px) calc(100% - 0.50057999999996px), calc(50% - -28.66304px) calc(100% - 0.87775999999991px), calc(50% - -27.78125px) calc(100% - 1.3525px), calc(50% - -26.95736px) calc(100% - 1.92024px), calc(50% - -26.19983px) calc(100% - 2.57642px), calc(50% - -25.51712px) calc(100% - 3.31648px), calc(50% - -24.91769px) calc(100% - 4.13586px), calc(50% - -24.41px) calc(100% - 5.03px), calc(50% - -24.41px) calc(100% - 5.03px), calc(50% - -22.95654px) calc(100% - 7.6045699999999px), calc(50% - -21.23752px) calc(100% - 9.9929599999998px), calc(50% - -19.27298px) calc(100% - 12.17519px), calc(50% - -17.08296px) calc(100% - 14.13128px), calc(50% - -14.6875px) calc(100% - 15.84125px), calc(50% - -12.10664px) calc(100% - 17.28512px), calc(50% - -9.36042px) calc(100% - 18.44291px), calc(50% - -6.46888px) calc(100% - 19.29464px), calc(50% - -3.45206px) calc(100% - 19.82033px), calc(50% - -0.32999999999998px) calc(100% - 20px), calc(50% - -0.32999999999998px) calc(100% - 20px), calc(50% - 2.79179px) calc(100% - 19.82033px), calc(50% - 5.8079199999999px) calc(100% - 19.29464px), calc(50% - 8.69853px) calc(100% - 18.44291px), calc(50% - 11.44376px) calc(100% - 17.28512px), calc(50% - 14.02375px) calc(100% - 15.84125px), calc(50% - 16.41864px) calc(100% - 14.13128px), calc(50% - 18.60857px) calc(100% - 12.17519px), calc(50% - 20.57368px) calc(100% - 9.9929599999999px), calc(50% - 22.29411px) calc(100% - 7.60457px), calc(50% - 23.75px) calc(100% - 5.03px), calc(50% - 23.75px) calc(100% - 5.03px), calc(50% - 24.25769px) calc(100% - 4.1358599999999px), calc(50% - 24.85712px) calc(100% - 3.3164799999998px), calc(50% - 25.53983px) calc(100% - 2.57642px), calc(50% - 26.29736px) calc(100% - 1.92024px), calc(50% - 27.12125px) calc(100% - 1.3525px), calc(50% - 28.00304px) calc(100% - 0.87775999999997px), calc(50% - 28.93427px) calc(100% - 0.50057999999996px), calc(50% - 29.90648px) calc(100% - 0.22552000000002px), calc(50% - 30.91121px) calc(100% - 0.057140000000004px), calc(50% - 31.94px) calc(100% - 0px), 26.5px calc(100% - 0px), 26.5px calc(100% - 0px), 22.20048px calc(100% - 0.34671999999989px), 18.12224px calc(100% - 1.3505599999999px), 14.31976px calc(100% - 2.95704px), 10.84752px calc(100% - 5.1116799999999px), 7.76px calc(100% - 7.76px), 5.11168px calc(100% - 10.84752px), 2.95704px calc(100% - 14.31976px), 1.35056px calc(100% - 18.12224px), 0.34672px calc(100% - 22.20048px), 4.3855735949631E-31px calc(100% - 26.5px), 0px 26.5px, 0px 26.5px, 0.34672px 22.20048px, 1.35056px 18.12224px, 2.95704px 14.31976px, 5.11168px 10.84752px, 7.76px 7.76px, 10.84752px 5.11168px, 14.31976px 2.95704px, 18.12224px 1.35056px, 22.20048px 0.34672px, 26.5px 4.3855735949631E-31px, calc(50% - 26.74px) 0px, calc(50% - 26.74px) 0px, calc(50% - 25.31263px) 0.07137px, calc(50% - 23.91544px) 0.28176px, calc(50% - 22.55581px) 0.62559px, calc(50% - 21.24112px) 1.09728px, calc(50% - 19.97875px) 1.69125px, calc(50% - 18.77608px) 2.40192px, calc(50% - 17.64049px) 3.22371px, calc(50% - 16.57936px) 4.15104px, calc(50% - 15.60007px) 5.17833px, calc(50% - 14.71px) 6.3px, calc(50% - 14.71px) 6.3px, calc(50% - 13.6371px) 7.64798px, calc(50% - 12.446px) 8.89024px, calc(50% - 11.1451px) 10.01826px, calc(50% - 9.7428px) 11.02352px, calc(50% - 8.2475px) 11.8975px, calc(50% - 6.6676px) 12.63168px, calc(50% - 5.0115px) 13.21754px, calc(50% - 3.2876px) 13.64656px, calc(50% - 1.5043px) 13.91022px, calc(50% - -0.32999999999996px) 14px, calc(50% - -0.32999999999998px) 14px, calc(50% - -2.16431px) 13.9105px, calc(50% - -3.94768px) 13.6476px, calc(50% - -5.67177px) 13.2197px, calc(50% - -7.32824px) 12.6352px, calc(50% - -8.90875px) 11.9025px, calc(50% - -10.40496px) 11.03px, calc(50% - -11.80853px) 10.0261px, calc(50% - -13.11112px) 8.8992px, calc(50% - -14.30439px) 7.6577px, calc(50% - -15.38px) 6.31px, calc(50% - -15.38px) 6.31px, calc(50% - -16.27279px) 5.18562px, calc(50% - -17.25432px) 4.15616px, calc(50% - -18.31733px) 3.22714px, calc(50% - -19.45456px) 2.40408px, calc(50% - -20.65875px) 1.6925px, calc(50% - -21.92264px) 1.09792px, calc(50% - -23.23897px) 0.62586px, calc(50% - -24.60048px) 0.28184px, calc(50% - -25.99991px) 0.07138px, calc(50% - -27.43px) 8.9116630386686E-32px, calc(100% - 26.5px) 0px, calc(100% - 26.5px) 0px, calc(100% - 22.20048px) 0.34672px, calc(100% - 18.12224px) 1.35056px, calc(100% - 14.31976px) 2.95704px, calc(100% - 10.84752px) 5.11168px, calc(100% - 7.76px) 7.76px, calc(100% - 5.11168px) 10.84752px, calc(100% - 2.9570399999999px) 14.31976px, calc(100% - 1.35056px) 18.12224px, calc(100% - 0.34671999999995px) 22.20048px, calc(100% - 5.6843418860808E-14px) 26.5px);
      }

      .close-button {
        background: ${properties.color || '#6B46C1'};
      }
    </style>
    <div class="popup-wrapper">
      <button class="close-button" aria-label="Close popup"></button>
      <div class="popup-side">
        <div class="image-container">
          <img src="${properties.image}" alt="${properties.name}" class="full-image">
          <div class="button-container">
            <button class="back-button">Terug</button>
          </div>
          <div class="location-name">${properties.name}</div>
        </div>
      </div>
    </div>
  `;

  // Add popup to map
  popup
    .setLngLat(coordinates)
    .setHTML(html)
    .addTo((window as any).map);
  setActivePopup(popup);

  // Get DOM elements
  const popupElement = popup.getElement();
  const popupContent = popupElement.querySelector('.mapboxgl-popup-content') as HTMLElement;
  const closeButton = popupElement.querySelector('.close-button') as HTMLElement;
  const backButton = popupElement.querySelector('.back-button') as HTMLElement;

  // Animate popup appearance
  popupContent.style.opacity = '0';
  popupContent.style.transform = 'rotate(8deg) translateY(40px) scale(0.4)';

  requestAnimationFrame(() => {
    popupContent.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    popupContent.style.opacity = '1';
    popupContent.style.transform = 'rotate(0deg) translateY(0) scale(1)';
  });

  // Find gradient for hover effect if it exists
  const svgElement = popupElement.querySelector('svg');
  if (svgElement) {
    const gradient = svgElement.querySelector('linearGradient');
    if (gradient) {
      const popupWrapper = popupElement.querySelector('.popup-wrapper') as HTMLElement;

      function animateGradient(newY1: number, newY2: number, gradient: any): void {
        const startY1 = parseFloat(gradient.y1.baseVal.value);
        const startY2 = parseFloat(gradient.y2.baseVal.value);
        const startTime = Date.now();

        function step(): void {
          const progress = Math.min((Date.now() - startTime) / 800, 1);
          gradient.y1.baseVal.value = startY1 + (newY1 - startY1) * progress;
          gradient.y2.baseVal.value = startY2 + (newY2 - startY2) * progress;

          if (progress < 1) {
            requestAnimationFrame(step);
          }
        }

        requestAnimationFrame(step);
      }

      popupWrapper.addEventListener('mouseenter', () => {
        animateGradient(30, 282, gradient);
      });

      popupWrapper.addEventListener('mouseleave', () => {
        animateGradient(0, 252, gradient);
      });
    }
  }

  // Handle close button click
  closeButton.addEventListener('click', () => {
    popupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    popupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
    popupContent.style.opacity = '0';

    setTimeout(() => {
      popup.remove();
      setActivePopup(null);
    }, 400);
  });

  // Handle back button click (return to main popup)
  backButton.addEventListener('click', () => {
    popupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    popupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
    popupContent.style.opacity = '0';

    setTimeout(async () => {
      popup.remove();
      setActivePopup(null);

      // Create new main popup
      const mainPopup = new window.mapboxgl.Popup({
        offset: {
          bottom: [0, -5],
          top: [0, 0],
          left: [0, 0],
          right: [0, 0],
        },
        className: 'custom-popup',
        closeButton: false,
        maxWidth: '300px',
        closeOnClick: false,
        anchor: 'bottom',
      });

      const { createPopupContent } = await import('./popups.js');
      const { styles, html } = createPopupContent(properties);
      mainPopup.setLngLat(coordinates).setHTML(`${styles}${html}`);
      mainPopup.addTo((window as any).map);
      setActivePopup(mainPopup);
      setupPopupInteractions(mainPopup, properties, coordinates);

      // Animate new popup appearance
      const newPopupContent = mainPopup
        .getElement()
        .querySelector('.mapboxgl-popup-content') as HTMLElement;
      newPopupContent.style.opacity = '0';
      newPopupContent.style.transform = 'rotate(8deg) translateY(40px) scale(0.4)';

      requestAnimationFrame(() => {
        newPopupContent.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        newPopupContent.style.opacity = '1';
        newPopupContent.style.transform = 'rotate(0deg) translateY(0) scale(1)';
      });
    }, 400);
  });
}

/**
 * Close sidebar items
 */
export function closeItem(): void {
  window.$('.locations-map_item').removeClass('is--show');
}

/**
 * Close sidebar items if visible
 */
export function closeItemIfVisible(): void {
  if (window.$('.locations-map_item').hasClass('is--show')) {
    closeItem();
  }
}
