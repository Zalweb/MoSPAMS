# Multi-Tenancy Quick Reference Guide

## For Developers Working on MoSPAMS

### Golden Rules

1. **NEVER query without shop scoping** (except SuperAdmin-specific endpoints)
2. **ALWAYS inject shop_id_fk on inserts**
3. **ALWAYS validate shop ownership on updates/deletes**
4. **ALWAYS use the shopId() helper**

---

## Common Patterns

### Reading Data

```php
// ✅ CORRECT - Scoped to shop
public function myEndpoint(): JsonResponse
{
    $data = DB::table('my_table')
        ->where('shop_id_fk', $this->shopId())
        ->get();
    
    return response()->json(['data' => $data]);
}

// ❌ WRONG - Not scoped
public function myEndpoint(): JsonResponse
{
    $data = DB::table('my_table')->get(); // SECURITY BREACH!
    
    return response()->json(['data' => $data]);
}
```

### Creating Data

```php
// ✅ CORRECT - Injects shop_id_fk
public function store(Request $request): JsonResponse
{
    $id = DB::table('my_table')->insertGetId([
        'shop_id_fk' => $this->shopId(), // REQUIRED
        'name' => $request->input('name'),
        'created_at' => now(),
    ]);
    
    return response()->json(['data' => $this->findById($id)], 201);
}

// ❌ WRONG - Missing shop_id_fk
public function store(Request $request): JsonResponse
{
    $id = DB::table('my_table')->insertGetId([
        'name' => $request->input('name'), // SECURITY BREACH!
        'created_at' => now(),
    ]);
    
    return response()->json(['data' => $this->findById($id)], 201);
}
```

### Updating Data

```php
// ✅ CORRECT - Validates ownership
public function update(Request $request, int $id): JsonResponse
{
    $existing = DB::table('my_table')
        ->where('id', $id)
        ->where('shop_id_fk', $this->shopId()) // REQUIRED
        ->first();
    
    abort_if(!$existing, 404);
    
    DB::table('my_table')
        ->where('id', $id)
        ->where('shop_id_fk', $this->shopId()) // REQUIRED
        ->update(['name' => $request->input('name')]);
    
    return response()->json(['data' => $this->findById($id)]);
}

// ❌ WRONG - No ownership validation
public function update(Request $request, int $id): JsonResponse
{
    DB::table('my_table')
        ->where('id', $id) // SECURITY BREACH!
        ->update(['name' => $request->input('name')]);
    
    return response()->json(['data' => $this->findById($id)]);
}
```

### Deleting Data

```php
// ✅ CORRECT - Validates ownership
public function destroy(Request $request, int $id): JsonResponse
{
    $existing = DB::table('my_table')
        ->where('id', $id)
        ->where('shop_id_fk', $this->shopId()) // REQUIRED
        ->first();
    
    abort_if(!$existing, 404);
    
    DB::table('my_table')
        ->where('id', $id)
        ->where('shop_id_fk', $this->shopId()) // REQUIRED
        ->delete();
    
    return response()->json(['message' => 'Deleted.']);
}

// ❌ WRONG - No ownership validation
public function destroy(Request $request, int $id): JsonResponse
{
    DB::table('my_table')
        ->where('id', $id) // SECURITY BREACH!
        ->delete();
    
    return response()->json(['message' => 'Deleted.']);
}
```

### Find-or-Create Helpers

```php
// ✅ CORRECT - Scoped find + inject on create
private function getCategoryId(string $name): int
{
    $shopId = $this->shopId();
    
    $existing = DB::table('categories')
        ->where('category_name', $name)
        ->where('shop_id_fk', $shopId) // REQUIRED
        ->value('category_id');
    
    if ($existing) return (int) $existing;
    
    return DB::table('categories')->insertGetId([
        'shop_id_fk' => $shopId, // REQUIRED
        'category_name' => $name,
        'created_at' => now(),
    ]);
}

// ❌ WRONG - Not scoped
private function getCategoryId(string $name): int
{
    $existing = DB::table('categories')
        ->where('category_name', $name) // SECURITY BREACH!
        ->value('category_id');
    
    if ($existing) return (int) $existing;
    
    return DB::table('categories')->insertGetId([
        'category_name' => $name, // SECURITY BREACH!
        'created_at' => now(),
    ]);
}
```

---

## Using the scopeToShop() Helper

For simple queries, use the helper:

```php
// ✅ CORRECT - Using helper
public function myEndpoint(): JsonResponse
{
    $data = $this->scopeToShop(DB::table('my_table'))
        ->orderBy('name')
        ->get();
    
    return response()->json(['data' => $data]);
}
```

---

## SuperAdmin Exceptions

SuperAdmin endpoints that need to see ALL shops:

```php
// ✅ CORRECT - SuperAdmin endpoint
public function allShopsData(): JsonResponse
{
    // No shop scoping - SuperAdmin can see everything
    $data = DB::table('my_table')->get();
    
    return response()->json(['data' => $data]);
}
```

**Important:** Only use this pattern in SuperAdminController, never in MospamsController!

---

## Testing Your Changes

Always test cross-tenant access:

```php
/** @test */
public function user_cannot_access_other_shop_data()
{
    [$shopA, $userA] = $this->createShopWithUser('Shop A');
    [$shopB, $userB] = $this->createShopWithUser('Shop B');
    
    $dataB = $this->createData($shopB->shop_id);
    
    $response = $this->actingAs($userA)->getJson("/api/my-endpoint/{$dataB}");
    
    $response->assertNotFound(); // MUST return 404
}
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Forgetting shop_id_fk on inserts
```php
// WRONG
DB::table('parts')->insert(['name' => 'Part A']);

// CORRECT
DB::table('parts')->insert([
    'shop_id_fk' => $this->shopId(),
    'name' => 'Part A',
]);
```

### ❌ Mistake 2: Not validating ownership on updates
```php
// WRONG
DB::table('parts')->where('part_id', $id)->update(['name' => 'New Name']);

// CORRECT
DB::table('parts')
    ->where('part_id', $id)
    ->where('shop_id_fk', $this->shopId())
    ->update(['name' => 'New Name']);
```

### ❌ Mistake 3: Joining without scoping
```php
// WRONG
DB::table('service_jobs')
    ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
    ->get();

// CORRECT
DB::table('service_jobs')
    ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
    ->where('service_jobs.shop_id_fk', $this->shopId())
    ->get();
```

### ❌ Mistake 4: Using global queries in reports
```php
// WRONG
$totalRevenue = DB::table('sales')->sum('net_amount');

// CORRECT
$totalRevenue = DB::table('sales')
    ->where('shop_id_fk', $this->shopId())
    ->sum('net_amount');
```

---

## Code Review Checklist

Before submitting a PR, verify:

- [ ] All SELECT queries include `WHERE shop_id_fk = ?`
- [ ] All INSERT operations include `shop_id_fk`
- [ ] All UPDATE operations validate shop ownership
- [ ] All DELETE operations validate shop ownership
- [ ] Helper methods are shop-scoped
- [ ] Tests verify cross-tenant isolation
- [ ] No hardcoded shop IDs

---

## Need Help?

If you're unsure about shop scoping:
1. Look at existing methods in MospamsController
2. Follow the patterns above
3. Write a test to verify isolation
4. Ask for code review

**Remember:** When in doubt, scope it out! 🔒
