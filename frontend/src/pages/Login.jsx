import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartHandshake, LogIn, Sparkles, AlertCircle, ArrowRight, Wheat } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      // Navigate to role-specific dashboard
      const routeMap = {
        DONOR: '/donor',
        NGO: '/ngo',
        DRIVER: '/driver',
        ADMIN: '/admin',
      };
      navigate(routeMap[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-12 bg-[#F7F9F6] relative overflow-hidden">
      {/* Left Agrarian Hero Panel */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#0E793C] p-12 flex-col justify-between text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-black/10 pointer-events-none"></div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
            <HeartHandshake className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-wide block leading-none">FoodHarvest</span>
            <span className="text-xs text-emerald-200 font-medium">Agrarian Surplus Network</span>
          </div>
        </div>

        <div className="space-y-6 relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-100 text-xs font-semibold border border-white/15">
            <Wheat className="w-3.5 h-3.5 text-[#FF6B35]" />
            <span>Farm-to-Community Rescue</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-[1.15]">
            Bridging agrarian harvest surplus directly to communities in need.
          </h1>
          <p className="text-emerald-100 text-sm leading-relaxed">
            Coordinate real-time rescue operations seamlessly between agricultural donors, local food banks, and transport logistics.
          </p>
        </div>

        <div className="text-xs text-emerald-200/80 relative z-10 border-t border-white/10 pt-4">
          © {new Date().getFullYear()} FoodHarvest Network. Cultivating zero waste.
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          
          {/* Mobile Header */}
          <div className="text-center space-y-2 lg:hidden">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-[#0E793C] items-center justify-center shadow-lg shadow-[#0E793C]/20 mx-auto mb-1">
              <HeartHandshake className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1C251F]">Welcome back</h2>
            <p className="text-sm text-slate-600">Sign in to coordinate surplus food rescue in real-time</p>
          </div>

          {/* Desktop Title */}
          <div className="hidden lg:block space-y-1">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1C251F]">Welcome back</h2>
            <p className="text-sm text-slate-600">Please enter your credentials to access your portal</p>
          </div>

          {/* Login Card */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-[#FF6B35]" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1C251F] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.com"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#1C251F]/30 text-[#1C251F] text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#0E793C] focus:ring-1 focus:ring-[#0E793C] transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1C251F]">
                    Password
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs font-semibold text-[#FF6B35] hover:underline transition-all"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#1C251F]/30 text-[#1C251F] text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#0E793C] focus:ring-1 focus:ring-[#0E793C] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-[#0E793C] hover:bg-[#0b6130] text-white font-bold rounded-xl shadow-lg shadow-[#0E793C]/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>Quick Demo 1-Click Login</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('donor@example.com')}
                  className="p-2.5 text-xs font-semibold text-[#1C251F] bg-[#F7F9F6] hover:bg-[#0E793C]/10 hover:text-[#0E793C] hover:border-[#0E793C]/40 border border-slate-200 rounded-xl text-left transition-all flex items-center justify-between group"
                >
                  <span>Donor</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('ngo@example.com')}
                  className="p-2.5 text-xs font-semibold text-[#1C251F] bg-[#F7F9F6] hover:bg-[#0E793C]/10 hover:text-[#0E793C] hover:border-[#0E793C]/40 border border-slate-200 rounded-xl text-left transition-all flex items-center justify-between group"
                >
                  <span>Shelter / NGO</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('driver@example.com')}
                  className="p-2.5 text-xs font-semibold text-[#1C251F] bg-[#F7F9F6] hover:bg-[#0E793C]/10 hover:text-[#0E793C] hover:border-[#0E793C]/40 border border-slate-200 rounded-xl text-left transition-all flex items-center justify-between group"
                >
                  <span>Driver Courier</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin@example.com')}
                  className="p-2.5 text-xs font-semibold text-[#1C251F] bg-[#F7F9F6] hover:bg-[#0E793C]/10 hover:text-[#0E793C] hover:border-[#0E793C]/40 border border-slate-200 rounded-xl text-left transition-all flex items-center justify-between group"
                >
                  <span>Administrator</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-slate-600">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-[#0E793C] hover:underline transition-colors">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;