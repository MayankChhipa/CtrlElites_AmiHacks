import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  AlertCircle,
  Heart,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleVerification = async (userId, currentStatus) => {
    setActionLoading(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/verify`, {
        isVerified: !currentStatus,
      });
      if (res.data.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isVerified: !currentStatus } : u))
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update verification status');
    } finally {
      setActionLoading(null);
    }
  };

  // Warm Impact Role Badges
  const getRoleBadge = (role) => {
    switch (role) {
      case 'DONOR':
        return 'bg-amber-100 text-amber-900 border-amber-300/80';
      case 'NGO':
        return 'bg-orange-100 text-orange-900 border-orange-300/80';
      case 'DRIVER':
        return 'bg-yellow-100 text-yellow-900 border-yellow-300/80';
      case 'ADMIN':
        return 'bg-red-100 text-red-900 border-red-300/80';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 text-stone-800 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation & Header with FR Monogram Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-xs font-bold text-red-700 hover:text-red-900 transition-all hover:-translate-x-1"
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
            <span>Back to Administration Overview</span>
          </Link>

          {/* FR Monogram Branding Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FFFDF6] px-4 py-1.5 rounded-full shadow-md shadow-orange-900/5 border border-orange-200/60 self-start sm:self-auto">
            <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-xs tracking-tighter shadow-inner">
              FR
            </div>
            <span className="text-xs font-black tracking-wider text-red-900 uppercase">
              FoodRescue Admin
            </span>
          </div>
        </div>

        {/* Hero Card Banner with Warm Illustration Touch */}
        <div className="bg-[#FFFDF6] rounded-3xl p-6 sm:p-8 shadow-xl shadow-orange-900/5 border border-orange-100 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-xs font-black uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 fill-orange-500 text-orange-500" /> Community Champions
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-red-950">
              Platform Users & Verification
            </h1>
            <p className="text-stone-600 text-sm sm:text-base font-medium">
              Review community shelters and rescue drivers, manage compliance, and champion team verification for maximum social impact.
            </p>
          </div>

          {/* Flat Friendly Illustration Graphic */}
          <div className="shrink-0 z-10 hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-200/50 to-amber-200/50 p-4 rounded-2xl border border-orange-200/60">
            <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center text-2xl shadow-sm">
              🍎
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-400 flex items-center justify-center text-2xl shadow-sm">
              🍞
            </div>
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-2xl shadow-sm">
              ❤️
            </div>
          </div>

          {/* Warm background glow decoration */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-orange-200/40 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-100 border-2 border-red-300 text-red-900 text-sm font-bold flex items-center gap-3 shadow-md shadow-red-900/5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-[#FFFDF6] p-4 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Role Pill Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1.5 bg-orange-100/60 rounded-full border border-orange-200/80">
            {['', 'DONOR', 'NGO', 'DRIVER', 'ADMIN'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-4 py-2 rounded-full text-xs font-black tracking-wide transition-all ${
                  roleFilter === r
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105'
                    : 'text-stone-700 hover:text-red-900 hover:bg-orange-200/50'
                }`}
              >
                {r || 'All Roles'}
              </button>
            ))}
          </div>

          {/* Rounded Input & Pill Search Button */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-orange-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-orange-50/50 border border-orange-200 rounded-full text-xs font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-full shadow-md shadow-red-600/20 active:scale-95 transition-all shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        {/* Users Table Card */}
        <div className="bg-[#FFFDF6] rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-orange-100/70 text-xs uppercase tracking-wider font-black text-stone-600 border-b border-orange-200/60">
                <tr>
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Contact</th>
                  <th className="py-4 px-6">Verification</th>
                  <th className="py-4 px-6">Joined</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-500 font-medium">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        Fetching community members...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-500 font-medium">
                      No users found matching query.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id} className="hover:bg-orange-50/60 transition-colors">
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-red-950 text-base">{u.name}</div>
                        <div className="text-xs font-medium text-stone-500">{u.email}</div>
                      </td>

                      {/* Visual Role Card Badge */}
                      <td className="py-4 px-6">
                        <span className={`inline-block text-[11px] font-black px-3 py-1 rounded-full border shadow-sm uppercase tracking-wider ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-6 text-xs font-semibold text-stone-600">
                        {u.phone || 'N/A'}
                      </td>

                      {/* Verification Status */}
                      <td className="py-4 px-6">
                        {u.isVerified ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300/80 shadow-sm">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300/80 shadow-sm">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-xs font-semibold text-stone-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action CTA Pill Button */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleToggleVerification(u._id, u.isVerified)}
                          disabled={actionLoading === u._id}
                          className={`text-xs font-black px-4 py-2 rounded-full transition-all border shadow-sm active:scale-95 ${
                            u.isVerified
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-600'
                              : 'bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-red-600/20'
                          }`}
                        >
                          {actionLoading === u._id
                            ? 'Updating...'
                            : u.isVerified
                            ? 'Reject / Revoke'
                            : 'Verify Account'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminUsers;