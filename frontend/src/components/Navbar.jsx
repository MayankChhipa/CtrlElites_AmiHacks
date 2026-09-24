import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HeartHandshake,
  PlusCircle,
  LayoutDashboard,
  Truck,
  Building2,
  ShieldAlert,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'DONOR':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'NGO':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'DRIVER':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ADMIN':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getNavLinks = () => {
    if (!user) return [];

    switch (user.role) {
      case 'DONOR':
        return [
          { name: 'Dashboard', path: '/donor', icon: LayoutDashboard },
          { name: 'Donate Food', path: '/donor/donate', icon: PlusCircle },
        ];
      case 'NGO':
        return [
          { name: 'Dashboard', path: '/ngo', icon: LayoutDashboard },
          { name: 'Proposals', path: '/ngo/proposals', icon: Package },
        ];
      case 'DRIVER':
        return [
          { name: 'Deliveries', path: '/driver', icon: Truck },
        ];
      case 'ADMIN':
        return [
          { name: 'Overview', path: '/admin', icon: LayoutDashboard },
          { name: 'Users', path: '/admin/users', icon: Users },
          { name: 'Donations', path: '/admin/donations', icon: Package },
          { name: 'Deliveries', path: '/admin/deliveries', icon: Truck },
          { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <nav className="sticky top-0 z-40 glass-panel border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  Surplus-to-Shelter
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  Zero Hunger Rescue
                </span>
              </div>
            </Link>

            {/* Role Badge */}
            {user && (
              <span
                className={`hidden md:inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getRoleBadge(
                  user.role
                )}`}
              >
                {user.role}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Side: Notification & User Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <NotificationDropdown />

                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-medium text-slate-200">{user?.name}</span>
                  <span className="text-[10px] text-slate-400">{user?.email}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md shadow-emerald-600/30 transition-all hover:scale-105"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            {isAuthenticated && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 px-4 pt-2 pb-4 space-y-1 bg-slate-900/95">
          <div className="py-2 mb-2 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">{user?.name}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getRoleBadge(user?.role)}`}>
              {user?.role}
            </span>
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-base font-medium ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
