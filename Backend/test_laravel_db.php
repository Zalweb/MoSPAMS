<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$start = microtime(true);
\Illuminate\Support\Facades\DB::connection()->getPdo();
echo "Laravel DB connect: " . (microtime(true) - $start) . " seconds\n";
