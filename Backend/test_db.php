<?php
$start = microtime(true);
$pdo = new PDO('mysql:host=mospams-mysql;port=3306;dbname=mospams_db', 'mospams', 'mospams');
echo (microtime(true) - $start) . " seconds to connect\n";
