import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Package,
  Check,
  X,
  AlertCircle,
  Clock,
  MapPin,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

const NgoDashboard = () => {
  const [capacity, setCapacity] = useState({
    capacityDailyMeals: 150,
    allocatedCapacity: 0,
    availableCapacity: 150,
    utilizationPercentage: 0,
  });
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);

  const fetchData = async () => {
    try {
      const [capRes, propRes] = await Promise.all([
        api.get('/matches/capacity'),
        api.get('/matches/proposals'),
      ]);

      if (capRes.data.success) {
        setCapacity(capRes.data);
      }
      if (propRes.data.success) {
        setProposals(propRes.data.proposals || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load shelter data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    if (socket) {
      const handleProposal = () => {
        fetchData();
      };

      socket.on('match_proposed', handleProposal);
      socket.on('match_accepted', handleProposal);
      socket.on('match_declined', handleProposal);
      socket.on('delivery_completed', handleProposal);
      socket.on('delivery_verified', handleProposal);

      return () => {
        socket.off('match_proposed', handleProposal);
        socket.off('match_accepted', handleProposal);
        socket.off('match_declined', handleProposal);
        socket.off('delivery_completed', handleProposal);
        socket.off('delivery_verified', handleProposal);
      };
    }
  }, []);

  const handleAccept = async (matchId) => {
    setActionLoading(matchId);
    setError('');
    try {
      const res = await api.patch(`/matches/${matchId}/accept`);
      if (res.data.success) {
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (matchId) => {
    setActionLoading(matchId);
    setError('');
    try {
      const res = await api.patch(`/matches/${matchId}/decline`);
      if (res.data.success) {
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to decline proposal');
    } finally {
      setActionLoading(null);
    }
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
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Shelter Intake & Operations</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review incoming surplus match proposals, track capacity, and receive food rescues.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Capacity Overview Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-purple-400 font-bold block">
              Daily Meal Capacity
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white">{capacity.availableCapacity}</span>
              <span className="text-sm text-slate-400 font-medium">
                / {capacity.capacityDailyMeals} meals available today
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium block">Allocated / Reserved</span>
              <span className="text-base font-bold text-amber-400">{capacity.allocatedCapacity} meals</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              capacity.utilizationPercentage > 85
                ? 'bg-rose-500'
                : capacity.utilizationPercentage > 50
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, capacity.utilizationPercentage || 0)}%` }}
          ></div>
        </div>
      </div>

      {/* Incoming Proposals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Incoming Food Match Proposals</span>
            <span className="text-xs bg-purple-500/20 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-500/30">
              {proposals.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading incoming proposals...</div>
        ) : proposals.length === 0 ? (
          <div className="glass-panel p-10 rounded-2xl text-center border border-slate-800 space-y-2">
            <Package className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No pending proposals</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              You will automatically receive high-compatibility surplus proposals when nearby restaurants post food.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {proposals.map((m) => {
              const d = m.donationId;
              if (!d) return null;

              return (
                <div
                  key={m._id}
                  className="glass-panel rounded-2xl p-5 border border-slate-700/80 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      {/* Match Score Badge */}
                      <button
                        onClick={() => setSelectedBreakdown(m)}
                        className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 hover:scale-105 transition-transform"
                        title="Click to view score breakdown"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Match {m.matchScore}%</span>
                        <Info className="w-3 h-3 ml-0.5 text-slate-400" />
                      </button>

                      {d.urgency && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getUrgencyBadge(d.urgency)}`}>
                          {d.urgency} ({d.timeRemainingFormatted})
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-white line-clamp-1">{d.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{d.description || 'Surplus rescue donation'}</p>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Quantity</span>
                        <span className="font-bold text-white">{d.quantity?.estimatedServings} Servings</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Food Type</span>
                        <span className="font-medium text-slate-300">{d.foodType?.replace(/_/g, ' ')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Dietary</span>
                        <span className="font-medium text-slate-300">{d.dietaryPreference}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Distance</span>
                        <span className="font-medium text-slate-300">{m.scoreBreakdown?.distanceKm || '~2.0'} km</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{d.pickupLocation?.address || 'City Center'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleAccept(m._id)}
                      disabled={actionLoading === m._id}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleDecline(m._id)}
                      disabled={actionLoading === m._id}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/40 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Match Score Breakdown Modal */}
      {selectedBreakdown && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Algorithm Score Breakdown</h3>
              </div>
              <button
                onClick={() => setSelectedBreakdown(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-2 bg-slate-900/60 rounded-2xl border border-slate-800">
              <span className="text-xs uppercase text-slate-400 font-semibold block">Total Match Compatibility</span>
              <span className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                {selectedBreakdown.matchScore}%
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                <span className="text-slate-300 font-medium">Distance Proximity (30% weight)</span>
                <span className="font-bold text-emerald-400">{selectedBreakdown.scoreBreakdown?.distanceScore || 0} / 100</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                <span className="text-slate-300 font-medium">Perishability Urgency (25% weight)</span>
                <span className="font-bold text-emerald-400">{selectedBreakdown.scoreBreakdown?.urgencyScore || 0} / 100</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                <span className="text-slate-300 font-medium">Shelter Capacity Headroom (20% weight)</span>
                <span className="font-bold text-emerald-400">{selectedBreakdown.scoreBreakdown?.capacityScore || 0} / 100</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                <span className="text-slate-300 font-medium">Food & Dietary Compatibility (15% weight)</span>
                <span className="font-bold text-emerald-400">{selectedBreakdown.scoreBreakdown?.compatibilityScore || 0} / 100</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                <span className="text-slate-300 font-medium">Fleet Driver Availability (10% weight)</span>
                <span className="font-bold text-emerald-400">{selectedBreakdown.scoreBreakdown?.driverScore || 0} / 100</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedBreakdown(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NgoDashboard;
