import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  Truck,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import DeliveryMap from '../../components/DeliveryMap';

const NgoDonationDetail = () => {
  const { id } = useParams();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchDonation = async () => {
    try {
      const res = await api.get(`/donations/${id}`);
      if (res.data.success) {
        setDonation(res.data.donation);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load donation details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonation();

    const socket = getSocket();
    if (socket) {
      socket.emit('join_donation', id);

      const handleUpdate = () => {
        fetchDonation();
      };

      socket.on('driver_assigned', handleUpdate);
      socket.on('driver_en_route', handleUpdate);
      socket.on('driver_arrived', handleUpdate);
      socket.on('pickup_confirmed', handleUpdate);
      socket.on('delivery_in_transit', handleUpdate);
      socket.on('delivery_completed', handleUpdate);
      socket.on('delivery_verified', handleUpdate);

      return () => {
        socket.emit('leave_donation', id);
        socket.off('driver_assigned', handleUpdate);
        socket.off('driver_en_route', handleUpdate);
        socket.off('driver_arrived', handleUpdate);
        socket.off('pickup_confirmed', handleUpdate);
        socket.off('delivery_in_transit', handleUpdate);
        socket.off('delivery_completed', handleUpdate);
        socket.off('delivery_verified', handleUpdate);
      };
    }
  }, [id]);

  const handleVerifyDelivery = async () => {
    if (!donation?.activeDeliveryId?._id && !donation?.activeDeliveryId) {
      setError('Active delivery record missing.');
      return;
    }
    const deliveryId = donation.activeDeliveryId._id || donation.activeDeliveryId;

    setVerifying(true);
    try {
      const res = await api.post(`/deliveries/${deliveryId}/verify`, {
        rating: Number(rating),
        feedbackNote,
      });

      if (res.data.success) {
        setShowVerifyModal(false);
        fetchDonation();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 flex items-center justify-center py-16 px-4">
        <div className="bg-[#FFFDF6] p-12 rounded-3xl shadow-xl shadow-orange-900/5 text-center border border-orange-100 max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-stone-700 font-bold text-sm">Loading donation record...</span>
        </div>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 flex items-center justify-center py-16 px-4">
        <div className="bg-[#FFFDF6] p-8 sm:p-10 rounded-3xl shadow-xl shadow-orange-900/5 text-center border border-orange-100 max-w-md w-full space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto">
            <AlertCircle className="w-7 h-7 stroke-[2]" />
          </div>
          <h2 className="text-xl font-black text-red-950">Donation Not Found</h2>
          <p className="text-stone-600 text-xs font-medium">{error || 'This record is unavailable.'}</p>
          <Link
            to="/ngo"
            className="inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-black shadow-md shadow-red-600/20 active:scale-95 transition-all"
          >
            Back to Shelter Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 text-stone-800 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation & Header Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/ngo"
            className="inline-flex items-center gap-2 text-xs font-black text-stone-600 hover:text-red-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Shelter Hub</span>
          </Link>

          <span className="text-xs font-black px-3.5 py-1 rounded-full border border-orange-200 bg-orange-100 text-orange-950 shadow-sm self-start sm:self-auto uppercase">
            Status: {donation.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Primary Donation Card */}
        <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-red-950">{donation.title}</h1>
              <p className="text-stone-600 text-xs sm:text-sm font-medium mt-1">
                {donation.description || 'Surplus rescue delivery'}
              </p>
            </div>

            <div className="bg-orange-50/80 px-4 py-3 rounded-2xl border border-orange-100 text-left sm:text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Total Meals</span>
              <span className="text-2xl font-black text-red-950">
                {donation.quantity?.estimatedServings} Servings
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Delivery Info & Map */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-[#FFFDF6] p-5 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 space-y-3">
              <h3 className="text-sm font-black text-red-950 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                <span>Live Transit Route</span>
              </h3>
              <div className="rounded-2xl overflow-hidden border border-orange-100 shadow-inner">
                <DeliveryMap
                  pickupCoords={donation.pickupLocation?.location?.coordinates}
                  dropoffCoords={donation.matchedNgoId?.location?.coordinates}
                  driverCoords={donation.activeDeliveryId?.currentLocation?.coordinates}
                  routeGeojson={donation.activeDeliveryId?.routeSummary?.geojson}
                  height="300px"
                />
              </div>
            </div>

            <div className="bg-[#FFFDF6] p-6 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100">
                <span className="text-[10px] uppercase font-black text-stone-400 block">Origin Donor</span>
                <span className="text-red-950 font-black text-sm block mt-0.5">{donation.donorId?.name}</span>
              </div>
              <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100">
                <span className="text-[10px] uppercase font-black text-stone-400 block">Food Category</span>
                <span className="text-stone-800 font-bold block mt-0.5">{donation.foodType?.replace(/_/g, ' ')}</span>
              </div>
              <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100">
                <span className="text-[10px] uppercase font-black text-stone-400 block">Dietary Preference</span>
                <span className="text-stone-800 font-bold block mt-0.5">{donation.dietaryPreference}</span>
              </div>
              <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100">
                <span className="text-[10px] uppercase font-black text-stone-400 block">Cold Storage Required</span>
                <span className="text-stone-800 font-bold block mt-0.5">
                  {donation.perishability?.requiresColdChain ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Action & Status Side Panel */}
          <div className="space-y-6">
            {/* Delivery OTP Card (Shelter gives this to driver on dropoff) */}
            {donation.deliveryOtp && (
              <div className="bg-[#FFFDF6] p-6 rounded-3xl border-2 border-orange-200 shadow-xl shadow-orange-900/5 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-red-950 font-black text-xs uppercase tracking-wider">
                  <KeyRound className="w-4 h-4 text-orange-600 stroke-[2.5]" />
                  <span>Delivery Handshake OTP</span>
                </div>
                <p className="text-xs text-stone-600 font-medium leading-relaxed">
                  Provide this 4-digit code to the courier when they arrive at your shelter to confirm food handover.
                </p>
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200/80 text-center shadow-inner">
                  <span className="font-mono text-3xl font-black text-red-950 tracking-widest">
                    {donation.deliveryOtp}
                  </span>
                </div>
              </div>
            )}

            {/* Verification CTA Button (when status is DELIVERED) */}
            {donation.status === 'DELIVERED' && (
              <div className="bg-[#FFFDF6] p-6 rounded-3xl border border-emerald-200 shadow-xl shadow-orange-900/5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                  <span>Verify Food Condition</span>
                </div>
                <p className="text-xs text-stone-600 font-medium">
                  The driver has confirmed delivery. Verify the meal condition and release your allocated intake capacity.
                </p>
                <button
                  onClick={() => setShowVerifyModal(true)}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-full shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                >
                  Verify & Rate Food Quality
                </button>
              </div>
            )}

            {donation.status === 'VERIFIED' && (
              <div className="bg-[#FFFDF6] p-5 rounded-3xl border border-emerald-200 shadow-xl shadow-orange-900/5 flex items-center gap-3 text-emerald-900 text-xs font-black">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>Food rescue verified! Shelter capacity successfully released.</span>
              </div>
            )}

            {/* Courier Card */}
            <div className="bg-[#FFFDF6] p-5 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 space-y-3">
              <h4 className="text-[10px] uppercase font-black tracking-wider text-stone-400 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-orange-600 stroke-[2.5]" />
                <span>Assigned Courier</span>
              </h4>
              {donation.assignedDriverId ? (
                <div className="space-y-1 text-xs">
                  <span className="text-sm font-black text-red-950 block">{donation.assignedDriverId.name}</span>
                  <span className="text-stone-600 font-mono font-bold block">{donation.assignedDriverId.phone}</span>
                </div>
              ) : (
                <div className="text-xs text-stone-500 font-medium italic">Courier assignment in progress...</div>
              )}
            </div>
          </div>
        </div>

        {/* Verify Food Condition Modal */}
        {showVerifyModal && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl border border-orange-200 shadow-2xl max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <h3 className="font-black text-base text-red-950">Verify Delivery & Condition</h3>
                <button
                  onClick={() => setShowVerifyModal(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-orange-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-2">
                    Food Condition Rating (1 to 5 Stars)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 rounded-xl hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= rating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1.5">
                    Feedback Notes / Inspection Comments
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="e.g. Excellent temperature, fresh and properly sealed containers"
                    className="w-full px-4 py-3 rounded-2xl bg-orange-50/60 border border-orange-200/80 text-stone-800 placeholder-stone-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-black rounded-full transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={verifying}
                    onClick={handleVerifyDelivery}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-full shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {verifying ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Confirm Receipt</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NgoDonationDetail;