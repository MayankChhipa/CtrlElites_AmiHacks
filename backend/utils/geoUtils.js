// Calculate distance in kilometers between two [longitude, latitude] coordinates
const calculateDistanceKm = (coord1, coord2) => {
  if (
    !Array.isArray(coord1) ||
    coord1.length < 2 ||
    !Array.isArray(coord2) ||
    coord2.length < 2 ||
    isNaN(Number(coord1[0])) ||
    isNaN(Number(coord1[1])) ||
    isNaN(Number(coord2[0])) ||
    isNaN(Number(coord2[1]))
  ) {
    return 2.5;
  }
  const lon1 = Number(coord1[0]);
  const lat1 = Number(coord1[1]);
  const lon2 = Number(coord2[0]);
  const lat2 = Number(coord2[1]);

  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

module.exports = { calculateDistanceKm };
