# Walk-in Service + POS Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff can search and link a registered customer when creating a service or parts-only sale; unregistered customers are entered as a name only. Parts selection becomes a search-and-add flow instead of a flat chip list. The Sales page "New Transaction" modal gains a customer field.

**Architecture:** One new reusable `CustomerSearchInput` component handles the search-or-type pattern across both the Service form and Sales modal. A new backend endpoint `GET /api/customers/search` powers the lookup. `storeService` and `storeTransaction` both accept an optional `customer_id` to override the name-based customer resolution. The parts-only sale already exists on the Sales page — we just add a customer field and clean up the UX.

**Tech Stack:** Laravel 11 (PHP 8.3), React + TypeScript + Vite, Tailwind CSS, Lucide icons, react-hook-form / zod not needed for the new component (plain controlled state).

---

## File Map

**Created:**
- `Frontend/src/features/services/components/CustomerSearchInput.tsx` — reusable debounced customer search + type-in component

**Modified:**
- `Backend/app/Http/Controllers/Api/MospamsController.php` — add `searchCustomers`, modify `storeService` + `storeTransaction`
- `Backend/routes/api.php` — register `GET /customers/search`
- `Frontend/src/features/services/pages/ServicesPage.tsx` — replace customer name field with `CustomerSearchInput`; replace parts chip list with search-and-add
- `Frontend/src/features/sales/pages/SalesPage.tsx` — add `CustomerSearchInput` to transaction modal; pass `customerId` on checkout

---

## Task 1: Backend — Customer Search Endpoint + Link Customer by ID

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`
- Modify: `Backend/routes/api.php`

- [ ] **Step 1: Add `searchCustomers` method to MospamsController**

  In `MospamsController.php`, add this method near `customers()` (around line 1860):

  ```php
  public function searchCustomers(Request $request): JsonResponse
  {
      $q = trim($request->query('q', ''));
      if (strlen($q) < 1) {
          return response()->json(['data' => []]);
      }

      $rows = DB::table('customers')
          ->where('shop_id_fk', $this->shopId())
          ->where('full_name', 'like', '%'.$q.'%')
          ->orderBy('full_name')
          ->limit(10)
          ->get(['customer_id', 'full_name', 'phone', 'email']);

      return response()->json(['data' => $rows->map(fn ($r) => [
          'id'    => (string) $r->customer_id,
          'name'  => $r->full_name,
          'phone' => $r->phone ?? null,
          'email' => $r->email ?? null,
      ])]);
  }
  ```

- [ ] **Step 2: Register the route in `api.php`**

  Find (around line 137):
  ```php
  Route::get('/customers', [MospamsController::class, 'customers'])->middleware('role:Owner');
  ```
  Add after it:
  ```php
  Route::get('/customers/search', [MospamsController::class, 'searchCustomers'])->middleware('role:Owner,Staff');
  ```

- [ ] **Step 3: Accept optional `customerId` in `storeService`**

  In `storeService` (around line 744), find the validation:
  ```php
  $data = $request->validate([
      'customerName'         => ['required', 'string', 'max:100'],
      'motorcycleModel'      => ['nullable', 'string', 'max:150'],
      'serviceType'          => ['required', 'string', 'max:100'],
      'laborCost'            => ['required', 'numeric', 'min:0'],
      'status'               => ['nullable', Rule::in(['Pending', 'Ongoing', 'Completed'])],
      'partsUsed'            => ['array'],
      'partsUsed.*.partId'   => ['required'],
      'partsUsed.*.quantity' => ['required', 'integer', 'min:1'],
      'mechanicIds'          => ['array'],
      'mechanicIds.*'        => ['string'],
      'notes'                => ['nullable', 'string'],
  ]);
  ```
  Replace with:
  ```php
  $data = $request->validate([
      'customerName'         => ['required', 'string', 'max:100'],
      'customerId'           => ['nullable', 'integer'],
      'motorcycleModel'      => ['nullable', 'string', 'max:150'],
      'serviceType'          => ['required', 'string', 'max:100'],
      'laborCost'            => ['required', 'numeric', 'min:0'],
      'status'               => ['nullable', Rule::in(['Pending', 'Ongoing', 'Completed'])],
      'partsUsed'            => ['array'],
      'partsUsed.*.partId'   => ['required'],
      'partsUsed.*.quantity' => ['required', 'integer', 'min:1'],
      'mechanicIds'          => ['array'],
      'mechanicIds.*'        => ['string'],
      'notes'                => ['nullable', 'string'],
  ]);
  ```

  Then find inside the `DB::transaction` callback (around line 759):
  ```php
  $customerId = $this->customerId($data['customerName']);
  ```
  Replace with:
  ```php
  $customerId = !empty($data['customerId'])
      ? (int) $data['customerId']
      : $this->customerId($data['customerName']);
  ```

- [ ] **Step 4: Accept optional `customerId` in `storeTransaction`**

  In `storeTransaction` (around line 1270), find the validation block and add `customerId`:
  ```php
  $data = $request->validate([
      'customerName'     => ['nullable', 'string', 'max:100'],
      'customerId'       => ['nullable', 'integer'],
      'type'             => ['required', Rule::in(['parts-only', 'service+parts'])],
      'items'            => ['array'],
      'items.*.partId'   => ['required'],
      'items.*.quantity' => ['required', 'integer', 'min:1'],
      'items.*.price'    => ['required', 'numeric', 'min:0'],
      'serviceId'        => ['nullable'],
      'serviceLaborCost' => ['nullable', 'numeric', 'min:0'],
      'paymentMethod'    => ['required', Rule::in(['Cash', 'GCash'])],
      'total'            => ['required', 'numeric', 'min:0'],
  ]);
  ```

  Then find (around line 1282–1283):
  ```php
  $jobId = isset($data['serviceId']) ? $this->numericId($data['serviceId']) : null;
  $customerId = $jobId ? DB::table('service_jobs')->where('job_id', $jobId)->value('customer_id_fk') : null;
  ```
  Replace with:
  ```php
  $jobId = isset($data['serviceId']) ? $this->numericId($data['serviceId']) : null;
  $customerId = null;
  if ($jobId) {
      $customerId = DB::table('service_jobs')->where('job_id', $jobId)->value('customer_id_fk');
  } elseif (!empty($data['customerId'])) {
      $customerId = (int) $data['customerId'];
  } elseif (!empty($data['customerName'])) {
      $customerId = $this->customerId($data['customerName']);
  }
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/routes/api.php
  git commit -m "feat: add customer search endpoint and accept customer_id in service/transaction creation"
  ```

---

## Task 2: Frontend — CustomerSearchInput Component

**Files:**
- Create: `Frontend/src/features/services/components/CustomerSearchInput.tsx`

This is a controlled input that:
- Shows a text field where staff types a customer name
- After 300ms debounce, calls `GET /api/customers/search?q=` and shows a dropdown
- Clicking a result sets the name + stores the customer's ID
- Typing freely (no selection) = walk-in mode (ID stays null)
- Shows a small "Registered" badge on the field when a customer is linked

- [ ] **Step 1: Create the component file**

  Create `Frontend/src/features/services/components/CustomerSearchInput.tsx`:

  ```tsx
  import { useState, useEffect, useRef } from 'react';
  import { Search, UserCheck, X } from 'lucide-react';
  import { apiGet } from '@/shared/lib/api';

  interface CustomerResult {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  }

  interface Props {
    value: string;
    customerId: string | null;
    onChange: (name: string, id: string | null) => void;
    placeholder?: string;
    className?: string;
  }

  export function CustomerSearchInput({ value, customerId, onChange, placeholder = 'Customer name…', className = '' }: Props) {
    const [results, setResults] = useState<CustomerResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInput = (raw: string) => {
      onChange(raw, null); // clear linked ID when user types manually
      setOpen(true);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (raw.trim().length < 1) { setResults([]); return; }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const data = await apiGet<{ data: CustomerResult[] }>(`/api/customers/search?q=${encodeURIComponent(raw)}`);
          setResults(data.data);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    };

    const select = (r: CustomerResult) => {
      onChange(r.name, r.id);
      setResults([]);
      setOpen(false);
    };

    const clearLink = () => {
      onChange(value, null);
    };

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => value.trim().length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
          {customerId && (
            <button
              type="button"
              onClick={clearLink}
              title="Unlink registered customer"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 hover:text-muted-foreground transition-colors"
            >
              <UserCheck className="w-4 h-4" />
            </button>
          )}
          {!customerId && value && (
            <button
              type="button"
              onClick={() => onChange('', null)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {customerId && (
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mt-1 ml-1">
            ✓ Linked to registered customer
          </p>
        )}

        {open && (value.trim().length > 0) && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
            {loading && (
              <p className="text-xs text-muted-foreground text-center py-3">Searching…</p>
            )}
            {!loading && results.length === 0 && (
              <p className="text-xs text-muted-foreground px-4 py-3">
                No registered customer found — will be saved as walk-in.
              </p>
            )}
            {!loading && results.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => select(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-muted dark:hover:bg-zinc-800 transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.name}</p>
                  {(r.phone || r.email) && (
                    <p className="text-xs text-muted-foreground">{r.phone ?? r.email}</p>
                  )}
                </div>
                <UserCheck className="w-3.5 h-3.5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add Frontend/src/features/services/components/CustomerSearchInput.tsx
  git commit -m "feat: CustomerSearchInput component — search registered customers or type walk-in name"
  ```

---

## Task 3: Frontend — Update ServicesPage New Service Form

**Files:**
- Modify: `Frontend/src/features/services/pages/ServicesPage.tsx`

Two changes: (a) replace the customer name `Input` with `CustomerSearchInput`, (b) replace the flat parts chip list with a search-and-add flow.

- [ ] **Step 1: Add state for customer ID and parts search; import CustomerSearchInput**

  At the top of the file, add the import:
  ```tsx
  import { CustomerSearchInput } from '../components/CustomerSearchInput';
  ```

  Inside the `Services()` component, after the existing state declarations (around line 88), add:
  ```tsx
  const [linkedCustomerId, setLinkedCustomerId] = useState<string | null>(null);
  const [partsSearch, setPartsSearch] = useState('');
  ```

  Clear these when opening add/edit modal. In `openAdd` (around line 133):
  ```tsx
  const openAdd = () => {
    setEditing(null);
    form.reset({ customerName: '', motorcycleModel: '', serviceType: '', laborCost: 0, notes: '' });
    setPartsUsed([]);
    setSelectedMechanicIds([]);
    setLinkedCustomerId(null);
    setPartsSearch('');
    setModalOpen(true);
  };
  ```

  In `openEdit` (around line 140):
  ```tsx
  const openEdit = (s: ServiceRecord) => {
    setEditing(s);
    form.reset({ customerName: s.customerName, motorcycleModel: s.motorcycleModel, serviceType: s.serviceType, laborCost: s.laborCost, notes: s.notes });
    setPartsUsed(s.partsUsed.map(p => ({ partId: p.partId, quantity: p.quantity })));
    setSelectedMechanicIds((s.mechanics ?? []).map(m => m.id));
    setLinkedCustomerId(null);
    setPartsSearch('');
    setModalOpen(true);
  };
  ```

- [ ] **Step 2: Pass `customerId` in the service submission**

  In `onSubmit` (around line 148), when calling `addService` / `updateService`, add `customerId`:
  ```tsx
  const onSubmit = form.handleSubmit(async (values) => {
    const shapedParts = partsUsed.map(p => ({
      jobPartId: '',
      partId: p.partId,
      quantity: p.quantity,
      status: 'confirmed' as const,
    }));
    const mechanics = selectedMechanicIds
      .map(id => availableMechanics.find(m => m.id === id))
      .filter((m): m is Mechanic => Boolean(m));
    if (editing) {
      const updated = await updateService(editing.id, {
        ...values,
        partsUsed: shapedParts,
        mechanicIds: selectedMechanicIds,
        mechanics,
      } as Partial<import('@/shared/types').ServiceRecord>);
      updateItem(editing.id, 'id', updated);
    } else {
      const created = await addService({
        ...values,
        customerId: linkedCustomerId ?? undefined,
        status: 'Pending',
        statusCode: 'pending',
        partsUsed: shapedParts,
        partRequests: [],
        mechanicIds: selectedMechanicIds,
        mechanics,
        completedAt: undefined,
      } as Omit<import('@/shared/types').ServiceRecord, 'id' | 'createdAt'>);
      prependItem(created);
    }
    setModalOpen(false);
  });
  ```

- [ ] **Step 3: Replace the customer name Input with CustomerSearchInput in the form JSX**

  Find the customer name field in the form (around line 492–495):
  ```tsx
  <div>
    <Label className="text-xs font-medium text-muted-foreground">Customer Name</Label>
    <Input {...form.register('customerName')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="Juan Dela Cruz" />
    {form.formState.errors.customerName && <p className="text-xs text-red-400 mt-1">{form.formState.errors.customerName.message}</p>}
  </div>
  ```
  Replace with:
  ```tsx
  <div>
    <Label className="text-xs font-medium text-muted-foreground">Customer</Label>
    <CustomerSearchInput
      value={form.watch('customerName')}
      customerId={linkedCustomerId}
      onChange={(name, id) => {
        form.setValue('customerName', name, { shouldValidate: true });
        setLinkedCustomerId(id);
      }}
      placeholder="Search or type customer name…"
      className="mt-1.5"
    />
    {form.formState.errors.customerName && <p className="text-xs text-red-400 mt-1">{form.formState.errors.customerName.message}</p>}
  </div>
  ```

- [ ] **Step 4: Replace the flat parts chip list with search-and-add**

  Find the parts section in the form (around line 541–560):
  ```tsx
  <div>
    <Label className="text-xs font-medium text-muted-foreground">Parts Used</Label>
    <div className="mt-1.5 flex flex-wrap gap-2">
      {availableParts.filter(p => p.stock > 0).map(part => (
        <button type="button" key={part.id} onClick={() => addPartToService(part.id)} className="text-xs font-medium bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 hover:bg-secondary dark:bg-zinc-800 text-muted-foreground px-3 py-1.5 rounded-lg border border-border dark:border-zinc-700 transition-colors">+ {part.name}</button>
      ))}
    </div>
    {partsUsed.length > 0 && (
      <div className="mt-2 space-y-1">
        {partsUsed.map(pu => {
          const part = availableParts.find(p => p.id === pu.partId);
          return (
            <div key={pu.partId} className="flex items-center justify-between text-sm bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 px-3 py-2 rounded-lg border border-border dark:border-zinc-700">
              <span className="text-foreground">{part ? `${part.name} x${pu.quantity}` : `Part #${pu.partId} x${pu.quantity}`}</span>
              <button type="button" onClick={() => removePartFromService(pu.partId)} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>
    )}
  </div>
  ```
  Replace with:
  ```tsx
  <div>
    <Label className="text-xs font-medium text-muted-foreground">Parts Used</Label>
    <div className="relative mt-1.5">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search parts to add…"
        value={partsSearch}
        onChange={e => setPartsSearch(e.target.value)}
        className="w-full h-10 pl-9 pr-3 rounded-xl bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/10"
      />
    </div>
    {partsSearch.trim().length > 0 && (
      <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-border dark:border-zinc-700 divide-y divide-border dark:divide-zinc-800">
        {availableParts
          .filter(p => p.stock > 0 && p.name.toLowerCase().includes(partsSearch.toLowerCase()))
          .slice(0, 8)
          .map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { addPartToService(p.id); setPartsSearch(''); }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <span className="font-medium text-foreground">{p.name}</span>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">₱{p.price} · {p.stock} left</span>
            </button>
          ))}
        {availableParts.filter(p => p.stock > 0 && p.name.toLowerCase().includes(partsSearch.toLowerCase())).length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No parts found</p>
        )}
      </div>
    )}
    {partsUsed.length > 0 && (
      <div className="mt-2 space-y-1">
        {partsUsed.map(pu => {
          const part = availableParts.find(p => p.id === pu.partId);
          return (
            <div key={pu.partId} className="flex items-center justify-between text-sm bg-secondary/50 dark:bg-zinc-800/50 px-3 py-2 rounded-lg border border-border dark:border-zinc-700">
              <span className="text-foreground">{part ? part.name : `Part #${pu.partId}`}</span>
              <div className="flex items-center gap-2 ml-2">
                <button type="button" onClick={() => setPartsUsed(prev => prev.map(p => p.partId === pu.partId ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p))} className="w-6 h-6 rounded-lg bg-muted/50 dark:bg-zinc-700/50 text-muted-foreground text-xs font-bold flex items-center justify-center">-</button>
                <span className="w-5 text-center tabular-nums text-sm font-semibold text-foreground">{pu.quantity}</span>
                <button type="button" onClick={() => setPartsUsed(prev => prev.map(p => p.partId === pu.partId ? { ...p, quantity: p.quantity + 1 } : p))} className="w-6 h-6 rounded-lg bg-muted/50 dark:bg-zinc-700/50 text-muted-foreground text-xs font-bold flex items-center justify-center">+</button>
                <button type="button" onClick={() => removePartFromService(pu.partId)} className="text-muted-foreground hover:text-red-400 ml-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
  ```

- [ ] **Step 5: Make sure `Search` is in the lucide import**

  The file already imports `Search` from lucide-react (line 6). No change needed.

- [ ] **Step 6: Commit**

  ```bash
  git add Frontend/src/features/services/pages/ServicesPage.tsx
  git commit -m "feat: customer search/link and parts search-and-add in service creation form"
  ```

---

## Task 4: Frontend — Parts-Only Sale Customer Field (SalesPage)

**Files:**
- Modify: `Frontend/src/features/sales/pages/SalesPage.tsx`

The Sales "New Transaction" modal is already the parts-only sale. We add a customer field at the top and pass it on checkout.

- [ ] **Step 1: Import `CustomerSearchInput` and add customer state**

  Add to imports at top of `SalesPage.tsx`:
  ```tsx
  import { CustomerSearchInput } from '@/features/services/components/CustomerSearchInput';
  ```

  Inside `Sales()`, after existing state declarations (around line 37), add:
  ```tsx
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [saleCustomerId, setSaleCustomerId] = useState<string | null>(null);
  ```

  Clear on modal close. Find the modal close handler — find where `setModalOpen` is called and also reset:
  ```tsx
  const resetModal = () => {
    setModalOpen(false);
    setCart([]);
    setSelectedService('');
    setServiceLabor(0);
    setPaymentMethod('Cash');
    setSaleCustomerName('');
    setSaleCustomerId(null);
  };
  ```

  Then replace all `setModalOpen(false); setCart([]); setSelectedService(''); setServiceLabor(0); setPaymentMethod('Cash');` with `resetModal();` in `handleCheckout`.

- [ ] **Step 2: Pass `customerName` and `customerId` in the checkout call**

  Find `handleCheckout` (around line 77):
  ```tsx
  const handleCheckout = async () => {
    if (cart.length === 0 && !selectedService) return;
    const newTx = await addTransaction({
      type: selectedService ? 'service+parts' : 'parts-only',
      items: cart.map(c => ({ partId: c.partId, name: c.name, quantity: c.quantity, price: c.price })),
      serviceId: selectedService || undefined,
      serviceLaborCost: selectedService ? serviceLabor : undefined,
      paymentMethod,
      total: grandTotal,
    });
    prependItem(newTx);
    setModalOpen(false); setCart([]); setSelectedService(''); setServiceLabor(0); setPaymentMethod('Cash');
  };
  ```
  Replace with:
  ```tsx
  const handleCheckout = async () => {
    if (cart.length === 0 && !selectedService) return;
    const newTx = await addTransaction({
      type: selectedService ? 'service+parts' : 'parts-only',
      items: cart.map(c => ({ partId: c.partId, name: c.name, quantity: c.quantity, price: c.price })),
      serviceId: selectedService || undefined,
      serviceLaborCost: selectedService ? serviceLabor : undefined,
      customerName: saleCustomerName.trim() || undefined,
      customerId: saleCustomerId ?? undefined,
      paymentMethod,
      total: grandTotal,
    });
    prependItem(newTx);
    resetModal();
  };
  ```

- [ ] **Step 3: Add `Transaction` type fields for customerName/customerId if not present**

  In `Frontend/src/shared/types/index.ts`, find the `Transaction` interface (around line 62):
  ```ts
  export interface Transaction {
    id: string;
    type: 'parts-only' | 'service+parts';
    items: { partId: string; name: string; quantity: number; price: number }[];
    serviceId?: string;
    serviceLaborCost?: number;
    paymentMethod: 'Cash' | 'GCash';
    total: number;
  ```
  Add optional fields:
  ```ts
  export interface Transaction {
    id: string;
    type: 'parts-only' | 'service+parts';
    items: { partId: string; name: string; quantity: number; price: number }[];
    serviceId?: string;
    serviceLaborCost?: number;
    customerName?: string;
    customerId?: string;
    paymentMethod: 'Cash' | 'GCash';
    total: number;
  ```

- [ ] **Step 4: Add the customer field to the modal JSX**

  In the modal `<DialogContent>` (around line 199), find:
  ```tsx
  <DialogHeader className="pb-2"><DialogTitle className="text-base font-semibold text-foreground">New Transaction</DialogTitle></DialogHeader>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-3">
  ```
  Replace with:
  ```tsx
  <DialogHeader className="pb-2"><DialogTitle className="text-base font-semibold text-foreground">New Transaction</DialogTitle></DialogHeader>
  <div className="pt-2 pb-1">
    <label className="text-xs font-medium text-muted-foreground">Customer (optional)</label>
    <CustomerSearchInput
      value={saleCustomerName}
      customerId={saleCustomerId}
      onChange={(name, id) => { setSaleCustomerName(name); setSaleCustomerId(id); }}
      placeholder="Search registered or type walk-in name…"
      className="mt-1.5"
    />
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
  ```

- [ ] **Step 5: Update the modal's `onOpenChange` to use `resetModal`**

  Find:
  ```tsx
  <Dialog open={modalOpen} onOpenChange={setModalOpen}>
  ```
  Replace with:
  ```tsx
  <Dialog open={modalOpen} onOpenChange={open => { if (!open) resetModal(); else setModalOpen(true); }}>
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add Frontend/src/features/sales/pages/SalesPage.tsx Frontend/src/shared/types/index.ts
  git commit -m "feat: add customer search to parts-only sale (Sales page transaction modal)"
  ```

---

## Task 5: Deploy

- [ ] **Step 1: Deploy**

  ```bash
  bash deploy.sh
  ```

---

## Self-Review

**Spec coverage:**
- Customer search + link registered customer in New Service ✓ Tasks 1, 2, 3
- Walk-in fallback (type name, no link) ✓ Task 2 — component shows "will be saved as walk-in" when no match
- Parts search-and-add in service form ✓ Task 3
- Parts-only sale format with customer field ✓ Task 4

**Notes:**
- `customerId` field on `Transaction` type (Task 4 Step 3) must be added before `addTransaction` call or TypeScript will error.
- The `customers/search` route must be accessible to Staff role — confirmed in Task 1 Step 2.
- The `resetModal` function in Task 4 replaces inline state resets — this must be defined before `handleCheckout` references it, or move it above.
- `form.watch('customerName')` in Task 3 triggers re-renders on every keystroke — acceptable for a modal form; no optimization needed.
