<?php
declare(strict_types=1);
function fail_request(int $code, string $message): never {
    http_response_code($code); header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error'=>$message], JSON_UNESCAPED_UNICODE); exit;
}
function secure_session(): void {
    ini_set('session.use_strict_mode','1'); ini_set('session.use_only_cookies','1');
    session_name('kokuti_' . substr(hash('sha256',__DIR__),0,12));
    session_set_cookie_params(['httponly'=>true,'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off','samesite'=>'Strict','path'=>rtrim(dirname($_SERVER['SCRIPT_NAME']),'/').'/']);
    session_start(); header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff'); header('X-Frame-Options: DENY'); header('Referrer-Policy: no-referrer');
    if(!isset($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(32));
}
function csrf_check(): void {
    $token=$_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf'] ?? '';
    if(!is_string($token) || !hash_equals($_SESSION['csrf'],$token)) fail_request(403,'画面を再読み込みしてください。');
}
function require_user(): array {
    if(!isset($_SESSION['user']) || time()-($_SESSION['last'] ?? 0)>3600) {unset($_SESSION['user']); fail_request(401,'ログインしてください。');}
    $_SESSION['last']=time(); return $_SESSION['user'];
}
function validate_schema(mixed $v, array $s): bool {
    if(isset($s['const']) && $v!==$s['const']) return false;
    if(isset($s['enum']) && !in_array($v,$s['enum'],true)) return false;
    switch($s['type'] ?? '') {
      case 'object':
        if(!is_array($v)) return false;
        foreach($s['required'] ?? [] as $k) if(!array_key_exists($k,$v)) return false;
        foreach($v as $k=>$x) if(!isset($s['properties'][$k]) || !validate_schema($x,$s['properties'][$k])) return false;
        break;
      case 'array':
        if(!is_array($v) || !array_is_list($v) || count($v)<($s['minItems'] ?? 0) || count($v)>($s['maxItems'] ?? 50)) return false;
        foreach($v as $x) if(!validate_schema($x,$s['items'])) return false;
        break;
      case 'string': if(!is_string($v) || strlen($v)>($s['maxLength'] ?? 20000)*4) return false; break;
      case 'boolean': if(!is_bool($v)) return false; break;
      case 'integer': if(!is_int($v)) return false; break;
    } return true;
}
function check_site(array $d, string $root): void {
    $s=json_decode(file_get_contents($root.'/data/schema.json'),true,512,JSON_THROW_ON_ERROR);
    if(!validate_schema($d,$s) || trim($d['site']['clinicName'])==='') fail_request(422,'サイトデータの項目・件数を確認してください。');
    foreach(['main','sub','text'] as $k) if(!preg_match('/^#[a-f0-9]{6}$/i',$d['colors'][$k])) fail_request(422,'色の形式が正しくありません。');
    foreach($d['mv']['images'] as $i) if(!in_array($i['preset'],['preset-mv-1.svg','preset-mv-2.svg','preset-mv-3.svg'],true)) fail_request(422,'背景を確認してください。');
    $walk=function($v) use (&$walk) {if(!is_array($v)) return; foreach($v as $k=>$x) {if(in_array($k,['upload','imageUpload','logoUpload','faviconUpload'],true) && $x!=='' && (!is_string($x) || !preg_match('~^media/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|ico)$~',$x))) fail_request(422,'画像パスが正しくありません。'); if(is_array($x)) $walk($x);}}; $walk($d);
}
