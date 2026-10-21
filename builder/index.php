<?php
require __DIR__.'/gate.php';
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__.'/index.html');
