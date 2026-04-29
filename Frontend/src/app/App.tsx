import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { DataProvider } from '@/shared/contexts/DataContext';
import Login from '@/features/auth/pages/Login';
import DashboardLayout from '@/features/layout/pages/DashboardLayout';
import Overview from '@/features/dashboard/pages/Overview';
import InventoryPage from '@/features/inventory/pages/InventoryPage';
import ServicesPage from '@/features/services/pages/ServicesPage';
import SalesPage from '@/features/sales/pages/SalesPage';
import ReportsPage from '@/features/reports/pages/ReportsPage';
import UsersPage from '@/features/users/pages/UsersPage';
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
  if (user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Toaster position="top-right" richColors closeButton />
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<RequireAuth />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Overview />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route element={<RequireRole role="Admin" />}>
                  <Route path="users" element={<UsersPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
