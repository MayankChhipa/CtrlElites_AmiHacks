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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Administration Overview</span>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Active Fleet Monitoring</h1>
        <p className="text-slate-400 text-sm mt-1">
          Real-time visibility into all active delivery missions across the city.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading active deliveries...</div>
      ) : deliveries.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800 space-y-3">
          <Truck className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-300">No deliveries currently in transit</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            When drivers claim matched food donations, they will appear here with live tracking telemetry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliveries.map((del) => (
            <div
              key={del._id}
              className="glass-panel rounded-3xl p-6 border border-slate-700/80 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {del.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    {del.routeSummary?.distanceKm ? `${del.routeSummary.distanceKm} km` : 'Active'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-white">{del.donationId?.title || 'Surplus Food'}</h3>
                  <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                    Courier: {del.driverId?.name || 'Assigned Driver'}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Pickup</span>
                      <span className="text-white font-medium">{del.donorId?.name}</span>
                      <span className="text-slate-400 block truncate text-[11px]">{del.donorId?.address?.formattedAddress || 'Origin'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-1 border-t border-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Dropoff</span>
                      <span className="text-white font-medium">{del.ngoId?.name}</span>
                      <span className="text-slate-400 block truncate text-[11px]">{del.ngoId?.address?.formattedAddress || 'Shelter'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
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
