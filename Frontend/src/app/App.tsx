import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { DataProvider } from '@/shared/contexts/DataContext';
import { defaultRouteForUser, normalizeRole } from '@/shared/lib/roles';

import LandingPage from '@/features/landing/LandingPage';
import ShopRegistrationPage from '@/features/registration/pages/ShopRegistrationPage';
import Login from '@/features/auth/pages/Login';
import DashboardLayout from '@/features/layout/pages/DashboardLayout';
import Overview from '@/features/dashboard/pages/Overview';
import InventoryPage from '@/features/inventory/pages/InventoryPage';
import ServicesPage from '@/features/services/pages/ServicesPage';
import SalesPage from '@/features/sales/pages/SalesPage';
import ReportsPage from '@/features/reports/pages/ReportsPage';
import UsersPage from '@/features/users/pages/UsersPage';
import ApprovalsPage from '@/features/users/pages/ApprovalsPage';
import CustomerDashboard from '@/features/customers/pages/CustomerDashboard';
import BookService from '@/features/customers/pages/BookService';
import ServiceHistory from '@/features/customers/pages/ServiceHistory';
import Payments from '@/features/customers/pages/Payments';
import RolesPage from '@/features/roles/pages/RolesPage';
import ActivityLogsPage from '@/features/activity-logs/pages/ActivityLogsPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import SuperAdminLayout from '@/features/superadmin/pages/SuperAdminLayout';
import SuperAdminAnalyticsPage from '@/features/superadmin/pages/SuperAdminAnalyticsPage';
import SuperAdminShopsPage from '@/features/superadmin/pages/SuperAdminShopsPage';
import SuperAdminSubscriptionsPage from '@/features/superadmin/pages/SuperAdminSubscriptionsPage';
import SuperAdminAccessControlPage from '@/features/superadmin/pages/SuperAdminAccessControlPage';
import SuperAdminAuditLogsPage from '@/features/superadmin/pages/SuperAdminAuditLogsPage';
import SuperAdminSettingsPage from '@/features/superadmin/pages/SuperAdminSettingsPage';
import NotFound from '@/features/common/NotFound';
import ShopBlockedScreen from '@/features/common/ShopBlockedScreen';
import TenantBootstrapScreen from '@/features/common/TenantBootstrapScreen';
import type { Role } from '@/shared/types';
import { useTenantBranding } from '@/shared/contexts/TenantBrandingContext';
import { currentHostMode } from '@/shared/lib/hostMode';

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;
  return <Outlet />;
}

function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (normalizeRole(user.role) !== normalizeRole(role)) return <Navigate to={defaultRouteForUser(user)} replace />;
  return <Outlet />;
}

function RequireCustomer() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (normalizeRole(user.role) !== 'Customer') return <Navigate to={defaultRouteForUser(user)} replace />;
  return <Outlet />;
}

function RequireSuperAdmin() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (normalizeRole(user.role) !== 'SuperAdmin') return <Navigate to={defaultRouteForUser(user)} replace />;
  return <Outlet />;
}

function RequireActiveShop() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;

  if (normalizeRole(user.role) === 'SuperAdmin') {
    return <Navigate to="/superadmin/analytics" replace />;
  }

  if (user.shopStatus && user.shopStatus !== 'ACTIVE') {
    return <ShopBlockedScreen shopStatus={user.shopStatus} />;
  }

  return <Outlet />;
}

function LoginRoute() {
  return <Login />;
}

function App() {
  const tenant = useTenantBranding();
  const hostMode = currentHostMode();

  if (tenant.loading) {
    return <TenantBootstrapScreen title="Loading shop context" message="Please wait while we initialize your branded workspace." />;
  }

  if (!tenant.ready) {
    if (tenant.statusCode === 404) {
      return <TenantBootstrapScreen statusCode={404} title="Shop not found" message={tenant.error ?? 'This domain is not connected to a MoSPAMS shop.'} />;
    }

    if (tenant.statusCode === 503) {
      return <TenantBootstrapScreen statusCode={503} title="Shop unavailable" message={tenant.error ?? 'This shop is currently unavailable.'} />;
    }

    return <TenantBootstrapScreen statusCode={tenant.statusCode} title="Tenant bootstrap failed" message={tenant.error ?? 'Unable to initialize tenant context.'} />;
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <Toaster position="top-right" richColors closeButton />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/register-shop" element={<ShopRegistrationPage />} />
              <Route path="/login" element={<LoginRoute />} />
              {hostMode !== 'public' ? (
                <Route element={<RequireAuth />}>
                  <Route element={<RequireActiveShop />}>
                    <Route path="dashboard" element={<DashboardLayout />}>
                      <Route index element={<Overview />} />
                      <Route path="inventory" element={<InventoryPage />} />
                      <Route path="services" element={<ServicesPage />} />
                      <Route path="sales" element={<SalesPage />} />
                      <Route path="reports" element={<ReportsPage />} />
                      <Route element={<RequireRole role="Owner" />}>
                        <Route path="users" element={<UsersPage />} />
                        <Route path="approvals" element={<ApprovalsPage />} />
                        <Route path="roles" element={<RolesPage />} />
                        <Route path="activity-logs" element={<ActivityLogsPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                      </Route>
                      <Route element={<RequireCustomer />}>
                        <Route path="customer" element={<CustomerDashboard />} />
                        <Route path="customer/book" element={<BookService />} />
                        <Route path="customer/history" element={<ServiceHistory />} />
                        <Route path="customer/payments" element={<Payments />} />
                      </Route>
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Route>
                  <Route element={<RequireSuperAdmin />}>
                    <Route path="superadmin" element={<SuperAdminLayout />}>
                      <Route index element={<Navigate to="/superadmin/analytics" replace />} />
                      <Route path="analytics" element={<SuperAdminAnalyticsPage />} />
                      <Route path="shops" element={<SuperAdminShopsPage />} />
                      <Route path="subscriptions" element={<SuperAdminSubscriptionsPage />} />
                      <Route path="access-control" element={<SuperAdminAccessControlPage />} />
                      <Route path="audit-logs" element={<SuperAdminAuditLogsPage />} />
                      <Route path="settings" element={<SuperAdminSettingsPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Route>
                </Route>
              ) : null}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
