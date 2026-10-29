import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/context/AuthContext';

// Pages
import LoginPage from './pages/auth/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AccountManagementPage from './pages/admin/AccountManagementPage';
import MachineManagementPage from './pages/admin/MachineManagementPage';
import ManageConfigPage from './pages/admin/ManageConfigPage';
import PricingPlanManagementPage from './pages/admin/PricingPlanManagementPage';
import TransactionManagementPage from './pages/admin/TransactionManagementPage';
import StaffDashboardPage from './pages/staff/StaffDashboardPage';
import CustomerDashboardPage from './pages/customer/CustomerDashboardPage';
import CustomerProfilePage from './pages/customer/CustomerProfilePage';
import CustomerComboPage from './pages/customer/CustomerComboPage';
import ServiceCatalogPage from './pages/admin/ServiceCatalogPage';
import RevenueReportPage from './pages/admin/RevenueReportPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-mono tracking-wide">
            Đang khởi tạo hệ thống NEXUS Cloud Cyber OS...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to correct dashboard based on actual role
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (role === 'STAFF') return <Navigate to="/staff" replace />;
    return <Navigate to="/customer" replace />;
  }

  return children;
};

// Auto Redirect based on Role
const RoleRedirect = () => {
  const { currentUser, role, loading } = useAuth();

  if (loading) return null;

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (role === 'STAFF') return <Navigate to="/staff" replace />;
  return <Navigate to="/customer" replace />;
};

// Login Page Wrapper with Auth Context
const LoginWrapper = () => {
  const { currentUser, role, login } = useAuth();
  const navigate = useNavigate();

  if (currentUser) {
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (role === 'STAFF') return <Navigate to="/staff" replace />;
    return <Navigate to="/customer" replace />;
  }

  const handleLoginSuccess = async (user) => {
    const userRole = user?.role === 'EMPLOYEE' ? 'STAFF' : user?.role === 'MEMBER' ? 'CUSTOMER' : user?.role;
    if (userRole === 'ADMIN') navigate('/admin');
    else if (userRole === 'STAFF') navigate('/staff');
    else navigate('/customer');
  };

  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
};

// Dashboard Wrapper Components passing AuthContext props
const AdminWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <AdminDashboardPage user={currentUser} onLogout={logout} />;
};

const AccountMembersWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <AccountManagementPage user={currentUser} onLogout={logout} />;
};

const MachineManagementWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <MachineManagementPage user={currentUser} onLogout={logout} />;
};

const ManageConfigWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <ManageConfigPage user={currentUser} onLogout={logout} />;
};

const PricingPlanManagementWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <PricingPlanManagementPage user={currentUser} onLogout={logout} />;
};

const TransactionManagementWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <TransactionManagementPage user={currentUser} onLogout={logout} />;
};

const StaffWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <StaffDashboardPage user={currentUser} onLogout={logout} />;
};

const CustomerWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <CustomerDashboardPage user={currentUser} onLogout={logout} />;
};

const CustomerProfileWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <CustomerProfilePage user={currentUser} onLogout={logout} />;
};

const CustomerComboWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <CustomerComboPage user={currentUser} onLogout={logout} />;
};

const ServiceCatalogWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <ServiceCatalogPage user={currentUser} onLogout={logout} />;
};

const RevenueReportWrapper = () => {
  const { currentUser, logout } = useAuth();
  return <RevenueReportPage user={currentUser} onLogout={logout} />;
};


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginWrapper />} />

          {/* Protected Role-Based Routes */}
          <Route
            path="/admin/members"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AccountMembersWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/machines"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <MachineManagementWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/config"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <ManageConfigWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/pricing-plans"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <PricingPlanManagementWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/promotions"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <PricingPlanManagementWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/transactions"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <TransactionManagementWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/catalog"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <ServiceCatalogWrapper />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <RevenueReportWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff/*"
            element={
              <ProtectedRoute allowedRoles={['STAFF']}>
                <StaffWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customer/profile"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'MEMBER']}>
                <CustomerProfileWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customer/combos"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'MEMBER']}>
                <CustomerComboWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customer/*"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'MEMBER']}>
                <CustomerWrapper />
              </ProtectedRoute>
            }
          />

          {/* Root & Catch-all Redirect */}
          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
