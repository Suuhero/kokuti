<?php
declare(strict_types=1);

/** Trusted site-owner analytics snippets are intentionally emitted as HTML. */
function kokuti_head(array $data, string $root): string
{
    $html = '';
    $icon = $data['site']['faviconUpload'] ?? '';
    if (is_string($icon) && preg_match('~^media/[a-zA-Z0-9_-]+\.(png|ico)$~i', $icon) && is_file($root . '/' . $icon)) {
        $html .= '<link rel="icon" href="' . htmlspecialchars($icon, ENT_QUOTES, 'UTF-8') . '" />' . "\n";
    } elseif (is_file($root . '/favicon/favicon.ico')) {
        $html .= '<link rel="icon" type="image/png" href="favicon/favicon-96x96.png" sizes="96x96" />' . "\n";
        $html .= '<link rel="icon" type="image/svg+xml" href="favicon/favicon.svg" />' . "\n";
        $html .= '<link rel="shortcut icon" href="favicon/favicon.ico" />' . "\n";
        $html .= '<link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png" />' . "\n";
        $html .= '<link rel="manifest" href="favicon/site.webmanifest" />' . "\n";
    }
    $analytics = $data['site']['analyticsCode'] ?? '';
    if (is_string($analytics) && trim($analytics) !== '') {
        $html .= $analytics . "\n";
    }
    return $html;
}
