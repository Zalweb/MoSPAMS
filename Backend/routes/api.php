<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingWebhookController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DomainOnboardingController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\MechanicController;
use App\Http\Controllers\Api\MospamsController;
use App\Http\Controllers\Api\OwnerMechanicController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\RoleRequestController;
use App\Http\Controllers\Api\ShopBrandingController;
use App\Http\Controllers\Api\ShopRegistrationController;
use App\Http\Controllers\Api\SuperAdminController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
Route::post('/join-shop', [AuthController::class, 'joinShop'])->middleware('throttle:auth', 'google.auth.headers');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:forgot-password');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');
Route::post('/auth/google', [GoogleAuthController::class, 'googleLogin'])->middleware('google.auth.headers');
Route::post('/auth/google/register', [GoogleAuthController::class, 'googleRegister'])->middleware('google.auth.headers');
Route::post('/auth/google/proxy', [GoogleAuthController::class, 'googleLoginProxy'])->middleware('google.auth.headers');
Route::get('/stats', [MospamsController::class, 'publicStats']);
Route::get('/plans', [MospamsController::class, 'publicPlans']);

// Public shop registration
Route::post('/shop-registration', [ShopRegistrationController::class, 'register'])->middleware('throttle:shop-registration');

// Public shop branding (no auth required)
Route::get('/shop/info', [ShopBrandingController::class, 'publicShopInfo']);


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
        Route::get('/notifications', [SuperAdminController::class, 'notifications']);
        Route::patch('/profile', [SuperAdminController::class, 'updateProfile']);

        Route::get('/revenue-reports', [SuperAdminController::class, 'revenueReports']);
        Route::get('/overdue-accounts', [SuperAdminController::class, 'overdueAccounts']);
        Route::get('/revenue-analytics', [SuperAdminController::class, 'revenueAnalytics']);
        Route::get('/shop-growth', [SuperAdminController::class, 'shopGrowth']);
        Route::get('/user-statistics', [SuperAdminController::class, 'userStatistics']);
        Route::get('/support-tickets', [SuperAdminController::class, 'supportTickets']);
        Route::get('/shop-feedback', [SuperAdminController::class, 'shopFeedback']);
    });

    Route::middleware(['shop.active', 'tenant.user', 'tenant.token'])->group(function () {
        Route::get('/parts', [MospamsController::class, 'parts'])->middleware('role:Owner,Staff,Mechanic');
        Route::post('/parts', [MospamsController::class, 'storePart'])->middleware('role:Owner,Staff');
        Route::patch('/parts/{part}', [MospamsController::class, 'updatePart'])->middleware('role:Owner,Staff');
        Route::delete('/parts/{part}', [MospamsController::class, 'deletePart'])->middleware('role:Owner');
        Route::get('/categories', [MospamsController::class, 'categories'])->middleware('role:Owner,Staff');
        Route::post('/categories', [MospamsController::class, 'storeCategory'])->middleware('role:Owner,Staff');
        Route::get('/stock-movements', [MospamsController::class, 'stockMovements'])->middleware('role:Owner,Staff');
        Route::post('/stock-movements', [MospamsController::class, 'storeStockMovement'])->middleware('role:Owner,Staff');

        Route::get('/services', [MospamsController::class, 'services'])->middleware('role:Owner,Staff');
        Route::get('/services/{service}', [MospamsController::class, 'showService'])->middleware('role:Owner,Staff');
        Route::post('/services', [MospamsController::class, 'storeService'])->middleware('role:Owner,Staff');
        Route::patch('/services/{service}', [MospamsController::class, 'updateService'])->middleware('role:Owner,Staff');
        Route::delete('/services/{service}', [MospamsController::class, 'deleteService'])->middleware('role:Owner');
        Route::post('/services/{service}/mechanics', [MospamsController::class, 'assignMechanic'])->middleware('role:Owner,Staff');
        Route::delete('/services/{service}/mechanics/{mechanic}', [MospamsController::class, 'removeMechanic'])->middleware('role:Owner,Staff');
        Route::post('/services/{service}/bill', [MospamsController::class, 'billService'])->middleware('role:Owner,Staff');
        Route::post('/services/{service}/start', [MospamsController::class, 'startService'])->middleware('role:Owner,Staff');
        Route::post('/services/{service}/cancel', [MospamsController::class, 'cancelService'])->middleware('role:Owner,Staff');
        Route::post('/services/{service}/parts', [MospamsController::class, 'addPartToService'])->middleware('role:Owner,Staff');
        Route::patch('/services/{service}/parts/{jobPartId}/confirm', [MospamsController::class, 'confirmServicePart'])->middleware('role:Owner,Staff');
        Route::delete('/services/{service}/parts/{jobPartId}', [MospamsController::class, 'removeServicePart'])->middleware('role:Owner,Staff');

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
        Route::patch('/users/password', [MospamsController::class, 'updatePassword'])->middleware('role:Owner,Staff');
        Route::get('/activity-logs', [MospamsController::class, 'activityLogs'])->middleware('role:Owner');

        Route::get('/notifications', [MospamsController::class, 'notifications'])->middleware('role:Owner');
        Route::patch('/notifications/read-all', [MospamsController::class, 'markAllNotificationsRead'])->middleware('role:Owner');
        Route::patch('/notifications/{notificationId}/read', [MospamsController::class, 'markNotificationRead'])->middleware('role:Owner');

        Route::get('/customers', [MospamsController::class, 'customers'])->middleware('role:Owner');
        Route::post('/customers', [MospamsController::class, 'storeCustomer'])->middleware('role:Owner');
        Route::patch('/customers/{customerId}', [MospamsController::class, 'updateCustomer'])->middleware('role:Owner');
        Route::delete('/customers/{customerId}', [MospamsController::class, 'deleteCustomer'])->middleware('role:Owner');

        Route::get('/mechanics/manage', [MospamsController::class, 'manageMechanics'])->middleware('role:Owner');
        Route::post('/mechanics', [MospamsController::class, 'storeMechanic'])->middleware('role:Owner');
        Route::patch('/mechanics/{mechanicId}', [MospamsController::class, 'updateMechanic'])->middleware('role:Owner');
        Route::delete('/mechanics/{mechanicId}', [MospamsController::class, 'deleteMechanic'])->middleware('role:Owner');

        Route::get('/reports/sales', [MospamsController::class, 'salesReport'])->middleware('role:Owner,Staff');
        Route::get('/reports/inventory', [MospamsController::class, 'inventoryReport'])->middleware('role:Owner,Staff');
        Route::get('/reports/services', [MospamsController::class, 'servicesReport'])->middleware('role:Owner,Staff');
        Route::get('/reports/income', [MospamsController::class, 'incomeReport'])->middleware('role:Owner,Staff');

        Route::get('/dashboard/stats', [MospamsController::class, 'dashboardStats'])->middleware('role:Owner,Staff');

        Route::get('/service-types', [MospamsController::class, 'serviceTypes']);

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
        Route::get('/customer/service-types', [CustomerController::class, 'serviceTypes']);
        Route::get('/customer/services', [CustomerController::class, 'services']);
        Route::post('/customer/services', [CustomerController::class, 'createService']);
        Route::delete('/customer/services/{jobId}', [CustomerController::class, 'cancelService']);
        Route::get('/customer/payments', [CustomerController::class, 'payments']);
        Route::get('/customer/payments/{paymentId}', [CustomerController::class, 'paymentDetails']);
        Route::get('/customer/profile', [CustomerController::class, 'getProfile']);
        Route::patch('/customer/profile', [CustomerController::class, 'updateProfile']);
        Route::patch('/customer/password', [CustomerController::class, 'updatePassword']);
        Route::get('/customer/vehicles', [CustomerController::class, 'getVehicles']);
        Route::post('/customer/vehicles', [CustomerController::class, 'storeVehicle']);
        Route::patch('/customer/vehicles/{vehicleId}', [CustomerController::class, 'updateVehicle']);
        Route::delete('/customer/vehicles/{vehicleId}', [CustomerController::class, 'deleteVehicle']);
        Route::get('/customer/notifications', [CustomerController::class, 'getNotifications']);
        Route::patch('/customer/notifications/read-all', [CustomerController::class, 'markAllNotificationsRead']);
        Route::patch('/customer/notifications/{notificationId}/read', [CustomerController::class, 'markNotificationRead']);

        // Rating routes
        Route::post('/ratings', [RatingController::class, 'store']);
        Route::get('/ratings/{jobId}', [RatingController::class, 'show']);

        // Mechanic routes
        Route::middleware(['role:Mechanic'])->prefix('mechanic')->group(function () {
            Route::get('/jobs', [MechanicController::class, 'assignedJobs']);
            Route::get('/history', [MechanicController::class, 'history']);
            Route::get('/performance', [MechanicController::class, 'performance']);
            Route::get('/jobs/{job}', [MechanicController::class, 'jobDetails']);
            Route::patch('/jobs/{job}/status', [MechanicController::class, 'updateJobStatus']);
            Route::post('/jobs/{job}/parts', [MechanicController::class, 'addPartToJob']);
            Route::delete('/jobs/{job}/parts/{jobPart}', [MechanicController::class, 'removePartFromJob']);
        });

        // Owner mechanic performance routes
        Route::middleware(['role:Owner'])->group(function () {
            Route::get('/owner/mechanics', [OwnerMechanicController::class, 'index']);
            Route::get('/owner/mechanics/{mechanicId}', [OwnerMechanicController::class, 'show']);
        });
    });
});
