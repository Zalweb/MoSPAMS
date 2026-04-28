import { useState } from 'react';
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
import type { View } from '@/shared/types';

function Dashboard() {
  const [view, setView] = useState<View>('overview');

  const renderPage = () => {
    switch (view) {
      case 'overview': return <Overview />;
      case 'inventory': return <InventoryPage />;
      case 'services': return <ServicesPage />;
      case 'sales': return <SalesPage />;
      case 'reports': return <ReportsPage />;
      case 'users': return <UsersPage />;
      default: return <Overview />;
    }
  };

  return (
    <DashboardLayout currentView={view} onNavigate={setView}>
      {renderPage()}
    </DashboardLayout>
  );
}

function AppRouter() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppRouter />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
