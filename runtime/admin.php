<?php
declare(strict_types=1);
require __DIR__.'/security.php'; secure_session();
$root=dirname(__DIR__); $config=require $root.'/private/config.php';
$error='';
if($_SERVER['REQUEST_METHOD']==='POST') {
  csrf_check();
  if(isset($_POST['logout'])) { $_SESSION=[];session_regenerate_id(true);header('Location: ./');exit; }
  $id=trim((string)($_POST['id'] ?? '')); $password=(string)($_POST['password'] ?? '');
  // Per-IP and per-account counters survive new sessions. Locked while checking to prevent parallel bypass.
  $lock=fopen($root.'/private/login-lock.json','c+'); if(!$lock || !flock($lock,LOCK_EX)) fail_request(503,'ログイン処理を利用できません。');
  $limits=json_decode(stream_get_contents($lock),true) ?: []; $now=time();
  $limits=array_filter($limits,fn($v)=>$v['until']>$now);
  $keys=[hash('sha256','ip:'.($_SERVER['REMOTE_ADDR'] ?? '')),hash('sha256','id:'.strtolower($id))];
  $blocked=false;foreach($keys as $k) if(($limits[$k]['n'] ?? 0)>=10) $blocked=true;
  $user=null;
  if(!$blocked && strlen($password)<=512 && strlen($id)<=40) foreach($config['users'] as $u) {
    if(hash_equals($u['id'],$id) && hash_equals($u['hash'],hash_pbkdf2('sha256',$password,$u['salt'],600000,64))) $user=['id'=>$id,'role'=>$u['role']];
  }
  if($user) {foreach($keys as $k) unset($limits[$k]);}
  else foreach($keys as $k) $limits[$k]=['n'=>($limits[$k]['n'] ?? 0)+1,'until'=>$limits[$k]['until'] ?? $now+900];
  ftruncate($lock,0);rewind($lock);fwrite($lock,json_encode($limits));flock($lock,LOCK_UN);fclose($lock);
  if($user) {session_regenerate_id(true);$_SESSION['user']=$user;$_SESSION['last']=$now;$_SESSION['csrf']=bin2hex(random_bytes(32));header('Location: ./');exit;}
  $error=$blocked?'試行回数の上限です。15分ほど待って再試行してください。':'IDまたはパスワードを確認してください。';
}
if(isset($_SESSION['user']) && time()-($_SESSION['last'] ?? 0)<=3600) {
  $_SESSION['last']=time();
  $html=file_get_contents(__DIR__.'/template.html');
  $marker='<script id="kokuti-runtime" type="application/json">'.json_encode(['csrf'=>$_SESSION['csrf'],'role'=>$_SESSION['user']['role']],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_QUOT|JSON_HEX_APOS).'</script>';
  $html=str_replace('</head>',$marker.'</head>',$html);
  $html=str_replace('GitHub Pages デモ','公開サイト管理',$html);
  $html=str_replace('ブラウザ内に保存 / v0.1','サーバーに保存',$html);
  $html=str_replace('公開サイト管理',$_SESSION['user']['role']==='company' ? '社内アカウント / 全設定' : 'お客様アカウント / テキスト・画像',$html);
  $html=str_replace('デモ環境：変更はこのブラウザ内だけに保存されます。','変更を保存すると公開サイトに反映されます。',$html);
  $html=str_replace('サンプルの医院情報はすべて架空です。','掲載内容を確認してから保存してください。',$html);
  $logout='<form method="post" style="margin-left:16px"><input type="hidden" name="csrf" value="'.$_SESSION['csrf'].'"><button name="logout" value="1">ログアウト</button></form>';
  echo str_replace('</header>',$logout.'</header>',$html);exit;
}
?><!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>告知サイト｜ログイン</title><link rel="stylesheet" href="../assets/admin.css"><body><main style="max-width:440px;margin:10vh auto;padding:30px;background:white;border:1px solid #dcdcde"><h1>告知サイト管理</h1><p>医院の編集担当者・制作担当者用</p><form method="post"><input type="hidden" name="csrf" value="<?= $_SESSION['csrf'] ?>"><p><label>ログインID<br><input name="id" autocomplete="username" required maxlength="40"></label></p><p><label>パスワード<br><input name="password" type="password" autocomplete="current-password" required maxlength="128"></label></p><p role="alert"><?= htmlspecialchars($error,ENT_QUOTES,'UTF-8') ?></p><button class="primary">ログイン</button></form><p><a href="../">サイトへ戻る</a></p></main></body></html>
