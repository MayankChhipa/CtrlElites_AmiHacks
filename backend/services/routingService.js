const axios = require('axios');
const { calculateDistanceKm } = require('../utils/geoUtils');

/**
 * Calculates road routing and ETA between two coordinates [longitude, latitude]
 * Uses OSRM if reachable, falls back to geodesic distance + urban transit speed.
 * 
 * @param {Array<number>} originCoords - [lon, lat]
 * @param {Array<number>} destCoords - [lon, lat]
 * @returns {Promise<Object>} { distanceKm, durationMinutes, source, geojson }
 */
const calculateRouteAndEta = async (originCoords, destCoords) => {
  // Validate coordinates
  if (
    !Array.isArray(originCoords) ||
    originCoords.length !== 2 ||
    !Array.isArray(destCoords) ||
    destCoords.length !== 2
  ) {
    return getFallbackRoute([77.209, 28.6139], [77.22, 28.62]);
  }

  const [lon1, lat1] = originCoords;
  const [lon2, lat2] = destCoords;

  const osrmBaseUrl = process.env.OSRM_URL || 'https://router.project-osrm.org';

  try {
    const url = `${osrmBaseUrl}/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
    const response = await axios.get(url, { timeout: 2500 });

    if (
      response.data &&
      response.data.code === 'Ok' &&
      response.data.routes &&
      response.data.routes.length > 0
    ) {
      const route = response.data.routes[0];
      const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      const durationMinutes = Math.max(1, Math.round(route.duration / 60));

      return {
        distanceKm,
        durationMinutes,
        source: 'OSRM',
        geojson: route.geometry,
      };
    }
  } catch (err) {
    // Graceful fallback on network timeout, OSRM rate-limit, or connection refusal
  }

  return getFallbackRoute(originCoords, destCoords);
};

const getFallbackRoute = (originCoords, destCoords) => {
  const straightLine = calculateDistanceKm(originCoords, destCoords);
  // Urban road factor ~ 1.3x straight-line
  const distanceKm = Math.round(straightLine * 1.3 * 10) / 10;
  // Average urban vehicle speed 30 km/h
  const durationMinutes = Math.max(2, Math.round((distanceKm / 30) * 60));

  return {
    distanceKm,
    durationMinutes,
    source: 'FALLBACK',
    geojson: {
      type: 'LineString',
      coordinates: [originCoords, destCoords],
    },
  };
};

module.exports = {
  calculateRouteAndEta,
  getFallbackRoute,
};
