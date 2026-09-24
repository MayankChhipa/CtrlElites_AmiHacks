const axios = require('axios');

const {
  calculateDistanceKm,
} = require('../utils/geoUtils');

const isValidCoordinates = (coordinates) => {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2
  ) {
    return false;
  }

  const [longitude, latitude] = coordinates;

  return (
    typeof longitude === 'number' &&
    typeof latitude === 'number' &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
};

/**
 * Calculates road routing and ETA between two coordinates.
 *
 * Coordinates use GeoJSON order:
 * [longitude, latitude]
 *
 * Uses OSRM when available and falls back to a
 * straight-line distance adjusted by an urban road factor.
 *
 * @param {Array<number>} originCoords
 * @param {Array<number>} destCoords
 * @returns {Promise<Object>}
 * {
 *   distanceKm,
 *   durationMinutes,
 *   source,
 *   geojson
 * }
 */
const calculateRouteAndEta = async (
  originCoords,
  destCoords
) => {
  /*
   * Do not silently replace invalid coordinates with a
   * hardcoded location.
   */
  if (
    !isValidCoordinates(originCoords) ||
    !isValidCoordinates(destCoords)
  ) {
    throw new Error(
      'Valid origin and destination coordinates are required.'
    );
  }

  const [
    originLongitude,
    originLatitude,
  ] = originCoords;

  const [
    destinationLongitude,
    destinationLatitude,
  ] = destCoords;

  const osrmBaseUrl =
    process.env.OSRM_URL ||
    'https://router.project-osrm.org';

  const normalizedBaseUrl =
    osrmBaseUrl.replace(/\/+$/, '');

  try {
    const url =
      `${normalizedBaseUrl}/route/v1/driving/` +
      `${originLongitude},${originLatitude};` +
      `${destinationLongitude},${destinationLatitude}` +
      '?overview=full&geometries=geojson';

    const response = await axios.get(url, {
      timeout: 2500,
      headers: {
        Accept: 'application/json',
      },
    });

    if (
      response.data?.code === 'Ok' &&
      Array.isArray(response.data.routes) &&
      response.data.routes.length > 0
    ) {
      const route =
        response.data.routes[0];

      const rawDistanceKm =
        Number(route.distance) / 1000;

      const rawDurationMinutes =
        Number(route.duration) / 60;

      if (
        Number.isFinite(rawDistanceKm) &&
        rawDistanceKm >= 0 &&
        Number.isFinite(rawDurationMinutes) &&
        rawDurationMinutes >= 0
      ) {
        const distanceKm =
          Math.round(
            rawDistanceKm * 10
          ) / 10;

        const durationMinutes =
          Math.max(
            1,
            Math.round(
              rawDurationMinutes
            )
          );

        return {
          distanceKm,
          durationMinutes,
          source: 'OSRM',
          geojson:
            route.geometry || null,
        };
      }
    }

    /*
     * OSRM responded but did not provide a usable route.
     * Use the deterministic fallback.
     */
    console.warn(
      '[RoutingService] OSRM returned no usable route. Using fallback.'
    );
  } catch (error) {
    /*
     * Routing is an enhancement. A temporary OSRM outage,
     * timeout, or rate limit should not break the delivery
     * workflow.
     */
    console.warn(
      `[RoutingService] OSRM unavailable: ${error.message}. Using fallback.`
    );
  }

  return getFallbackRoute(
    originCoords,
    destCoords
  );
};

/**
 * Calculates an approximate route when road-routing data
 * is unavailable.
 *
 * This is NOT a real road route. It is an estimate based on
 * straight-line distance multiplied by an urban road factor.
 */
const getFallbackRoute = (
  originCoords,
  destCoords
) => {
  if (
    !isValidCoordinates(originCoords) ||
    !isValidCoordinates(destCoords)
  ) {
    throw new Error(
      'Valid origin and destination coordinates are required.'
    );
  }

  const straightLine =
    calculateDistanceKm(
      originCoords,
      destCoords
    );

  if (
    !Number.isFinite(straightLine) ||
    straightLine < 0
  ) {
    throw new Error(
      'Unable to calculate distance between the provided coordinates.'
    );
  }

  /*
   * Approximate urban road-network factor.
   *
   * This is only an estimate and should not be treated
   * as an actual mapped road distance.
   */
  const ROAD_DISTANCE_FACTOR = 1.3;

  const distanceKm =
    Math.round(
      straightLine *
        ROAD_DISTANCE_FACTOR *
        10
    ) / 10;

  /*
   * Approximate average urban driving speed.
   */
  const AVERAGE_URBAN_SPEED_KMH = 30;

  const durationMinutes =
    Math.max(
      2,
      Math.round(
        (distanceKm /
          AVERAGE_URBAN_SPEED_KMH) *
          60
      )
    );

  return {
    distanceKm,
    durationMinutes,
    source: 'FALLBACK',
    geojson: {
      type: 'LineString',
      coordinates: [
        originCoords,
        destCoords,
      ],
    },
  };
};

module.exports = {
  calculateRouteAndEta,
  getFallbackRoute,
  isValidCoordinates,
};