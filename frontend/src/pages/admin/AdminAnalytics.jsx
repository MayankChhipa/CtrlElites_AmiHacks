import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { BarChart3, ArrowLeft, TrendingUp, Leaf, Package, Users, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'];

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/impact');
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load telemetry analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span>Loading telemetry models and charts...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Analytics Unavailable</h2>
        <p className="text-slate-400 text-sm">{error || 'Could not load impact data.'}</p>
        <Link to="/admin" className="inline-block px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-sm font-semibold">
          Back to Overview
        </Link>
      </div>
    );
  }

  const { impact, donationsByFoodType = [], donationsByStatus = [], impactOverTime = [], usersByRole = {} } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Administration Overview</span>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Impact & Platform Telemetry</h1>
        <p className="text-slate-400 text-sm mt-1">
          Visual insights into hunger prevention, carbon abatement, food types, and operational velocity.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80">
          <span className="text-xs uppercase text-slate-400 font-bold block">Meals Rescued</span>
          <div className="text-3xl font-black text-white mt-1">{impact.totalMealsRescued}</div>
          <span className="text-[11px] text-emerald-400 font-medium">To verified shelters</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80">
          <span className="text-xs uppercase text-slate-400 font-bold block">Food Saved</span>
          <div className="text-3xl font-black text-white mt-1">{impact.totalWeightKgSaved} kg</div>
          <span className="text-[11px] text-teal-400 font-medium">Diverted from landfill</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80">
          <span className="text-xs uppercase text-slate-400 font-bold block">CO₂ Abated</span>
          <div className="text-3xl font-black text-white mt-1">{impact.totalCo2PreventedKg} kg</div>
          <span className="text-[11px] text-cyan-400 font-medium">1kg food ≈ 2.5kg CO₂e</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80">
          <span className="text-xs uppercase text-slate-400 font-bold block">Rescues Executed</span>
          <div className="text-3xl font-black text-white mt-1">{impact.totalRescuesCompleted}</div>
          <span className="text-[11px] text-purple-400 font-medium">{impact.activeDonationsCount} active in queue</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impact Over Time AreaChart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Rescued Meals Velocity</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            {impactOverTime.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Not enough historical rescue batches yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={impactOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mealGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="mealsRescued" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#mealGradient)" name="Meals Rescued" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Food Categories BarChart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-400" />
              <span>Rescues by Food Category (Servings)</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            {donationsByFoodType.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No food donations recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={donationsByFoodType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="foodType" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => val.split('_')[0]} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="servings" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Total Servings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution PieChart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 space-y-4">
          <h3 className="text-base font-bold text-white">Donation Status Pipeline</h3>
          <div className="h-64 w-full flex items-center justify-center">
            {donationsByStatus.length === 0 ? (
              <div className="text-xs text-slate-500">No donations in pipeline.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donationsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => `${status.split('_')[0]}: ${count}`}
                  >
                    {donationsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Community Breakdown Cards */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 space-y-4 flex flex-col justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Active Community Roles</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 uppercase text-[10px] block font-semibold">Registered Donors</span>
              <span className="text-xl font-bold text-emerald-400">{usersByRole.DONOR || 0}</span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 uppercase text-[10px] block font-semibold">Partner Shelters</span>
              <span className="text-xl font-bold text-purple-400">{usersByRole.NGO || 0}</span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 uppercase text-[10px] block font-semibold">Rescue Couriers</span>
              <span className="text-xl font-bold text-amber-400">{usersByRole.DRIVER || 0}</span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 uppercase text-[10px] block font-semibold">System Admins</span>
              <span className="text-xl font-bold text-rose-400">{usersByRole.ADMIN || 0}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400">
            Real-time telemetry reflects all registered food recovery activity verified across the database.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
