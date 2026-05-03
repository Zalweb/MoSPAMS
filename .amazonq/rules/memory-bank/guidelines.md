# MoSPAMS - Development Guidelines

## Backend (PHP / Laravel)

### Controller Patterns

**Single resource controller consolidation**: Most domain operations live in `MospamsController`. Only auth, Google OAuth, customer-specific, and role-request flows have their own controllers.

**Return type declarations on all public methods**: Every controller method declares `JsonResponse` as its return type.
```php
public function parts(): JsonResponse { ... }
public function storePart(Request $request): JsonResponse { ... }
```

**Consistent response envelope**: All list responses use `['data' => $collection]`. Single-item responses use `['data' => $resource]`. Delete responses use `['message' => '...']`.
```php
return response()->json(['data' => $parts]);          // list
return response()->json(['data' => $this->partById($id)], 201); // created
return response()->json(['message' => 'Part deleted.']);        // deleted
```

**Inline validation with array syntax**: Validation rules always use array syntax (not pipe strings).
```php
$data = $request->validate([
    'name'     => ['required', 'string', 'max:100'],
    'price'    => ['required', 'numeric', 'min:0'],
    'barcode'  => ['nullable', 'string', 'max:100', 'unique:parts,barcode'],
]);
```

**`sometimes` for PATCH endpoints**: Update methods use `sometimes` instead of `required` so partial updates work.
```php
'name' => ['sometimes', 'string', 'max:100'],
```

**`abort_if` / `abort_unless` for guard clauses**: Used at the top of methods before any mutation.
```php
abort_if(! $existing, 404);
abort_if($request->user()->user_id === $user, 422, 'You cannot disable your own account.');
```

**`DB::transaction` for multi-step writes**: Any operation that touches more than one table is wrapped in a transaction.
```php
return DB::transaction(function () use ($request, $data) {
    $id = DB::table('parts')->insertGetId([...]);
    $this->recordMovement(...);
    $this->log($request, ...);
    return response()->json(['data' => $this->partById($id)], 201);
});
```

**Query Builder over Eloquent for reads**: `DB::table(...)` with explicit joins is used for all read queries. Eloquent (`User::query()->with([...])`) is used only for the User model where relationships are needed.

**Private resource mapper methods**: Each entity has a private `*Resource(object $row): array` method that maps DB rows to the API shape. This keeps the public methods clean.
```php
private function partResource(object $part): array
{
    return [
        'id'        => (string) $part->part_id,
        'name'      => $part->part_name,
        'stock'     => (int) $part->stock_quantity,
        'price'     => (float) $part->unit_price,
        'createdAt' => $this->iso($part->created_at),
    ];
}
```

**Explicit type casting in resource mappers**: IDs are always cast to `(string)`, numeric fields to `(int)` or `(float)`. This ensures consistent JSON types regardless of DB driver.

**Private helper methods**: Shared logic is extracted to private helpers:
- `statusId(string $table, string $key, string $code): int` — resolves status lookup table IDs
- `categoryId(string $name): int` — find-or-create category
- `customerId(string $name): int` — find-or-create customer
- `serviceTypeId(string $name, $labor): int` — find-or-create service type
- `recordMovement(...)` — inserts a stock movement row
- `log(Request $request, string $action, ...)` — inserts an activity log row
- `numericId(mixed $id): int` — strips non-numeric chars from IDs
- `iso(mixed $value): ?string` — converts any date value to ISO 8601 string

**Activity logging on every mutation**: Every create, update, and delete calls `$this->log($request, 'Human-readable action', 'table_name', $recordId)`.

**Status codes stored in lookup tables**: Statuses (ACTIVE, INACTIVE, COMPLETED, etc.) are stored in separate `*_statuses` tables and resolved via `statusId()`. Status codes are always UPPERCASE strings.

### Routing Patterns

**Role middleware on individual routes**: Applied as `->middleware('role:Admin,Staff')` per route, not per controller group.
```php
Route::get('/parts', [MospamsController::class, 'parts'])->middleware('role:Admin,Staff');
Route::post('/parts', [MospamsController::class, 'storePart'])->middleware('role:Admin');
```

**All protected routes inside `auth:sanctum` group**: The outer group handles authentication; inner middleware handles authorization.

**PATCH for partial updates**: Use `PATCH` (not `PUT`) for update endpoints.

**Route parameter naming matches model**: `{part}`, `{service}`, `{user}`, `{serviceType}` — singular, camelCase for multi-word.

### Middleware

**RoleMiddleware uses variadic roles**: Accepts multiple roles as variadic string args, checks against the user's `role->role_name` relationship.
```php
public function handle(Request $request, Closure $next, string ...$roles): Response
{
    $role = $request->user()?->role?->role_name;
    abort_unless($role && in_array($role, $roles, true), 403, '...');
    return $next($request);
}
```

### Naming Conventions (Backend)

| Item | Convention | Example |
|------|-----------|---------|
| Table names | snake_case, plural | `service_jobs`, `stock_movements` |
| Primary keys | `{table_singular}_id` | `part_id`, `job_id` |
| Foreign keys | `{referenced_table_singular}_id_fk` | `category_id_fk`, `user_id_fk` |
| Status code values | UPPERCASE | `ACTIVE`, `COMPLETED` |
| Controller methods | camelCase verbs | `storePart`, `updateService` |
| API response keys | camelCase | `customerName`, `laborCost`, `createdAt` |

---

## Frontend (React / TypeScript)

### Context & State Patterns

**DataContext as the single data layer**: All API calls and domain state live in `DataContext`. Feature components never call the API directly — they use `useData()`.

**Demo data as initial state**: `DEMO_*` constants pre-populate state so the UI works without a backend. When a user logs in, `useEffect` replaces demo data with real API data.

**`useCallback` for all mutation functions**: Every function exposed by `DataContext` is wrapped in `useCallback` to prevent unnecessary re-renders.

**`useRef` for current user in callbacks**: `userRef` holds the current user so callbacks don't close over stale auth state.
```tsx
const userRef = useRef(user);
useEffect(() => { userRef.current = user; }, [user]);
```

**Cancellation pattern for async effects**: Effects that load data set a `cancelled` flag and check it before updating state.
```tsx
let cancelled = false;
async function loadFromApi() {
  const data = await apiGet(...);
  if (cancelled) return;
  setState(data);
}
void loadFromApi();
return () => { cancelled = true; };
```

**`Promise.all` for parallel API loads**: Multiple independent endpoints are fetched in parallel on login.

**Role-conditional data loading**: Admin-only data (users, activity logs) is fetched only when `activeRole === 'Admin'`.

**`showApiFailure` helper for error handling**: A shared helper logs the error and shows a toast. Never swallow errors silently.
```tsx
function showApiFailure(action: string, error: unknown) {
  console.error(`${action} failed`, error);
  toast.error(`${action} was not saved. Start the Laravel API backend and try again.`);
}
```

**Optimistic local state updates**: After a successful API call, state is updated immediately from the API response (not re-fetched).
```tsx
setParts(prev => [...prev, newPart]);          // add
setParts(prev => prev.map(p => p.id === id ? response.data : p)); // update
setParts(prev => prev.filter(p => p.id !== id)); // delete
```

### API Client Patterns

**Thin `api.ts` module**: Two public functions — `apiGet<T>` and `apiMutation<T>` — wrap a single private `apiRequest` function.

**Module-level auth token**: `setAuthToken(token)` stores the token in a module-level variable; no localStorage or context needed for the token itself.

**ngrok header included**: `'ngrok-skip-browser-warning': 'true'` is always sent to support local tunneling.

**Error extraction from JSON**: On non-OK responses, the client tries to parse `payload.message` from the JSON body before falling back to a generic message.

**204 handling**: Returns `undefined as T` for empty responses.

### Routing & Auth Guard Patterns

**Wrapper components for route protection**: `RequireAuth`, `RequireRole`, and `RequireCustomer` are thin components that return `<Navigate>` or `<Outlet>`.
```tsx
function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
```

**Nested routes under `DashboardLayout`**: All authenticated pages are children of the `dashboard` route, which renders the layout shell.

**`LoginRoute` redirects authenticated users**: Prevents logged-in users from seeing the login page.

### Styling Patterns

**CSS custom properties for theming**: All colors are defined as `hsl(var(--token))` CSS variables, enabling dark mode via class toggling.
```js
primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" }
```

**Dark mode via `class` strategy**: `darkMode: ["class"]` in Tailwind config — toggled by adding/removing the `dark` class on the root element.

**Inter as the default font**: `fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }`.

**Radix-aware animation keyframes**: Accordion animations use `var(--radix-accordion-content-height)` for smooth open/close.

**Custom animation tokens**: `float`, `float-slow`, `pulse-glow` are defined for landing page decorative elements.

**shadcn/ui border radius tokens**: Radius values use `calc(var(--radius) ± Npx)` for consistent scaling.

### Naming Conventions (Frontend)

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `InventoryPage`, `DashboardLayout` |
| Hooks | camelCase with `use` prefix | `useData`, `useAuth`, `useAdminStats` |
| Context files | `*Context.tsx` | `DataContext.tsx`, `AuthContext.tsx` |
| API response types | `ApiList<T>`, `ApiItem<T>` | `ApiList<Part>` |
| Feature folders | kebab-case | `activity-logs/`, `service-types/` |
| Shared utilities | camelCase | `apiGet`, `apiMutation`, `showApiFailure` |
| Type definitions | PascalCase interfaces/types | `Part`, `ServiceRecord`, `Transaction` |

### TypeScript Patterns

**`Omit<T, 'id' | 'createdAt'>` for create inputs**: Server-generated fields are omitted from create function signatures.
```tsx
addPart: (part: Omit<Part, 'id' | 'createdAt'>) => Promise<void>
```

**`Partial<T>` for update inputs**: Update functions accept partial shapes.

**Generic API response wrappers**: `ApiList<T> = { data: T[] }` and `ApiItem<T> = { data: T }` are local type aliases used consistently.

**`void` operator for floating promises in effects**: `void loadFromApi()` prevents unhandled promise warnings without `await`.

---

## Cross-Cutting Conventions

- **IDs are strings on the frontend, integers on the backend**: The backend casts all IDs to `(string)` in resource mappers; the frontend types use `string` for IDs.
- **Timestamps are ISO 8601**: All dates are serialized as ISO strings (`createdAt`, `completedAt`, `timestamp`). The backend uses `Carbon::parse($value)->toISOString()`.
- **camelCase API contract**: Request bodies and response payloads use camelCase keys on both sides.
- **No localStorage for production data**: Auth tokens and user data may use memory/context; domain data always comes from the API.
- **Toast notifications for all mutations**: Every successful mutation shows a `toast.success(...)`. Every failure shows a `toast.error(...)`.
- **Activity log on every backend mutation**: The `log()` helper is called at the end of every create/update/delete operation.
