<?php
require_once dirname(__DIR__) . '/head.php';
$root = sys_get_temp_dir() . '/kokuti-head-' . bin2hex(random_bytes(6));
mkdir($root);
mkdir($root . '/favicon');
mkdir($root . '/media');
function check(bool $ok, string $message): void {
    if (!$ok) throw new RuntimeException($message);
}
try {
    check(kokuti_head([], $root) === '', 'No icon / no analytics must emit nothing');
    file_put_contents($root . '/favicon/favicon.svg', '<svg/>');
    check(kokuti_head([], $root) === '', 'SVG alone must not enable favicon links');
    file_put_contents($root . '/favicon/favicon.ico', 'test');
    $head = kokuti_head([], $root);
    file_put_contents($root . '/media/icon.png', 'test');
    $custom = kokuti_head(['site'=>['faviconUpload'=>'media/icon.png']], $root);
    check(substr_count($custom, '<link ') === 1 && str_contains($custom, 'media/icon.png'), 'Admin favicon overrides folder fallback');
    check(kokuti_head(['site'=>['faviconUpload'=>'../icon.png']], $root) === $head, 'Reject paths outside media');
    check(substr_count($head, '<link ') === 5, 'ICO enables all five links');
    check(str_contains($head, 'href="favicon/favicon.ico"'), 'Use folder-relative paths');
    $code = '<script>window.analyticsTest = true;</script>';
    check(str_contains(kokuti_head(['site'=>['analyticsCode'=>$code]], $root), $code), 'Keep analytics script intact');
    unlink($root . '/favicon/favicon.ico');
    check(kokuti_head(['site'=>['analyticsCode'=>$code]], $root) === $code . "\n", 'Analytics independent of favicon');
    echo "PASS: favicon conditional, 5 links, relative paths, analytics output\n";
} finally {
    if (is_file($root . '/media/icon.png')) unlink($root . '/media/icon.png');
    rmdir($root . '/media');
    foreach (['favicon.ico','favicon.svg'] as $file) {
        if (is_file($root . '/favicon/' . $file)) unlink($root . '/favicon/' . $file);
    }
    rmdir($root . '/favicon');
    rmdir($root);
}
