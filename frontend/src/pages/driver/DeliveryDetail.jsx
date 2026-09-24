import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Truck,
  MapPin,
  Building2,
  Clock,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Check,
  ShieldAlert,
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import DeliveryMap from '../../components/DeliveryMap';

const DeliveryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // OTP inputs
  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [deliveryOtpInput, setDeliveryOtpInput] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchDelivery = async () => {
    try {
      const res = await api.get(`/deliveries/${id}`);
      if (res.data.success) {
        setDelivery(res.data.delivery);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelivery();

    const socket = getSocket();
    if (socket) {
      const donationId = delivery?.donationId?._id || delivery?.donationId;
      if (donationId) {
        socket.emit('join_donation', donationId);
      }

      const handleUpdate = () => {
        fetchDelivery();
      };

      socket.on('pickup_confirmed', handleUpdate);
      socket.on('delivery_completed', handleUpdate);
      socket.on('delivery_verified', handleUpdate);

      return () => {
        if (donationId) {
          socket.emit('leave_donation', donationId);
        }
        socket.off('pickup_confirmed', handleUpdate);
        socket.off('delivery_completed', handleUpdate);
        socket.off('delivery_verified', handleUpdate);
      };
    }
  }, [id, delivery?.donationId]);

  const handleAction = async (endpoint, payload = {}) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post(`/deliveries/${id}/${endpoint}`, payload);
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Status updated successfully');
        fetchDelivery();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDelivery = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.post(`/deliveries/${id}/cancel`, { reason: cancelReason });
      if (res.data.success) {
        setShowCancelModal(false);
        navigate('/driver');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel delivery');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span>Loading delivery route...</span>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Delivery Not Found</h2>
        <p className="text-slate-400 text-sm">{error}</p>
        <Link to="/driver" className="inline-block px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-sm font-semibold">
          Back to Dispatch
        </Link>
      </div>
    );
  }

  const d = delivery.donationId;
  const status = delivery.status;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link to="/driver" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Fleet Dispatch</span>
        </Link>

        <span className="text-xs font-bold px-3 py-1 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/40">
          Status: {status.replace(/_/g, ' ')}
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Delivery Mission Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Truck className="w-4 h-4" />
              <span>Active Rescue Transport</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{d?.title || 'Surplus Food Cargo'}</h1>
            <p className="text-slate-400 text-sm mt-1">{d?.description || 'Deliver safely to recipient shelter'}</p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Rescue Cargo</span>
            <span className="text-2xl font-black text-amber-400">
              {d?.quantity?.estimatedServings || 0} Meals ({d?.quantity?.estimatedWeightKg || 0} kg)
            </span>
          </div>
        </div>

        {/* Route Summary Metrics */}
        {delivery.routeSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase font-semibold text-[10px]">Estimated Distance</span>
              <span className="text-base font-bold text-white">{delivery.routeSummary.distanceKm} km</span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase font-semibold text-[10px]">Transit Duration</span>
              <span className="text-base font-bold text-white">~{delivery.routeSummary.durationMinutes} mins</span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-500 block uppercase font-semibold text-[10px]">Route Engine</span>
              <span className="text-base font-bold text-emerald-400">{delivery.routeSummary.source || 'Standard'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Map & Location Points */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Navigation className="w-4 h-4 text-amber-400" />
              <span>Transit Map View</span>
            </h3>
            <DeliveryMap
              pickupCoords={delivery.pickupCoords}
              dropoffCoords={delivery.dropoffCoords}
              driverCoords={delivery.currentLocation?.coordinates}
              routeGeojson={delivery.routeSummary?.geojson}
              height="340px"
            />
          </div>

          {/* Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                <span>Pickup Origin (Donor)</span>
              </div>
              <h4 className="text-sm font-bold text-white">{d?.donorId?.name}</h4>
              <p className="text-xs text-slate-300">{d?.pickupLocation?.address}</p>
              <div className="text-xs font-mono text-emerald-400 pt-1">
                Phone: {d?.pickupLocation?.contactPhone || d?.donorId?.phone}
              </div>
              {d?.pickupLocation?.instructions && (
                <div className="text-[11px] text-slate-400 italic bg-slate-900/50 p-2 rounded-lg mt-1">
                  Note: {d.pickupLocation.instructions}
                </div>
              )}
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                <span>Dropoff Destination (Shelter)</span>
              </div>
              <h4 className="text-sm font-bold text-white">{d?.matchedNgoId?.name}</h4>
              <p className="text-xs text-slate-300">{d?.matchedNgoId?.address?.formattedAddress || 'Shelter Address'}</p>
              <div className="text-xs font-mono text-purple-400 pt-1">
                Phone: {d?.matchedNgoId?.phone}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Mission Execution Controls & Handshake OTP Prompts */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-amber-500/40 bg-slate-900/90 space-y-5 shadow-2xl">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Mission Controls</span>
            </h3>

            {/* Step 1: Assigned */}
            {status === 'ASSIGNED' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  You have claimed this delivery. Start your navigation to the donor location to collect the surplus food.
                </p>
                <button
                  onClick={() => handleAction('en-route-pickup')}
                  disabled={actionLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Start Route to Pickup</span>
                </button>
              </div>
            )}

            {/* Step 2: En Route to Pickup */}
            {status === 'EN_ROUTE_TO_PICKUP' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Head to the pickup address. Tap below when you have arrived outside the kitchen.
                </p>
                <button
                  onClick={() => handleAction('arrived-pickup')}
                  disabled={actionLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Arrived at Pickup Location</span>
                </button>
              </div>
            )}

            {/* Step 3: Arrived at Pickup -> Requires Donor Pickup OTP */}
            {status === 'ARRIVED_AT_PICKUP' && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                    <KeyRound className="w-4 h-4" />
                    <span>Donor Pickup Verification</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Ask the donor staff for their 4-digit Pickup OTP before taking the food containers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Enter Donor Pickup OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pickupOtpInput}
                    onChange={(e) => setPickupOtpInput(e.target.value)}
                    placeholder="e.g. 4821"
                    className="w-full text-center font-mono text-xl font-bold py-2.5 rounded-xl glass-input tracking-widest"
                  />
                </div>

                <button
                  onClick={() => handleAction('pickup', { otp: pickupOtpInput })}
                  disabled={actionLoading || !pickupOtpInput.trim()}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Verify OTP & Confirm Pickup</span>
                </button>
              </div>
            )}

            {/* Step 4: Picked Up -> Head to Shelter */}
            {status === 'PICKED_UP' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Food is secured in your vehicle. Start route to the recipient shelter dropoff point.
                </p>
                <button
                  onClick={() => handleAction('en-route-delivery')}
                  disabled={actionLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Start Route to Shelter Dropoff</span>
                </button>
              </div>
            )}

            {/* Step 5: En Route to Delivery */}
            {status === 'EN_ROUTE_TO_DELIVERY' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  In transit to the community shelter. Tap below once you pull up at the shelter.
                </p>
                <button
                  onClick={() => handleAction('arrived-dropoff')}
                  disabled={actionLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Arrived at Shelter Dropoff</span>
                </button>
              </div>
            )}

            {/* Step 6: Arrived at Dropoff -> Requires Shelter Delivery OTP */}
            {status === 'ARRIVED_AT_DROPOFF' && (
              <div className="space-y-3">
                <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold">
                    <KeyRound className="w-4 h-4" />
                    <span>Shelter Delivery Verification</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Hand over the food to shelter staff and ask them for their 4-digit Delivery OTP.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Enter Shelter Delivery OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={deliveryOtpInput}
                    onChange={(e) => setDeliveryOtpInput(e.target.value)}
                    placeholder="e.g. 7392"
                    className="w-full text-center font-mono text-xl font-bold py-2.5 rounded-xl glass-input tracking-widest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Courier Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Delivered to kitchen manager"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>

                <button
                  onClick={() => handleAction('deliver', { otp: deliveryOtpInput, notes: deliveryNotes })}
                  disabled={actionLoading || !deliveryOtpInput.trim()}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Verify OTP & Complete Delivery</span>
                </button>
              </div>
            )}

            {/* Completed */}
            {['DELIVERED', 'VERIFIED'].includes(status) && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Mission Accomplished!</h4>
                <p className="text-xs text-slate-300">
                  You have successfully rescued and delivered this surplus food. Great job!
                </p>
                <Link
                  to="/driver"
                  className="inline-block mt-2 py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors"
                >
                  Return to Dispatch
                </Link>
              </div>
            )}
            {/* Cancel Delivery Option (when active) */}
            {!['DELIVERED', 'VERIFIED', 'CANCELLED'].includes(status) && (
              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-2.5 px-3 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel Delivery Transport
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/40 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-white">Cancel Rescue Delivery</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to cancel? The donation will be returned to the dispatch board for another driver to rescue.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Reason for cancellation
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Vehicle breakdown / Flat tire"
                className="w-full px-3 py-2 rounded-xl glass-input text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="py-2.5 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelDelivery}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDetail;
