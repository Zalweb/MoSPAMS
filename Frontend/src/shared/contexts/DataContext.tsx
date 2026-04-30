import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { Part, ServiceRecord, Transaction, ActivityLog, ServiceType, StockMovement, User, Role } from '@/shared/types';
import { useAuth } from '@/features/auth/context/AuthContext';
import { apiGet, apiMutation } from '@/shared/lib/api';

const DEMO_PARTS: Part[] = [
  { id: 'p1', name: 'Brake Pad Set - Honda', category: 'Braking', stock: 15, minStock: 5, price: 850, barcode: 'BRK-HND-001', createdAt: '2026-04-01T10:00:00Z' },
  { id: 'p2', name: 'Engine Oil 10W40 - Yamalube', category: 'Fluids', stock: 8, minStock: 10, price: 450, barcode: 'OIL-YML-010', createdAt: '2026-04-02T09:30:00Z' },
  { id: 'p3', name: 'Chain Sprocket Kit - KTM', category: 'Drivetrain', stock: 22, minStock: 5, price: 1200, barcode: 'CHN-KTM-220', createdAt: '2026-04-03T14:15:00Z' },
  { id: 'p4', name: 'Air Filter - NGK', category: 'Filtration', stock: 3, minStock: 8, price: 350, barcode: 'AIR-NGK-003', createdAt: '2026-04-04T11:00:00Z' },
  { id: 'p5', name: 'Spark Plug - Iridium', category: 'Ignition', stock: 50, minStock: 10, price: 180, barcode: 'SPK-IRI-050', createdAt: '2026-04-05T08:45:00Z' },
  { id: 'p6', name: 'Clutch Cable - Universal', category: 'Controls', stock: 12, minStock: 5, price: 250, barcode: 'CLT-UNV-012', createdAt: '2026-04-06T16:20:00Z' },
  { id: 'p7', name: 'Tire Inner Tube 70/90-17', category: 'Wheels', stock: 20, minStock: 8, price: 320, barcode: 'TIR-7090-017', createdAt: '2026-04-07T13:10:00Z' },
  { id: 'p8', name: 'Headlight Bulb LED - White', category: 'Electrical', stock: 6, minStock: 5, price: 550, barcode: 'LED-WHT-006', createdAt: '2026-04-08T09:00:00Z' },
];

const DEMO_SERVICES: ServiceRecord[] = [
  { id: 's1', customerName: 'Juan Dela Cruz', motorcycleModel: 'Honda Click 150i', serviceType: 'Oil Change', laborCost: 350, status: 'Completed', partsUsed: [{ partId: 'p2', quantity: 1 }], notes: 'Regular maintenance', createdAt: '2026-04-20T08:00:00Z', completedAt: '2026-04-20T09:30:00Z' },
  { id: 's2', customerName: 'Maria Santos', motorcycleModel: 'Yamaha NMAX', serviceType: 'Brake Repair', laborCost: 500, status: 'Ongoing', partsUsed: [{ partId: 'p1', quantity: 1 }], notes: 'Front brake pad replacement', createdAt: '2026-04-22T10:00:00Z' },
  { id: 's3', customerName: 'Pedro Reyes', motorcycleModel: 'Suzuki Raider 150', serviceType: 'Full Tune-up', laborCost: 800, status: 'Pending', partsUsed: [], notes: 'Complete overhaul requested', createdAt: '2026-04-23T07:30:00Z' },
  { id: 's4', customerName: 'Ana Lim', motorcycleModel: 'Kawasaki Rouser 200', serviceType: 'Chain Replacement', laborCost: 450, status: 'Pending', partsUsed: [{ partId: 'p3', quantity: 1 }], notes: 'Chain slipping issue', createdAt: '2026-04-23T11:00:00Z' },
  { id: 's5', customerName: 'Roberto Tan', motorcycleModel: 'Honda Beat Fi', serviceType: 'Oil Change', laborCost: 350, status: 'Completed', partsUsed: [{ partId: 'p2', quantity: 1 }], notes: '10,000 km service', createdAt: '2026-04-21T14:00:00Z', completedAt: '2026-04-21T15:15:00Z' },
  { id: 's6', customerName: 'Elena Garcia', motorcycleModel: 'Yamaha Mio Sporty', serviceType: 'Electrical Check', laborCost: 400, status: 'Ongoing', partsUsed: [{ partId: 'p8', quantity: 1 }], notes: 'Headlight not working', createdAt: '2026-04-22T16:00:00Z' },
];

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'parts-only', items: [{ partId: 'p1', name: 'Brake Pad Set - Honda', quantity: 1, price: 850 }], paymentMethod: 'Cash', total: 850, createdAt: '2026-04-23T09:00:00Z' },
  { id: 't2', type: 'service+parts', items: [{ partId: 'p2', name: 'Engine Oil 10W40', quantity: 1, price: 450 }], serviceId: 's1', serviceLaborCost: 350, paymentMethod: 'GCash', total: 800, createdAt: '2026-04-20T09:30:00Z' },
  { id: 't3', type: 'parts-only', items: [{ partId: 'p3', name: 'Chain Sprocket Kit', quantity: 1, price: 1200 }], paymentMethod: 'Cash', total: 1200, createdAt: '2026-04-22T14:00:00Z' },
  { id: 't4', type: 'service+parts', items: [{ partId: 'p1', name: 'Brake Pad Set - Honda', quantity: 1, price: 850 }], serviceId: 's2', serviceLaborCost: 500, paymentMethod: 'GCash', total: 1350, createdAt: '2026-04-22T10:00:00Z' },
];

const DEMO_LOGS: ActivityLog[] = [
  { id: 'l1', user: 'Admin User', action: 'Logged in to the system', timestamp: '2026-04-23T08:00:00Z' },
  { id: 'l2', user: 'Staff User', action: 'Created service record #s3 for Pedro Reyes', timestamp: '2026-04-23T07:35:00Z' },
  { id: 'l3', user: 'Staff User', action: 'Recorded sale #t1 (Cash)', timestamp: '2026-04-23T09:05:00Z' },
  { id: 'l4', user: 'Admin User', action: 'Updated stock for Brake Pad Set - Honda', timestamp: '2026-04-23T10:15:00Z' },
  { id: 'l5', user: 'Staff User', action: 'Updated service #s2 status to Ongoing', timestamp: '2026-04-22T10:30:00Z' },
];

const DEMO_SERVICE_TYPES: ServiceType[] = [
  { id: 'st1', name: 'Oil Change', defaultLaborCost: 350 },
  { id: 'st2', name: 'Brake Repair', defaultLaborCost: 500 },
  { id: 'st3', name: 'Full Tune-up', defaultLaborCost: 800 },
  { id: 'st4', name: 'Chain Replacement', defaultLaborCost: 450 },
  { id: 'st5', name: 'Electrical Check', defaultLaborCost: 400 },
  { id: 'st6', name: 'Engine Overhaul', defaultLaborCost: 2000 },
];

interface DataContextType {
  parts: Part[];
  services: ServiceRecord[];
  transactions: Transaction[];
  logs: ActivityLog[];
  serviceTypes: ServiceType[];
  stockMovements: StockMovement[];
  users: User[];
  addPart: (part: Omit<Part, 'id' | 'createdAt'>) => Promise<void>;
  updatePart: (id: string, part: Partial<Part>) => Promise<void>;
  deletePart: (id: string) => Promise<void>;
  recordStockMovement: (partId: string, type: 'in' | 'out' | 'adjust', qty: number, reason: string) => Promise<void>;
  addService: (service: Omit<ServiceRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateService: (id: string, service: Partial<ServiceRecord>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  addServiceType: (st: Omit<ServiceType, 'id'>) => Promise<void>;
  updateServiceType: (id: string, st: Partial<ServiceType>) => Promise<void>;
  deleteServiceType: (id: string) => Promise<void>;
  addUser: (input: { name: string; email: string; role: Role; password: string }) => Promise<void>;
  updateUser: (id: string, patch: Partial<User> & { password?: string }) => Promise<void>;
  setUserStatus: (id: string, status: 'Active' | 'Inactive') => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
type ApiList<T> = { data: T[] };
type ApiItem<T> = { data: T };

function showApiFailure(action: string, error: unknown) {
  console.error(`${action} failed`, error);
  toast.error(`${action} was not saved. Start the Laravel API backend and try again.`);
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [parts, setParts] = useState<Part[]>(DEMO_PARTS);
  const [services, setServices] = useState<ServiceRecord[]>(DEMO_SERVICES);
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS);
  const [logs, setLogs] = useState<ActivityLog[]>(DEMO_LOGS);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(DEMO_SERVICE_TYPES);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const activeRole = user.role;

    async function loadFromApi() {
      try {
        const [
          partsResponse,
          servicesResponse,
          transactionsResponse,
          serviceTypesResponse,
          stockMovementsResponse,
        ] = await Promise.all([
          apiGet<ApiList<Part>>('/api/parts'),
          apiGet<ApiList<ServiceRecord>>('/api/services'),
          apiGet<ApiList<Transaction>>('/api/transactions'),
          apiGet<ApiList<ServiceType>>('/api/service-types'),
          apiGet<ApiList<StockMovement>>('/api/stock-movements'),
        ]);

        if (cancelled) return;
        setParts(partsResponse.data);
        setServices(servicesResponse.data);
        setTransactions(transactionsResponse.data);
        setServiceTypes(serviceTypesResponse.data);
        setStockMovements(stockMovementsResponse.data);

        if (activeRole === 'Admin') {
          const [usersResponse, logsResponse] = await Promise.all([
            apiGet<ApiList<User>>('/api/users'),
            apiGet<ApiList<ActivityLog>>('/api/activity-logs'),
          ]);
          if (cancelled) return;
          setUsers(usersResponse.data);
          setLogs(logsResponse.data);
        }
      } catch (error) {
        console.error('Failed to load backend data', error);
        toast.error('Could not load backend data. Make sure the Laravel API is running.');
      }
    }

    void loadFromApi();

    return () => { cancelled = true; };
  }, [user]);

  const addLogAction = useCallback((action: string) => {
    const activeUser = userRef.current;
    if (!activeUser) return;
    const newLog: ActivityLog = {
      id: `l${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user: activeUser.name,
      action,
      timestamp: new Date().toISOString(),
    };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const recordMovement = useCallback((mov: Omit<StockMovement, 'id' | 'timestamp' | 'userId' | 'userName'>) => {
    const activeUser = userRef.current;
    const newMov: StockMovement = {
      ...mov,
      id: `m${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: activeUser?.id ?? 'system',
      userName: activeUser?.name ?? 'System',
    };
    setStockMovements(prev => [newMov, ...prev]);
  }, []);

  const addPart = useCallback(async (part: Omit<Part, 'id' | 'createdAt'>) => {
    try {
      const response = await apiMutation<ApiItem<Part>>('/api/parts', 'POST', part);
      const newPart = response.data;
      setParts(prev => [...prev, newPart]);
      if (newPart.stock > 0) {
        recordMovement({ partId: newPart.id, partName: newPart.name, type: 'in', qty: newPart.stock, reason: 'Initial stock' });
      }
      addLogAction(`Added new part: ${part.name}`);
      toast.success(`Part added: ${part.name}`);
    } catch (error) {
      showApiFailure('Add part', error);
    }
  }, [addLogAction, recordMovement]);

  const updatePart = useCallback(async (id: string, part: Partial<Part>) => {
    try {
      const response = await apiMutation<ApiItem<Part>>(`/api/parts/${id}`, 'PATCH', part);
      setParts(prev => {
        const before = prev.find(p => p.id === id);
        const next = prev.map(p => p.id === id ? response.data : p);
        const after = next.find(p => p.id === id);
        if (before && after && typeof part.stock === 'number' && before.stock !== after.stock) {
          const delta = after.stock - before.stock;
          recordMovement({
            partId: id,
            partName: after.name,
            type: delta > 0 ? 'in' : 'adjust',
            qty: Math.abs(delta),
            reason: 'Manual update',
          });
        }
        return next;
      });
      addLogAction(`Updated part: ${part.name || id}`);
      toast.success('Part updated');
    } catch (error) {
      showApiFailure('Update part', error);
    }
  }, [addLogAction, recordMovement]);

  const deletePart = useCallback(async (id: string) => {
    try {
      await apiMutation(`/api/parts/${id}`, 'DELETE');
      const name = parts.find(p => p.id === id)?.name || id;
      setParts(prev => prev.filter(p => p.id !== id));
      addLogAction(`Deleted part: ${name}`);
      toast.success(`Deleted ${name}`);
    } catch (error) {
      showApiFailure('Delete part', error);
    }
  }, [parts, addLogAction]);

  const recordStockMovement = useCallback(async (partId: string, type: 'in' | 'out' | 'adjust', qty: number, reason: string) => {
    try {
      await apiMutation('/api/stock-movements', 'POST', { partId, type, qty, reason });
      setParts(prev => {
        const target = prev.find(p => p.id === partId);
        if (!target) return prev;
        const delta = type === 'in' ? qty : type === 'out' ? -qty : qty;
        const newStock = type === 'adjust' ? qty : Math.max(0, target.stock + delta);
        recordMovement({ partId, partName: target.name, type, qty: type === 'adjust' ? Math.abs(qty - target.stock) : qty, reason });
        addLogAction(`Stock ${type} for ${target.name}: ${type === 'adjust' ? `set to ${qty}` : `${qty}`} - ${reason}`);
        toast.success(`Stock ${type === 'in' ? 'received' : type === 'out' ? 'issued' : 'adjusted'} for ${target.name}`);
        return prev.map(p => p.id === partId ? { ...p, stock: newStock } : p);
      });
    } catch (error) {
      showApiFailure('Record stock movement', error);
    }
  }, [addLogAction, recordMovement]);

  const addService = useCallback(async (service: Omit<ServiceRecord, 'id' | 'createdAt'>) => {
    try {
      const response = await apiMutation<ApiItem<ServiceRecord>>('/api/services', 'POST', service);
      const newService = response.data;
      setServices(prev => [...prev, newService]);
      addLogAction(`Created service record for ${service.customerName}`);
      toast.success(`Service created for ${service.customerName}`);
    } catch (error) {
      showApiFailure('Create service', error);
    }
  }, [addLogAction]);

  const updateService = useCallback(async (id: string, service: Partial<ServiceRecord>) => {
    try {
      const response = await apiMutation<ApiItem<ServiceRecord>>(`/api/services/${id}`, 'PATCH', service);
      setServices(prev => prev.map(s => s.id === id ? response.data : s));
      if (service.status) {
        addLogAction(`Updated service #${id} status to ${service.status}`);
        toast.success(`Service marked ${service.status}`);
      } else {
        addLogAction(`Updated service #${id}`);
      }
    } catch (error) {
      showApiFailure('Update service', error);
    }
  }, [addLogAction]);

  const deleteService = useCallback(async (id: string) => {
    try {
      await apiMutation(`/api/services/${id}`, 'DELETE');
      setServices(prev => prev.filter(s => s.id !== id));
      addLogAction(`Deleted service record #${id}`);
      toast.success('Service record deleted');
    } catch (error) {
      showApiFailure('Delete service', error);
    }
  }, [addLogAction]);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      const response = await apiMutation<ApiItem<Transaction>>('/api/transactions', 'POST', tx);
      const newTx = response.data;
      setParts(prev => prev.map(p => {
        const item = tx.items.find(i => i.partId === p.id);
        if (!item) return p;
        recordMovement({ partId: p.id, partName: p.name, type: 'out', qty: item.quantity, reason: `Sale ${newTx.id}` });
        return { ...p, stock: Math.max(0, p.stock - item.quantity) };
      }));
      setTransactions(prev => [...prev, newTx]);
      addLogAction(`Recorded ${tx.type} transaction (#${newTx.id}) - PHP ${tx.total.toLocaleString()}`);
      toast.success(`Sale recorded - PHP ${tx.total.toLocaleString()}`);
    } catch (error) {
      showApiFailure('Record transaction', error);
    }
  }, [addLogAction, recordMovement]);

  const addServiceType = useCallback(async (st: Omit<ServiceType, 'id'>) => {
    try {
      const response = await apiMutation<ApiItem<ServiceType>>('/api/service-types', 'POST', st);
      setServiceTypes(prev => [...prev, response.data]);
      addLogAction(`Added service type: ${st.name}`);
      toast.success(`Service type added: ${st.name}`);
    } catch (error) {
      showApiFailure('Add service type', error);
    }
  }, [addLogAction]);

  const updateServiceType = useCallback(async (id: string, st: Partial<ServiceType>) => {
    try {
      const response = await apiMutation<ApiItem<ServiceType>>(`/api/service-types/${id}`, 'PATCH', st);
      setServiceTypes(prev => prev.map(s => s.id === id ? response.data : s));
      addLogAction(`Updated service type #${id}`);
      toast.success('Service type updated');
    } catch (error) {
      showApiFailure('Update service type', error);
    }
  }, [addLogAction]);

  const deleteServiceType = useCallback(async (id: string) => {
    try {
      await apiMutation(`/api/service-types/${id}`, 'DELETE');
      setServiceTypes(prev => prev.filter(s => s.id !== id));
      addLogAction(`Deleted service type #${id}`);
      toast.success('Service type removed');
    } catch (error) {
      showApiFailure('Delete service type', error);
    }
  }, [addLogAction]);

  const addUser = useCallback(async ({ name, email, role, password }: { name: string; email: string; role: Role; password: string }) => {
    try {
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        toast.error('A user with that email already exists');
        return;
      }
      const response = await apiMutation<ApiItem<User>>('/api/users', 'POST', { name, email, role, password });
      setUsers(prev => [...prev, response.data]);
      addLogAction(`Created user ${name} (${role})`);
      toast.success(`User ${name} created`);
    } catch (error) {
      showApiFailure('Create user', error);
    }
  }, [users, addLogAction]);

  const updateUser = useCallback(async (id: string, patch: Partial<User> & { password?: string }) => {
    try {
      const response = await apiMutation<ApiItem<User>>(`/api/users/${id}`, 'PATCH', patch);
      setUsers(prev => prev.map(u => u.id === id ? response.data : u));
      addLogAction(`Updated user #${id}`);
      toast.success('User updated');
    } catch (error) {
      showApiFailure('Update user', error);
    }
  }, [addLogAction]);

  const setUserStatus = useCallback(async (id: string, status: 'Active' | 'Inactive') => {
    try {
      const response = await apiMutation<ApiItem<User>>(`/api/users/${id}/status`, 'PATCH', { status });
      setUsers(prev => prev.map(u => u.id === id ? response.data : u));
      addLogAction(`Set user #${id} status to ${status}`);
      toast.success(`User ${status === 'Active' ? 'enabled' : 'disabled'}`);
    } catch (error) {
      showApiFailure('Update user status', error);
    }
  }, [addLogAction]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      const target = users.find(u => u.id === id);
      if (!target) return;
      if (userRef.current?.id === id) {
        toast.error('You cannot delete your own account');
        return;
      }
      await apiMutation(`/api/users/${id}`, 'DELETE');
      setUsers(prev => prev.filter(u => u.id !== id));
      addLogAction(`Deleted user ${target.name}`);
      toast.success(`User ${target.name} deleted`);
    } catch (error) {
      showApiFailure('Delete user', error);
    }
  }, [users, addLogAction]);

  return (
    <DataContext.Provider value={{
      parts, services, transactions, logs, serviceTypes, stockMovements,
      users,
      addPart, updatePart, deletePart, recordStockMovement,
      addService, updateService, deleteService,
      addTransaction,
      addServiceType, updateServiceType, deleteServiceType,
      addUser, updateUser, setUserStatus, deleteUser,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
