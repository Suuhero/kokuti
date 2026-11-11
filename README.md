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

## 管理画面の設定場所（2026-10-21）

- 基本情報: ロゴ表示テキスト・ロゴ画像・favicon（PNG/ICO、1MBまで）。
- デザイン・カラー: デザイン3種類・18色・MVプリセット/アップロード画像。
- faviconは任意のsite.faviconUploadにmedia/相対パスを保存。詳細設定からsite.jsonと画像を個別にダウンロードし、FTP側のdata/とmedia/へ配置します。管理画面で設定した画像を優先し、未設定/未配置なら従来のfavicon/favicon.icoによる5リンク出力に戻ります。解除は管理画面設定の解除であり、FTPの既存faviconフォルダは削除しません。
- Pagesの保存は従来どおりブラウザ内です。サーバーへの直接保存はまだ実装していません。

## 調整前と調整後を比較する

`npm run build` のあとに `npm run preview` を実行して、[ローカル比較ページ](http://127.0.0.1:8794/compare/)を開きます。GitHub Pagesのデモでは [デザイン比較](https://suuhero.github.io/kokuti/compare/) を開きます。

公開サイトは、同一の架空の医院情報・配色・標準の文字サイズで、デザイン3種類と背景A〜Cを比較できます。「表示箇所」で両側を同じセクションへ移動します。「原寸で開く」は片側を別タブで開きます。画面幅が狭い端末では「調整前」「調整後」を切り替えられます。画面・デザイン・背景・表示箇所・画面幅の選択は比較ページのURLに残ります。

管理画面と制作ツールは各版専用のブラウザ保存領域で操作できます。公開サイトの比較は常に固定サンプルを表示します。ビルドではGit履歴内の調整前コミット `6ba9fc6063f417326072ea00e12c8cd67952f225` から静的デモを復元します。比較はGitHub Pages用の配布物に含まれます。

### デザインの判断基準

- [Hallmark](https://github.com/Nutlope/hallmark) の改善前後の比較方法を採用。既存の入力・医院情報を維持し、レイアウトの違いを同じ内容で評価する。
- [Impeccable](https://github.com/pbakaus/impeccable) の書体・情報の整理・異なる画面幅での見直しを適用。開院日、内覧会、診療時間を見分けられることを優先する。
- [Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) の考え方に沿い、医院の案内板、日差しの入る窓、和の冊子という別々の造形から3案を設計。医院ごとに事実と異なる写真や実績は加えない。
- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) を管理・制作画面の点検に使用。現在位置、フォーカス、押せる範囲、戻る操作と入力の保持を確認する。

これらは設計資料であり、配布サイトを動かすための依存パッケージではありません。
