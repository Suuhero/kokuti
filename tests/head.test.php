<?php
require_once dirname(__DIR__) . '/head.php';
$root = sys_get_temp_dir() . '/kokuti-head-' . bin2hex(random_bytes(6));
mkdir($root);
mkdir($root . '/favicon');
function check(bool $ok, string $message): void {
    if (!$ok) throw new RuntimeException($message);
}
try {
    check(kokuti_head([], $root) === '', 'No icon / no analytics must emit nothing');
    file_put_contents($root . '/favicon/favicon.svg', '<svg/>');
    check(kokuti_head([], $root) === '', 'SVG alone must not enable favicon links');
    file_put_contents($root . '/favicon/favicon.ico', 'test');
    $head = kokuti_head([], $root);
    check(substr_count($head, '<link ') === 5, 'ICO enables all five links');
    check(str_contains($head, 'href="favicon/favicon.ico"'), 'Use folder-relative paths');
    $code = '<script>window.analyticsTest = true;</script>';
    check(str_contains(kokuti_head(['site'=>['analyticsCode'=>$code]], $root), $code), 'Keep analytics script intact');
    unlink($root . '/favicon/favicon.ico');
    check(kokuti_head(['site'=>['analyticsCode'=>$code]], $root) === $code . "\n", 'Analytics independent of favicon');
    echo "PASS: favicon conditional, 5 links, relative paths, analytics output\n";
} finally {
    foreach (['favicon.ico','favicon.svg'] as $file) {
        if (is_file($root . '/favicon/' . $file)) unlink($root . '/favicon/' . $file);
    }
    rmdir($root . '/favicon');
    rmdir($root);
}
