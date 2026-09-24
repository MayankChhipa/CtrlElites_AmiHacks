import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Building2,
  Truck,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import DeliveryMap from '../../components/DeliveryMap';

const DonationDetail = () => {
  const { id } = useParams();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      socket.on('match_accepted', handleUpdate);
      socket.on('driver_assigned', handleUpdate);
      socket.on('driver_en_route', handleUpdate);
      socket.on('driver_arrived', handleUpdate);
      socket.on('pickup_confirmed', handleUpdate);
      socket.on('delivery_in_transit', handleUpdate);
      socket.on('delivery_completed', handleUpdate);
      socket.on('delivery_verified', handleUpdate);

      return () => {
        socket.emit('leave_donation', id);
        socket.off('match_accepted', handleUpdate);
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span>Loading donation tracker...</span>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Donation Not Found</h2>
        <p className="text-slate-400 text-sm">{error || 'This donation record does not exist or has been removed.'}</p>
        <Link to="/donor" className="inline-block px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-700">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'PENDING_MATCH', label: 'Matching Shelter' },
    { key: 'MATCHED', label: 'Shelter Accepted' },
    { key: 'DRIVER_ASSIGNED', label: 'Driver Assigned' },
    { key: 'PICKED_UP', label: 'Food Picked Up' },
    { key: 'IN_TRANSIT', label: 'In Transit' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'VERIFIED', label: 'Verified' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === donation.status);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link to="/donor" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hub</span>
        </Link>

        {donation.urgency && (
          <span className="text-xs font-bold px-3 py-1 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/40">
            Urgency: {donation.urgency} ({donation.timeRemainingFormatted})
          </span>
        )}
      </div>

      {/* Main Title Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{donation.title}</h1>
            <p className="text-slate-400 text-sm mt-1">{donation.description || 'Surplus rescue donation'}</p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Quantity</span>
            <span className="text-2xl font-black text-emerald-400">
              {donation.quantity?.estimatedServings} Servings
            </span>
          </div>
        </div>

        {/* Status Stepper */}
        <div className="pt-6 border-t border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {steps.map((step, idx) => {
              const isCompleted = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step.key} className="flex flex-col items-center text-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    } ${isCurrent ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-[11px] font-semibold mt-1.5 ${isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details & Key Logistics */}
        <div className="md:col-span-2 space-y-6">
          {/* Map View */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Live Delivery Route</span>
            </h3>
            <DeliveryMap
              pickupCoords={donation.pickupLocation?.location?.coordinates}
              dropoffCoords={donation.matchedNgoId?.location?.coordinates}
              driverCoords={donation.activeDeliveryId?.currentLocation?.coordinates}
              routeGeojson={donation.activeDeliveryId?.routeSummary?.geojson}
              height="300px"
            />
          </div>

          {/* Logistics Details */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs uppercase text-slate-500 block font-semibold">Pickup Address</span>
              <span className="text-slate-200 font-medium">{donation.pickupLocation?.address}</span>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 block font-semibold">Food Type</span>
              <span className="text-slate-200 font-medium">{donation.foodType?.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 block font-semibold">Dietary</span>
              <span className="text-slate-200 font-medium">{donation.dietaryPreference}</span>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 block font-semibold">Cold Chain</span>
              <span className="text-slate-200 font-medium">
                {donation.perishability?.requiresColdChain ? 'Yes (Refrigeration required)' : 'No (Ambient)'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Handshake OTP & Participants */}
        <div className="space-y-6">
          {/* Handshake Pickup OTP Card */}
          {donation.pickupOtp && (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-500/40 bg-emerald-950/30 space-y-3 shadow-xl shadow-emerald-950/40">
              <div className="flex items-center gap-2 text-emerald-400">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Pickup Handshake OTP</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Provide this 4-digit verification code to the courier when they arrive to collect the food.
              </p>
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-emerald-500/30 text-center">
                <span className="font-mono text-3xl font-black text-emerald-400 tracking-widest">
                  {donation.pickupOtp}
                </span>
              </div>
            </div>
          )}

          {/* Matched Shelter / NGO Card */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span>Assigned Shelter</span>
            </h4>
            {donation.matchedNgoId ? (
              <div className="space-y-1 text-xs">
                <span className="text-sm font-bold text-white block">{donation.matchedNgoId.name}</span>
                <span className="text-slate-400 block">{donation.matchedNgoId.address?.formattedAddress || 'Shelter Center'}</span>
                <span className="text-emerald-400 block font-mono">{donation.matchedNgoId.phone}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">Matching algorithm is currently finding eligible shelters...</div>
            )}
          </div>

          {/* Assigned Driver Card */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Rescue Courier</span>
            </h4>
            {donation.assignedDriverId ? (
              <div className="space-y-1 text-xs">
                <span className="text-sm font-bold text-white block">{donation.assignedDriverId.name}</span>
                <span className="text-slate-400 block">
                  Vehicle: {donation.assignedDriverId.driverProfile?.vehicleType || 'Courier Vehicle'}
                </span>
                <span className="text-emerald-400 block font-mono">{donation.assignedDriverId.phone}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                {donation.status === 'MATCHED'
                  ? 'Awaiting driver claim from fleet dispatch...'
                  : 'Pending shelter acceptance before driver assignment.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationDetail;
