import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default Leaflet icon paths in Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored HTML marker icons
const createCustomIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 13px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        border: 2px solid white;
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

const donorIcon = createCustomIcon('#10b981', '🍲');
const ngoIcon = createCustomIcon('#a855f7', '🏢');
const driverIcon = createCustomIcon('#3b82f6', '🚚');

// Helper component to auto-fit map view to route and markers
const MapBoundsUpdater = ({ pickupLatLng, dropoffLatLng, driverLatLng, polylinePositions }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const points = [];
    if (pickupLatLng) points.push(pickupLatLng);
    if (dropoffLatLng) points.push(dropoffLatLng);
    if (driverLatLng) points.push(driverLatLng);
    if (polylinePositions && polylinePositions.length > 0) {
      polylinePositions.forEach((p) => points.push(p));
    }

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [pickupLatLng, dropoffLatLng, driverLatLng, polylinePositions, map]);

  return null;
};

const DeliveryMap = ({
  pickupCoords, // [lon, lat]
  dropoffCoords, // [lon, lat]
  driverCoords, // [lon, lat]
  routeGeojson,
  height = '360px',
}) => {
  // Convert [lon, lat] to Leaflet's [lat, lon]
  const pickupLatLng = pickupCoords && pickupCoords.length === 2 ? [pickupCoords[1], pickupCoords[0]] : null;
  const dropoffLatLng = dropoffCoords && dropoffCoords.length === 2 ? [dropoffCoords[1], dropoffCoords[0]] : null;
  const driverLatLng = driverCoords && driverCoords.length === 2 ? [driverCoords[1], driverCoords[0]] : null;

  const center = pickupLatLng || dropoffLatLng || [28.6139, 77.209];

  // Route positions for polyline
  let polylinePositions = [];
  if (routeGeojson && routeGeojson.coordinates) {
    polylinePositions = routeGeojson.coordinates.map((c) => [c[1], c[0]]);
  } else if (pickupLatLng && dropoffLatLng) {
    polylinePositions = [pickupLatLng, dropoffLatLng];
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-xl" style={{ height }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater
          pickupLatLng={pickupLatLng}
          dropoffLatLng={dropoffLatLng}
          driverLatLng={driverLatLng}
          polylinePositions={polylinePositions}
        />

        {pickupLatLng && (
          <Marker position={pickupLatLng} icon={donorIcon}>
            <Popup>
              <div className="text-slate-900 font-sans">
                <strong className="block text-emerald-700">Pickup Location (Donor)</strong>
                <span className="text-xs">Prepared meals ready for transport</span>
              </div>
            </Popup>
          </Marker>
        )}

        {dropoffLatLng && (
          <Marker position={dropoffLatLng} icon={ngoIcon}>
            <Popup>
              <div className="text-slate-900 font-sans">
                <strong className="block text-purple-700">Dropoff Location (Shelter)</strong>
                <span className="text-xs">Community kitchen destination</span>
              </div>
            </Popup>
          </Marker>
        )}

        {driverLatLng && (
          <Marker position={driverLatLng} icon={driverIcon}>
            <Popup>
              <div className="text-slate-900 font-sans">
                <strong className="block text-blue-700">Driver Courier</strong>
                <span className="text-xs">Active rescue delivery vehicle</span>
              </div>
            </Popup>
          </Marker>
        )}

        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#10b981',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.8,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;
