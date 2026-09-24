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

// Custom warm-themed HTML marker icons
const createCustomIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border-radius: 50%;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(124, 45, 18, 0.25);
        border: 2px solid #FFFDF6;
      ">
        ${label}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
};

const donorIcon = createCustomIcon('#059669', '🍲');
const ngoIcon = createCustomIcon('#7c2d12', '🏢');
const driverIcon = createCustomIcon('#ea580c', '🚚');

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
    <div className="w-full rounded-3xl overflow-hidden border border-orange-200/80 shadow-lg shadow-orange-900/5 bg-[#FFFDF6]" style={{ height }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', backgroundColor: '#fffdf6' }}
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
              <div className="text-stone-800 font-sans p-0.5">
                <strong className="block text-emerald-800 font-black text-xs">Pickup Location (Donor)</strong>
                <span className="text-[11px] text-stone-600 font-medium">Prepared meals ready for transport</span>
              </div>
            </Popup>
          </Marker>
        )}

        {dropoffLatLng && (
          <Marker position={dropoffLatLng} icon={ngoIcon}>
            <Popup>
              <div className="text-stone-800 font-sans p-0.5">
                <strong className="block text-red-950 font-black text-xs">Dropoff Location (Shelter)</strong>
                <span className="text-[11px] text-stone-600 font-medium">Community kitchen destination</span>
              </div>
            </Popup>
          </Marker>
        )}

        {driverLatLng && (
          <Marker position={driverLatLng} icon={driverIcon}>
            <Popup>
              <div className="text-stone-800 font-sans p-0.5">
                <strong className="block text-orange-700 font-black text-xs">Courier Driver</strong>
                <span className="text-[11px] text-stone-600 font-medium">Active rescue delivery vehicle</span>
              </div>
            </Popup>
          </Marker>
        )}

        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#ea580c',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.85,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;