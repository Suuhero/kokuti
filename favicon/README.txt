favicon.ico がある場合、FTP用 index.php が5種類のlinkタグをheadに出力します。
以下のファイルをこのフォルダに配置してください（実際のアイコンは未同梱です）。

favicon.ico
favicon-96x96.png
favicon.svg
apple-touch-icon.png
site.webmanifest

site.webmanifest 内の icons.src も、このフォルダを基準にした画像パスにしてください。
favicon.ico がなければ5つのタグはいずれも出力しません。
GitHub PagesはPHPを実行しないため、この自動判定はFTP先のみで動きます。
