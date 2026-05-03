<?php

namespace App\Providers;

use App\Services\Billing\BillingProviderInterface;
use App\Services\Billing\PayMongoBillingProvider;
use App\Support\Tenancy\TenantManager;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(TenantManager::class, function () {
            return new TenantManager();
        });

        $this->app->bind(BillingProviderInterface::class, PayMongoBillingProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth', function (Request $request) {
            return [
                Limit::perMinute(15)->by($request->ip()),
            ];
        });

        RateLimiter::for('shop-info', function (Request $request) {
            return [
                Limit::perMinute(120)->by($request->ip()),
            ];
        });

        RateLimiter::for('shop-registration', function (Request $request) {
            return [
                Limit::perMinute(10)->by($request->ip()),
            ];
        });

        RateLimiter::for('billing-webhooks', function (Request $request) {
            return [
                Limit::perMinute(240)->by($request->ip()),
            ];
        });
    }
}
