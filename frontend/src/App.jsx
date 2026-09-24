import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Donor Pages
import DonorDashboard from './pages/donor/DonorDashboard';
import DonateFood from './pages/donor/DonateFood';
import DonationDetail from './pages/donor/DonationDetail';

// NGO Pages
import NgoDashboard from './pages/ngo/NgoDashboard';
import NgoProposals from './pages/ngo/NgoProposals';
import NgoDonationDetail from './pages/ngo/NgoDonationDetail';

// Driver Pages
import DriverDashboard from './pages/driver/DriverDashboard';
import DeliveryDetail from './pages/driver/DeliveryDetail';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDonations from './pages/admin/AdminDonations';
import AdminDeliveries from './pages/admin/AdminDeliveries';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// Root redirect handler
const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const roleMap = {
    DONOR: '/donor',
    NGO: '/ngo',
    DRIVER: '/driver',
    ADMIN: '/admin',
  };

  return <Navigate to={roleMap[user?.role] || '/login'} replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Root */}
              <Route path="/" element={<RootRedirect />} />

              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Donor Routes */}
              <Route
                path="/donor"
                element={
                  <ProtectedRoute allowedRoles={['DONOR', 'ADMIN']}>
                    <DonorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donor/donate"
                element={
                  <ProtectedRoute allowedRoles={['DONOR', 'ADMIN']}>
                    <DonateFood />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donor/donations/:id"
                element={
                  <ProtectedRoute allowedRoles={['DONOR', 'ADMIN']}>
                    <DonationDetail />
                  </ProtectedRoute>
                }
              />

              {/* NGO Routes */}
              <Route
                path="/ngo"
                element={
                  <ProtectedRoute allowedRoles={['NGO', 'ADMIN']}>
                    <NgoDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ngo/proposals"
                element={
                  <ProtectedRoute allowedRoles={['NGO', 'ADMIN']}>
                    <NgoProposals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ngo/donations/:id"
                element={
                  <ProtectedRoute allowedRoles={['NGO', 'ADMIN']}>
                    <NgoDonationDetail />
                  </ProtectedRoute>
                }
              />

              {/* Driver Routes */}
              <Route
                path="/driver"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER', 'ADMIN']}>
                    <DriverDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver/deliveries/:id"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER', 'ADMIN']}>
                    <DeliveryDetail />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/donations"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDonations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/deliveries"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDeliveries />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
