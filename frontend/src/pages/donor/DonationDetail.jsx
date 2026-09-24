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
  Sparkles,
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
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 flex items-center justify-center p-4">
        <div className="bg-[#FFFDF6] p-8 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="text-stone-700 font-bold text-sm block">Loading donation tracker...</span>
        </div>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#FFFDF6] p-8 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-2xl font-black text-red-950">Donation Not Found</h2>
          <p className="text-stone-600 text-sm font-medium">{error || 'This donation record does not exist or has been removed.'}</p>
          <Link
            to="/donor"
            className="inline-block px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-black shadow-md shadow-red-600/20 active:scale-95 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 text-stone-800 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation & FR Monogram Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/donor"
            className="inline-flex items-center gap-2 text-xs font-bold text-red-700 hover:text-red-900 transition-all hover:-translate-x-1"
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
            <span>Back to Hub</span>
          </Link>

          <div className="flex items-center gap-3">
            {donation.urgency && (
              <span className="text-xs font-black px-3.5 py-1 rounded-full border border-orange-300/80 bg-orange-100 text-orange-950 shadow-sm">
                Urgency: {donation.urgency} ({donation.timeRemainingFormatted})
              </span>
            )}

            {/* FR Monogram Branding Badge */}
            <div className="inline-flex items-center gap-2 bg-[#FFFDF6] px-3.5 py-1 rounded-full shadow-md shadow-orange-900/5 border border-orange-200/60">
              <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-[10px] tracking-tighter shadow-inner">
                FR
              </div>
              <span className="text-[11px] font-black tracking-wider text-red-900 uppercase">
                Rescue Tracker
              </span>
            </div>
          </div>
        </div>

        {/* Main Title Banner & Stepper Card */}
        <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-[11px] font-black uppercase tracking-wide mb-2">
                <Sparkles className="w-3 h-3 fill-orange-500 text-orange-500" /> Active Rescue Mission
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-red-950 tracking-tight">{donation.title}</h1>
              <p className="text-stone-600 text-sm font-medium mt-1">{donation.description || 'Surplus rescue donation'}</p>
            </div>

            <div className="text-left sm:text-right bg-orange-50 p-4 sm:p-0 rounded-2xl sm:bg-transparent">
              <span className="text-xs font-black uppercase tracking-wider text-stone-500 block">Quantity</span>
              <span className="text-2xl sm:text-3xl font-black text-red-600">
                {donation.quantity?.estimatedServings} Servings
              </span>
            </div>
          </div>

          {/* Status Stepper */}
          <div className="pt-6 border-t border-orange-100 relative z-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {steps.map((step, idx) => {
                const isCompleted = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isCompleted
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                          : 'bg-orange-100 text-stone-400 border border-orange-200'
                      } ${isCurrent ? 'ring-4 ring-orange-300/80' : ''}`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                    </div>
                    <span className={`text-[11px] font-bold mt-2 ${isCompleted ? 'text-stone-800' : 'text-stone-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Background Ambient Glow */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-orange-200/30 rounded-full blur-2xl pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Details & Key Logistics */}
          <div className="md:col-span-2 space-y-6">
            {/* Map View */}
            <div className="bg-[#FFFDF6] p-5 sm:p-6 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 space-y-3">
              <h3 className="text-sm font-black text-red-950 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-700">
                  <MapPin className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span>Live Delivery Route</span>
              </h3>
              <div className="rounded-2xl overflow-hidden border border-orange-200/80 shadow-inner">
                <DeliveryMap
                  pickupCoords={donation.pickupLocation?.location?.coordinates}
                  dropoffCoords={donation.matchedNgoId?.location?.coordinates}
                  driverCoords={donation.activeDeliveryId?.currentLocation?.coordinates}
                  routeGeojson={donation.activeDeliveryId?.routeSummary?.geojson}
                  height="300px"
                />
              </div>
            </div>

            {/* Logistics Details */}
            <div className="bg-[#FFFDF6] p-6 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-100">
                <span className="text-[11px] uppercase text-stone-500 block font-black">Pickup Address</span>
                <span className="text-stone-800 font-bold">{donation.pickupLocation?.address}</span>
              </div>
              <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-100">
                <span className="text-[11px] uppercase text-stone-500 block font-black">Food Type</span>
                <span className="text-stone-800 font-bold">{donation.foodType?.replace(/_/g, ' ')}</span>
              </div>
              <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-100">
                <span className="text-[11px] uppercase text-stone-500 block font-black">Dietary</span>
                <span className="text-stone-800 font-bold">{donation.dietaryPreference}</span>
              </div>
              <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-100">
                <span className="text-[11px] uppercase text-stone-500 block font-black">Cold Chain</span>
                <span className="text-stone-800 font-bold">
                  {donation.perishability?.requiresColdChain ? 'Yes (Refrigeration required)' : 'No (Ambient)'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Handshake OTP & Participants */}
          <div className="space-y-6">
            {/* Handshake Pickup OTP Card */}
            {donation.pickupOtp && (
              <div className="bg-[#FFFDF6] p-6 rounded-3xl border-2 border-orange-300 shadow-xl shadow-orange-900/5 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-red-900">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <KeyRound className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-wider">Pickup Handshake OTP</h3>
                </div>
                <p className="text-xs text-stone-600 font-medium leading-relaxed">
                  Provide this 4-digit verification code to the courier when they arrive to collect the food.
                </p>
                <div className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl border border-orange-300/80 text-center shadow-inner">
                  <span className="font-mono text-3xl font-black text-red-900 tracking-widest">
                    {donation.pickupOtp}
                  </span>
                </div>
              </div>
            )}

            {/* Matched Shelter / NGO Card */}
            <div className="bg-[#FFFDF6] p-5 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-stone-500 font-black flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-800">
                  <Building2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>Assigned Shelter</span>
              </h4>
              {donation.matchedNgoId ? (
                <div className="space-y-1 text-xs bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                  <span className="text-sm font-black text-red-950 block">{donation.matchedNgoId.name}</span>
                  <span className="text-stone-600 font-medium block">{donation.matchedNgoId.address?.formattedAddress || 'Shelter Center'}</span>
                  <span className="text-red-700 block font-mono font-bold mt-1">{donation.matchedNgoId.phone}</span>
                </div>
              ) : (
                <div className="text-xs text-stone-500 font-semibold italic bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                  Matching algorithm is currently finding eligible shelters...
                </div>
              )}
            </div>

            {/* Assigned Driver Card */}
            <div className="bg-[#FFFDF6] p-5 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-stone-500 font-black flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-800">
                  <Truck className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>Rescue Courier</span>
              </h4>
              {donation.assignedDriverId ? (
                <div className="space-y-1 text-xs bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                  <span className="text-sm font-black text-red-950 block">{donation.assignedDriverId.name}</span>
                  <span className="text-stone-600 font-medium block">
                    Vehicle: {donation.assignedDriverId.driverProfile?.vehicleType || 'Courier Vehicle'}
                  </span>
                  <span className="text-red-700 block font-mono font-bold mt-1">{donation.assignedDriverId.phone}</span>
                </div>
              ) : (
                <div className="text-xs text-stone-500 font-semibold italic bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                  {donation.status === 'MATCHED'
                    ? 'Awaiting driver claim from fleet dispatch...'
                    : 'Pending shelter acceptance before driver assignment.'}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DonationDetail;