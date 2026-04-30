<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MospamsController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/parts', [MospamsController::class, 'parts'])->middleware('role:Admin,Staff');
    Route::post('/parts', [MospamsController::class, 'storePart'])->middleware('role:Admin');
    Route::patch('/parts/{part}', [MospamsController::class, 'updatePart'])->middleware('role:Admin,Staff');
    Route::delete('/parts/{part}', [MospamsController::class, 'deletePart'])->middleware('role:Admin');
    Route::get('/categories', [MospamsController::class, 'categories'])->middleware('role:Admin,Staff');
    Route::get('/stock-movements', [MospamsController::class, 'stockMovements'])->middleware('role:Admin,Staff');
    Route::post('/stock-movements', [MospamsController::class, 'storeStockMovement'])->middleware('role:Admin,Staff');

    Route::get('/services', [MospamsController::class, 'services'])->middleware('role:Admin,Staff');
    Route::post('/services', [MospamsController::class, 'storeService'])->middleware('role:Admin,Staff');
    Route::patch('/services/{service}', [MospamsController::class, 'updateService'])->middleware('role:Admin,Staff');
    Route::delete('/services/{service}', [MospamsController::class, 'deleteService'])->middleware('role:Admin');
    Route::get('/service-types', [MospamsController::class, 'serviceTypes'])->middleware('role:Admin,Staff');
    Route::post('/service-types', [MospamsController::class, 'storeServiceType'])->middleware('role:Admin');
    Route::patch('/service-types/{serviceType}', [MospamsController::class, 'updateServiceType'])->middleware('role:Admin');
    Route::delete('/service-types/{serviceType}', [MospamsController::class, 'deleteServiceType'])->middleware('role:Admin');
    Route::get('/mechanics', [MospamsController::class, 'mechanics'])->middleware('role:Admin,Staff');

    Route::get('/transactions', [MospamsController::class, 'transactions'])->middleware('role:Admin,Staff');
    Route::post('/transactions', [MospamsController::class, 'storeTransaction'])->middleware('role:Admin,Staff');
    Route::get('/payments', [MospamsController::class, 'payments'])->middleware('role:Admin,Staff');

    Route::get('/users', [MospamsController::class, 'users'])->middleware('role:Admin');
    Route::post('/users', [MospamsController::class, 'storeUser'])->middleware('role:Admin');
    Route::patch('/users/{user}', [MospamsController::class, 'updateUser'])->middleware('role:Admin');
    Route::patch('/users/{user}/status', [MospamsController::class, 'updateUserStatus'])->middleware('role:Admin');
    Route::delete('/users/{user}', [MospamsController::class, 'deleteUser'])->middleware('role:Admin');
    Route::get('/activity-logs', [MospamsController::class, 'activityLogs'])->middleware('role:Admin');

    Route::get('/reports/sales', [MospamsController::class, 'salesReport'])->middleware('role:Admin,Staff');
    Route::get('/reports/inventory', [MospamsController::class, 'inventoryReport'])->middleware('role:Admin,Staff');
    Route::get('/reports/services', [MospamsController::class, 'servicesReport'])->middleware('role:Admin,Staff');
    Route::get('/reports/income', [MospamsController::class, 'incomeReport'])->middleware('role:Admin,Staff');
});
