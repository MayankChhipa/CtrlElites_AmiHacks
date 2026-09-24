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
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'NGO':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'DRIVER':
        return 'bg-orange-100 text-orange-950 border-orange-300';
      case 'ADMIN':
        return 'bg-rose-100 text-rose-950 border-rose-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-300';
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
    <nav className="sticky top-0 z-40 bg-[#FFFDF6]/95 backdrop-blur-md border-b border-orange-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Role Badge */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-md shadow-red-600/20 group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6 text-white stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-red-950">
                  Surplus-to-Shelter
                </span>
                <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">
                  Zero Hunger Rescue
                </span>
              </div>
            </Link>

            {user && (
              <span
                className={`hidden lg:inline-flex items-center text-xs font-bold px-3 py-1 rounded-full border ${getRoleBadge(
                  user.role
                )}`}
              >
                {user.role}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-orange-100 text-red-950 border border-orange-300/80 shadow-sm'
                        : 'text-stone-600 hover:text-red-950 hover:bg-orange-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Side Actions & User Info */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <NotificationDropdown />

                <div className="hidden sm:flex flex-col text-right pl-2 border-l border-orange-200/60">
                  <span className="text-sm font-bold text-red-950">{user?.name}</span>
                  <span className="text-xs text-stone-500 font-medium">{user?.email}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2.5 text-stone-500 hover:text-rose-700 rounded-xl hover:bg-rose-100 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-5 h-5 stroke-[2]" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-5 py-2.5 text-sm font-bold text-stone-700 hover:text-red-950 hover:bg-orange-50 rounded-xl transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 transition-all active:scale-95"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            {isAuthenticated && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 rounded-xl text-stone-600 hover:text-red-950 hover:bg-orange-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 stroke-[2]" /> : <Menu className="w-6 h-6 stroke-[2]" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="md:hidden border-t border-orange-200 px-6 py-4 space-y-2 bg-[#FFFDF6] shadow-xl">
          <div className="pb-3 border-b border-orange-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-red-950">{user?.name}</div>
              <div className="text-xs text-stone-500">{user?.email}</div>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getRoleBadge(user?.role)}`}>
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-orange-100 text-red-950 border border-orange-300'
                    : 'text-stone-700 hover:bg-orange-50 hover:text-red-950'
                }`}
              >
                <Icon className="w-5 h-5 stroke-2" />
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