import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Check,
  X,
  Sparkles,
  MapPin,
  Clock,
  ArrowLeft,
  Info,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

const NgoProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);

  const fetchProposals = async () => {
    try {
      const res = await api.get('/matches/proposals');
      if (res.data.success) {
        setProposals(res.data.proposals || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();

    const socket = getSocket();
    if (socket) {
      const handleProposal = () => {
        fetchProposals();
      };

      socket.on('match_proposed', handleProposal);
      socket.on('match_accepted', handleProposal);
      socket.on('match_declined', handleProposal);

      return () => {
        socket.off('match_proposed', handleProposal);
        socket.off('match_accepted', handleProposal);
        socket.off('match_declined', handleProposal);
      };
    }
  }, []);

  const handleAccept = async (matchId) => {
    setActionLoading(matchId);
    try {
      const res = await api.patch(`/matches/${matchId}/accept`);
      if (res.data.success) {
        fetchProposals();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (matchId) => {
    setActionLoading(matchId);
    try {
      const res = await api.patch(`/matches/${matchId}/decline`);
      if (res.data.success) {
        fetchProposals();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to decline proposal');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 text-stone-800 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/ngo"
            className="inline-flex items-center gap-1.5 text-xs font-black text-stone-600 hover:text-red-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Shelter Hub</span>
          </Link>
        </div>

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-red-950">Match Proposals Pipeline</h1>
          <p className="text-stone-600 text-xs sm:text-sm font-medium mt-1">
            Review candidates scored and proposed in real-time by the intelligent surplus matching engine.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs font-bold shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 stroke-[2]" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="bg-[#FFFDF6] p-12 rounded-3xl border border-orange-100 shadow-xl shadow-orange-900/5 text-center">
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="text-stone-700 font-bold text-sm">Evaluating match candidates...</span>
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-[#FFFDF6] p-12 rounded-3xl text-center border border-orange-100 shadow-xl shadow-orange-900/5 space-y-3 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto">
              <Package className="w-7 h-7 stroke-[2]" />
            </div>
            <h3 className="text-lg font-black text-red-950">No active proposals right now</h3>
            <p className="text-stone-600 text-xs font-medium leading-relaxed">
              All surplus food in your area has been matched or accepted. New proposals will appear here automatically when available.
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
                  className="bg-[#FFFDF6] rounded-3xl p-6 border border-orange-100 hover:border-orange-300 shadow-xl shadow-orange-900/5 transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedBreakdown(m)}
                        className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 hover:scale-105 transition-transform"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{m.matchScore}% Match Score</span>
                        <Info className="w-3 h-3 ml-0.5 text-emerald-700 stroke-[2.5]" />
                      </button>

                      {d.urgency && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                          {d.urgency}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-black text-base text-red-950">{d.title}</h3>
                      <p className="text-xs text-stone-600 font-medium mt-1 line-clamp-2">
                        {d.description || 'Surplus rescue donation'}
                      </p>
                    </div>

                    <div className="p-3 bg-orange-50/60 rounded-2xl border border-orange-100/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-black text-stone-400 block">Quantity</span>
                        <span className="font-black text-red-950">{d.quantity?.estimatedServings} Servings</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-black text-stone-400 block">Category</span>
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

                    <div className="text-xs text-stone-600 font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-600 flex-shrink-0 stroke-[2.5]" />
                      <span className="truncate">{d.pickupLocation?.address || 'City Center'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-orange-100">
                    <button
                      onClick={() => handleAccept(m._id)}
                      disabled={actionLoading === m._id}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-full flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleDecline(m._id)}
                      disabled={actionLoading === m._id}
                      className="py-2.5 px-3 bg-orange-100 hover:bg-rose-100 text-stone-700 hover:text-rose-900 border border-orange-200 text-xs font-black rounded-full flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Score Breakdown Modal */}
        {selectedBreakdown && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl border border-orange-200 shadow-2xl max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <h3 className="font-black text-base text-red-950">Match Score Breakdown</h3>
                <button
                  onClick={() => setSelectedBreakdown(null)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-orange-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-3 rounded-2xl bg-orange-50/80 border border-orange-100/80">
                  <span className="font-bold text-stone-700">Distance (30%)</span>
                  <span className="font-black text-emerald-700">
                    {selectedBreakdown.scoreBreakdown?.distanceScore} / 100
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-2xl bg-orange-50/80 border border-orange-100/80">
                  <span className="font-bold text-stone-700">Urgency (25%)</span>
                  <span className="font-black text-emerald-700">
                    {selectedBreakdown.scoreBreakdown?.urgencyScore} / 100
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-2xl bg-orange-50/80 border border-orange-100/80">
                  <span className="font-bold text-stone-700">Capacity (20%)</span>
                  <span className="font-black text-emerald-700">
                    {selectedBreakdown.scoreBreakdown?.capacityScore} / 100
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-2xl bg-orange-50/80 border border-orange-100/80">
                  <span className="font-bold text-stone-700">Compatibility (15%)</span>
                  <span className="font-black text-emerald-700">
                    {selectedBreakdown.scoreBreakdown?.compatibilityScore} / 100
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-2xl bg-orange-50/80 border border-orange-100/80">
                  <span className="font-bold text-stone-700">Driver Fleet (10%)</span>
                  <span className="font-black text-emerald-700">
                    {selectedBreakdown.scoreBreakdown?.driverScore} / 100
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedBreakdown(null)}
                className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-black transition-all active:scale-95"
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

export default NgoProposals;