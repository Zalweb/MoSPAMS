<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\MechanicController;
use Illuminate\Http\Request;

$user = DB::table('users')->where('username', 'alex.torres')->first();
if (!$user) {
    echo "User not found\n";
    exit;
}

$request = Request::create('/api/mechanic/performance', 'GET');
$request->setUserResolver(fn() => $user);

$controller = new MechanicController();
try {
    $response = $controller->performance($request);
    echo $response->getContent();
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
