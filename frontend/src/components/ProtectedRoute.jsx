import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-red-600 border-t-orange-400 rounded-full animate-spin"></div>
          <p className="text-red-950 text-sm font-bold tracking-wide">
            Verifying authorization...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect user to their own role dashboard
    const defaultRolePath = {
      DONOR: '/donor',
      NGO: '/ngo',
      DRIVER: '/driver',
      ADMIN: '/admin',
    }[user?.role] || '/login';

    return <Navigate to={defaultRolePath} replace />;
  }

  return children;
};

export default ProtectedRoute;