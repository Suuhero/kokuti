import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist/ftp');
await fs.mkdir(out, {recursive:true});
for (const file of ['index.html','index.php','head.php','assets','admin','favicon']) {
  await fs.cp(path.join(root,file),path.join(out,file),{recursive:true});
}
await fs.mkdir(path.join(out,'data'),{recursive:true});
await fs.mkdir(path.join(out,'media'),{recursive:true});
for (const file of ['sample.json','schema.json','AIプロンプト.txt']) {
  await fs.copyFile(path.join(root,'data',file),path.join(out,'data',file));
}
await fs.writeFile(path.join(out,'.htaccess'),'DirectoryIndex index.php\n');
console.log('FTP確認用ファイル: dist/ftp（data/site.jsonを別途配置してください）');
