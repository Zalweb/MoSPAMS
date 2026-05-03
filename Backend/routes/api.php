<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingWebhookController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DomainOnboardingController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\MospamsController;
use App\Http\Controllers\Api\RoleRequestController;
use App\Http\Controllers\Api\ShopBrandingController;
use App\Http\Controllers\Api\ShopRegistrationController;
use App\Http\Controllers\Api\SuperAdminController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
Route::post('/auth/google', [GoogleAuthController::class, 'googleLogin']);
Route::post('/auth/google/register', [GoogleAuthController::class, 'googleRegister']);
Route::get('/stats', [MospamsController::class, 'publicStats']);

// Public shop registration
Route::post('/shop-registration', [ShopRegistrationController::class, 'register'])->middleware('throttle:shop-registration');

// Public shop branding (no auth required)
Route::get('/shop/info', [ShopBrandingController::class, 'publicShopInfo'])->middleware('throttle:shop-info');
Route::post('/webhooks/paymongo', [BillingWebhookController::class, 'paymongo'])->middleware('throttle:billing-webhooks');

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::prefix('superadmin')->middleware(['role:SuperAdmin', 'platform.token'])->group(function () {
        Route::get('/analytics', [SuperAdminController::class, 'analytics']);

        Route::get('/shops', [SuperAdminController::class, 'shops']);
        Route::post('/shops', [SuperAdminController::class, 'storeShop']);
        Route::patch('/shops/{shop}', [SuperAdminController::class, 'updateShop']);
        Route::patch('/shops/{shop}/suspend', [SuperAdminController::class, 'suspendShop']);
        Route::patch('/shops/{shop}/activate', [SuperAdminController::class, 'activateShop']);
        Route::post('/shops/{shop}/approve-registration', [SuperAdminController::class, 'approveRegistration']);
        Route::post('/shops/{shop}/reject-registration', [SuperAdminController::class, 'rejectRegistration']);
        Route::get('/shops/{shop}/diagnostics', [SuperAdminController::class, 'shopDiagnostics']);

        Route::get('/subscription-plans', [SuperAdminController::class, 'subscriptionPlans']);
        Route::post('/subscription-plans', [SuperAdminController::class, 'storeSubscriptionPlan']);
        Route::patch('/subscription-plans/{plan}', [SuperAdminController::class, 'updateSubscriptionPlan']);

        Route::get('/shop-subscriptions', [SuperAdminController::class, 'shopSubscriptions']);
        Route::post('/shop-subscriptions', [SuperAdminController::class, 'storeShopSubscription']);
        Route::patch('/shop-subscriptions/{shopSubscription}', [SuperAdminController::class, 'updateShopSubscription']);
        Route::get('/subscriptions/expiring', [SuperAdminController::class, 'expiringSubscriptions']);

        Route::get('/subscription-payments', [SuperAdminController::class, 'subscriptionPayments']);
        Route::post('/subscription-payments', [SuperAdminController::class, 'storeSubscriptionPayment']);

        Route::get('/platform-admins', [SuperAdminController::class, 'platformAdmins']);
        Route::post('/platform-admins', [SuperAdminController::class, 'storePlatformAdmin']);
        Route::patch('/platform-admins/{user}/status', [SuperAdminController::class, 'updatePlatformAdminStatus']);

        Route::get('/audit-logs', [SuperAdminController::class, 'auditLogs']);
        Route::get('/settings', [SuperAdminController::class, 'settings']);
        Route::patch('/settings', [SuperAdminController::class, 'updateSettings']);
        Route::get('/system-health', [SuperAdminController::class, 'systemHealth']);
    });

    Route::middleware(['shop.active', 'tenant.user', 'tenant.token'])->group(function () {
        Route::get('/parts', [MospamsController::class, 'parts'])->middleware('role:Owner,Staff');
        Route::post('/parts', [MospamsController::class, 'storePart'])->middleware('role:Owner');
        Route::patch('/parts/{part}', [MospamsController::class, 'updatePart'])->middleware('role:Owner,Staff');
        Route::delete('/parts/{part}', [MospamsController::class, 'deletePart'])->middleware('role:Owner');
        Route::get('/categories', [MospamsController::class, 'categories'])->middleware('role:Owner,Staff');
        Route::get('/stock-movements', [MospamsController::class, 'stockMovements'])->middleware('role:Owner,Staff');
        Route::post('/stock-movements', [MospamsController::class, 'storeStockMovement'])->middleware('role:Owner,Staff');

        Route::get('/services', [MospamsController::class, 'services'])->middleware('role:Owner,Staff');
        Route::post('/services', [MospamsController::class, 'storeService'])->middleware('role:Owner,Staff');
        Route::patch('/services/{service}', [MospamsController::class, 'updateService'])->middleware('role:Owner,Staff');
        Route::delete('/services/{service}', [MospamsController::class, 'deleteService'])->middleware('role:Owner');
        Route::get('/service-types', [MospamsController::class, 'serviceTypes'])->middleware('role:Owner,Staff');
        Route::post('/service-types', [MospamsController::class, 'storeServiceType'])->middleware('role:Owner');
        Route::patch('/service-types/{serviceType}', [MospamsController::class, 'updateServiceType'])->middleware('role:Owner');
        Route::delete('/service-types/{serviceType}', [MospamsController::class, 'deleteServiceType'])->middleware('role:Owner');
        Route::get('/mechanics', [MospamsController::class, 'mechanics'])->middleware('role:Owner,Staff');

        Route::get('/transactions', [MospamsController::class, 'transactions'])->middleware('role:Owner,Staff');
        Route::post('/transactions', [MospamsController::class, 'storeTransaction'])->middleware('role:Owner,Staff');
        Route::get('/payments', [MospamsController::class, 'payments'])->middleware('role:Owner,Staff');

        Route::get('/users', [MospamsController::class, 'users'])->middleware('role:Owner');
        Route::post('/users', [MospamsController::class, 'storeUser'])->middleware('role:Owner');
        Route::patch('/users/{user}', [MospamsController::class, 'updateUser'])->middleware('role:Owner');
        Route::patch('/users/{user}/status', [MospamsController::class, 'updateUserStatus'])->middleware('role:Owner');
        Route::delete('/users/{user}', [MospamsController::class, 'deleteUser'])->middleware('role:Owner');
        Route::get('/activity-logs', [MospamsController::class, 'activityLogs'])->middleware('role:Owner');

        Route::get('/reports/sales', [MospamsController::class, 'salesReport'])->middleware('role:Owner,Staff');
        Route::get('/reports/inventory', [MospamsController::class, 'inventoryReport'])->middleware('role:Owner,Staff');
        Route::get('/reports/services', [MospamsController::class, 'servicesReport'])->middleware('role:Owner,Staff');
        Route::get('/reports/income', [MospamsController::class, 'incomeReport'])->middleware('role:Owner,Staff');

        Route::get('/role-requests', [RoleRequestController::class, 'index'])->middleware('role:Owner');
        Route::patch('/role-requests/{roleRequest}/approve', [RoleRequestController::class, 'approve'])->middleware('role:Owner');
        Route::patch('/role-requests/{roleRequest}/deny', [RoleRequestController::class, 'deny'])->middleware('role:Owner');

        // Shop branding management (Owner only)
        Route::get('/shop/branding', [ShopBrandingController::class, 'getBranding'])->middleware('role:Owner');
        Route::patch('/shop/branding', [ShopBrandingController::class, 'updateBranding'])->middleware('role:Owner');
        Route::post('/shop/logo', [ShopBrandingController::class, 'uploadLogo'])->middleware('role:Owner');
        Route::delete('/shop/logo', [ShopBrandingController::class, 'deleteLogo'])->middleware('role:Owner');
        Route::post('/shop/invitation-code/regenerate', [ShopBrandingController::class, 'regenerateInvitationCode'])->middleware('role:Owner');
        Route::post('/shop/domain/request', [DomainOnboardingController::class, 'requestDomain'])->middleware('role:Owner');
        Route::get('/shop/domain/dns-instructions', [DomainOnboardingController::class, 'dnsInstructions'])->middleware('role:Owner');
        Route::post('/shop/domain/verify', [DomainOnboardingController::class, 'verifyDomain'])->middleware('role:Owner');
        Route::post('/shop/domain/activate', [DomainOnboardingController::class, 'activateDomain'])->middleware('role:Owner');

        // Customer routes
        Route::get('/customer/services', [CustomerController::class, 'services']);
        Route::post('/customer/services', [CustomerController::class, 'createService']);
        Route::get('/customer/payments', [CustomerController::class, 'payments']);
    });
});
