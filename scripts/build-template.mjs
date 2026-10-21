import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {zipSync,strToU8} from 'fflate';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files={};
async function add(file,dest=file){files[dest]=new Uint8Array(await fs.readFile(path.join(root,file)));}
async function tree(dir){for(const e of await fs.readdir(path.join(root,dir),{withFileTypes:true})){const f=dir+'/'+e.name;if(e.isDirectory())await tree(f);else if(!f.includes('/vendor/')&&!/builder(?:-core)?\./.test(f))await add(f);}}
await tree('assets');await tree('favicon');
for(const f of ['index.php','head.php','data/schema.json','data/AIプロンプト.txt'])await add(f);
let html=await fs.readFile(path.join(root,'index.html'),'utf8');
html=html.replace('noindex,nofollow','index,follow').replace('デモの表示','サイトの表示');files['index.html']=strToU8(html);
await add('admin/index.html','admin/template.html');
for(const [src,dst]of [['admin.php','admin/index.php'],['api.php','admin/api.php'],['security.php','admin/security.php'],['sitemap.php','sitemap.php']])await add('runtime/'+src,dst);
files['.htaccess']=strToU8('DirectoryIndex index.php\nOptions -Indexes\nRewriteEngine On\nRewriteRule ^sitemap\\.xml$ sitemap.php [L]\nRewriteRule ^sitmap\\.xml$ sitemap.xml [R=301,L]\n<FilesMatch "^(index\\.html|head\\.php)$">\nRequire all denied\n</FilesMatch>\n');
files['admin/.htaccess']=strToU8('DirectoryIndex index.php\nOptions -Indexes\n<FilesMatch "^(template\\.html|security\\.php)$">\nRequire all denied\n</FilesMatch>\n');
files['private/.htaccess']=strToU8('Require all denied\n');
files['data/.htaccess']=strToU8('Options -Indexes\n<FilesMatch "^(site\\.json|\\.pending-.*)$">\nRequire all denied\n</FilesMatch>\n');
files['media/.htaccess']=strToU8('Options -Indexes -ExecCGI\nRemoveHandler .php .phtml .phar .cgi .pl\n<FilesMatch "\\.(php[0-9]?|phtml|phar|cgi|pl|html|svg)$">\nRequire all denied\n</FilesMatch>\nHeader set X-Content-Type-Options "nosniff"\n');
files['設置方法.txt']=strToU8('kokuti FTP設置用\nPHP 8.1以上 / Apache・.htaccess対応 / HTTPSを利用してください。\n1. Xサーバーのドメイン・DNS・SSLを設定します。\n2. ZIPの中身を公開フォルダへ配置します。隠しファイル.htaccessも必要です。\n3. admin/を開き、設定したアカウントでログインします。\n4. data・media・privateはPHPから書き込める権限が必要です。777にはしないでください。\n5. sitemap.xmlはPHPで動的生成します。\n6. 公開前にprivate/config.phpとdata/site.jsonが直接表示されないこと、管理画面から保存できることを確認してください。\nパスワードを失念した場合は制作ツールで認証情報を再生成しprivate/config.phpだけを差し替えてください。\nログインは1時間で期限切れ。10回失敗でIP/IDごとに15分制限します。\n既存サイトを更新する前にバックアップしてください。\n');
await fs.mkdir(path.join(root,'builder'),{recursive:true});await fs.writeFile(path.join(root,'builder/template.zip'),zipSync(files,{level:6}));
console.log(`FTP template: ${Object.keys(files).length} files`);
