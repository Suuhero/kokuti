<?php
// Development router for the PHP built-in server; production uses Apache .htaccess.
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if(preg_match('~(^|/)(private|\.git|node_modules)(/|$)|/(data/site\.json|admin/template\.html|runtime/.*|builder/gate\.php)$~',$path)) {http_response_code(403);exit('Forbidden');}
if(preg_match('~/(sitmap|sitemap)\.xml$~',$path)) {
 $file=getcwd().preg_replace('~/(sitmap|sitemap)\.xml$~','/sitemap.php',$path);
 if(is_file($file)){require $file;return true;}
}
return false;
