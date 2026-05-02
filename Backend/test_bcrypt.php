<?php
$start = microtime(true);
password_hash('password', PASSWORD_BCRYPT, ['cost' => 12]);
echo (microtime(true) - $start) . " seconds\n";
