<?php
declare(strict_types=1);
// Keep the private AI proxy local until the operator configures access control.
$local=in_array($_SERVER['REMOTE_ADDR'] ?? '',['127.0.0.1','::1'],true);
if(!$local) {
  $expected=getenv('KOKUTI_BUILDER_PASSWORD') ?: '';
  if(!$expected || !hash_equals($expected,$_SERVER['PHP_AUTH_PW'] ?? '') || ($_SERVER['PHP_AUTH_USER'] ?? '')!=='starter') {
    header('WWW-Authenticate: Basic realm="kokuti builder", charset="UTF-8"');http_response_code(401);exit('制作ツールへのログインが必要です。');
  }
  if(empty($_SERVER['HTTPS']) || $_SERVER['HTTPS']==='off') {http_response_code(403);exit('HTTPSで開いてください。');}
}
require_once dirname(__DIR__).'/runtime/security.php'; secure_session();
