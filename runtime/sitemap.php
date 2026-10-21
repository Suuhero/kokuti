<?php
declare(strict_types=1);
$config=require __DIR__.'/private/config.php';
header('Content-Type: application/xml; charset=UTF-8');
$url=htmlspecialchars($config['url'],ENT_XML1|ENT_QUOTES,'UTF-8');
$modified=gmdate('Y-m-d',filemtime(__DIR__.'/data/site.json'));
echo '<?xml version="1.0" encoding="UTF-8"?>';
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'.$url.'</loc><lastmod>'.$modified.'</lastmod></url></urlset>';
