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

const COLORS = ['#ef3d32', '#f59e0b', '#e85d04', '#d94841', '#f28c28', '#c94c4c'];

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
      <div className="min-h-screen bg-[#fff1d6] px-4 py-16 text-center text-[#8a5a3b]">
        <div className="w-10 h-10 border-4 border-[#ef3d32] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span>Loading telemetry models and charts...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fff1d6] px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-[#d92f26] mx-auto" />
        <h2 className="text-xl font-extrabold text-[#3b2118]">Analytics Unavailable</h2>
        <p className="text-[#8a5a3b] text-sm">{error || 'Could not load impact data.'}</p>
        <Link to="/admin" className="inline-block px-4 py-2 bg-[#fff1d6] text-[#5f3525] rounded-xl text-sm font-semibold">
          Back to Overview
        </Link>
      </div>
    );
  }

  const { impact, donationsByFoodType = [], donationsByStatus = [], impactOverTime = [], usersByRole = {} } = data;

  return (
    <div className="min-h-screen bg-[#fff1d6] px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ef3d32] text-white flex items-center justify-center font-black shadow-[0_8px_20px_rgba(217,47,38,0.2)]">FR</div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#9a4d2f]">FoodRescue</span>
        </div>
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-[#8a5a3b] hover:text-[#3b2118] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Administration Overview</span>
        </Link>
      </div>

      <div className="rounded-[2rem] bg-[#fffaf0] border border-[#f0c98d] p-7 sm:p-9 shadow-[0_14px_40px_rgba(128,72,30,0.10)]">
        <div className="flex items-center gap-2 mb-3">
          <Leaf className="w-5 h-5 text-[#e85d04]" />
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#d92f26]">Community Impact</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#3b2118]">Impact & Platform Telemetry</h1>
        <p className="text-[#8a5a3b] text-sm mt-1">
          Visual insights into hunger prevention, carbon abatement, food types, and operational velocity.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#fffaf0] p-5 rounded-[1.5rem] shadow-[0_10px_30px_rgba(128,72,30,0.08)] border border-[#f0c98d] border border-[#f0c98d]">
          <span className="text-xs uppercase text-[#8a5a3b] font-bold block">Meals Rescued</span>
          <div className="text-3xl font-black text-[#3b2118] mt-1">{impact.totalMealsRescued}</div>
          <span className="text-[11px] text-[#d92f26] font-medium">To verified shelters</span>
        </div>
        <div className="bg-[#fffaf0] p-5 rounded-[1.5rem] shadow-[0_10px_30px_rgba(128,72,30,0.08)] border border-[#f0c98d] border border-[#f0c98d]">
          <span className="text-xs uppercase text-[#8a5a3b] font-bold block">Food Saved</span>
          <div className="text-3xl font-black text-[#3b2118] mt-1">{impact.totalWeightKgSaved} kg</div>
          <span className="text-[11px] text-[#e85d04] font-medium">Diverted from landfill</span>
        </div>
        <div className="bg-[#fffaf0] p-5 rounded-[1.5rem] shadow-[0_10px_30px_rgba(128,72,30,0.08)] border border-[#f0c98d] border border-[#f0c98d]">
          <span className="text-xs uppercase text-[#8a5a3b] font-bold block">CO₂ Abated</span>
          <div className="text-3xl font-black text-[#3b2118] mt-1">{impact.totalCo2PreventedKg} kg</div>
          <span className="text-[11px] text-[#d94841] font-medium">1kg food ≈ 2.5kg CO₂e</span>
        </div>
        <div className="bg-[#fffaf0] p-5 rounded-[1.5rem] shadow-[0_10px_30px_rgba(128,72,30,0.08)] border border-[#f0c98d] border border-[#f0c98d]">
          <span className="text-xs uppercase text-[#8a5a3b] font-bold block">Rescues Executed</span>
          <div className="text-3xl font-black text-[#3b2118] mt-1">{impact.totalRescuesCompleted}</div>
          <span className="text-[11px] text-[#c94c4c] font-medium">{impact.activeDonationsCount} active in queue</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impact Over Time AreaChart */}
        <div className="bg-[#fffaf0] p-6 rounded-[1.75rem] shadow-[0_10px_30px_rgba(128,72,30,0.08)] border border-[#f0c98d] border border-[#f0c98d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[#3b2118] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#d92f26]" />
              <span>Rescued Meals Velocity</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            {impactOverTime.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#a66b46]">
                Not enough historical rescue batches yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={impactOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mealGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef3d32" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef3d32" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8cfa9" opacity={0.7} />
                  <XAxis dataKey="date" stroke="#a66b46" fontSize={11} />
                  <YAxis stroke="#a66b46" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fffaf0', borderColor: '#f0c98d', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="mealsRescued" stroke="#ef3d32" strokeWidth={3} fillOpacity={1} fill="url(#mealGradient)" name="Meals Rescued" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Food Categories BarChart */}
        <div className="bg-[#fffaf0] p-6 rounded-[1.75rem] shadow-[0_10px_30px_rgba(128,72,30,0.08)] border border-[#f0c98d] border border-[#f0c98d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[#3b2118] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#e85d04]" />
              <span>Rescues by Food Category (Servings)</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            {donationsByFoodType.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#a66b46]">
                No food donations recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={donationsByFoodType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8cfa9" opacity={0.7} />
                  <XAxis dataKey="foodType" stroke="#a66b46" fontSize={10} tickFormatter={(val) => val.split('_')[0]} />
                  <YAxis stroke="#a66b46" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fffaf0', borderColor: '#f0c98d', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="servings" fill="#e85d04" radius={[6, 6, 0, 0]} name="Total Servings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution PieChart */}
        <div className="bg-[#fffaf0] p-6 rounded-[1.75rem] shadow-[0_10px_30px_rgba(128,72,30,0.08)] border border-[#f0c98d] border border-[#f0c98d] space-y-4">
          <h3 className="text-base font-extrabold text-[#3b2118]">Donation Status Pipeline</h3>
          <div className="h-64 w-full flex items-center justify-center">
            {donationsByStatus.length === 0 ? (
              <div className="text-xs text-[#a66b46]">No donations in pipeline.</div>
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
                    contentStyle={{ backgroundColor: '#fffaf0', borderColor: '#f0c98d', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Community Breakdown Cards */}
        <div className="bg-[#fffaf0] p-6 rounded-[1.75rem] shadow-[0_10px_30px_rgba(128,72,30,0.08)] border border-[#f0c98d] border border-[#f0c98d] space-y-4 flex flex-col justify-between">
          <h3 className="text-base font-extrabold text-[#3b2118] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#c94c4c]" />
            <span>Active Community Roles</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#fff8ea] rounded-xl border border-[#f2d7ad]">
              <span className="text-[#8a5a3b] uppercase text-[10px] block font-semibold">Registered Donors</span>
              <span className="text-xl font-bold text-[#d92f26]">{usersByRole.DONOR || 0}</span>
            </div>
            <div className="p-3 bg-[#fff8ea] rounded-xl border border-[#f2d7ad]">
              <span className="text-[#8a5a3b] uppercase text-[10px] block font-semibold">Partner Shelters</span>
              <span className="text-xl font-bold text-[#c94c4c]">{usersByRole.NGO || 0}</span>
            </div>
            <div className="p-3 bg-[#fff8ea] rounded-xl border border-[#f2d7ad]">
              <span className="text-[#8a5a3b] uppercase text-[10px] block font-semibold">Rescue Couriers</span>
              <span className="text-xl font-bold text-[#e85d04]">{usersByRole.DRIVER || 0}</span>
            </div>
            <div className="p-3 bg-[#fff8ea] rounded-xl border border-[#f2d7ad]">
              <span className="text-[#8a5a3b] uppercase text-[10px] block font-semibold">System Admins</span>
              <span className="text-xl font-bold text-[#d92f26]">{usersByRole.ADMIN || 0}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#fff4df] border border-[#f2d7ad] text-[11px] text-[#8a5a3b]">
            Real-time telemetry reflects all registered food recovery activity verified across the database.
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
