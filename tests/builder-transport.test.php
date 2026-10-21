<?php
require __DIR__.'/../builder/transport.php';
foreach([60=>'証明書',77=>'証明書',6=>'DNS',28=>'100秒',7=>'通信'] as $code=>$expected) {
 $json=json_encode(['error'=>gemini_transport_error($code)],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
 $decoded=json_decode($json,true,512,JSON_THROW_ON_ERROR);
 if(!str_contains($decoded['error'],$expected))throw new RuntimeException('Unexpected transport message: '.$code);
}
echo "All transport error branches return valid JSON without cURL constants.\n";
