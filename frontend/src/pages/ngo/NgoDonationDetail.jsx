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
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span>Loading donation record...</span>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Donation Not Found</h2>
        <p className="text-slate-400 text-sm">{error || 'This record is unavailable.'}</p>
        <Link to="/ngo" className="inline-block px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-sm font-semibold">
          Back to Shelter Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/ngo" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shelter Hub</span>
        </Link>

        <span className="text-xs font-bold px-3 py-1 rounded-full border bg-purple-500/20 text-purple-300 border-purple-500/40">
          Status: {donation.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{donation.title}</h1>
            <p className="text-slate-400 text-sm mt-1">{donation.description || 'Surplus rescue delivery'}</p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Total Meals</span>
            <span className="text-2xl font-black text-purple-400">
              {donation.quantity?.estimatedServings} Servings
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span>Live Transit Route</span>
            </h3>
            <DeliveryMap
              pickupCoords={donation.pickupLocation?.location?.coordinates}
              dropoffCoords={donation.matchedNgoId?.location?.coordinates}
              driverCoords={donation.activeDeliveryId?.currentLocation?.coordinates}
              routeGeojson={donation.activeDeliveryId?.routeSummary?.geojson}
              height="300px"
            />
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs uppercase text-slate-500 block font-semibold">Origin Donor</span>
              <span className="text-slate-200 font-medium">{donation.donorId?.name}</span>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 block font-semibold">Food Category</span>
              <span className="text-slate-200 font-medium">{donation.foodType?.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 block font-semibold">Dietary</span>
              <span className="text-slate-200 font-medium">{donation.dietaryPreference}</span>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 block font-semibold">Cold Storage Required</span>
              <span className="text-slate-200 font-medium">
                {donation.perishability?.requiresColdChain ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Delivery OTP Card (Shelter gives this to driver on dropoff) */}
          {donation.deliveryOtp && (
            <div className="glass-panel p-6 rounded-3xl border border-purple-500/40 bg-purple-950/30 space-y-3 shadow-xl shadow-purple-950/40">
              <div className="flex items-center gap-2 text-purple-300">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Delivery Handshake OTP</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Provide this 4-digit code to the courier when they arrive at your shelter to confirm food handover.
              </p>
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-purple-500/30 text-center">
                <span className="font-mono text-3xl font-black text-purple-400 tracking-widest">
                  {donation.deliveryOtp}
                </span>
              </div>
            </div>
          )}

          {/* Verification CTA Button (when status is DELIVERED) */}
          {donation.status === 'DELIVERED' && (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-500/40 bg-emerald-950/20 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Verify Food Condition</span>
              </div>
              <p className="text-xs text-slate-300">
                The driver has confirmed delivery. Verify the meal condition and release your allocated intake capacity.
              </p>
              <button
                onClick={() => setShowVerifyModal(true)}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Verify & Rate Food Quality
              </button>
            </div>
          )}

          {donation.status === 'VERIFIED' && (
            <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-emerald-950/10 flex items-center gap-3 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>Food rescue verified! Shelter capacity successfully released.</span>
            </div>
          )}

          {/* Courier Card */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 space-y-2">
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Assigned Courier</span>
            </h4>
            {donation.assignedDriverId ? (
              <div className="space-y-1 text-xs">
                <span className="text-sm font-bold text-white block">{donation.assignedDriverId.name}</span>
                <span className="text-slate-400 block font-mono">{donation.assignedDriverId.phone}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">Courier assignment in progress...</div>
            )}
          </div>
        </div>
      </div>

      {/* Verify Food Condition Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Verify Delivery & Condition</h3>
              <button onClick={() => setShowVerifyModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Food Condition Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1.5 rounded-lg hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Feedback Notes / Inspection Comments
                </label>
                <textarea
                  rows={3}
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="e.g. Excellent temperature, fresh and properly sealed containers"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="py-2.5 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={verifying}
                  onClick={handleVerifyDelivery}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Confirm Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NgoDonationDetail;
