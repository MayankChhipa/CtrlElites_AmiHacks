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
      PENDING_MATCH: 'bg-[#FFE0B2] text-[#C2410C] border-[#E8A05B]',
      MATCHED: 'bg-[#F6D7D0] text-[#B23A48] border-[#D99A9A]',
      DRIVER_ASSIGNED: 'bg-[#F0D7DF] text-[#8B3A62] border-[#C89AAD]',
      PICKED_UP: 'bg-[#FFE1C7] text-[#D45A2A] border-cyan-500/40',
      IN_TRANSIT: 'bg-[#FFE0C2] text-[#C2410C] border-teal-500/40',
      DELIVERED: 'bg-[#FFD8CC] text-[#D92D20] border-[#E88B72]',
      VERIFIED: 'bg-[#FFC7BD] text-[#B91C1C] border-[#D92D20]',
      EXPIRED: 'bg-[#FFD1C7] text-[#C62828] border-[#E8A08A]',
      CANCELLED: 'bg-[#F1D9A8] text-[#6B3A2A] border-[#D9B97D]',
    };
    return map[status] || 'bg-[#F1D9A8] text-[#6B3A2A]';
  };

  return (
    <div className="min-h-screen bg-[#FFF3C7] text-[#5A1A12] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-[#8A5A4A] hover:text-[#5A1A12] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Administration Overview</span>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D92D20] text-[#FFF8E7] flex items-center justify-center font-black text-lg shadow-lg shadow-[#D92D20]/25 flex-shrink-0">
            FR
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#5A1A12]">Global Surplus Pipeline</h1>
        <p className="text-[#8A5A4A] text-sm mt-1">
          Inspect all food donations created on the network and filter by lifecycle status or category.
        </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 bg-[#FFF8E7] border border-[#E8C98B] rounded-3xl px-4 py-3 shadow-[0_8px_24px_rgba(183,96,42,0.10)]">
          <div className="relative w-12 h-12 rounded-full bg-[#FFD9B8] border-2 border-[#D92D20] flex items-center justify-center overflow-hidden">
            <div className="absolute top-1 w-7 h-5 bg-[#5A1A12] rounded-t-full"></div>
            <div className="mt-1 flex gap-1.5">
              <span className="w-1.5 h-2.5 bg-[#5A1A12] rounded-full"></span>
              <span className="w-1.5 h-2.5 bg-[#5A1A12] rounded-full"></span>
            </div>
            <div className="absolute bottom-1.5 w-5 h-1 rounded-full bg-[#D92D20]"></div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-black text-[#D92D20]">Food Rescue</div>
            <div className="text-xs font-bold text-[#6B3A2A]">Every meal matters ✦</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[#C62828] text-sm">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-[#FFF8E7] shadow-[0_10px_30px_rgba(183,96,42,0.12)] p-4 rounded-3xl border border-[#E8C98B] flex flex-wrap items-center gap-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-[#8A5A4A] block mb-1">Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl text-xs bg-[#FFF8E7] text-[#5A1A12] border border-[#E8C98B] outline-none focus:ring-2 focus:ring-[#D92D20]/20"
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
          <label className="text-[10px] uppercase font-bold text-[#8A5A4A] block mb-1">Food Category</label>
          <select
            value={foodTypeFilter}
            onChange={(e) => setFoodTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl text-xs bg-[#FFF8E7] text-[#5A1A12] border border-[#E8C98B] outline-none focus:ring-2 focus:ring-[#D92D20]/20"
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
      <div className="bg-[#FFF8E7] shadow-[0_12px_32px_rgba(183,96,42,0.12)] rounded-3xl overflow-hidden border border-[#E8C98B]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#6B3A2A]">
            <thead className="bg-[#FFF8E7]/80 text-xs uppercase text-[#8A5A4A] border-b border-[#E8C98B]">
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
            <tbody className="divide-y divide-[#E8C98B]/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#8A5A4A]">Loading donations...</td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#8A5A4A]">No donations found.</td>
                </tr>
              ) : (
                donations.map((d) => (
                  <tr key={d._id} className="hover:bg-[#FFE8B0]">
                    <td className="py-3 px-4 font-semibold text-[#5A1A12]">{d.title}</td>
                    <td className="py-3 px-4 text-xs text-[#6B3A2A]">{d.donorId?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-xs text-[#6B3A2A]">{d.matchedNgoId?.name || 'Pending Match'}</td>
                    <td className="py-3 px-4 text-xs">{d.quantity?.estimatedServings} Meals</td>
                    <td className="py-3 px-4 text-xs">
                      {d.urgency ? (
                        <span className="font-semibold text-[#C2410C]">{d.urgency}</span>
                      ) : (
                        'Standard'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(d.status)}`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#8A5A4A]">
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
