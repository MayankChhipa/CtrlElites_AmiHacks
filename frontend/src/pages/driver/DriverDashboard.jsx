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
  const [finishingDeliveryId, setFinishingDeliveryId] = useState(null);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleFinishDelivery = async (deliveryId) => {
    setFinishingDeliveryId(deliveryId);
    setError('');
    setSuccessMessage('');

    try {
      const res = await api.post(`/deliveries/${deliveryId}/deliver`, {
        otp: deliveryOtp.trim(),
        notes: deliveryNotes.trim(),
      });

      if (res.data.success) {
        setDeliveryOtp('');
        setDeliveryNotes('');
        setSuccessMessage('Delivery completed. The shelter can now verify receipt.');
        await fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to finish delivery');
    } finally {
      setFinishingDeliveryId(null);
    }
  };

  const hasActiveDelivery = activeDeliveries.length > 0;

  const getStatusBadge = (status) => {
    const map = {
      ASSIGNED: 'bg-indigo-100 text-indigo-950 border-indigo-200',
      EN_ROUTE_TO_PICKUP: 'bg-blue-100 text-blue-950 border-blue-200',
      ARRIVED_AT_PICKUP: 'bg-amber-100 text-amber-950 border-amber-200',
      PICKED_UP: 'bg-cyan-100 text-cyan-950 border-cyan-200',
      EN_ROUTE_TO_DELIVERY: 'bg-teal-100 text-teal-950 border-teal-200',
      ARRIVED_AT_DROPOFF: 'bg-purple-100 text-purple-950 border-purple-200',
      DELIVERED: 'bg-emerald-100 text-emerald-950 border-emerald-200',
    };
    return map[status] || 'bg-stone-100 text-stone-800 border-stone-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 text-stone-800 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Monogram Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-red-950 tracking-tight">Rescue Fleet Dispatch</h1>
            <p className="text-stone-600 text-sm font-medium mt-1">
              Claim matched food transports, execute pickups and deliveries with dual OTP verification.
            </p>
          </div>

          {/* FR Monogram Branding Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FFFDF6] px-4 py-1.5 rounded-full shadow-md shadow-orange-900/5 border border-orange-200/60 self-start sm:self-auto">
            <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-xs tracking-tighter shadow-inner">
              FR
            </div>
            <span className="text-xs font-black tracking-wider text-red-900 uppercase">
              Fleet Logistics
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-100 border border-red-300 flex items-center gap-3 text-red-900 font-bold text-sm shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center gap-3 text-emerald-900 font-bold text-sm shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Active Delivery Alert Banner (if courier is currently on a mission) */}
        {hasActiveDelivery && (
          <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl border-2 border-orange-300 shadow-xl shadow-orange-900/5 space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-red-600">
                  <Truck className="w-5 h-5 animate-pulse stroke-[2.5]" />
                </div>
                <h2 className="text-xl font-black text-red-950">Active Rescue Mission in Progress</h2>
              </div>
              <span className={`text-xs font-black px-3.5 py-1 rounded-full border uppercase shadow-sm ${getStatusBadge(activeDeliveries[0].status)}`}>
                {activeDeliveries[0].status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-600 relative z-10 pt-2">
              <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-100">
                <span className="text-stone-500 block uppercase font-black text-[10px]">Food Cargo</span>
                <span className="font-black text-red-950 text-sm block truncate">
                  {activeDeliveries[0].donationId?.title || 'Surplus Meals'}
                </span>
              </div>
              <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-100">
                <span className="text-stone-500 block uppercase font-black text-[10px]">Pickup Origin</span>
                <span className="font-bold text-stone-800 truncate block">
                  {activeDeliveries[0].donationId?.donorId?.name} ({activeDeliveries[0].donationId?.pickupLocation?.address || 'Origin'})
                </span>
              </div>
              <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-100">
                <span className="text-stone-500 block uppercase font-black text-[10px]">Shelter Destination</span>
                <span className="font-bold text-stone-800 truncate block">
                  {activeDeliveries[0].donationId?.matchedNgoId?.name || 'Shelter'}
                </span>
              </div>
            </div>

            <div className="pt-2 relative z-10">
              <Link
                to={`/driver/deliveries/${activeDeliveries[0]._id}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-full shadow-lg shadow-red-600/20 active:scale-95 transition-all"
              >
                <span>Continue Delivery Mission</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </Link>
            </div>

            {activeDeliveries[0].status === 'ARRIVED_AT_DROPOFF' && (
              <div className="relative z-10 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                <div>
                  <h3 className="text-sm font-black text-emerald-950">Finish Delivery</h3>
                  <p className="mt-1 text-xs font-medium text-stone-600">
                    Hand the food to shelter staff and enter their delivery OTP to complete the handoff.
                  </p>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-stone-600">
                    Shelter Delivery OTP
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={deliveryOtp}
                    onChange={(event) => setDeliveryOtp(event.target.value)}
                    placeholder="Enter OTP from shelter staff"
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-emerald-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(event) => setDeliveryNotes(event.target.value)}
                  placeholder="Delivery note (optional)"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs text-stone-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
                <button
                  type="button"
                  onClick={() => handleFinishDelivery(activeDeliveries[0]._id)}
                  disabled={
                    finishingDeliveryId === activeDeliveries[0]._id ||
                    !deliveryOtp.trim()
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-xs font-black text-white shadow-md transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {finishingDeliveryId === activeDeliveries[0]._id
                      ? 'Finishing Delivery...'
                      : 'Finish Delivery'}
                  </span>
                </button>
              </div>
            )}

            {/* Background Ambient Glow */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-orange-200/40 rounded-full blur-2xl pointer-events-none" />
          </div>
        )}

        {/* Available Deliveries Board */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-red-950 flex items-center gap-2.5">
              <span>Available Delivery Requests</span>
              <span className="text-xs bg-orange-100 text-orange-950 font-black px-2.5 py-0.5 rounded-full border border-orange-200">
                {availableDeliveries.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="bg-[#FFFDF6] p-12 rounded-3xl shadow-xl shadow-orange-900/5 text-center text-stone-600 font-bold border border-orange-100">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <span>Loading delivery requests...</span>
            </div>
          ) : availableDeliveries.length === 0 ? (
            <div className="bg-[#FFFDF6] p-10 rounded-3xl text-center border border-orange-100 shadow-xl shadow-orange-900/5 space-y-2">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto mb-2">
                <Truck className="w-7 h-7 stroke-[2]" />
              </div>
              <h3 className="text-base font-black text-red-950">No available deliveries right now</h3>
              <p className="text-stone-600 text-xs font-medium max-w-sm mx-auto">
                When an NGO accepts a surplus food proposal, it will appear here instantly for pickup dispatch.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableDeliveries.map((d) => (
                <div
                  key={d._id}
                  className="bg-[#FFFDF6] rounded-3xl p-6 border border-orange-100 shadow-xl shadow-orange-900/5 hover:shadow-2xl hover:border-orange-300 transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                        Matched & Ready
                      </span>
                      {d.urgency && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                          {d.urgency}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-black text-base text-red-950">{d.title}</h3>
                      <p className="text-xs font-medium text-stone-600 mt-1 line-clamp-1">{d.description || 'Surplus rescue cargo'}</p>
                    </div>

                    <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-100 space-y-2.5 text-xs">
                      <div className="flex items-start gap-2.5 text-stone-700">
                        <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 stroke-[2.5]" />
                        <div>
                          <span className="text-[10px] uppercase font-black text-stone-400 block">Pickup Origin</span>
                          <span className="font-black text-red-950">{d.donorId?.name}</span>
                          <span className="text-[11px] font-medium text-stone-600 block truncate">{d.pickupLocation?.address}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-stone-700 pt-2 border-t border-orange-100">
                        <Building2 className="w-4 h-4 text-orange-700 shrink-0 mt-0.5 stroke-[2.5]" />
                        <div>
                          <span className="text-[10px] uppercase font-black text-stone-400 block">Dropoff Shelter</span>
                          <span className="font-black text-red-950">{d.matchedNgoId?.name}</span>
                          <span className="text-[11px] font-medium text-stone-600 block truncate">{d.matchedNgoId?.address?.formattedAddress || 'Shelter'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
                      <div className="p-2.5 bg-orange-50/40 rounded-xl border border-orange-100">
                        <span className="text-[10px] uppercase font-black text-stone-400 block">Servings</span>
                        <span className="font-black text-red-950 text-sm">{d.quantity?.estimatedServings} Meals</span>
                      </div>
                      <div className="p-2.5 bg-orange-50/40 rounded-xl border border-orange-100">
                        <span className="text-[10px] uppercase font-black text-stone-400 block">Weight</span>
                        <span className="font-black text-red-950 text-sm">{d.quantity?.estimatedWeightKg} kg</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaim(d._id)}
                    disabled={hasActiveDelivery || claimingId === d._id}
                    className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-full shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claimingId === d._id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : hasActiveDelivery ? (
                      <span>Finish Active Delivery First</span>
                    ) : (
                      <>
                        <Truck className="w-4 h-4 stroke-[2.5]" />
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
    </div>
  );
};

export default DriverDashboard;
