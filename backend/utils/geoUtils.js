// Calculate distance in kilometers between two [longitude, latitude] coordinates
const isValidCoordinates = (coordinates) => {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2
  ) {
    return false;
  }

  const [
    longitude,
    latitude,
  ] = coordinates;

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
 * Calculates the great-circle distance between two
 * GeoJSON coordinates using the Haversine formula.
 *
 * Coordinates must be:
 * [longitude, latitude]
 *
 * @param {Array<number>} coord1
 * @param {Array<number>} coord2
 * @returns {number} Distance in kilometers
 */
const calculateDistanceKm = (
  coord1,
  coord2
) => {
  if (
    !isValidCoordinates(coord1) ||
    !isValidCoordinates(coord2)
  ) {
    throw new Error(
      'Valid coordinates are required to calculate distance.'
    );
  }

  const [
    lon1,
    lat1,
  ] = coord1;

  const [
    lon2,
    lat2,
  ] = coord2;

  const EARTH_RADIUS_KM = 6371;

  const lat1Radians =
    (lat1 * Math.PI) / 180;

  const lat2Radians =
    (lat2 * Math.PI) / 180;

  const deltaLatitude =
    ((lat2 - lat1) * Math.PI) / 180;

  const deltaLongitude =
    ((lon2 - lon1) * Math.PI) / 180;

  const sinLat =
    Math.sin(deltaLatitude / 2);

  const sinLon =
    Math.sin(deltaLongitude / 2);

  const a =
    sinLat * sinLat +
    Math.cos(lat1Radians) *
      Math.cos(lat2Radians) *
      sinLon *
      sinLon;

  /*
   * Floating-point calculations can occasionally
   * produce a value marginally outside [0, 1].
   */
  const clampedA = Math.min(
    1,
    Math.max(0, a)
  );

  const c =
    2 *
    Math.atan2(
      Math.sqrt(clampedA),
      Math.sqrt(1 - clampedA)
    );

  return Math.round(
    EARTH_RADIUS_KM *
      c *
      10
  ) / 10;
};

module.exports = {
  isValidCoordinates,
  calculateDistanceKm,
};