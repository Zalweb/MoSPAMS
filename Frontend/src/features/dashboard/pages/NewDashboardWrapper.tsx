import { ShopProvider } from '@/shared/contexts/ShopContext';
import { ThemeProvider } from '@/theme/ThemeProvider';
import NewDashboardPage from './NewDashboardPage';

export default function NewDashboardWrapper() {
  return (
    <ShopProvider>
      <ThemeProvider>
        <NewDashboardPage />
      </ThemeProvider>
    </ShopProvider>
  );
}
