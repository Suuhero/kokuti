<?php
declare(strict_types=1);
// Stable libcurl error codes; PHP builds do not expose every symbolic alias.
function gemini_transport_error(int $code): string {
 return match($code) {
  60, 77 => 'PHPのHTTPS証明書設定に問題があります。制作担当者がcurl.cainfoのCA証明書を確認してください。',
  6 => 'Googleの接続先を見つけられませんでした。ネットワーク・DNS設定を確認してください。',
  28 => 'Geminiの応答が100秒以内に届きませんでした。再度試すか、グレードを1つ下げて再試行してください。',
  default => 'Geminiとの通信に失敗しました。ネットワーク接続を確認して再度試してください。'
 };
}
