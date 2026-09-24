import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartHandshake, LogIn, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center shadow-lg shadow-emerald-500/25 mb-1">
            <HeartHandshake className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Welcome back</h2>
          <p className="text-sm text-slate-400">Sign in to coordinate surplus food rescue in real-time</p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700/80">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.com"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm placeholder:text-slate-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm placeholder:text-slate-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
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
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Demo 1-Click Login</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('donor@example.com')}
                className="p-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-500/40 border border-slate-700/60 rounded-lg text-left transition-colors flex items-center justify-between"
              >
                <span>Donor</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('ngo@example.com')}
                className="p-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-purple-950/40 hover:text-purple-300 hover:border-purple-500/40 border border-slate-700/60 rounded-lg text-left transition-colors flex items-center justify-between"
              >
                <span>Shelter / NGO</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('driver@example.com')}
                className="p-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-amber-950/40 hover:text-amber-300 hover:border-amber-500/40 border border-slate-700/60 rounded-lg text-left transition-colors flex items-center justify-between"
              >
                <span>Driver Courier</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin@example.com')}
                className="p-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/40 border border-slate-700/60 rounded-lg text-left transition-colors flex items-center justify-between"
              >
                <span>Administrator</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-400">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
