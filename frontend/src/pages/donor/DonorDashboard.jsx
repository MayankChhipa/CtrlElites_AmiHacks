import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Package,
  TrendingUp,
  Leaf,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

const DonorDashboard = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDonations = async () => {
    try {
      const res = await api.get('/donations/my');
      if (res.data.success) {
        setDonations(res.data.donations || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();

    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => {
        fetchDonations();
      };

      socket.on('match_accepted', handleUpdate);
      socket.on('driver_assigned', handleUpdate);
      socket.on('pickup_confirmed', handleUpdate);
      socket.on('delivery_completed', handleUpdate);
      socket.on('delivery_verified', handleUpdate);

      return () => {
        socket.off('match_accepted', handleUpdate);
        socket.off('driver_assigned', handleUpdate);
        socket.off('pickup_confirmed', handleUpdate);
        socket.off('delivery_completed', handleUpdate);
        socket.off('delivery_verified', handleUpdate);
      };
    }
  }, []);

  const activeDonations = donations.filter((d) =>
    ['PENDING_MATCH', 'MATCHED', 'DRIVER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)
  );

  const deliveredDonations = donations.filter((d) =>
    ['DELIVERED', 'VERIFIED'].includes(d.status)
  );

  const totalMealsRescued = deliveredDonations.reduce(
    (sum, d) => sum + (d.quantity?.estimatedServings || 0),
    0
  );
  const totalWeightSaved = deliveredDonations.reduce(
    (sum, d) => sum + (d.quantity?.estimatedWeightKg || 0),
    0
  );
  const totalCo2Saved = Math.round(totalWeightSaved * 2.5 * 10) / 10;

  const getStatusBadge = (status) => {
    const map = {
      PENDING_MATCH: 'bg-amber-100 text-amber-900 border-amber-300',
      MATCHED: 'bg-orange-100 text-orange-900 border-orange-300',
      DRIVER_ASSIGNED: 'bg-yellow-100 text-yellow-900 border-yellow-300',
      PICKED_UP: 'bg-blue-100 text-blue-900 border-blue-300',
      IN_TRANSIT: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      DELIVERED: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      VERIFIED: 'bg-emerald-200 text-emerald-950 border-emerald-400 font-extrabold',
      EXPIRED: 'bg-rose-100 text-rose-900 border-rose-300',
      CANCELLED: 'bg-stone-200 text-stone-700 border-stone-300',
    };
    return map[status] || 'bg-stone-100 text-stone-700 border-stone-300';
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-900 border-red-300 animate-pulse font-black';
      case 'HIGH':
        return 'bg-orange-100 text-orange-900 border-orange-300 font-bold';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 text-stone-800 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              {/* FR Monogram Branding Badge */}
              <div className="inline-flex items-center gap-2 bg-[#FFFDF6] px-3 py-1 rounded-full shadow-md shadow-orange-900/5 border border-orange-200/60">
                <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-[9px] tracking-tighter shadow-inner">
                  FR
                </div>
                <span className="text-[10px] font-black tracking-wider text-red-900 uppercase">
                  Donor Hub
                </span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-red-950 tracking-tight">
              Rescue Dashboard
            </h1>
            <p className="text-stone-600 text-sm font-medium mt-1">
              Manage surplus food, view real-time deliveries, and track community impact.
            </p>
          </div>

          <Link
            to="/donor/donate"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-xl shadow-red-600/25 active:scale-95 transition-all"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            <span>Post Surplus Food</span>
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-100 border border-red-300 flex items-center gap-3 text-red-900 font-bold text-sm shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Impact Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-[#FFFDF6] p-6 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-900 border border-orange-200 flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-stone-500 font-black">Meals Rescued</span>
              <div className="text-3xl font-black text-red-950">{totalMealsRescued}</div>
            </div>
          </div>

          <div className="bg-[#FFFDF6] p-6 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center shrink-0 shadow-inner">
              <Package className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-stone-500 font-black">Food Saved (KG)</span>
              <div className="text-3xl font-black text-red-950">{totalWeightSaved} kg</div>
            </div>
          </div>

          <div className="bg-[#FFFDF6] p-6 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-yellow-100 text-yellow-900 border border-yellow-200 flex items-center justify-center shrink-0 shadow-inner">
              <Leaf className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-stone-500 font-black">CO₂ Prevented</span>
              <div className="text-3xl font-black text-red-950">{totalCo2Saved} kg</div>
            </div>
          </div>
        </div>

        {/* Active Deliveries & Donations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-red-950 flex items-center gap-2">
              <span>Active Donations</span>
              <span className="text-xs bg-red-100 text-red-900 font-extrabold px-3 py-0.5 rounded-full border border-red-200">
                {activeDonations.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="bg-[#FFFDF6] p-12 rounded-3xl border border-orange-100 text-center font-bold text-stone-500 shadow-xl shadow-orange-900/5 space-y-3">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <span>Loading active donations...</span>
            </div>
          ) : activeDonations.length === 0 ? (
            <div className="bg-[#FFFDF6] p-10 rounded-3xl text-center border border-orange-100 shadow-xl shadow-orange-900/5 space-y-4">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-800 mx-auto">
                <Package className="w-7 h-7 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-red-950">No active donations right now</h3>
                <p className="text-stone-600 text-sm font-medium max-w-md mx-auto mt-1">
                  Got excess buffet meals, bakery surplus, or produce? Post a donation to match with local shelters in minutes.
                </p>
              </div>
              <Link
                to="/donor/donate"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-black shadow-md shadow-red-600/20 active:scale-95 transition-all"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Create Donation</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeDonations.map((d) => (
                <div
                  key={d._id}
                  className="bg-[#FFFDF6] rounded-3xl p-6 border border-orange-100 shadow-xl shadow-orange-900/5 hover:border-orange-300 transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-full border ${getStatusBadge(d.status)}`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                      {d.urgency && (
                        <span className={`text-[10px] tracking-wide px-2.5 py-1 rounded-full border ${getUrgencyBadge(d.urgency)}`}>
                          {d.urgency} ({d.timeRemainingFormatted})
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-lg text-red-950 group-hover:text-red-700 transition-colors line-clamp-1">
                      {d.title}
                    </h3>
                    <p className="text-xs font-medium text-stone-600 mt-1 line-clamp-2">{d.description || 'No description provided'}</p>

                    <div className="mt-4 pt-4 border-t border-orange-100 grid grid-cols-2 gap-2 text-xs text-stone-700">
                      <div className="bg-orange-50/60 p-2.5 rounded-2xl border border-orange-100">
                        <span className="text-stone-500 block text-[10px] font-black uppercase">Quantity</span>
                        <span className="font-black text-red-950">{d.quantity?.estimatedServings} Servings</span>
                      </div>
                      <div className="bg-orange-50/60 p-2.5 rounded-2xl border border-orange-100">
                        <span className="text-stone-500 block text-[10px] font-black uppercase">Food Type</span>
                        <span className="font-black text-stone-800">{d.foodType?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>

                    {/* Pickup Handshake OTP Box */}
                    {d.pickupOtp && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-amber-100 to-orange-100 border border-orange-300 rounded-2xl flex items-center justify-between shadow-inner">
                        <span className="text-xs text-red-950 font-black uppercase tracking-wider">Pickup OTP:</span>
                        <span className="font-mono text-lg font-black text-red-900 tracking-widest">
                          {d.pickupOtp}
                        </span>
                      </div>
                    )}

                    {d.matchedNgoId && (
                      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-stone-700">
                        <Building2 className="w-4 h-4 text-orange-700 shrink-0" />
                        <span className="truncate">Shelter: {d.matchedNgoId.name}</span>
                      </div>
                    )}

                    {d.assignedDriverId && (
                      <div className="mt-2 flex items-center gap-2 text-xs font-bold text-stone-700">
                        <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                        <span className="truncate">Driver: {d.assignedDriverId.name}</span>
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/donor/donations/${d._id}`}
                    className="w-full py-2.5 px-4 bg-orange-100 hover:bg-orange-200 text-orange-950 text-xs font-black rounded-full flex items-center justify-center gap-2 transition-all border border-orange-200 active:scale-95"
                  >
                    <span>View Live Tracker</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivered History */}
        {deliveredDonations.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-orange-200/80">
            <h2 className="text-xl font-black text-red-950 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
              <span>Completed Rescues</span>
            </h2>

            <div className="bg-[#FFFDF6] rounded-3xl overflow-hidden border border-orange-100 shadow-xl shadow-orange-900/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-stone-800">
                  <thead className="bg-orange-100/60 text-xs uppercase font-black text-red-950 border-b border-orange-200/80">
                    <tr>
                      <th className="py-3.5 px-5">Food Item</th>
                      <th className="py-3.5 px-5">Quantity</th>
                      <th className="py-3.5 px-5">Shelter</th>
                      <th className="py-3.5 px-5">Driver</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 font-medium">
                    {deliveredDonations.map((d) => (
                      <tr key={d._id} className="hover:bg-orange-50/50 transition-colors">
                        <td className="py-3.5 px-5 font-black text-red-950">{d.title}</td>
                        <td className="py-3.5 px-5 font-bold">{d.quantity?.estimatedServings} Servings</td>
                        <td className="py-3.5 px-5 text-stone-600 font-semibold">{d.matchedNgoId?.name || 'Assigned Shelter'}</td>
                        <td className="py-3.5 px-5 text-stone-600 font-semibold">{d.assignedDriverId?.name || 'Courier'}</td>
                        <td className="py-3.5 px-5">
                          <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-full border ${getStatusBadge(d.status)}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <Link to={`/donor/donations/${d._id}`} className="text-xs font-black text-red-700 hover:text-red-900 underline">
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DonorDashboard;