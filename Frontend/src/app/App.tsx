import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { DataProvider } from '@/shared/contexts/DataContext';
import Login from '@/features/auth/pages/Login';
import LandingPage from '@/features/landing/LandingPage';
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
import NotFound from '@/features/common/NotFound';
import type { Role } from '@/shared/types';

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function RequireCustomer() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'Customer') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <Toaster position="top-right" richColors closeButton />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<RequireAuth />}>
                <Route path="dashboard" element={<DashboardLayout />}>
                  <Route index element={<Overview />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="sales" element={<SalesPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route element={<RequireRole role="Admin" />}>
                    <Route path="users" element={<UsersPage />} />
                    <Route path="approvals" element={<ApprovalsPage />} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
