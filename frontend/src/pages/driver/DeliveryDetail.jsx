import React, { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
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

  const fetchDelivery = useCallback(async () => {
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
  }, [id]);

  const donationId =
    delivery?.donationId?._id ||
    delivery?.donationId ||
    null;

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !donationId) {
      return undefined;
    }

    socket.emit('join_donation', donationId);

    const handleUpdate = () => {
      fetchDelivery();
    };

    socket.on('pickup_confirmed', handleUpdate);
    socket.on('delivery_completed', handleUpdate);
    socket.on('delivery_verified', handleUpdate);

    return () => {
      socket.emit('leave_donation', donationId);
      socket.off('pickup_confirmed', handleUpdate);
      socket.off('delivery_completed', handleUpdate);
      socket.off('delivery_verified', handleUpdate);
    };
  }, [donationId, fetchDelivery]);

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
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 flex items-center justify-center p-4">
        <div className="bg-[#FFFDF6] p-8 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="text-stone-700 font-bold text-sm block">Loading delivery route...</span>
        </div>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#FFFDF6] p-8 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-2xl font-black text-red-950">Delivery Not Found</h2>
          <p className="text-stone-600 text-sm font-medium">{error}</p>
          <Link
            to="/driver"
            className="inline-block px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-black shadow-md shadow-red-600/20 active:scale-95 transition-all"
          >
            Back to Dispatch
          </Link>
        </div>
      </div>
    );
  }

  const d = delivery.donationId;
  const status = delivery.status;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 text-stone-800 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation & FR Monogram Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/driver"
            className="inline-flex items-center gap-2 text-xs font-bold text-red-700 hover:text-red-900 transition-all hover:-translate-x-1"
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
            <span>Back to Fleet Dispatch</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black px-3.5 py-1 rounded-full border border-orange-300/80 bg-orange-100 text-orange-950 shadow-sm uppercase">
              Status: {status.replace(/_/g, ' ')}
            </span>

            {/* FR Monogram Branding Badge */}
            <div className="inline-flex items-center gap-2 bg-[#FFFDF6] px-3.5 py-1 rounded-full shadow-md shadow-orange-900/5 border border-orange-200/60">
              <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-[10px] tracking-tighter shadow-inner">
                FR
              </div>
              <span className="text-[11px] font-black tracking-wider text-red-900 uppercase">
                Courier Hub
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-100 border border-red-300 flex items-center gap-3 text-red-900 font-bold text-sm shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center gap-3 text-emerald-900 font-bold text-sm shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.5]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Delivery Mission Card */}
        <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-[11px] font-black uppercase tracking-wide mb-2">
                <Truck className="w-3.5 h-3.5 text-orange-600 stroke-[2.5]" /> Active Rescue Transport
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-red-950 tracking-tight">{d?.title || 'Surplus Food Cargo'}</h1>
              <p className="text-stone-600 text-sm font-medium mt-1">{d?.description || 'Deliver safely to recipient shelter'}</p>
            </div>

            <div className="text-left sm:text-right bg-orange-50 p-4 sm:p-0 rounded-2xl sm:bg-transparent">
              <span className="text-xs font-black uppercase tracking-wider text-stone-500 block">Rescue Cargo</span>
              <span className="text-2xl sm:text-3xl font-black text-red-600">
                {d?.quantity?.estimatedServings || 0} Meals ({d?.quantity?.estimatedWeightKg || 0} kg)
              </span>
            </div>
          </div>

          {/* Route Summary Metrics */}
          {delivery.routeSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-orange-100 text-xs relative z-10">
              <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-100">
                <span className="text-stone-500 block uppercase font-black text-[10px]">Estimated Distance</span>
                <span className="text-base font-black text-red-950">{delivery.routeSummary.distanceKm} km</span>
              </div>
              <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-100">
                <span className="text-stone-500 block uppercase font-black text-[10px]">Transit Duration</span>
                <span className="text-base font-black text-red-950">~{delivery.routeSummary.durationMinutes} mins</span>
              </div>
              <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-100 col-span-2 sm:col-span-1">
                <span className="text-stone-500 block uppercase font-black text-[10px]">Route Engine</span>
                <span className="text-base font-black text-emerald-700">{delivery.routeSummary.source || 'Standard'}</span>
              </div>
            </div>
          )}

          {/* Background Ambient Glow */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-orange-200/30 rounded-full blur-2xl pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Live Map & Location Points */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-[#FFFDF6] p-5 sm:p-6 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 space-y-3">
              <h3 className="text-sm font-black text-red-950 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-700">
                  <Navigation className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span>Transit Map View</span>
              </h3>
              <div className="rounded-2xl overflow-hidden border border-orange-200/80 shadow-inner">
                <DeliveryMap
                  pickupCoords={delivery.pickupCoords}
                  dropoffCoords={delivery.dropoffCoords}
                  driverCoords={delivery.currentLocation?.coordinates}
                  routeGeojson={delivery.routeSummary?.geojson}
                  height="340px"
                />
              </div>
            </div>

            {/* Locations Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#FFFDF6] p-5 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-black uppercase tracking-wider">
                  <MapPin className="w-4 h-4 stroke-[2.5]" />
                  <span>Pickup Origin (Donor)</span>
                </div>
                <h4 className="text-sm font-black text-red-950">{d?.donorId?.name}</h4>
                <p className="text-xs font-medium text-stone-600">{d?.pickupLocation?.address}</p>
                <div className="text-xs font-mono font-bold text-emerald-700 pt-1">
                  Phone: {d?.pickupLocation?.contactPhone || d?.donorId?.phone}
                </div>
                {d?.pickupLocation?.instructions && (
                  <div className="text-[11px] font-medium text-stone-600 italic bg-orange-50 p-2.5 rounded-xl border border-orange-100 mt-2">
                    Note: {d.pickupLocation.instructions}
                  </div>
                )}
              </div>

              <div className="bg-[#FFFDF6] p-5 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 space-y-2">
                <div className="flex items-center gap-2 text-orange-800 text-xs font-black uppercase tracking-wider">
                  <Building2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Dropoff Destination (Shelter)</span>
                </div>
                <h4 className="text-sm font-black text-red-950">{d?.matchedNgoId?.name}</h4>
                <p className="text-xs font-medium text-stone-600">{d?.matchedNgoId?.address?.formattedAddress || 'Shelter Address'}</p>
                <div className="text-xs font-mono font-bold text-orange-700 pt-1">
                  Phone: {d?.matchedNgoId?.phone}
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Mission Execution Controls & Handshake OTP Prompts */}
          <div className="space-y-6">
            <div className="bg-[#FFFDF6] p-6 rounded-3xl border-2 border-orange-300 shadow-xl shadow-orange-900/5 space-y-5">
              <h3 className="font-black text-xs text-red-950 uppercase tracking-wider flex items-center gap-2 border-b border-orange-100 pb-3">
                <ShieldAlert className="w-4 h-4 text-red-600 stroke-[2.5]" />
                <span>Mission Controls</span>
              </h3>

              {/* Step 1: Assigned */}
              {status === 'ASSIGNED' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 font-medium leading-relaxed">
                    You have claimed this delivery. Start your navigation to the donor location to collect the surplus food.
                  </p>
                  <button
                    onClick={() => handleAction('en-route-pickup')}
                    disabled={actionLoading}
                    className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-full shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Navigation className="w-4 h-4 stroke-[2.5]" />
                    <span>Start Route to Pickup</span>
                  </button>
                </div>
              )}

              {/* Step 2: En Route to Pickup */}
              {status === 'EN_ROUTE_TO_PICKUP' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 font-medium leading-relaxed">
                    Head to the pickup address. Tap below when you have arrived outside the kitchen.
                  </p>
                  <button
                    onClick={() => handleAction('arrived-pickup')}
                    disabled={actionLoading}
                    className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-full shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <MapPin className="w-4 h-4 stroke-[2.5]" />
                    <span>Arrived at Pickup Location</span>
                  </button>
                </div>
              )}

              {/* Step 3: Arrived at Pickup -> Requires Donor Pickup OTP */}
              {status === 'ARRIVED_AT_PICKUP' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-amber-900 font-black">
                      <KeyRound className="w-4 h-4 text-amber-700 stroke-[2.5]" />
                      <span>Donor Pickup Verification</span>
                    </div>
                    <p className="text-[11px] text-stone-600 font-medium">
                      Ask the donor staff for their 4-digit Pickup OTP before taking the food containers.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">
                      Enter Donor Pickup OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pickupOtpInput}
                      onChange={(e) => setPickupOtpInput(e.target.value)}
                      placeholder="e.g. 4821"
                      className="w-full text-center font-mono text-xl font-black py-2.5 bg-orange-50/50 border border-orange-200 rounded-2xl text-red-950 tracking-widest focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => handleAction('pickup', { otp: pickupOtpInput })}
                    disabled={actionLoading || !pickupOtpInput.trim()}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-full shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Verify OTP & Confirm Pickup</span>
                  </button>
                </div>
              )}

              {/* Step 4: Picked Up -> Head to Shelter */}
              {status === 'PICKED_UP' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 font-medium leading-relaxed">
                    Food is secured in your vehicle. Start route to the recipient shelter dropoff point.
                  </p>
                  <button
                    onClick={() => handleAction('en-route-delivery')}
                    disabled={actionLoading}
                    className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-full shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Navigation className="w-4 h-4 stroke-[2.5]" />
                    <span>Start Route to Shelter Dropoff</span>
                  </button>
                </div>
              )}

              {/* Step 5: En Route to Delivery */}
              {status === 'EN_ROUTE_TO_DELIVERY' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 font-medium leading-relaxed">
                    In transit to the community shelter. Tap below once you pull up at the shelter.
                  </p>
                  <button
                    onClick={() => handleAction('arrived-dropoff')}
                    disabled={actionLoading}
                    className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-full shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <MapPin className="w-4 h-4 stroke-[2.5]" />
                    <span>Arrived at Shelter Dropoff</span>
                  </button>
                </div>
              )}

              {/* Step 6: Arrived at Dropoff -> Requires Shelter Delivery OTP */}
              {status === 'ARRIVED_AT_DROPOFF' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-amber-900 font-black">
                      <KeyRound className="w-4 h-4 text-amber-700 stroke-[2.5]" />
                      <span>Shelter Delivery Verification</span>
                    </div>
                    <p className="text-[11px] text-stone-600 font-medium">
                      Hand over the food to shelter staff and ask them for their 4-digit Delivery OTP.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">
                      Enter Shelter Delivery OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={deliveryOtpInput}
                      onChange={(e) => setDeliveryOtpInput(e.target.value)}
                      placeholder="e.g. 7392"
                      className="w-full text-center font-mono text-xl font-black py-2.5 bg-orange-50/50 border border-orange-200 rounded-2xl text-red-950 tracking-widest focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">
                      Courier Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="e.g. Delivered to kitchen manager"
                      className="w-full px-3.5 py-2.5 bg-orange-50/50 border border-orange-200 rounded-2xl text-xs font-medium text-stone-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => handleAction('deliver', { otp: deliveryOtpInput, notes: deliveryNotes })}
                    disabled={actionLoading || !deliveryOtpInput.trim()}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-full shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Verify OTP & Complete Delivery</span>
                  </button>
                </div>
              )}

              {/* Completed */}
              {['DELIVERED', 'VERIFIED'].includes(status) && (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto stroke-[2.5]" />
                  <h4 className="text-sm font-black text-emerald-950">Mission Accomplished!</h4>
                  <p className="text-xs text-stone-600 font-medium">
                    You have successfully rescued and delivered this surplus food. Great job!
                  </p>
                  <Link
                    to="/driver"
                    className="inline-block mt-2 py-2 px-5 bg-emerald-600 text-white rounded-full text-xs font-black hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                  >
                    Return to Dispatch
                  </Link>
                </div>
              )}

              {/* Cancel Delivery Option */}
              {!['DELIVERED', 'VERIFIED', 'CANCELLED'].includes(status) && (
                <div className="pt-4 border-t border-orange-100">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-black transition-colors"
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
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl border border-red-200 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <h3 className="font-black text-lg text-red-950">Cancel Rescue Delivery</h3>
              <p className="text-xs font-medium text-stone-600">
                Are you sure you want to cancel? The donation will be returned to the dispatch board for another driver to rescue.
              </p>
              <div>
                <label className="block text-[11px] font-black uppercase text-stone-500 mb-1">
                  Reason for cancellation
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Vehicle breakdown / Flat tire"
                  className="w-full px-3.5 py-2.5 bg-orange-50/50 border border-orange-200 rounded-2xl text-xs font-medium text-stone-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="py-2.5 px-4 bg-stone-100 text-stone-700 text-xs font-black rounded-full hover:bg-stone-200 transition-all"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancelDelivery}
                  className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-full shadow-md shadow-red-600/20 disabled:opacity-50 transition-all active:scale-95"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DeliveryDetail;
