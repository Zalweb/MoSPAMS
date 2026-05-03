# Customer Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a customer-facing portal allowing customers to book services, track repairs, view service history, and make payments.

**Architecture:** Frontend pages for customers with read-only access to their own service records and ability to create new service requests. Backend endpoints to filter data by authenticated customer. Reuse existing DataContext and API patterns.

**Tech Stack:** React + TypeScript + Vite, Tailwind CSS (stone color scheme), Laravel backend API, existing UI components.

---

## File Map

**Frontend — create:**
- `Frontend/src/features/customers/pages/CustomerDashboard.tsx` — customer overview with active services and quick actions
- `Frontend/src/features/customers/pages/BookService.tsx` — service booking form
- `Frontend/src/features/customers/pages/ServiceHistory.tsx` — customer's service history
- `Frontend/src/features/customers/pages/Payments.tsx` — payment history and make payment

**Frontend — modify:**
- `Frontend/src/shared/lib/permissions.ts` — add customer access to routes
- `Frontend/src/app/App.tsx` — add customer routes
- `Frontend/src/features/layout/pages/DashboardLayout.tsx` — add customer navigation items
- `Frontend/src/shared/contexts/DataContext.tsx` — add customer-specific data fetching

**Backend — create:**
- `Backend/app/Http/Controllers/Api/CustomerController.php` — customer-specific endpoints
- `Backend/tests/Feature/CustomerControllerTest.php` — customer endpoint tests

**Backend — modify:**
- `Backend/routes/api.php` — add customer routes

---

## Task 1: Backend — CustomerController

**Files:**
- Create: `Backend/app/Http/Controllers/Api/CustomerController.php`
- Create: `Backend/tests/Feature/CustomerControllerTest.php`

- [ ] **Step 1: Write the failing tests**

Create `Backend/tests/Feature/CustomerControllerTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CustomerControllerTest extends TestCase
{
    use RefreshDatabase;

    private function seedBase(): array
    {
        foreach (['Admin', 'Staff', 'Mechanic', 'Customer'] as $role) {
            DB::table('roles')->insert(['role_name' => $role]);
        }
        DB::table('user_statuses')->insert([
            ['status_code' => 'ACTIVE', 'status_name' => 'Active', 'description' => null],
            ['status_code' => 'INACTIVE', 'status_name' => 'Inactive', 'description' => null],
        ]);
        DB::table('service_types')->insert([
            ['name' => 'Oil Change', 'default_labor_cost' => 500],
            ['name' => 'Tune Up', 'default_labor_cost' => 800],
        ]);
        return [
            'roles'    => DB::table('roles')->pluck('role_id', 'role_name'),
            'activeId' => DB::table('user_statuses')->where('status_code', 'ACTIVE')->value('user_status_id'),
        ];
    }

    private function createCustomer(array $seed, string $email): object
    {
        $id = DB::table('users')->insertGetId([
            'full_name'         => 'Test Customer',
            'username'          => $email,
            'email'             => $email,
            'password_hash'     => Hash::make('password'),
            'role_id_fk'        => $seed['roles']['Customer'],
            'user_status_id_fk' => $seed['activeId'],
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        DB::table('customers')->insert([
            'user_id_fk' => $id,
            'full_name'  => 'Test Customer',
            'email'      => $email,
        ]);
        return DB::table('users')->where('user_id', $id)->first();
    }

    private function createService(array $seed, int $customerId, string $status = 'Pending'): int
    {
        return DB::table('services')->insertGetId([
            'customer_name'     => 'Test Customer',
            'motorcycle_model'  => 'Honda Click 150i',
            'service_type'      => 'Oil Change',
            'labor_cost'        => 500,
            'status'            => $status,
            'notes'             => null,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
    }

    private function actingAsCustomer(array $seed, string $email): self
    {
        $customer = $this->createCustomer($seed, $email);
        $token = \App\Models\User::find($customer->user_id)->createToken('test')->plainTextToken;
        return $this->withToken($token);
    }

    public function test_customer_can_view_their_services(): void
    {
        $seed = $this->seedBase();
        $this->actingAsCustomer($seed, 'customer@test.com');

        $response = $this->getJson('/api/customer/services');

        $response->assertOk()->assertJsonStructure(['data' => []]);
    }

    public function test_customer_can_create_service_request(): void
    {
        $seed = $this->seedBase();

        $response = $this->actingAsCustomer($seed, 'customer@test.com')->postJson('/api/customer/services', [
            'motorcycle_model' => 'Honda Click 150i',
            'service_type'     => 'Oil Change',
            'notes'            => 'Please check brakes too',
        ]);

        $response->assertOk()->assertJsonStructure(['id', 'customer_name', 'status']);
        $this->assertDatabaseHas('services', ['motorcycle_model' => 'Honda Click 150i']);
    }

    public function test_customer_can_view_their_payments(): void
    {
        $seed = $this->seedBase();
        $this->actingAsCustomer($seed, 'customer@test.com');

        $response = $this->getJson('/api/customer/payments');

        $response->assertOk()->assertJsonStructure(['data' => []]);
    }
}
```

- [ ] **Step 2: Run tests — confirm fail**

```bash
cd Backend && php artisan test --filter=CustomerControllerTest
```

Expected: FAIL — route not found.

- [ ] **Step 3: Create the controller**

Create `Backend/app/Http/Controllers/Api/CustomerController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function services(Request $request): JsonResponse
    {
        $user = auth()->user();
        $customer = DB::table('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['data' => []]);
        }

        $services = Service::where('customer_name', $customer->full_name)
            ->orWhere('customer_id', $customer->customer_id)
            ->latest()
            ->get()
            ->map(fn ($s) => [
                'id'               => (string) $s->service_id,
                'customerName'     => $s->customer_name,
                'motorcycleModel'  => $s->motorcycle_model,
                'serviceType'      => $s->service_type,
                'laborCost'        => $s->labor_cost,
                'status'           => $s->status,
                'notes'            => $s->notes,
                'createdAt'        => $s->created_at?->toISOString(),
                'completedAt'      => $s->updated_at?->toISOString(),
            ]);

        return response()->json(['data' => $services]);
    }

    public function createService(Request $request): JsonResponse
    {
        $request->validate([
            'motorcycle_model' => ['required', 'string', 'max:100'],
            'service_type'     => ['required', 'string', 'max:100'],
            'notes'            => ['nullable', 'string', 'max:500'],
        ]);

        $user = auth()->user();
        $customer = DB::table('customers')->where('user_id_fk', $user->user_id)->firstOrFail();

        $service = DB::transaction(function () use ($request, $customer) {
            $serviceId = DB::table('services')->insertGetId([
                'customer_name'     => $customer->full_name,
                'customer_id'      => $customer->customer_id,
                'motorcycle_model'  => $request->motorcycle_model,
                'service_type'      => $request->service_type,
                'labor_cost'        => DB::table('service_types')
                    ->where('name', $request->service_type)
                    ->value('default_labor_cost') ?? 0,
                'status'            => 'Pending',
                'notes'             => $request->notes,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);

            $this->log($user->user_id, 'Created service request', 'services', $serviceId);

            return $serviceId;
        });

        $service = DB::table('services')->where('service_id', $serviceId)->first();

        return response()->json([
            'id'           => (string) $service->service_id,
            'customerName' => $service->customer_name,
            'status'       => $service->status,
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $user = auth()->user();
        $customer = DB::table('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['data' => []]);
        }

        $payments = Transaction::whereHas('service', fn ($q) => $q->where('customer_name', $customer->full_name))
            ->latest()
            ->get()
            ->map(fn ($t) => [
                'id'            => (string) $t->transaction_id,
                'type'          => $t->type,
                'total'         => $t->total,
                'paymentMethod' => $t->payment_method,
                'createdAt'     => $t->created_at?->toISOString(),
            ]);

        return response()->json(['data' => $payments]);
    }

    private function log(int $userId, string $action, ?string $table = null, ?int $recordId = null): void
    {
        DB::table('activity_logs')->insert([
            'user_id_fk'  => $userId,
            'action'      => $action,
            'table_name'  => $table,
            'record_id'   => $recordId,
            'log_date'    => now(),
            'description' => $action,
        ]);
    }
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd Backend && php artisan test --filter=CustomerControllerTest
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Http/Controllers/Api/CustomerController.php Backend/tests/Feature/CustomerControllerTest.php
git commit -m "feat: add CustomerController with services and payments endpoints"
```

---

## Task 2: Backend — Routes

**Files:**
- Modify: `Backend/routes/api.php`

- [ ] **Step 1: Add customer routes**

Add these lines inside the `Route::middleware('auth:sanctum')->group(function () {` block, after the existing routes:

```php
    // Customer routes
    Route::get('/customer/services', [CustomerController::class, 'services']);
    Route::post('/customer/services', [CustomerController::class, 'createService']);
    Route::get('/customer/payments', [CustomerController::class, 'payments']);
```

Also add the import at the top of the file:

```php
use App\Http\Controllers\Api\CustomerController;
```

- [ ] **Step 2: Run all backend tests**

```bash
cd Backend && php artisan test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add Backend/routes/api.php
git commit -m "feat: add customer API routes"
```

---

## Task 3: Frontend — Update Permissions

**Files:**
- Modify: `Frontend/src/shared/lib/permissions.ts`

- [ ] **Step 1: Add customer access to NAV_ACCESS**

Update the `NAV_ACCESS` object to include customer access:

```typescript
export const NAV_ACCESS: Record<string, Role[]> = {
  '/': ['Admin', 'Staff'],
  '/inventory': ['Admin', 'Staff'],
  '/services': ['Admin', 'Staff'],
  '/sales': ['Admin', 'Staff'],
  '/reports': ['Admin', 'Staff'],
  '/users': ['Admin'],
  '/approvals': ['Admin'],
  '/customer': ['Customer'],
  '/customer/book': ['Customer'],
  '/customer/history': ['Customer'],
  '/customer/payments': ['Customer'],
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/shared/lib/permissions.ts
git commit -m "feat: add customer routes to NAV_ACCESS"
```

---

## Task 4: Frontend — CustomerDashboard Page

**Files:**
- Create: `Frontend/src/features/customers/pages/CustomerDashboard.tsx`

- [ ] **Step 1: Create the customer dashboard page**

Create `Frontend/src/features/customers/pages/CustomerDashboard.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Wrench, Clock, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';

interface CustomerService {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: 'Pending' | 'Ongoing' | 'Completed';
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<CustomerService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await apiGet<{ data: CustomerService[] }>('/api/customer/services');
        setServices(data.data);
      } catch {
        setServices([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchServices();
  }, []);

  const pending = services.filter(s => s.status === 'Pending').length;
  const ongoing = services.filter(s => s.status === 'Ongoing').length;
  const completed = services.filter(s => s.status === 'Completed').length;

  const recentServices = services.slice(0, 3);

  const STATUS_STYLES = {
    Pending: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', icon: Clock },
    Ongoing: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', icon: Wrench },
    Completed: { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', icon: CheckCircle2 },
  };

  return (
    <div>
      {/* Header */}
      <motion.div {...fadeUp(0)} className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">Track your motorcycle services and payments</p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Pending', count: pending, icon: Clock, color: 'bg-[#FFFBEB] text-[#D97706]' },
          { label: 'Ongoing', count: ongoing, icon: Wrench, color: 'bg-[#EFF6FF] text-[#2563EB]' },
          { label: 'Completed', count: completed, icon: CheckCircle2, color: 'bg-[#ECFDF5] text-[#059669]' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            {...fadeUp(i * 0.06 + 0.05)}
            className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#F5F5F4]"
          >
            <div className={`w-8 h-8 rounded-[10px] ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-[14px] h-[14px]" strokeWidth={2} />
            </div>
            <p className="text-[22px] font-bold text-[#1C1917] tracking-tight leading-none">{s.count}</p>
            <p className="text-[12px] font-medium text-[#A8A29E] mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div {...fadeUp(0.25)} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => navigate('/customer/book')}
          className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 text-left hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[#1C1917]">Book a Service</p>
              <p className="text-[11px] text-[#A8A29E] mt-0.5">Schedule your next motorcycle service</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#D6D3D1] group-hover:text-[#1C1917] transition-colors" />
          </div>
        </button>
        <button
          onClick={() => navigate('/customer/history')}
          className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 text-left hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[#1C1917]">Service History</p>
              <p className="text-[11px] text-[#A8A29E] mt-0.5">View all past services</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#D6D3D1] group-hover:text-[#1C1917] transition-colors" />
          </div>
        </button>
      </motion.div>

      {/* Recent Services */}
      <motion.div {...fadeUp(0.35)} className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#A8A29E]" strokeWidth={2} />
            <h3 className="text-[13px] font-semibold text-[#1C1917]">Recent Services</h3>
          </div>
          <button
            onClick={() => navigate('/customer/history')}
            className="text-[11px] text-[#1C1917] hover:text-[#292524] font-medium"
          >
            View all
          </button>
        </div>
        <div className="divide-y divide-[#FAFAF9]">
          {loading ? (
            <p className="text-[12px] text-[#D6D3D1] py-10 text-center">Loading...</p>
          ) : recentServices.length === 0 ? (
            <p className="text-[12px] text-[#D6D3D1] py-10 text-center">No services yet. Book your first service!</p>
          ) : (
            recentServices.map(service => {
              const style = STATUS_STYLES[service.status];
              const StatusIcon = style.icon;
              return (
                <div key={service.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAF9]/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#44403C] truncate">{service.motorcycleModel}</p>
                    <p className="text-[11px] text-[#A8A29E]">{service.serviceType}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2.5 py-[3px] rounded-full ml-3 ${style.bg} ${style.text}`}>
                    {service.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/customers/pages/CustomerDashboard.tsx
git commit -m "feat: add CustomerDashboard page with stats and recent services"
```

---

## Task 5: Frontend — BookService Page

**Files:**
- Create: `Frontend/src/features/customers/pages/BookService.tsx`

- [ ] **Step 1: Create the book service page**

Create `Frontend/src/features/customers/pages/BookService.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Wrench, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiMutation } from '@/shared/lib/api';

const SERVICE_TYPES = [
  'Oil Change',
  'Tune Up',
  'Brake Service',
  'Tire Change',
  'Chain Adjustment',
  'Battery Check',
  'Electrical Check',
  'General Inspection',
];

export default function BookService() {
  const navigate = useNavigate();
  const [motorcycleModel, setMotorcycleModel] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!motorcycleModel.trim()) { setError('Please enter your motorcycle model.'); return; }
    if (!serviceType) { setError('Please select a service type.'); return; }

    setSubmitting(true);
    try {
      await apiMutation('/api/customer/services', 'POST', {
        motorcycle_model: motorcycleModel.trim(),
        service_type: serviceType,
        notes: notes.trim() || null,
      });
      setSuccess(true);
    } catch {
      setError('Failed to book service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-[#ECFDF5] flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#059669]" strokeWidth={2} />
        </div>
        <h2 className="text-[22px] font-bold text-[#1C1917] mb-2">Service Booked!</h2>
        <p className="text-[13px] text-[#A8A29E] mb-6">We'll contact you when your service is scheduled.</p>
        <Button
          onClick={() => navigate('/customer')}
          className="h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Book a Service</h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">Schedule your motorcycle service</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 max-w-lg">
        {error && (
          <div className="p-3 rounded-xl bg-red-50/80 text-red-600 text-[12px] mb-4 border border-red-100/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-[11px] font-medium text-[#78716C]">Motorcycle Model</Label>
            <Input
              value={motorcycleModel}
              onChange={(e) => setMotorcycleModel(e.target.value)}
              placeholder="e.g., Honda Click 150i"
              className="mt-1.5 h-10 rounded-xl border-[#E7E5E4] text-[13px]"
              required
            />
          </div>

          <div>
            <Label className="text-[11px] font-medium text-[#78716C]">Service Type</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {SERVICE_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setServiceType(type)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    serviceType === type
                      ? 'border-[#1C1917] bg-[#1C1917] text-white'
                      : 'border-[#E7E5E4] bg-white text-[#78716C] hover:border-[#C4C0BC]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-[12px] font-medium">{type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-medium text-[#78716C]">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or concerns..."
              className="mt-1.5 h-10 rounded-xl border-[#E7E5E4] text-[13px]"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Booking...' : 'Book Service'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/customers/pages/BookService.tsx
git commit -m "feat: add BookService page with service type selection"
```

---

## Task 6: Frontend — ServiceHistory Page

**Files:**
- Create: `Frontend/src/features/customers/pages/ServiceHistory.tsx`

- [ ] **Step 1: Create the service history page**

Create `Frontend/src/features/customers/pages/ServiceHistory.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Wrench, Clock, CheckCircle2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiGet } from '@/shared/lib/api';

interface CustomerService {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: 'Pending' | 'Ongoing' | 'Completed';
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

type StatusFilter = 'All' | 'Pending' | 'Ongoing' | 'Completed';

export default function ServiceHistory() {
  const [services, setServices] = useState<CustomerService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await apiGet<{ data: CustomerService[] }>('/api/customer/services');
        setServices(data.data);
      } catch {
        setServices([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchServices();
  }, []);

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.motorcycleModel.toLowerCase().includes(q) || s.serviceType.toLowerCase().includes(q)) &&
      (statusFilter === 'All' || s.status === statusFilter)
    );
  });

  const statusCounts = {
    All: services.length,
    Pending: services.filter(s => s.status === 'Pending').length,
    Ongoing: services.filter(s => s.status === 'Ongoing').length,
    Completed: services.filter(s => s.status === 'Completed').length,
  };

  const STATUS_STYLES = {
    Pending: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', icon: Clock },
    Ongoing: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', icon: Wrench },
    Completed: { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', icon: CheckCircle2 },
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Service History</h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">View all your motorcycle services</p>
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {(['All', 'Pending', 'Ongoing', 'Completed'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-[7px] rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
              statusFilter === s
                ? 'bg-[#1C1917] text-white'
                : 'bg-white text-[#A8A29E] border border-[#F0EFED] hover:border-[#E7E5E4] hover:text-[#78716C]'
            }`}
          >
            {s} <span className="opacity-50 ml-0.5">{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1]" />
        <Input
          placeholder="Search motorcycle or service type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 rounded-xl border-[#E7E5E4] bg-white text-[13px] focus:border-[#C4C0BC] focus:ring-0"
        />
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center py-14 text-[13px] text-[#D6D3D1] bg-white rounded-2xl border border-[#F5F5F4]">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-[13px] text-[#D6D3D1] bg-white rounded-2xl border border-[#F5F5F4]">
            No service records found
          </div>
        ) : (
          filtered.map(service => {
            const style = STATUS_STYLES[service.status];
            const StatusIcon = style.icon;
            return (
              <div
                key={service.id}
                className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-[10px] ${style.bg} flex items-center justify-center shrink-0`}>
                      <StatusIcon className={`w-[18px] h-[18px] ${style.text}`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#44403C]">{service.motorcycleModel}</p>
                      <p className="text-[12px] text-[#A8A29E]">{service.serviceType}</p>
                      <p className="text-[11px] text-[#D6D3D1] mt-0.5">Labor ₱{service.laborCost.toLocaleString()}</p>
                      {service.notes && (
                        <p className="text-[11px] text-[#78716C] mt-1">{service.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-semibold px-2.5 py-[3px] rounded-full ${style.bg} ${style.text}`}>
                      {service.status}
                    </span>
                    <p className="text-[10px] text-[#D6D3D1] mt-2">
                      {new Date(service.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/customers/pages/ServiceHistory.tsx
git commit -m "feat: add ServiceHistory page with filtering and search"
```

---

## Task 7: Frontend — Payments Page

**Files:**
- Create: `Frontend/src/features/customers/pages/Payments.tsx`

- [ ] **Step 1: Create the payments page**

Create `Frontend/src/features/customers/pages/Payments.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { CreditCard, Calendar, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiGet } from '@/shared/lib/api';

interface Payment {
  id: string;
  type: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await apiGet<{ data: Payment[] }>('/api/customer/payments');
        setPayments(data.data);
      } catch {
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchPayments();
  }, []);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    return (
      p.paymentMethod.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      p.total.toString().includes(q)
    );
  });

  const totalSpent = payments.reduce((sum, p) => sum + p.total, 0);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Payments</h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">View your payment history</p>
      </div>

      {/* Total Spent Card */}
      <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center">
            <CreditCard className="w-[18px] h-[18px] text-[#3B82F6]" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A8A29E]">Total Spent</p>
            <p className="text-[22px] font-bold text-[#1C1917] tracking-tight leading-none">
              ₱{totalSpent.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1]" />
        <Input
          placeholder="Search payments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 rounded-xl border-[#E7E5E4] bg-white text-[13px] focus:border-[#C4C0BC] focus:ring-0"
        />
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center py-14 text-[13px] text-[#D6D3D1] bg-white rounded-2xl border border-[#F5F5F4]">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-[13px] text-[#D6D3D1] bg-white rounded-2xl border border-[#F5F5F4]">
            No payment records found
          </div>
        ) : (
          filtered.map(payment => (
            <div
              key={payment.id}
              className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-[#F5F3FF] flex items-center justify-center">
                    <CreditCard className="w-[18px] h-[18px] text-[#8B5CF6]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#44403C]">{payment.type}</p>
                    <p className="text-[11px] text-[#A8A29E]">{payment.paymentMethod}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-[#1C1917]">₱{payment.total.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-[10px] text-[#D6D3D1] mt-0.5">
                    <Calendar className="w-3 h-3" strokeWidth={1.5} />
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/customers/pages/Payments.tsx
git commit -m "feat: add Payments page with payment history"
```

---

## Task 8: Frontend — Update App.tsx Routes

**Files:**
- Modify: `Frontend/src/app/App.tsx`

- [ ] **Step 1: Add customer routes and imports**

Add these imports at the top of the file:

```tsx
import CustomerDashboard from '@/features/customers/pages/CustomerDashboard';
import BookService from '@/features/customers/pages/BookService';
import ServiceHistory from '@/features/customers/pages/ServiceHistory';
import Payments from '@/features/customers/pages/Payments';
```

Add a new `RequireCustomer` function after `RequireRole`:

```tsx
function RequireCustomer() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'Customer') return <Navigate to="/" replace />;
  return <Outlet />;
}
```

Add customer routes inside the `<Route element={<RequireAuth />}>` block, after the existing Admin routes:

```tsx
                  <Route element={<RequireCustomer />}>
                    <Route path="customer" element={<CustomerDashboard />} />
                    <Route path="customer/book" element={<BookService />} />
                    <Route path="customer/history" element={<ServiceHistory />} />
                    <Route path="customer/payments" element={<Payments />} />
                  </Route>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/app/App.tsx
git commit -m "feat: add customer routes to App.tsx"
```

---

## Task 9: Frontend — Update DashboardLayout Navigation

**Files:**
- Modify: `Frontend/src/features/layout/pages/DashboardLayout.tsx`

- [ ] **Step 1: Add customer navigation items**

Add these icons to the lucide-react import:

```tsx
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  BarChart3, Shield, LogOut, Menu, X, Bell, ClipboardCheck,
  Home, Calendar, CreditCard,
} from 'lucide-react';
```

Update the `navItems` array to include customer-specific items. Replace the entire array with:

```tsx
const navItems: { label: string; to: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { label: 'Dashboard',  to: '/',           icon: LayoutDashboard, end: true },
  { label: 'Inventory',  to: '/inventory',  icon: Package },
  { label: 'Services',   to: '/services',   icon: Wrench },
  { label: 'Sales',      to: '/sales',      icon: ShoppingCart },
  { label: 'Reports',    to: '/reports',    icon: BarChart3 },
  { label: 'Users',      to: '/users',      icon: Shield },
  { label: 'Approvals',  to: '/approvals',  icon: ClipboardCheck },
  // Customer navigation
  { label: 'Home',       to: '/customer',   icon: Home, end: true },
  { label: 'Book',       to: '/customer/book', icon: Calendar },
  { label: 'History',    to: '/customer/history', icon: Wrench },
  { label: 'Payments',   to: '/customer/payments', icon: CreditCard },
];
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/layout/pages/DashboardLayout.tsx
git commit -m "feat: add customer navigation items to DashboardLayout"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run all backend tests**

```bash
cd Backend && php artisan test
```

Expected: All tests pass.

- [ ] **Step 2: Run frontend TypeScript check**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Start the frontend dev server**

```bash
cd Frontend && npm run dev
```

Expected: Server starts on `http://localhost:5173` with no compilation errors.

- [ ] **Step 4: Smoke test the customer flow**

1. Log in as a Customer user
2. Verify customer sees customer-specific navigation (Home, Book, History, Payments)
3. Navigate to `/customer` — verify dashboard shows stats and recent services
4. Navigate to `/customer/book` — verify service booking form works
5. Book a service — verify success message and redirect
6. Navigate to `/customer/history` — verify service appears in history
7. Navigate to `/customer/payments` — verify payments page loads

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete customer portal with dashboard, booking, history, and payments"
```
