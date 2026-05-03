import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { Part, ServiceRecord, Transaction, ActivityLog, ServiceType, StockMovement, User, Role } from '@/shared/types';
import { useAuth } from '@/features/auth/context/AuthContext';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { normalizeRole } from '@/shared/lib/roles';

interface DataContextType {
  parts: Part[];
  services: ServiceRecord[];
  transactions: Transaction[];
  logs: ActivityLog[];
  serviceTypes: ServiceType[];
  stockMovements: StockMovement[];
  users: User[];
  loading: boolean;
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

  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setParts([]);
      setServices([]);
      setTransactions([]);
      setLogs([]);
      setServiceTypes([]);
      setStockMovements([]);
      setUsers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const activeRole = normalizeRole(user.role);

    async function loadFromApi() {
      // SuperAdmin and Customer use dedicated data sources outside tenant data context.
      if (activeRole === 'SuperAdmin' || activeRole === 'Customer' || activeRole === 'Mechanic') {
        setParts([]);
        setServices([]);
        setTransactions([]);
        setLogs([]);
        setServiceTypes([]);
        setStockMovements([]);
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
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

        if (activeRole === 'Owner' || activeRole === 'Admin') {
          const [usersResponse, logsResponse] = await Promise.all([
            apiGet<ApiList<User>>('/api/users'),
            apiGet<ApiList<ActivityLog>>('/api/activity-logs'),
          ]);
          if (cancelled) return;
          setUsers(usersResponse.data);
          setLogs(logsResponse.data);
        } else {
          setUsers([]);
          setLogs([]);
        }
      } catch (error) {
        console.error('Failed to load backend data', error);
        toast.error('Could not load backend data. Make sure the Laravel API is running.');
      } finally {
        if (!cancelled) setLoading(false);
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
      users, loading,
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
