import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Part, ServiceRecord, Transaction, ActivityLog, ServiceType, StockMovement, User, Role, Category } from '@/shared/types';
import { useAuth } from '@/features/auth/context/AuthContext';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { normalizeRole } from '@/shared/lib/roles';

interface DataContextType {
  serviceTypes: ServiceType[];
  categories: Category[];
  users: User[];
  logs: ActivityLog[];
  loading: boolean;

  addPart: (part: Omit<Part, 'id' | 'createdAt'>) => Promise<Part>;
  updatePart: (id: string, part: Partial<Part>) => Promise<Part>;
  deletePart: (id: string) => Promise<void>;
  recordStockMovement: (partId: string, type: 'in' | 'out' | 'adjust', qty: number, reason: string) => Promise<StockMovement | void>;
  addService: (service: Omit<ServiceRecord, 'id' | 'createdAt'>) => Promise<ServiceRecord>;
  updateService: (id: string, service: Partial<ServiceRecord>) => Promise<ServiceRecord>;
  deleteService: (id: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<Transaction>;
  addServiceType: (st: Omit<ServiceType, 'id'>) => Promise<ServiceType>;
  updateServiceType: (id: string, st: Partial<ServiceType>) => Promise<ServiceType>;
  deleteServiceType: (id: string) => Promise<void>;
  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
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
  const message = error instanceof Error ? error.message : 'Unknown error';
  if (message.includes('401') || message.includes('Unauthenticated')) {
    toast.error(`${action} failed: Please log in again.`);
  } else if (message.includes('403') || message.includes('Forbidden')) {
    toast.error(`${action} failed: You don't have permission.`);
  } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    toast.error(`${action} failed: Cannot connect to server. Check if backend is running.`);
  } else {
    toast.error(`${action} failed: ${message}`);
  }
}

function useReferenceQuery<T>(key: string, path: string, enabled: boolean) {
  return useQuery<T[]>({
    queryKey: ['ref', key],
    queryFn: () => apiGet<ApiList<T>>(path).then(r => r.data),
    enabled,
    staleTime: 2 * 60_000, // reference data changes rarely — cache 2 min
    gcTime: 10 * 60_000,
  });
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const role = normalizeRole(user?.role);
  const isShopUser = !!user && role !== 'SuperAdmin' && role !== 'Customer' && role !== 'Mechanic';
  const isPrivileged = isShopUser && (role === 'Owner' || role === 'Admin');

  const { data: serviceTypes = [], isFetching: stFetching } = useReferenceQuery<ServiceType>('serviceTypes', '/api/service-types', isShopUser);
  const { data: categories = [], isFetching: catFetching } = useReferenceQuery<Category>('categories', '/api/categories', isShopUser);
  const { data: users = [], isFetching: usersFetching } = useReferenceQuery<User>('users', '/api/users', isPrivileged);
  const { data: logs = [], isFetching: logsFetching } = useReferenceQuery<ActivityLog>('logs', '/api/activity-logs', isPrivileged);

  const loading = stFetching || catFetching || usersFetching || logsFetching;

  // Clear all cached reference data on logout
  useEffect(() => {
    if (!user) {
      queryClient.removeQueries({ queryKey: ['ref'] });
      queryClient.removeQueries({ queryKey: ['paginated'] });
    }
  }, [user, queryClient]);

  const addPart = useCallback(async (part: Omit<Part, 'id' | 'createdAt'>): Promise<Part> => {
    try {
      const response = await apiMutation<ApiItem<Part>>('/api/parts', 'POST', part);
      toast.success(`Part added: ${part.name}`);
      return response.data;
    } catch (error) { showApiFailure('Add part', error); throw error; }
  }, []);

  const updatePart = useCallback(async (id: string, part: Partial<Part>): Promise<Part> => {
    try {
      const response = await apiMutation<ApiItem<Part>>(`/api/parts/${id}`, 'PATCH', part);
      toast.success('Part updated');
      return response.data;
    } catch (error) { showApiFailure('Update part', error); throw error; }
  }, []);

  const deletePart = useCallback(async (id: string): Promise<void> => {
    try {
      await apiMutation(`/api/parts/${id}`, 'DELETE');
      toast.success('Part deleted');
    } catch (error) { showApiFailure('Delete part', error); throw error; }
  }, []);

  const recordStockMovement = useCallback(async (partId: string, type: 'in' | 'out' | 'adjust', qty: number, reason: string) => {
    try {
      await apiMutation('/api/stock-movements', 'POST', { partId, type, qty, reason });
      const label = type === 'in' ? 'received' : type === 'out' ? 'issued' : 'adjusted';
      toast.success(`Stock ${label}`);
    } catch (error) { showApiFailure('Record stock movement', error); throw error; }
  }, []);

  const addService = useCallback(async (service: Omit<ServiceRecord, 'id' | 'createdAt'>): Promise<ServiceRecord> => {
    try {
      const response = await apiMutation<ApiItem<ServiceRecord>>('/api/services', 'POST', service);
      toast.success(`Service created for ${service.customerName}`);
      return response.data;
    } catch (error) { showApiFailure('Create service', error); throw error; }
  }, []);

  const updateService = useCallback(async (id: string, service: Partial<ServiceRecord>): Promise<ServiceRecord> => {
    try {
      const response = await apiMutation<ApiItem<ServiceRecord>>(`/api/services/${id}`, 'PATCH', service);
      toast.success(service.status ? `Service marked ${service.status}` : 'Service updated');
      return response.data;
    } catch (error) { showApiFailure('Update service', error); throw error; }
  }, []);

  const deleteService = useCallback(async (id: string): Promise<void> => {
    try {
      await apiMutation(`/api/services/${id}`, 'DELETE');
      toast.success('Service record deleted');
    } catch (error) { showApiFailure('Delete service', error); throw error; }
  }, []);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
    try {
      const response = await apiMutation<ApiItem<Transaction>>('/api/transactions', 'POST', tx);
      toast.success(`Sale recorded - PHP ${tx.total.toLocaleString()}`);
      return response.data;
    } catch (error) { showApiFailure('Record transaction', error); throw error; }
  }, []);

  const addServiceType = useCallback(async (st: Omit<ServiceType, 'id'>): Promise<ServiceType> => {
    try {
      const response = await apiMutation<ApiItem<ServiceType>>('/api/service-types', 'POST', st);
      queryClient.setQueryData<ServiceType[]>(['ref', 'serviceTypes'], old => [...(old ?? []), response.data]);
      toast.success(`Service type added: ${st.name}`);
      return response.data;
    } catch (error) { showApiFailure('Add service type', error); throw error; }
  }, [queryClient]);

  const updateServiceType = useCallback(async (id: string, st: Partial<ServiceType>): Promise<ServiceType> => {
    try {
      const response = await apiMutation<ApiItem<ServiceType>>(`/api/service-types/${id}`, 'PATCH', st);
      queryClient.setQueryData<ServiceType[]>(['ref', 'serviceTypes'], old => (old ?? []).map(s => s.id === id ? response.data : s));
      toast.success('Service type updated');
      return response.data;
    } catch (error) { showApiFailure('Update service type', error); throw error; }
  }, [queryClient]);

  const deleteServiceType = useCallback(async (id: string): Promise<void> => {
    try {
      await apiMutation(`/api/service-types/${id}`, 'DELETE');
      queryClient.setQueryData<ServiceType[]>(['ref', 'serviceTypes'], old => (old ?? []).filter(s => s.id !== id));
      toast.success('Service type removed');
    } catch (error) { showApiFailure('Delete service type', error); throw error; }
  }, [queryClient]);

  const addCategory = useCallback(async (cat: Omit<Category, 'id'>): Promise<Category> => {
    try {
      const response = await apiMutation<ApiItem<Category>>('/api/categories', 'POST', cat);
      queryClient.setQueryData<Category[]>(['ref', 'categories'], old => [...(old ?? []), response.data]);
      toast.success(`Category added: ${cat.name}`);
      return response.data;
    } catch (error) { showApiFailure('Add category', error); throw error; }
  }, [queryClient]);

  const addUser = useCallback(async ({ name, email, role: userRole, password }: { name: string; email: string; role: Role; password: string }) => {
    try {
      const currentUsers = queryClient.getQueryData<User[]>(['ref', 'users']) ?? [];
      if (currentUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        toast.error('A user with that email already exists');
        return;
      }
      const response = await apiMutation<ApiItem<User>>('/api/users', 'POST', { name, email, role: userRole, password });
      queryClient.setQueryData<User[]>(['ref', 'users'], old => [...(old ?? []), response.data]);
      toast.success(`User ${name} created`);
    } catch (error) { showApiFailure('Create user', error); }
  }, [queryClient]);

  const updateUser = useCallback(async (id: string, patch: Partial<User> & { password?: string }) => {
    try {
      const response = await apiMutation<ApiItem<User>>(`/api/users/${id}`, 'PATCH', patch);
      queryClient.setQueryData<User[]>(['ref', 'users'], old => (old ?? []).map(u => u.id === id ? response.data : u));
      toast.success('User updated');
    } catch (error) { showApiFailure('Update user', error); }
  }, [queryClient]);

  const setUserStatus = useCallback(async (id: string, status: 'Active' | 'Inactive') => {
    try {
      const response = await apiMutation<ApiItem<User>>(`/api/users/${id}/status`, 'PATCH', { status });
      queryClient.setQueryData<User[]>(['ref', 'users'], old => (old ?? []).map(u => u.id === id ? response.data : u));
      toast.success(`User ${status === 'Active' ? 'enabled' : 'disabled'}`);
    } catch (error) { showApiFailure('Update user status', error); }
  }, [queryClient]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      const currentUsers = queryClient.getQueryData<User[]>(['ref', 'users']) ?? [];
      const target = currentUsers.find(u => u.id === id);
      if (!target) return;
      if (userRef.current?.id === id) { toast.error('You cannot delete your own account'); return; }
      await apiMutation(`/api/users/${id}`, 'DELETE');
      queryClient.setQueryData<User[]>(['ref', 'users'], old => (old ?? []).filter(u => u.id !== id));
      toast.success(`User ${target.name} deleted`);
    } catch (error) { showApiFailure('Delete user', error); }
  }, [queryClient]);

  return (
    <DataContext.Provider value={{
      serviceTypes, categories, users, logs, loading,
      addPart, updatePart, deletePart, recordStockMovement,
      addService, updateService, deleteService,
      addTransaction,
      addServiceType, updateServiceType, deleteServiceType,
      addCategory,
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
