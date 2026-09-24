import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, ArrowLeft, MapPin, Building2, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const AdminDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDeliveries = async () => {
    try {
      const res = await api.get('/admin/deliveries/active');
      if (res.data.success) {
        setDeliveries(res.data.deliveries || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load active fleet deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF3C7] text-[#5A1A12] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-[#8A5A4A] hover:text-[#5A1A12] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Administration Overview</span>
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#D92D20] text-[#FFF8E7] flex items-center justify-center font-black text-lg shadow-lg shadow-[#D92D20]/25 flex-shrink-0">
          FR
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#5A1A12]">Active Fleet Monitoring</h1>
        <p className="text-[#8A5A4A] text-sm mt-1">
          Real-time visibility into all active delivery missions across the city.
        </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#FFF0EB] border border-[#E8A08A] text-[#C62828] text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-[#FFF8E7] shadow-[0_12px_32px_rgba(183,96,42,0.12)] p-12 rounded-3xl text-center text-[#8A5A4A] border border-[#E8C98B]">Loading active deliveries...</div>
      ) : deliveries.length === 0 ? (
        <div className="bg-[#FFF8E7] shadow-[0_12px_32px_rgba(183,96,42,0.12)] p-12 rounded-3xl text-center border border-[#E8C98B] space-y-3">
          <Truck className="w-12 h-12 text-[#B9795E] mx-auto" />
          <h3 className="text-lg font-bold text-[#6B3A2A]">No deliveries currently in transit</h3>
          <p className="text-[#8A5A4A] text-sm max-w-sm mx-auto">
            When drivers claim matched food donations, they will appear here with live tracking telemetry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliveries.map((del) => (
            <div
              key={del._id}
              className="bg-[#FFF8E7] shadow-[0_12px_32px_rgba(183,96,42,0.12)] rounded-3xl p-6 border border-[#E8C98B] space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FFE0B2] text-[#C2410C] border border-[#E8A05B]">
                    {del.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-[#8A5A4A]">
                    {del.routeSummary?.distanceKm ? `${del.routeSummary.distanceKm} km` : 'Active'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-[#5A1A12]">{del.donationId?.title || 'Surplus Food'}</h3>
                  <div className="text-xs font-semibold text-[#D92D20] mt-0.5">
                    Courier: {del.driverId?.name || 'Assigned Driver'}
                  </div>
                </div>

                <div className="p-3 bg-[#FFF8E7] rounded-2xl border border-[#E8C98B] space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#D92D20] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase text-[#9A6957] block">Pickup</span>
                      <span className="text-[#5A1A12] font-medium">{del.donorId?.name}</span>
                      <span className="text-[#8A5A4A] block truncate text-[11px]">{del.donorId?.address?.formattedAddress || 'Origin'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-1 border-t border-[#E8C98B]/70">
                    <Building2 className="w-3.5 h-3.5 text-[#B23A48] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase text-[#9A6957] block">Dropoff</span>
                      <span className="text-[#5A1A12] font-medium">{del.ngoId?.name}</span>
                      <span className="text-[#8A5A4A] block truncate text-[11px]">{del.ngoId?.address?.formattedAddress || 'Shelter'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#8A5A4A] flex items-center justify-between pt-2 border-t border-[#E8C98B]">
                <span>Vehicle: {del.driverId?.driverProfile?.vehicleType || 'Courier'}</span>
                <span>Claimed {new Date(del.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDeliveries;
