import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

const DriverDashboard = () => {
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [availRes, activeRes] = await Promise.all([
        api.get('/deliveries/available'),
        api.get('/deliveries/my-active'),
      ]);

      if (availRes.data.success) {
        setAvailableDeliveries(availRes.data.available || []);
      }
      if (activeRes.data.success) {
        setActiveDeliveries(activeRes.data.deliveries || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load driver dispatch board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    if (socket) {
      const handleRefresh = () => {
        fetchData();
      };

      socket.on('delivery_available', handleRefresh);
      socket.on('match_accepted', handleRefresh);
      socket.on('delivery_completed', handleRefresh);

      return () => {
        socket.off('delivery_available', handleRefresh);
        socket.off('match_accepted', handleRefresh);
        socket.off('delivery_completed', handleRefresh);
      };
    }
  }, []);

  const handleClaim = async (donationId) => {
    setClaimingId(donationId);
    setError('');
    try {
      const res = await api.post(`/deliveries/${donationId}/claim`);
      if (res.data.success) {
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to claim delivery');
    } finally {
      setClaimingId(null);
    }
  };

  const hasActiveDelivery = activeDeliveries.length > 0;

  const getStatusBadge = (status) => {
    const map = {
      ASSIGNED: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      EN_ROUTE_TO_PICKUP: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      ARRIVED_AT_PICKUP: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      PICKED_UP: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      EN_ROUTE_TO_DELIVERY: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      ARRIVED_AT_DROPOFF: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      DELIVERED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
    return map[status] || 'bg-slate-700 text-slate-300';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Rescue Fleet Dispatch</h1>
        <p className="text-slate-400 text-sm mt-1">
          Claim matched food transports, execute pickups and deliveries with dual OTP verification.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Delivery Alert Banner (if courier is currently on a mission) */}
      {hasActiveDelivery && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/40 bg-amber-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-amber-400">
              <Truck className="w-6 h-6 animate-pulse" />
              <h2 className="text-lg font-bold text-white">Active Rescue Mission in Progress</h2>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadge(activeDeliveries[0].status)}`}>
              {activeDeliveries[0].status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
            <div>
              <span className="text-slate-500 block uppercase font-semibold text-[10px]">Food Cargo</span>
              <span className="font-bold text-white text-sm">
                {activeDeliveries[0].donationId?.title || 'Surplus Meals'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-semibold text-[10px]">Pickup Origin</span>
              <span className="font-medium text-slate-200 truncate block">
                {activeDeliveries[0].donationId?.donorId?.name} ({activeDeliveries[0].donationId?.pickupLocation?.address || 'Origin'})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-semibold text-[10px]">Shelter Destination</span>
              <span className="font-medium text-slate-200 truncate block">
                {activeDeliveries[0].donationId?.matchedNgoId?.name || 'Shelter'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to={`/driver/deliveries/${activeDeliveries[0]._id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <span>Continue Delivery Mission</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Available Deliveries Board */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Available Delivery Requests</span>
            <span className="text-xs bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
              {availableDeliveries.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading delivery requests...</div>
        ) : availableDeliveries.length === 0 ? (
          <div className="glass-panel p-10 rounded-2xl text-center border border-slate-800 space-y-2">
            <Truck className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No available deliveries right now</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              When an NGO accepts a surplus food proposal, it will appear here instantly for pickup dispatch.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableDeliveries.map((d) => (
              <div
                key={d._id}
                className="glass-panel rounded-3xl p-6 border border-slate-700/80 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      Matched & Ready
                    </span>
                    {d.urgency && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {d.urgency}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white">{d.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{d.description || 'Surplus rescue cargo'}</p>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Pickup Origin</span>
                        <span className="font-semibold text-white">{d.donorId?.name}</span>
                        <span className="text-[11px] text-slate-400 block truncate">{d.pickupLocation?.address}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-slate-300 pt-1 border-t border-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Dropoff Shelter</span>
                        <span className="font-semibold text-white">{d.matchedNgoId?.name}</span>
                        <span className="text-[11px] text-slate-400 block truncate">{d.matchedNgoId?.address?.formattedAddress || 'Shelter'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Servings</span>
                      <span className="font-bold text-white">{d.quantity?.estimatedServings} Meals</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Weight</span>
                      <span className="font-bold text-white">{d.quantity?.estimatedWeightKg} kg</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleClaim(d._id)}
                  disabled={hasActiveDelivery || claimingId === d._id}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claimingId === d._id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : hasActiveDelivery ? (
                    <span>Finish Active Delivery First</span>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>Claim Transport</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
