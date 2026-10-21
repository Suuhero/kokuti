<?php
declare(strict_types=1);
require_once __DIR__ . '/head.php';
header('Content-Type: text/html; charset=UTF-8');
try {
    $path = __DIR__ . '/data/site.json';
    if (!is_file($path)) {
        throw new RuntimeException('site.json is missing');
    }
    $data = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data) || ($data['schemaVersion'] ?? null) !== 1 || !is_array($data['site'] ?? null)) {
        throw new RuntimeException('Invalid site data');
    }
    $template = file_get_contents(__DIR__ . '/index.html');
    $escape = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
    $template = preg_replace_callback('~<title>.*?</title>~s', fn() => '<title>'.$escape($data['site']['pageTitle'] ?: $data['site']['clinicName']).'</title>', $template);
    $template = preg_replace_callback('~<meta\s+name="description"\s+content="[^"]*"\s*/?>~s', fn() => '<meta name="description" content="'.$escape($data['site']['description']).'">', $template);
    // Keep data inert and prevent embedded text from terminating the script tag.
    $json = json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);
    $head = '<script id="kokuti-site-data" type="application/json">' . $json . '</script>' . "\n";
    $head .= kokuti_head($data, __DIR__);
    echo str_replace('</head>', $head . '</head>', $template);
} catch (Throwable $error) {
    http_response_code(503);
    echo '<!doctype html><html lang="ja"><meta charset="utf-8"><title>準備中</title><p>サイトデータを確認してください。data/site.jsonの配置とJSON形式を確認してください。</p></html>';
}
