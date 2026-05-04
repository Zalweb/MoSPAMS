import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { DataProvider } from '@/shared/contexts/DataContext';
import { defaultRouteForUser, normalizeRole } from '@/shared/lib/roles';
import { useTenantBranding } from '@/shared/contexts/TenantBrandingContext';
import { currentHostMode } from '@/shared/lib/hostMode';
import type { Role } from '@/shared/types';

// Layouts are NOT lazy — they render immediately on login
import DashboardLayout from '@/features/layout/pages/DashboardLayout';
import SuperAdminLayout from '@/features/superadmin/pages/SuperAdminLayout';
import LoginPage from '@/features/auth/LoginPage';
import LandingPage from '@/features/landing/LandingPage';
import ShopNotFoundPage from '@/features/common/ShopNotFoundPage';

// All page-level components are lazy-loaded
const ShopRegistrationPage = lazy(() => import('@/features/registration/pages/ShopRegistrationPage'));
const NewDashboardWrapper = lazy(() => import('@/features/dashboard/pages/NewDashboardWrapper'));
const InventoryPage = lazy(() => import('@/features/inventory/pages/InventoryPage'));
const ServicesPage = lazy(() => import('@/features/services/pages/ServicesPage'));
const SalesPage = lazy(() => import('@/features/sales/pages/SalesPage'));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'));
const ApprovalsPage = lazy(() => import('@/features/users/pages/ApprovalsPage'));
const CustomerDashboard = lazy(() => import('@/features/customers/pages/CustomerDashboard'));
const BookService = lazy(() => import('@/features/customers/pages/BookService'));
const ServiceHistory = lazy(() => import('@/features/customers/pages/ServiceHistory'));
const Payments = lazy(() => import('@/features/customers/pages/Payments'));
const RolesPage = lazy(() => import('@/features/roles/pages/RolesPage'));
const ActivityLogsPage = lazy(() => import('@/features/activity-logs/pages/ActivityLogsPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const NotFound = lazy(() => import('@/features/common/NotFound'));
const ShopBlockedScreen = lazy(() => import('@/features/common/ShopBlockedScreen'));

// Mechanic pages
const AssignedJobsPage = lazy(() => import('@/features/mechanic/pages/AssignedJobsPage'));
const JobDetailsPage = lazy(() => import('@/features/mechanic/pages/JobDetailsPage'));

// SuperAdmin pages
const SuperAdminAnalyticsPage = lazy(() => import('@/features/superadmin/pages/SuperAdminAnalyticsPage'));
const SuperAdminShopsPage = lazy(() => import('@/features/superadmin/pages/SuperAdminShopsPage'));
const PendingShopsPage = lazy(() => import('@/features/superadmin/pages/PendingShopsPage'));
const SuspendedShopsPage = lazy(() => import('@/features/superadmin/pages/SuspendedShopsPage'));
const CreateShopPage = lazy(() => import('@/features/superadmin/pages/CreateShopPage'));
const PaymentsHistoryPage = lazy(() => import('@/features/superadmin/pages/PaymentsHistoryPage'));
const AddPlatformAdminPage = lazy(() => import('@/features/superadmin/pages/AddPlatformAdminPage'));
const SystemPerformancePage = lazy(() => import('@/features/superadmin/pages/SystemPerformancePage'));
const SuperAdminSubscriptionsPage = lazy(() => import('@/features/superadmin/pages/SuperAdminSubscriptionsPage'));
const SuperAdminAccessControlPage = lazy(() => import('@/features/superadmin/pages/SuperAdminAccessControlPage'));
const SuperAdminAuditLogsPage = lazy(() => import('@/features/superadmin/pages/SuperAdminAuditLogsPage'));
const SuperAdminSettingsPage = lazy(() => import('@/features/superadmin/pages/SuperAdminSettingsPage'));

// PlaceholderPages — default + named exports
const RevenueReportsPage = lazy(() => import('@/features/superadmin/pages/PlaceholderPages'));
const OverdueAccountsPage = lazy(() => import('@/features/superadmin/pages/PlaceholderPages').then(m => ({ default: m.OverdueAccountsPage })));
const RevenueAnalyticsPage = lazy(() => import('@/features/superadmin/pages/PlaceholderPages').then(m => ({ default: m.RevenueAnalyticsPage })));
const ShopGrowthPage = lazy(() => import('@/features/superadmin/pages/PlaceholderPages').then(m => ({ default: m.ShopGrowthPage })));
const UserStatisticsPage = lazy(() => import('@/features/superadmin/pages/PlaceholderPages').then(m => ({ default: m.UserStatisticsPage })));

// SettingsPlaceholders — all named exports
const MaintenanceModePage = lazy(() => import('@/features/superadmin/pages/SettingsPlaceholders').then(m => ({ default: m.MaintenanceModePage })));
const ApiKeysPage = lazy(() => import('@/features/superadmin/pages/SettingsPlaceholders').then(m => ({ default: m.ApiKeysPage })));
const EmailTemplatesPage = lazy(() => import('@/features/superadmin/pages/SettingsPlaceholders').then(m => ({ default: m.EmailTemplatesPage })));
const SupportTicketsPage = lazy(() => import('@/features/superadmin/pages/SettingsPlaceholders').then(m => ({ default: m.SupportTicketsPage })));
const ShopFeedbackPage = lazy(() => import('@/features/superadmin/pages/SettingsPlaceholders').then(m => ({ default: m.ShopFeedbackPage })));

// Page-level suspense fallback
function PageLoader() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;
  return <Outlet />;
}

function RequireRole({ role }: { role: Role }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/" replace />;
  if (normalizeRole(user.role) !== normalizeRole(role)) return <Navigate to={defaultRouteForUser(user)} replace />;
  return <Outlet />;
}

function RequireCustomer() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/" replace />;
  if (normalizeRole(user.role) !== 'Customer') return <Navigate to={defaultRouteForUser(user)} replace />;
  return <Outlet />;
}

function RequireMechanic() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/" replace />;
  if (normalizeRole(user.role) !== 'Mechanic') return <Navigate to={defaultRouteForUser(user)} replace />;
  return <Outlet />;
}

function RequireSuperAdmin() {
  const { user, ready } = useAuth();
  if (!ready) return null;
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
    return (
      <Suspense fallback={<PageLoader />}>
        <ShopBlockedScreen shopStatus={user.shopStatus} />
      </Suspense>
    );
  }

  return <Outlet />;
}

function LoginRoute() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user) return <Navigate to={defaultRouteForUser(user)} replace />;
  return <LoginPage />;
}

function App() {
  const tenant = useTenantBranding();
  const hostMode = currentHostMode();

  if (tenant.statusCode === 404) {
    return <ShopNotFoundPage />;
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <Toaster position="top-right" richColors closeButton />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {hostMode === 'public' ? (
                  <>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/register-shop" element={<ShopRegistrationPage />} />
                    <Route path="*" element={<NotFound />} />
                  </>
                ) : hostMode === 'platform' ? (
                  <>
                    <Route path="/" element={<LoginRoute />} />
                    <Route path="/login" element={<LoginRoute />} />
                    <Route element={<RequireAuth />}>
                      <Route element={<RequireSuperAdmin />}>
                        <Route path="superadmin" element={<SuperAdminLayout />}>
                          <Route index element={<Navigate to="/superadmin/analytics" replace />} />
                          <Route path="analytics" element={<SuperAdminAnalyticsPage />} />

                          <Route path="shops" element={<SuperAdminShopsPage />} />
                          <Route path="shops/pending" element={<PendingShopsPage />} />
                          <Route path="shops/new" element={<CreateShopPage />} />
                          <Route path="shops/suspended" element={<SuspendedShopsPage />} />

                          <Route path="subscriptions" element={<SuperAdminSubscriptionsPage />} />
                          <Route path="billing/payments" element={<PaymentsHistoryPage />} />
                          <Route path="billing/reports" element={<RevenueReportsPage />} />
                          <Route path="billing/overdue" element={<OverdueAccountsPage />} />

                          <Route path="access-control" element={<SuperAdminAccessControlPage />} />
                          <Route path="admins/new" element={<AddPlatformAdminPage />} />

                          <Route path="reports/revenue" element={<RevenueAnalyticsPage />} />
                          <Route path="reports/growth" element={<ShopGrowthPage />} />
                          <Route path="reports/users" element={<UserStatisticsPage />} />
                          <Route path="reports/performance" element={<SystemPerformancePage />} />

                          <Route path="audit-logs" element={<SuperAdminAuditLogsPage />} />

                          <Route path="settings" element={<SuperAdminSettingsPage />} />
                          <Route path="settings/maintenance" element={<MaintenanceModePage />} />
                          <Route path="settings/api" element={<ApiKeysPage />} />
                          <Route path="settings/email" element={<EmailTemplatesPage />} />

                          <Route path="support/tickets" element={<SupportTicketsPage />} />
                          <Route path="support/feedback" element={<ShopFeedbackPage />} />

                          <Route path="*" element={<NotFound />} />
                        </Route>
                      </Route>
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </>
                ) : (
                  <>
                    <Route path="/" element={<LoginRoute />} />
                    <Route path="/login" element={<LoginRoute />} />
                    <Route element={<RequireAuth />}>
                      <Route element={<RequireActiveShop />}>
                        <Route path="dashboard" element={<DashboardLayout />}>
                          <Route index element={<NewDashboardWrapper />} />
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
                          <Route element={<RequireMechanic />}>
                            <Route path="mechanic/jobs" element={<AssignedJobsPage />} />
                            <Route path="mechanic/jobs/:id" element={<JobDetailsPage />} />
                          </Route>
                          <Route path="*" element={<NotFound />} />
                        </Route>
                      </Route>
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </>
                )}
              </Routes>
            </Suspense>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
