import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  Truck,
  TrendingUp,
  Leaf,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  BarChart3,
} from 'lucide-react';
import api from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [expiringDonations, setExpiringDonations] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    try {
      const [statsRes, expiringRes, deliveriesRes] = await Promise.all([
        api.get('/admin/statistics'),
        api.get('/admin/donations/expiring'),
        api.get('/admin/deliveries/active'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (expiringRes.data.success) setExpiringDonations(expiringRes.data.expiringDonations || []);
      if (deliveriesRes.data.success) setActiveDeliveries(deliveriesRes.data.deliveries || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load administrator data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF3C7] text-[#5A1A12] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D92D20] text-[#FFF8E7] flex items-center justify-center font-black text-lg shadow-lg shadow-[#D92D20]/25">FR</div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#5A1A12]">Platform Administration</h1>
          <p className="text-[#8A5A4A] text-sm mt-1">
            Global monitoring of food rescue pipeline, user verifications, active fleet, and impact telemetry.
          </p>
        </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/analytics"
            className="px-4 py-2 bg-[#FFF8E7] hover:bg-[#FFE8B0] text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4 text-[#D92D20]" />
            <span>Telemetry Charts</span>
          </Link>
          <Link
            to="/admin/users"
            className="px-4 py-2 bg-[#D92D20] hover:bg-[#B91C1C] text-[#5A1A12] text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FFF0EB] border border-[#E8A08A] text-[#C62828] text-sm">
          {error}
        </div>
      )}

      {/* Primary KPI Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="bg-[#FFF8E7] shadow-[0_10px_30px_rgba(183,96,42,0.12)] p-5 rounded-3xl border border-[#E8C98B] border border-[#E8C98B]">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#8A5A4A] font-bold">Total Meals Rescued</span>
              <TrendingUp className="w-5 h-5 text-[#D92D20]" />
            </div>
            <div className="text-3xl font-black text-[#5A1A12] mt-2">{stats.impact?.totalMealsRescued || 0}</div>
            <span className="text-[11px] text-[#D92D20] font-medium">Verified zero-hunger impact</span>
          </div>

          <div className="bg-[#FFF8E7] shadow-[0_10px_30px_rgba(183,96,42,0.12)] p-5 rounded-3xl border border-[#E8C98B] border border-[#E8C98B]">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#8A5A4A] font-bold">CO₂ Prevented</span>
              <Leaf className="w-5 h-5 text-[#E4572E]" />
            </div>
            <div className="text-3xl font-black text-[#5A1A12] mt-2">{stats.impact?.totalCo2PreventedKg || 0} kg</div>
            <span className="text-[11px] text-[#E4572E] font-medium">{stats.impact?.totalWeightKgSaved || 0} kg food diverted</span>
          </div>

          <div className="bg-[#FFF8E7] shadow-[0_10px_30px_rgba(183,96,42,0.12)] p-5 rounded-3xl border border-[#E8C98B] border border-[#E8C98B]">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#8A5A4A] font-bold">Active Deliveries</span>
              <Truck className="w-5 h-5 text-[#C2410C]" />
            </div>
            <div className="text-3xl font-black text-[#5A1A12] mt-2">{stats.deliveries?.active || 0}</div>
            <span className="text-[11px] text-[#C2410C] font-medium">{stats.donations?.active || 0} donations active</span>
          </div>

          <div className="bg-[#FFF8E7] shadow-[0_10px_30px_rgba(183,96,42,0.12)] p-5 rounded-3xl border border-[#E8C98B] border border-[#E8C98B]">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#8A5A4A] font-bold">Platform Community</span>
              <Users className="w-5 h-5 text-[#B23A48]" />
            </div>
            <div className="text-3xl font-black text-[#5A1A12] mt-2">{stats.users?.total || 0}</div>
            <span className="text-[11px] text-[#B23A48] font-medium">
              {stats.users?.donors} donors • {stats.users?.ngos} shelters • {stats.users?.drivers} drivers
            </span>
          </div>
        </div>
      )}

      {/* Expiring Donations Alert Section */}
      {expiringDonations.length > 0 && (
        <div className="bg-[#FFF8E7] shadow-[0_10px_30px_rgba(183,96,42,0.12)] p-6 rounded-3xl border border-[#E8C98B] border border-[#E88B72] bg-[#FFE2D5] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#C62828]">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h2 className="text-base font-bold text-[#5A1A12]">Expiring Donations Requiring Attention</h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFD1C7] text-[#C62828] border border-[#E8A08A]">
              {expiringDonations.length} Urgent
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringDonations.map((d) => (
              <div key={d._id} className="p-4 bg-[#FFF8E7] rounded-2xl border border-[#E8A08A] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#5A1A12] truncate">{d.title}</span>
                  <span className="text-[10px] font-bold text-[#C62828] bg-[#FFF0EB] px-2 py-0.5 rounded">
                    {d.timeRemainingFormatted || 'Urgent'}
                  </span>
                </div>
                <div className="text-[11px] text-[#8A5A4A] flex justify-between">
                  <span>Donor: {d.donorId?.name}</span>
                  <span>{d.quantity?.estimatedServings} Meals</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Fleet Deliveries Tracker */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#5A1A12] flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#C2410C]" />
            <span>Active Rescue Fleet</span>
          </h2>
          <Link to="/admin/deliveries" className="text-xs text-[#D92D20] hover:underline">
            View All Deliveries
          </Link>
        </div>

        {activeDeliveries.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center border border-[#E8C98B] text-[#8A5A4A] text-sm">
            No deliveries currently en route. All claimed food has reached shelters.
          </div>
        ) : (
          <div className="bg-[#FFF8E7] shadow-[0_10px_30px_rgba(183,96,42,0.12)] rounded-3xl border border-[#E8C98B] overflow-hidden border border-[#E8C98B]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#6B3A2A]">
                <thead className="bg-[#FFF8E7] text-xs uppercase text-[#8A5A4A] border-b border-[#E8C98B]">
                  <tr>
                    <th className="py-3 px-4">Courier</th>
                    <th className="py-3 px-4">Food Item</th>
                    <th className="py-3 px-4">Donor Origin</th>
                    <th className="py-3 px-4">Shelter Destination</th>
                    <th className="py-3 px-4">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8C98B]/70">
                  {activeDeliveries.map((del) => (
                    <tr key={del._id} className="hover:bg-[#FFE8B0]">
                      <td className="py-3 px-4 font-semibold text-[#5A1A12]">{del.driverId?.name || 'Courier'}</td>
                      <td className="py-3 px-4">{del.donationId?.title || 'Surplus'}</td>
                      <td className="py-3 px-4 text-[#8A5A4A] text-xs">{del.donorId?.name}</td>
                      <td className="py-3 px-4 text-[#8A5A4A] text-xs">{del.ngoId?.name}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-[#C2410C] border border-amber-500/40">
                          {del.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
