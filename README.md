# kokuti

医院告知サイトのテンプレートと、WordPress風管理画面の操作デモです。

公開サイト: https://suuhero.github.io/kokuti/

管理画面: https://suuhero.github.io/kokuti/admin/

方針: 最初の「告知サイト.zip」の編集機能と3デザインを継承。PHP + JSON、データベース不要。AI生成JSONと配布用テンプレートをFTP設置し、以後は管理画面から同じJSONを編集する。

管理画面はWordPressに近い左ナビゲーション式。開発段階はサイト独自のログインなし。実データを扱う本番公開前に認証・セキュリティ実装を行う。

本番はXサーバー。GitHub検証はユーザー指定によりGitHub Pagesを採用し、保存はブラウザ内だけで行う。GitHub PagesではPHPによる保存は実行できないため、本番向けPHP保存処理は別途自動テスト・設置検証する。

## 操作デモ

ログインなしで利用できます。編集内容・画像はこのブラウザのIndexedDBに保存され、他の人や本番には反映されません。ブラウザデータの削除で消えます。

3つの元デザイン、18色パレット、各デザイン3種類・合計9種類のSVG MV、医院情報、診療時間、複数医師・経歴、診療内容、特徴、自由記述、SNS・ボタンを編集できます。

詳細設定からsite.json・画像を個別ダウンロード、AIプロンプト・JSON仕様の取得、JSONの読込、デモの初期化ができます。MPクラウドは設定入力のみです。計測コードは「基本情報」で入力し、Pagesデモでは実行せずJSONに保存します。

## ローカル・ビルド

HTTPサーバーで配信してください。例: `python -m http.server 8788`。`/admin/`で管理画面を開きます。file://直接起動には対応しません。

Node.js 22以降で `npm test` と `npm run build`。実行時のnpm依存パッケージはありません。`dist/pages`が公開用成果物です。GitHub Settings > Pages > SourceをGitHub Actionsに設定するとmainへのpush時に検査・公開します。

## 次の工程

現在はPages操作デモです。Xサーバー向けPHPの公開描画・JSON保存・画像アップロード・MPクラウド実接続、本番用ログイン・セキュリティは後工程です。現在のデモを本番CMSとして利用しないでください。

BrowserStoreを保存境界として分離し、ServerStoreを後で追加する構成です。公開用の元CSSは変更せず、調整はpublic.cssとrefined.cssに分けています。顧客Word・実データ・認証情報はリポジトリに含めません。

## FTP用head出力の確認

`npm run build:ftp` で `dist/ftp` を作成します。中身をFTPで配置し、管理画面からダウンロードしたJSONを `data/site.json` に置いてください。`.htaccess` により `index.php` が入口になります。サブフォルダ設置にも対応した相対パスです。

「基本情報」のアナリティクスコードは、このPHP入口で公開ページの `<head>` 内にそのまま出力します。管理者が用意した `<script>` タグを含むhead用コードを使用してください。管理画面には出力しません。

`favicon/favicon.ico` がある場合のみ、同フォルダの `favicon-96x96.png`、`favicon.svg`、`favicon.ico`、`apple-touch-icon.png`、`site.webmanifest` に向けた5つのlinkタグを出力します。5ファイルを一緒に配置してください。アイコンそのものは未同梱です。

これはFTP向けhead出力と配置JSONの読み込みを確認する段階です。管理画面の保存は引き続きブラウザ内のみで、変更後はJSONを再配置します。サーバー保存・ログイン・MPクラウド連携は未実装です。PagesではPHPの分岐と計測コードは実行しません。

PHP検証: `php tests/head.test.php`。
