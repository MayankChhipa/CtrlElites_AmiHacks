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
      PENDING_MATCH: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      MATCHED: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      DRIVER_ASSIGNED: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      PICKED_UP: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      IN_TRANSIT: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      DELIVERED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      VERIFIED: 'bg-emerald-600/30 text-emerald-200 border-emerald-500',
      EXPIRED: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      CANCELLED: 'bg-slate-700 text-slate-300 border-slate-600',
    };
    return map[status] || 'bg-slate-700 text-slate-300 border-slate-600';
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Donor Operations Hub</h1>
          <p className="text-slate-400 text-sm mt-1">Manage surplus food, view real-time deliveries, and track impact.</p>
        </div>
        <Link
          to="/donor/donate"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Post Surplus Food</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Impact Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Meals Rescued</span>
            <div className="text-2xl font-black text-white">{totalMealsRescued}</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Food Saved (KG)</span>
            <div className="text-2xl font-black text-white">{totalWeightSaved} kg</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">CO₂ Prevented</span>
            <div className="text-2xl font-black text-white">{totalCo2Saved} kg</div>
          </div>
        </div>
      </div>

      {/* Active Deliveries & Donations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Active Donations</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
              {activeDonations.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading active donations...</div>
        ) : activeDonations.length === 0 ? (
          <div className="glass-panel p-10 rounded-2xl text-center border border-slate-800 space-y-3">
            <Package className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-300">No active donations right now</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Got excess buffet meals, bakery surplus, or produce? Post a donation to match with local shelters in minutes.
            </p>
            <Link
              to="/donor/donate"
              className="inline-flex items-center gap-2 px-4 py-2 mt-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create Donation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeDonations.map((d) => (
              <div
                key={d._id}
                className="glass-panel rounded-2xl p-5 border border-slate-700/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadge(d.status)}`}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                    {d.urgency && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getUrgencyBadge(d.urgency)}`}>
                        {d.urgency} ({d.timeRemainingFormatted})
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {d.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{d.description || 'No description provided'}</p>

                  <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Quantity</span>
                      <span className="font-semibold">{d.quantity?.estimatedServings} Servings</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Food Type</span>
                      <span className="font-semibold">{d.foodType?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  {/* Pickup OTP Box (Donor can see this!) */}
                  {d.pickupOtp && (
                    <div className="mt-4 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-emerald-300 font-medium">Pickup OTP:</span>
                      <span className="font-mono text-base font-black text-emerald-400 tracking-wider">
                        {d.pickupOtp}
                      </span>
                    </div>
                  )}

                  {d.matchedNgoId && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-purple-400" />
                      <span className="truncate">Shelter: {d.matchedNgoId.name}</span>
                    </div>
                  )}

                  {d.assignedDriverId && (
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-300">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <span className="truncate">Driver: {d.assignedDriverId.name}</span>
                    </div>
                  )}
                </div>

                <Link
                  to={`/donor/donations/${d._id}`}
                  className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
                >
                  <span>View Live Tracker</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivered History */}
      {deliveredDonations.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Completed Rescues</span>
          </h2>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Food Item</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Shelter</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {deliveredDonations.map((d) => (
                    <tr key={d._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{d.title}</td>
                      <td className="py-3 px-4">{d.quantity?.estimatedServings} Servings</td>
                      <td className="py-3 px-4 text-slate-400">{d.matchedNgoId?.name || 'Assigned Shelter'}</td>
                      <td className="py-3 px-4 text-slate-400">{d.assignedDriverId?.name || 'Courier'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(d.status)}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link to={`/donor/donations/${d._id}`} className="text-xs text-emerald-400 hover:underline">
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
  );
};

export default DonorDashboard;
