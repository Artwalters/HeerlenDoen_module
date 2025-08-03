// Boundary utilities and teleport functionality

import type { Map } from 'mapbox-gl';
import { CONFIG } from './config.js';

// Extend global interface for gsap
declare global {
  const gsap: {
    to: (target: any, options: any) => void;
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @return Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Haversine formula
  const toRad = (deg: number): number => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c; // Earth radius in km
}

/**
 * Setup boundary checking for map movement
 * @param map - The mapbox map instance
 */
export function setupBoundaryCheck(map: Map): void {
  map.on('moveend', () => {
    // Skip this check if we're flying back
    if (map.isEasing()) return;

    const currentCenter = map.getCenter();
    const boundaryCenter = {
      lng: CONFIG.MAP.boundary.center[0],
      lat: CONFIG.MAP.boundary.center[1],
    };

    // Calculate distance from current center to Heerlen center
    const distance = calculateDistance(
      currentCenter.lat,
      currentCenter.lng,
      boundaryCenter.lat,
      boundaryCenter.lng
    );

    // If we're too far away (more than 1 km), fly back
    if (distance > 1) {
      // Create blocker overlay
      const overlay = document.createElement('div');
      overlay.id = 'interaction-blocker';
      document.body.appendChild(overlay);

      // Fly back to center
      map.flyTo({
        center: CONFIG.MAP.center,
        zoom: 17,
        pitch: 45,
        bearing: -17.6,
        speed: 0.8,
        curve: 1.5,
        essential: true,
      });

      // Fade overlay
      gsap.to(overlay, {
        duration: 2,
        backgroundColor: 'rgba(255,255,255,0)',
        onComplete: () => {
          overlay.remove();
        },
      });
    }
  });
}