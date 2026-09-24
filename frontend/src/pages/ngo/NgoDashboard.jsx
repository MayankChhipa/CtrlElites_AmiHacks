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
        return 'bg-rose-100 text-rose-950 border-rose-300 animate-pulse';
      case 'HIGH':
        return 'bg-amber-100 text-amber-950 border-amber-300';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-950 border-blue-300';
      default:
        return 'bg-emerald-100 text-emerald-950 border-emerald-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 text-stone-800 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Monogram Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-red-950 tracking-tight">Shelter Intake & Operations</h1>
            <p className="text-stone-600 text-sm font-medium mt-1">
              Review incoming surplus match proposals, track capacity, and receive food rescues.
            </p>
          </div>

          {/* FR Monogram Branding Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FFFDF6] px-4 py-1.5 rounded-full shadow-md shadow-orange-900/5 border border-orange-200/60 self-start sm:self-auto">
            <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-xs tracking-tighter shadow-inner">
              FR
            </div>
            <span className="text-xs font-black tracking-wider text-red-900 uppercase">
              Shelter Operations
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-100 border border-red-300 flex items-center gap-3 text-red-900 font-bold text-sm shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Capacity Overview Card */}
        <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-black tracking-wider text-orange-800 block">
                Daily Meal Capacity
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black text-red-950">{capacity.availableCapacity}</span>
                <span className="text-xs font-bold text-stone-500">
                  / {capacity.capacityDailyMeals} meals available today
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-orange-50/80 px-4 py-2.5 rounded-2xl border border-orange-100">
              <div className="text-right">
                <span className="text-[10px] uppercase font-black text-stone-400 block">Allocated / Reserved</span>
                <span className="text-sm font-black text-amber-700">{capacity.allocatedCapacity} meals</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-orange-100/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-orange-200/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                capacity.utilizationPercentage > 85
                  ? 'bg-red-600'
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
            <h2 className="text-xl font-black text-red-950 flex items-center gap-2.5">
              <span>Incoming Food Match Proposals</span>
              <span className="text-xs bg-orange-100 text-orange-950 font-black px-2.5 py-0.5 rounded-full border border-orange-200">
                {proposals.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="bg-[#FFFDF6] p-12 rounded-3xl shadow-xl shadow-orange-900/5 text-center text-stone-600 font-bold border border-orange-100">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <span>Loading incoming proposals...</span>
            </div>
          ) : proposals.length === 0 ? (
            <div className="bg-[#FFFDF6] p-10 rounded-3xl text-center border border-orange-100 shadow-xl shadow-orange-900/5 space-y-2">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto mb-2">
                <Package className="w-7 h-7 stroke-[2]" />
              </div>
              <h3 className="text-base font-black text-red-950">No pending proposals</h3>
              <p className="text-stone-600 text-xs font-medium max-w-sm mx-auto">
                You will automatically receive high-compatibility surplus proposals when nearby food donors post surplus meals.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proposals.map((m) => {
                const d = m.donationId;
                if (!d) return null;

                return (
                  <div
                    key={m._id}
                    className="bg-[#FFFDF6] rounded-3xl p-6 border border-orange-100 shadow-xl shadow-orange-900/5 hover:shadow-2xl hover:border-orange-300 transition-all flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        {/* Match Score Badge */}
                        <button
                          onClick={() => setSelectedBreakdown(m)}
                          className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 hover:scale-105 transition-transform shadow-sm"
                          title="Click to view score breakdown"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                          <span>Match {m.matchScore}%</span>
                          <Info className="w-3 h-3 text-emerald-700 ml-0.5" />
                        </button>

                        {d.urgency && (
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm ${getUrgencyBadge(d.urgency)}`}>
                            {d.urgency} ({d.timeRemainingFormatted})
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-black text-base text-red-950 line-clamp-1">{d.title}</h3>
                        <p className="text-xs text-stone-600 font-medium mt-1 line-clamp-2">{d.description || 'Surplus rescue donation'}</p>
                      </div>

                      <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-100 grid grid-cols-2 gap-2.5 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-black text-stone-400 block">Quantity</span>
                          <span className="font-black text-red-950 text-sm">{d.quantity?.estimatedServings} Servings</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-black text-stone-400 block">Food Type</span>
                          <span className="font-bold text-stone-800">{d.foodType?.replace(/_/g, ' ')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-black text-stone-400 block">Dietary</span>
                          <span className="font-bold text-stone-800">{d.dietaryPreference}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-black text-stone-400 block">Distance</span>
                          <span className="font-bold text-stone-800">{m.scoreBreakdown?.distanceKm || '~2.0'} km</span>
                        </div>
                      </div>

                      <div className="text-xs text-stone-600 flex items-center gap-2 truncate pt-1">
                        <MapPin className="w-4 h-4 text-emerald-700 shrink-0 stroke-[2.5]" />
                        <span className="truncate font-medium">{d.pickupLocation?.address || 'City Center'}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-orange-100">
                      <button
                        onClick={() => handleAccept(m._id)}
                        disabled={actionLoading === m._id}
                        className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-full flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {actionLoading === m._id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Accept</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDecline(m._id)}
                        disabled={actionLoading === m._id}
                        className="py-3 px-3 bg-stone-100 hover:bg-red-100 hover:text-red-950 hover:border-red-300 border border-stone-200 text-stone-700 text-xs font-black rounded-full flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <X className="w-4 h-4 stroke-[3]" />
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
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl border border-orange-200 shadow-2xl max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 fill-amber-500" />
                  <h3 className="font-black text-base text-red-950">Algorithm Score Breakdown</h3>
                </div>
                <button
                  onClick={() => setSelectedBreakdown(null)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-orange-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center py-3 bg-orange-50/80 rounded-2xl border border-orange-100">
                <span className="text-[10px] uppercase text-stone-500 font-black block">Total Match Compatibility</span>
                <span className="text-4xl font-black text-emerald-700 block mt-0.5">
                  {selectedBreakdown.matchScore}%
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200/60">
                  <span className="text-stone-700 font-bold">Distance Proximity (30% weight)</span>
                  <span className="font-black text-emerald-700">{selectedBreakdown.scoreBreakdown?.distanceScore || 0} / 100</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200/60">
                  <span className="text-stone-700 font-bold">Perishability Urgency (25% weight)</span>
                  <span className="font-black text-emerald-700">{selectedBreakdown.scoreBreakdown?.urgencyScore || 0} / 100</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200/60">
                  <span className="text-stone-700 font-bold">Shelter Capacity Headroom (20% weight)</span>
                  <span className="font-black text-emerald-700">{selectedBreakdown.scoreBreakdown?.capacityScore || 0} / 100</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200/60">
                  <span className="text-stone-700 font-bold">Food & Dietary Compatibility (15% weight)</span>
                  <span className="font-black text-emerald-700">{selectedBreakdown.scoreBreakdown?.compatibilityScore || 0} / 100</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200/60">
                  <span className="text-stone-700 font-bold">Fleet Driver Availability (10% weight)</span>
                  <span className="font-black text-emerald-700">{selectedBreakdown.scoreBreakdown?.driverScore || 0} / 100</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedBreakdown(null)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-black shadow-md shadow-red-600/20 active:scale-95 transition-all"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NgoDashboard;