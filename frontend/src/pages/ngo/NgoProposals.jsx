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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/ngo" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shelter Hub</span>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Match Proposals Pipeline</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review candidates scored and proposed by the matching engine.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading proposals...</div>
      ) : proposals.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800 space-y-3">
          <Package className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-300">No active proposals right now</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            All surplus food in your area has been matched or accepted. New proposals will appear here in real-time.
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
                className="glass-panel rounded-3xl p-6 border border-slate-700/80 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedBreakdown(m)}
                      className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:scale-105 transition-transform"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{m.matchScore}% Match Score</span>
                      <Info className="w-3 h-3 ml-0.5 text-slate-400" />
                    </button>

                    {d.urgency && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {d.urgency}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white">{d.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{d.description || 'Surplus rescue donation'}</p>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Quantity</span>
                      <span className="font-bold text-white">{d.quantity?.estimatedServings} Servings</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Category</span>
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

                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{d.pickupLocation?.address || 'City Center'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => handleAccept(m._id)}
                    disabled={actionLoading === m._id}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleDecline(m._id)}
                    disabled={actionLoading === m._id}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
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

      {/* Breakdown Modal */}
      {selectedBreakdown && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Score Breakdown</h3>
              <button onClick={() => setSelectedBreakdown(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-800/50">
                <span>Distance (30%)</span>
                <span className="font-bold text-emerald-400">{selectedBreakdown.scoreBreakdown?.distanceScore} / 100</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/50">
                <span>Urgency (25%)</span>
                <span className="font-bold text-emerald-400">{selectedBreakdown.scoreBreakdown?.urgencyScore} / 100</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/50">
                <span>Capacity (20%)</span>
                <span className="font-bold text-emerald-400">{selectedBreakdown.scoreBreakdown?.capacityScore} / 100</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/50">
                <span>Compatibility (15%)</span>
                <span className="font-bold text-emerald-400">{selectedBreakdown.scoreBreakdown?.compatibilityScore} / 100</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/50">
                <span>Driver Fleet (10%)</span>
                <span className="font-bold text-emerald-400">{selectedBreakdown.scoreBreakdown?.driverScore} / 100</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedBreakdown(null)}
              className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NgoProposals;
