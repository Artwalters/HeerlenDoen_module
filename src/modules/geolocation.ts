// Geolocation management for the Heerlen Interactive Map

import type { GeolocateControl, Map, Marker, Popup } from 'mapbox-gl';

import { CONFIG } from './config.js';
import { state } from './state.js';

// Global declarations for external libraries
declare global {
  interface Window {
    mapboxgl: typeof import('mapbox-gl');
    geolocationManager: GeolocationManager;
  }
}

interface GeolocationPosition {
  coords: {
    longitude: number;
    latitude: number;
    heading?: number;
  };
}

interface GeolocationError {
  code: number;
  message: string;
}

export class GeolocationManager {
  private map: Map;
  private searchRadiusId: string;
  private searchRadiusOuterId: string;
  private radiusInMeters: number;
  private boundaryLayerIds: string[];
  private distanceMarkers: Marker[];
  public isPopupOpen: boolean;
  private centerPoint: [number, number];
  private boundaryRadius: number;
  public geolocateControl?: GeolocateControl;
  private isFirstLocation: boolean;
  private isTracking: boolean;
  private userInitiatedGeolocation: boolean;
  public wasTracking?: boolean;

  constructor(map: Map) {
    this.map = map;
    this.searchRadiusId = 'search-radius';
    this.searchRadiusOuterId = 'search-radius-outer';
    this.radiusInMeters = 25;
    this.boundaryLayerIds = ['boundary-fill', 'boundary-line', 'boundary-label'];
    this.distanceMarkers = [];
    this.isPopupOpen = false;
    this.centerPoint = CONFIG.MAP.boundary.center;
    this.boundaryRadius = CONFIG.MAP.boundary.radius;
    this.isFirstLocation = true;
    this.isTracking = false;
    this.userInitiatedGeolocation = false;
    console.log('[DEBUG] GeolocationManager initialized.');
    console.log('[DEBUG] Boundary Center:', this.centerPoint);
    console.log('[DEBUG] Boundary Radius (km):', this.boundaryRadius);
    this.initialize();
  }

  /**
   * Initialize geolocation features
   */
  private initialize(): void {
    this.setupGeolocateControl();
    this.setupSearchRadius();
    this.setupBoundaryCheck();
  }

  /**
   * Pause geolocation tracking while keeping user location visible
   */
  public pauseTracking(): void {
    if (this.geolocateControl && (this.geolocateControl as any)._watchState === 'ACTIVE_LOCK') {
      this.wasTracking = true;
      (this.geolocateControl as any)._watchState = 'ACTIVE_ERROR';
      console.log('Geolocation tracking paused');
    }
  }

  /**
   * Resume geolocation tracking if it was paused
   */
  public resumeTracking(): void {
    if (this.geolocateControl && this.wasTracking) {
      (this.geolocateControl as any)._watchState = 'ACTIVE_LOCK';
      this.wasTracking = false;
      console.log('Geolocation tracking resumed');
    }
  }

  /**
   * Create and update distance markers based on user location
   */
  private updateDistanceMarkers(userPosition: [number, number]): void {
    // Clear existing markers
    if (this.distanceMarkers) {
      this.distanceMarkers.forEach((marker) => marker.remove());
      this.distanceMarkers = [];
    }

    // Add new markers for features within radius
    state.mapLocations.features.forEach((feature) => {
      const featureCoords = feature.geometry.coordinates as [number, number];
      const distance =
        1000 *
        this.calculateDistance(
          userPosition[1],
          userPosition[0],
          featureCoords[1],
          featureCoords[0]
        );

      if (distance <= this.radiusInMeters) {
        const markerEl = document.createElement('div');
        markerEl.className = 'distance-marker';
        markerEl.innerHTML = `<span class="distance-marker-distance">${Math.round(distance)}m</span>`;

        const marker = new window.mapboxgl.Marker({ element: markerEl })
          .setLngLat(featureCoords)
          .addTo(this.map);

        // Add click handler
        markerEl.addEventListener('click', () => {
          this.map.fire('click', {
            lngLat: featureCoords,
            point: this.map.project(featureCoords),
            features: [feature],
          } as any);
        });

        this.distanceMarkers.push(marker);
      }
    });
  }

  // Handle user location updates
  private handleUserLocation(position: GeolocationPosition): void {
    const userPosition: [number, number] = [position.coords.longitude, position.coords.latitude];
    console.log('[DEBUG] handleUserLocation - User Position:', userPosition);

    if (this.isWithinBoundary(userPosition)) {
      console.log('[DEBUG] handleUserLocation - User is INSIDE boundary.');
      this.updateSearchRadius(userPosition);
      this.updateDistanceMarkers(userPosition);

      if (!this.isPopupOpen) {
        if (this.isFirstLocation) {
          console.log('[DEBUG] handleUserLocation - First location detected, flying to user.');
          this.map.flyTo({
            center: userPosition,
            zoom: 17.5,
            pitch: 45,
            duration: 2000,
            bearing: position.coords.heading || 0,
          });
          this.isFirstLocation = false;
        } else {
          const mapCenter = this.map.getCenter();
          const distanceChange = this.calculateDistance(
            mapCenter.lat,
            mapCenter.lng,
            userPosition[1],
            userPosition[0]
          );

          if (distanceChange > 0.05) {
            console.log('[DEBUG] handleUserLocation - Easing to new user position.');
            this.map.easeTo({
              center: userPosition,
              duration: 1000,
            });
          }
        }
      } else {
        console.log('[DEBUG] handleUserLocation - Popup is open, map movement skipped.');
      }
    } else {
      console.warn('[DEBUG] handleUserLocation - User is OUTSIDE boundary. Stopping tracking.');
      (this.geolocateControl as any)._watchState = 'OFF';
      if ((this.geolocateControl as any)._geolocateButton) {
        (this.geolocateControl as any)._geolocateButton.classList.remove(
          'mapboxgl-ctrl-geolocate-active'
        );
        (this.geolocateControl as any)._geolocateButton.classList.remove(
          'mapboxgl-ctrl-geolocate-waiting'
        );
      }

      // Clear any existing user location indicators
      this.clearSearchRadius();
      if (this.distanceMarkers) {
        this.distanceMarkers.forEach((marker) => marker.remove());
        this.distanceMarkers = [];
      }

      console.log(
        '[DEBUG] handleUserLocation - Calling showBoundaryPopup because user moved outside.'
      );
      this.showBoundaryPopup();

      console.log('[DEBUG] handleUserLocation - Flying to Heerlen center.');
      this.map.flyTo({
        center: this.centerPoint,
        zoom: 14,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      });
    }
  }

  /**
   * Setup geolocate control with event handlers
   */
  private setupGeolocateControl(): void {
    // Remove any existing controls
    document
      .querySelectorAll('.mapboxgl-ctrl-top-right .mapboxgl-ctrl-group')
      .forEach((el) => el.remove());
    document
      .querySelectorAll('.mapboxgl-ctrl-bottom-right .mapboxgl-ctrl-group')
      .forEach((el) => el.remove());

    // Create geolocate control
    this.geolocateControl = new window.mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 6000,
      },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: false,
      fitBoundsOptions: {
        maxZoom: 17.5,
        animate: true,
      },
    });

    this.isFirstLocation = true;
    this.isTracking = false;
    this.userInitiatedGeolocation = false;

    // Override the original _onSuccess method from the geolocate control
    const originalOnSuccess = (this.geolocateControl as any)._onSuccess;
    (this.geolocateControl as any)._onSuccess = (position: GeolocationPosition) => {
      const userPosition: [number, number] = [position.coords.longitude, position.coords.latitude];
      console.log('[DEBUG] _onSuccess - Position received:', userPosition);

      const isWithin = this.isWithinBoundary(userPosition);
      console.log(
        '[DEBUG] _onSuccess - Before check: userInitiatedGeolocation =',
        this.userInitiatedGeolocation,
        ', isWithinBoundary =',
        isWithin
      );

      // Only do boundary check if user clicked the button
      if (this.userInitiatedGeolocation && !isWithin) {
        console.warn(
          '[DEBUG] _onSuccess - User clicked AND is outside boundary. Preventing geolocation and showing popup.'
        );

        // Reset geolocate control state
        (this.geolocateControl as any)._watchState = 'OFF';
        if ((this.geolocateControl as any)._geolocateButton) {
          (this.geolocateControl as any)._geolocateButton.classList.remove(
            'mapboxgl-ctrl-geolocate-active'
          );
          (this.geolocateControl as any)._geolocateButton.classList.remove(
            'mapboxgl-ctrl-geolocate-waiting'
          );
          console.log('[DEBUG] _onSuccess - Geolocate button classes removed.');
        }

        // Show boundary popup and highlight boundary
        this.showBoundaryLayers();
        console.log('[DEBUG] _onSuccess - Calling showBoundaryPopup().');
        this.showBoundaryPopup();

        // Remove any user location marker that might have been added
        if ((this.geolocateControl as any)._userLocationDotMarker) {
          console.log('[DEBUG] _onSuccess - Removing user location dot marker.');
          (this.geolocateControl as any)._userLocationDotMarker.remove();
        }

        this.userInitiatedGeolocation = false;
        console.log('[DEBUG] _onSuccess - userInitiatedGeolocation flag reset to false.');
        return;
      }

      console.log(
        '[DEBUG] _onSuccess - User is within boundary OR check was not user-initiated. Proceeding with original _onSuccess.'
      );
      originalOnSuccess.call(this.geolocateControl, position);
      this.userInitiatedGeolocation = false;
      console.log(
        '[DEBUG] _onSuccess - userInitiatedGeolocation flag reset after normal processing.'
      );
    };

    // Handle errors
    this.geolocateControl.on('error', (error: GeolocationError) => {
      console.error('[DEBUG] Geolocation error event triggered:', error);
      if (this.userInitiatedGeolocation) {
        console.warn('[DEBUG] Geolocation error occurred after user initiated the request.');
        this.handleGeolocationError(error);
      } else {
        console.log(
          '[DEBUG] Geolocation error occurred during automatic tracking or initial load.'
        );
      }
      this.userInitiatedGeolocation = false;
      console.log('[DEBUG] Geolocation error - userInitiatedGeolocation flag reset.');
    });

    // Setup the button click handler
    this.map.once('idle', () => {
      const geolocateButton = document.querySelector('.mapboxgl-ctrl-geolocate');
      if (geolocateButton && geolocateButton.parentElement) {
        geolocateButton.addEventListener(
          'click',
          (event) => {
            console.log(
              '[DEBUG] Geolocate button CLICKED. Setting userInitiatedGeolocation = true.'
            );
            this.userInitiatedGeolocation = true;
            console.log('[DEBUG] Geolocate button click - Showing boundary layers.');
            this.showBoundaryLayers();
          },
          true
        );
      } else {
        console.warn('[DEBUG] Could not find geolocate button after map idle.');
      }
    });

    this.geolocateControl.on('trackuserlocationstart', () => {
      console.log('Location tracking started');
      console.log('[DEBUG] trackuserlocationstart event - Showing boundary layers.');
      this.isTracking = true;
      this.showBoundaryLayers();
    });

    this.geolocateControl.on('trackuserlocationend', () => {
      console.log('Location tracking ended');
      this.isTracking = false;
      this.isFirstLocation = true;
      this.map.easeTo({ bearing: 0, pitch: 45 });
      this.clearSearchRadius();

      if (this.distanceMarkers) {
        this.distanceMarkers.forEach((marker) => marker.remove());
        this.distanceMarkers = [];
      }
    });

    // Add controls to map
    this.map.addControl(this.geolocateControl, 'bottom-right');
    this.map.addControl(new window.mapboxgl.NavigationControl(), 'top-right');
  }

  /**
   * Setup search radius visualization
   */
  private setupSearchRadius(): void {
    this.map.on('load', () => {
      if (this.map.getSource(this.searchRadiusId)) {
        console.log('[DEBUG] Search radius source already exists on load.');
        return;
      }
      // Setup inner radius
      this.map.addSource(this.searchRadiusId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[]] },
        },
      });

      this.map.addLayer({
        id: this.searchRadiusId,
        type: 'fill-extrusion',
        source: this.searchRadiusId,
        paint: {
          'fill-extrusion-color': '#4B83F2',
          'fill-extrusion-opacity': 0.08,
          'fill-extrusion-height': 1,
          'fill-extrusion-base': 0,
        },
      });

      // Setup outer radius
      this.map.addSource(this.searchRadiusOuterId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[]] },
        },
      });

      this.map.addLayer({
        id: this.searchRadiusOuterId,
        type: 'fill-extrusion',
        source: this.searchRadiusOuterId,
        paint: {
          'fill-extrusion-color': '#4B83F2',
          'fill-extrusion-opacity': 0.04,
          'fill-extrusion-height': 2,
          'fill-extrusion-base': 0,
        },
      });
      console.log('[DEBUG] Search radius layers added.');
    });
  }

  /**
   * Setup boundary circle visualization
   */
  private setupBoundaryCheck(): void {
    this.map.on('load', () => {
      if (this.map.getSource('boundary-circle')) {
        console.log('[DEBUG] Boundary circle source already exists on load.');
        return;
      }
      this.map.addSource('boundary-circle', {
        type: 'geojson',
        data: this.createBoundaryCircle(),
      });

      this.map.addLayer({
        id: 'boundary-fill',
        type: 'fill',
        source: 'boundary-circle',
        paint: {
          'fill-color': '#4B83F2',
          'fill-opacity': 0.03,
        },
        layout: {
          visibility: 'none',
        },
      });

      this.map.addLayer({
        id: 'boundary-line',
        type: 'line',
        source: 'boundary-circle',
        paint: {
          'line-color': '#4B83F2',
          'line-width': 2,
          'line-dasharray': [3, 3],
        },
        layout: {
          visibility: 'none',
        },
      });
      console.log('[DEBUG] Boundary check layers added.');
    });
  }

  /**
   * Show boundary visualization with animation
   */
  private showBoundaryLayers(): void {
    console.log('[DEBUG] showBoundaryLayers called.');
    this.boundaryLayerIds.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', 'visible');

        if (layerId === 'boundary-fill') {
          let opacity = 0;
          const animateOpacity = () => {
            if (opacity < 0.03) {
              opacity += 0.005;
              this.map.setPaintProperty(layerId, 'fill-opacity', opacity);
              requestAnimationFrame(animateOpacity);
            }
          };
          animateOpacity();
        }
      } else {
        console.warn(`[DEBUG] Layer ${layerId} not found in showBoundaryLayers.`);
      }
    });
  }

  /**
   * Hide boundary visualization with animation
   */
  private hideBoundaryLayers(): void {
    console.log('[DEBUG] hideBoundaryLayers called.');
    this.boundaryLayerIds.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        if (layerId === 'boundary-fill') {
          let opacity = (this.map.getPaintProperty(layerId, 'fill-opacity') as number) || 0.03;
          const animateOpacity = () => {
            if (opacity > 0) {
              opacity -= 0.005;
              const currentOpacity = Math.max(0, opacity);
              this.map.setPaintProperty(layerId, 'fill-opacity', currentOpacity);
              if (currentOpacity > 0) {
                requestAnimationFrame(animateOpacity);
              } else {
                this.map.setLayoutProperty(layerId, 'visibility', 'none');
              }
            } else {
              this.map.setLayoutProperty(layerId, 'visibility', 'none');
            }
          };
          animateOpacity();
        } else {
          this.map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      } else {
        console.warn(`[DEBUG] Layer ${layerId} not found in hideBoundaryLayers.`);
      }
    });
  }

  /**
   * Update search radius visualization around user
   */
  private updateSearchRadius(center: [number, number]): void {
    if (!this.map.getSource(this.searchRadiusId)) {
      console.warn('[DEBUG] updateSearchRadius - Source not found:', this.searchRadiusId);
      return;
    }

    // Create circle coordinates
    const generateCircle = (
      center: [number, number],
      radiusInM: number,
      pointCount = 64
    ): [number, number][] => {
      const point = {
        latitude: center[1],
        longitude: center[0],
      };

      const radiusKm = radiusInM / 1000;
      const points: [number, number][] = [];

      // Convert km to degrees based on latitude
      const degreesLongPerKm = radiusKm / (111.32 * Math.cos((point.latitude * Math.PI) / 180));
      const degreesLatPerKm = radiusKm / 110.574;

      // Generate points around the circle
      for (let i = 0; i < pointCount; i++) {
        const angle = (i / pointCount) * (2 * Math.PI);
        const dx = degreesLongPerKm * Math.cos(angle);
        const dy = degreesLatPerKm * Math.sin(angle);
        points.push([point.longitude + dx, point.latitude + dy]);
      }

      // Close the loop
      points.push(points[0]);
      return points;
    };

    const circleCoords = generateCircle(center, this.radiusInMeters);

    // Update both radius layers
    [this.searchRadiusId, this.searchRadiusOuterId].forEach((sourceId) => {
      const source = this.map.getSource(sourceId);
      if (source && 'setData' in source) {
        (source as any).setData({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [circleCoords],
          },
        });
      } else {
        console.warn(`[DEBUG] updateSearchRadius - Source not found during update: ${sourceId}`);
      }
    });
  }

  /**
   * Clear search radius visualization
   */
  private clearSearchRadius(): void {
    if (this.map.getSource(this.searchRadiusId)) {
      [this.searchRadiusId, this.searchRadiusOuterId].forEach((sourceId) => {
        const source = this.map.getSource(sourceId);
        if (source && 'setData' in source) {
          (source as any).setData({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[]],
            },
          });
        } else {
          console.warn(`[DEBUG] clearSearchRadius - Source not found: ${sourceId}`);
        }
      });
    } else {
      console.warn('[DEBUG] clearSearchRadius - Source not found initially:', this.searchRadiusId);
    }
  }

  /**
   * Handle geolocation errors
   */
  private handleGeolocationError(error: GeolocationError): void {
    console.error('[DEBUG] handleGeolocationError called with error:', error);
    console.error('Geolocation error code:', error.code);
    console.error('Geolocation error message:', error.message);

    const errorMessages: Record<number, string> = {
      1: 'Locatie toegang geweigerd. Schakel het in bij je instellingen.',
      2: 'Locatie niet beschikbaar. Controleer je apparaat instellingen.',
      3: 'Verzoek verlopen. Probeer opnieuw.',
    };
    const defaultMessage = 'Er is een fout opgetreden bij het ophalen van je locatie.';

    this.showNotification(errorMessages[error.code] || defaultMessage);
  }

  /**
   * Show notification to user
   */
  private showNotification(message: string): void {
    console.log('[DEBUG] Displaying notification:', message);
    const notification = document.createElement('div');
    notification.className = 'geolocation-error-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 5000);
  }

  /**
   * Create boundary circle GeoJSON
   */
  private createBoundaryCircle(): GeoJSON.Feature<GeoJSON.Polygon> {
    const center = {
      latitude: this.centerPoint[1],
      longitude: this.centerPoint[0],
    };

    const radiusKm = this.boundaryRadius;
    const points: [number, number][] = [];

    // Convert km to degrees based on latitude
    const degreesLongPerKm = radiusKm / (111.32 * Math.cos((center.latitude * Math.PI) / 180));
    const degreesLatPerKm = radiusKm / 110.574;

    // Generate points around the circle
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * (2 * Math.PI);
      const dx = degreesLongPerKm * Math.cos(angle);
      const dy = degreesLatPerKm * Math.sin(angle);
      points.push([center.longitude + dx, center.latitude + dy]);
    }

    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [points],
      },
    };
  }

  /**
   * Check if position is within boundary
   */
  private isWithinBoundary(position: [number, number]): boolean {
    const distance = this.calculateDistance(
      position[1],
      position[0],
      this.centerPoint[1],
      this.centerPoint[0]
    );
    const isWithin = distance <= this.boundaryRadius;
    return isWithin;
  }

  /**
   * Calculate distance between coordinates in km
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula
    const toRad = (deg: number) => deg * (Math.PI / 180);

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c; // Earth radius in km
  }

  /**
   * Show boundary popup when user is outside boundary
   */
  private showBoundaryPopup(): void {
    console.log('[DEBUG] showBoundaryPopup started.');

    // Remove existing popup if any
    const existingPopup = document.querySelector('.location-boundary-popup');
    if (existingPopup) {
      console.log('[DEBUG] Removing existing location-boundary-popup.');
      existingPopup.remove();
    }

    // Create new popup
    const popup = document.createElement('div');
    popup.className = 'location-boundary-popup';
    console.log('[DEBUG] Created new popup element.');

    const heading = document.createElement('h3');
    heading.textContent = 'Kom naar Heerlen';

    const text = document.createElement('p');
    text.textContent =
      'Deze functie is alleen beschikbaar binnen de blauwe cirkel op de kaart. Kom naar het centrum van Heerlen om de interactieve kaart te gebruiken!';

    const button = document.createElement('button');
    button.textContent = 'Ik kom er aan!';

    // Handle button click
    const self = this;
    button.addEventListener('click', function () {
      console.log('[DEBUG] Boundary popup button clicked.');
      if (window.innerWidth <= 768) {
        popup.style.transform = 'translateY(100%)';
      } else {
        popup.style.transform = 'translateX(120%)';
      }

      setTimeout(() => {
        console.log('[DEBUG] Removing boundary popup after click.');
        popup.remove();
      }, 600);

      setTimeout(() => {
        console.log('[DEBUG] Hiding boundary layers after popup button click.');
        self.hideBoundaryLayers();
      }, 200);

      // Fly back to intro animation location
      const finalZoom = window.matchMedia('(max-width: 479px)').matches ? 17 : 18;

      console.log('[DEBUG] Flying back to intro location after popup button click.');
      self.map.flyTo({
        center: CONFIG.MAP.center,
        zoom: finalZoom,
        pitch: 55,
        bearing: -17.6,
        duration: 3000,
        essential: true,
        easing: (t: number) => t * (2 - t),
      });
    });

    // Assemble popup
    popup.appendChild(heading);
    popup.appendChild(text);
    popup.appendChild(button);
    document.body.appendChild(popup);
    console.log('[DEBUG] Boundary popup appended to document body.');

    // Highlight boundary
    if (this.map.getLayer('boundary-fill')) {
      console.log('[DEBUG] Highlighting boundary layers.');
      this.map.setPaintProperty('boundary-fill', 'fill-opacity', 0.05);
      this.map.setPaintProperty('boundary-line', 'line-width', 3);

      setTimeout(() => {
        console.log('[DEBUG] Resetting boundary layer highlight.');
        if (this.map.getLayer('boundary-fill')) {
          this.map.setPaintProperty('boundary-fill', 'fill-opacity', 0.03);
        }
        if (this.map.getLayer('boundary-line')) {
          this.map.setPaintProperty('boundary-line', 'line-width', 2);
        }
      }, 2000);
    } else {
      console.warn('[DEBUG] Boundary layers not found for highlighting in showBoundaryPopup.');
    }

    // Fly to center to show the boundary (only if not already flying)
    if (!this.map.isMoving() && !this.map.isEasing()) {
      console.log('[DEBUG] Flying to boundary center to show the area.');
      this.map.flyTo({
        center: this.centerPoint,
        zoom: 14,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      });
    } else {
      console.log(
        '[DEBUG] Skipping flyTo center in showBoundaryPopup because map is already moving.'
      );
    }

    // Show popup with animation
    requestAnimationFrame(() => {
      popup.offsetHeight;
      popup.classList.add('show');
      console.log("[DEBUG] Added 'show' class to boundary popup.");
    });

    console.log('[DEBUG] showBoundaryPopup finished.');
  }
}
