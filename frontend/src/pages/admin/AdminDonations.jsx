import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowLeft, Filter, AlertCircle, Clock } from 'lucide-react';
import api from '../../services/api';

const AdminDonations = () => {
  const [donations, setDonations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (foodTypeFilter) params.append('foodType', foodTypeFilter);

      const res = await api.get(`/admin/donations?${params.toString()}`);
      if (res.data.success) {
        setDonations(res.data.donations || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [statusFilter, foodTypeFilter]);

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
    return map[status] || 'bg-slate-700 text-slate-300';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Administration Overview</span>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Global Surplus Pipeline</h1>
        <p className="text-slate-400 text-sm mt-1">
          Inspect all food donations created on the network and filter by lifecycle status or category.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-700/80 flex flex-wrap items-center gap-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl glass-input text-xs bg-slate-900 text-white"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_MATCH">Pending Match</option>
            <option value="MATCHED">Matched (Accepted by Shelter)</option>
            <option value="DRIVER_ASSIGNED">Driver Assigned</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="VERIFIED">Verified</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Food Category</label>
          <select
            value={foodTypeFilter}
            onChange={(e) => setFoodTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl glass-input text-xs bg-slate-900 text-white"
          >
            <option value="">All Food Types</option>
            <option value="COOKED_MEALS">Cooked Meals</option>
            <option value="RAW_PRODUCE">Raw Produce</option>
            <option value="PACKAGED_FOOD">Packaged Food</option>
            <option value="BAKERY">Bakery</option>
            <option value="DAIRY">Dairy</option>
          </select>
        </div>
      </div>

      {/* Donations Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Donor</th>
                <th className="py-3 px-4">Shelter</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading donations...</td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No donations found.</td>
                </tr>
              ) : (
                donations.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-white">{d.title}</td>
                    <td className="py-3 px-4 text-xs text-slate-300">{d.donorId?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-xs text-slate-300">{d.matchedNgoId?.name || 'Pending Match'}</td>
                    <td className="py-3 px-4 text-xs">{d.quantity?.estimatedServings} Meals</td>
                    <td className="py-3 px-4 text-xs">
                      {d.urgency ? (
                        <span className="font-semibold text-amber-400">{d.urgency}</span>
                      ) : (
                        'Standard'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(d.status)}`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDonations;
