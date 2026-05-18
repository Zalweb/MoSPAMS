import { ShopProvider } from '@/shared/contexts/ShopContext';

import NewDashboardPage from './NewDashboardPage';

export default function NewDashboardWrapper() {
 return (
 <ShopProvider>
 <NewDashboardPage />
 </ShopProvider>
 );
}
