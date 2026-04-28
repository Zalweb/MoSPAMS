import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { Part, ServiceRecord, Transaction, ActivityLog } from '@/shared/types';
import { useAuth } from '@/features/auth/context/AuthContext';

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

interface DataContextType {
  parts: Part[];
  services: ServiceRecord[];
  transactions: Transaction[];
  logs: ActivityLog[];
  addPart: (part: Omit<Part, 'id' | 'createdAt'>) => void;
  updatePart: (id: string, part: Partial<Part>) => void;
  deletePart: (id: string) => void;
  addService: (service: Omit<ServiceRecord, 'id' | 'createdAt'>) => void;
  updateService: (id: string, service: Partial<ServiceRecord>) => void;
  deleteService: (id: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

function loadData<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [parts, setParts] = useState<Part[]>(() => loadData('mospams_parts', DEMO_PARTS));
  const [services, setServices] = useState<ServiceRecord[]>(() => loadData('mospams_services', DEMO_SERVICES));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadData('mospams_transactions', DEMO_TRANSACTIONS));
  const [logs, setLogs] = useState<ActivityLog[]>(() => loadData('mospams_logs', DEMO_LOGS));

  const persist = useCallback((key: string, data: unknown) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, []);

  const addLogAction = useCallback((action: string) => {
    const u = userRef.current;
    if (!u) return;
    const newLog: ActivityLog = { id: `l${Date.now()}`, user: u.name, action, timestamp: new Date().toISOString() };
    setLogs(prev => { const next = [newLog, ...prev]; persist('mospams_logs', next); return next; });
  }, [persist]);

  const addPart = useCallback((part: Omit<Part, 'id' | 'createdAt'>) => {
    const newPart: Part = { ...part, id: `p${Date.now()}`, createdAt: new Date().toISOString() };
    setParts(prev => { const next = [...prev, newPart]; persist('mospams_parts', next); return next; });
    addLogAction(`Added new part: ${part.name}`);
  }, [persist, addLogAction]);

  const updatePart = useCallback((id: string, part: Partial<Part>) => {
    setParts(prev => { const next = prev.map(p => p.id === id ? { ...p, ...part } : p); persist('mospams_parts', next); return next; });
    addLogAction(`Updated part: ${part.name || id}`);
  }, [persist, addLogAction]);

  const deletePart = useCallback((id: string) => {
    setParts(prev => {
      const name = prev.find(p => p.id === id)?.name || id;
      const next = prev.filter(p => p.id !== id);
      persist('mospams_parts', next);
      addLogAction(`Deleted part: ${name}`);
      return next;
    });
  }, [persist, addLogAction]);

  const addService = useCallback((service: Omit<ServiceRecord, 'id' | 'createdAt'>) => {
    const newService: ServiceRecord = { ...service, id: `s${Date.now()}`, createdAt: new Date().toISOString() };
    setServices(prev => { const next = [...prev, newService]; persist('mospams_services', next); return next; });
    addLogAction(`Created service record for ${service.customerName}`);
  }, [persist, addLogAction]);

  const updateService = useCallback((id: string, service: Partial<ServiceRecord>) => {
    setServices(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...service, ...(service.status === 'Completed' && s.status !== 'Completed' ? { completedAt: new Date().toISOString() } : {}) } : s);
      persist('mospams_services', next);
      return next;
    });
    if (service.status) addLogAction(`Updated service #${id} status to ${service.status}`);
  }, [persist, addLogAction]);

  const deleteService = useCallback((id: string) => {
    setServices(prev => { const next = prev.filter(s => s.id !== id); persist('mospams_services', next); return next; });
    addLogAction(`Deleted service record #${id}`);
  }, [persist, addLogAction]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = { ...tx, id: `t${Date.now()}`, createdAt: new Date().toISOString() };
    setParts(prev => {
      const next = prev.map(p => { const item = tx.items.find(i => i.partId === p.id); return item ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p; });
      persist('mospams_parts', next); return next;
    });
    setTransactions(prev => { const next = [...prev, newTx]; persist('mospams_transactions', next); return next; });
    addLogAction(`Recorded ${tx.type} transaction (#${newTx.id}) — ₱${tx.total.toLocaleString()}`);
  }, [persist, addLogAction]);

  return (
    <DataContext.Provider value={{ parts, services, transactions, logs, addPart, updatePart, deletePart, addService, updateService, deleteService, addTransaction }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
