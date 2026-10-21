<?php
declare(strict_types=1);
require __DIR__.'/security.php'; secure_session(); $user=require_user();
$root=dirname(__DIR__); header('Content-Type: application/json; charset=utf-8');
if($_SERVER['REQUEST_METHOD']==='GET') {
  $raw=file_get_contents($root.'/data/site.json');
  echo json_encode(['data'=>json_decode($raw,true),'revision'=>hash('sha256',$raw),'updatedAt'=>date(DATE_ATOM,filemtime($root.'/data/site.json'))],JSON_UNESCAPED_UNICODE);exit;
}
if($_SERVER['REQUEST_METHOD']!=='POST') fail_request(405,'POSTが必要です。');
csrf_check();
if((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>25*1024*1024) fail_request(413,'画像を含む保存サイズが大きすぎます。');
$raw=file_get_contents('php://input',false,null,0,25*1024*1024+1);
if(strlen($raw)>25*1024*1024) fail_request(413,'保存サイズが大きすぎます。');
$body=json_decode($raw,true);if(!is_array($body) || !is_array($body['data'] ?? null)) fail_request(400,'JSONを確認してください。');
$d=$body['data'];check_site($d,$root);
$lock=fopen($root.'/private/save.lock','c');if(!$lock || !flock($lock,LOCK_EX)) fail_request(503,'保存を利用できません。');
$old=file_get_contents($root.'/data/site.json');
if(($body['revision'] ?? '')!==hash('sha256',$old)) fail_request(409,'別の画面で保存されています。入力をJSONで控え、再読み込みしてください。');
$previous=json_decode($old,true);
if($user['role']!=='company') {
 foreach(['design','colors','mv'] as $key) if($d[$key]!==$previous[$key]) fail_request(403,'デザイン・配色・MVは社内アカウントで変更してください。');
 foreach(['analyticsCode','customCss'] as $key) if(($d['site'][$key] ?? '')!==($previous['site'][$key] ?? '')) fail_request(403,'CSS・アナリティクスは社内アカウントで変更してください。');
}
$files=$body['images'] ?? [];if(!is_array($files) || count($files)>50) fail_request(422,'画像件数を確認してください。');
foreach($files as $path=>$encoded) {
 if($user['role']!=='company' && in_array($path,array_column($previous['mv']['images'],'upload'),true)) fail_request(403,'MV画像は社内アカウントで変更してください。');
 if(!is_string($path) || !preg_match('~^media/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|ico)$~',$path,$m) || !is_string($encoded)) fail_request(422,'画像を確認してください。');
 $bytes=base64_decode($encoded,true);if($bytes===false || strlen($bytes)>5*1024*1024) fail_request(422,'画像サイズを確認してください。');
 $ext=$m[1];$ok=match($ext){'png'=>str_starts_with($bytes,"\x89PNG\r\n\x1a\n"),'jpg','jpeg'=>str_starts_with($bytes,"\xff\xd8\xff"),'webp'=>substr($bytes,0,4)==='RIFF' && substr($bytes,8,4)==='WEBP','ico'=>str_starts_with($bytes,"\x00\x00\x01\x00"),default=>false};
 if(!$ok) fail_request(422,'画像形式が正しくありません。');
 if(file_put_contents($root.'/'.$path,$bytes,LOCK_EX)===false) fail_request(503,'画像を保存できません。mediaの書き込み権限を確認してください。');
}
$json=json_encode($d,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR);
$tmp=$root.'/data/.pending-'.bin2hex(random_bytes(8));
if(file_put_contents($tmp,$json,LOCK_EX)===false || !rename($tmp,$root.'/data/site.json')) fail_request(503,'保存できません。dataの書き込み権限を確認してください。');
flock($lock,LOCK_UN);fclose($lock);
echo json_encode(['data'=>$d,'revision'=>hash('sha256',$json),'updatedAt'=>date(DATE_ATOM)],JSON_UNESCAPED_UNICODE);
