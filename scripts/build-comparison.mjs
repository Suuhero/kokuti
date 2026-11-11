import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';

const baseline = '6ba9fc6063f417326072ea00e12c8cd67952f225';
const publicFiles = ['index.html', 'admin/index.html', 'builder/index.html', 'assets',
  'data/sample.json', 'data/schema.json', 'data/AIプロンプト.txt'];
const templateSources = ['scripts/build-template.mjs', 'index.php', 'head.php', 'favicon',
  'runtime/admin.php', 'runtime/api.php', 'runtime/security.php', 'runtime/sitemap.php'];

export async function buildComparison(root, pages) {
  const target = path.join(pages, 'compare');
  const staging = await fs.mkdtemp(path.join(root, 'dist', 'comparison-build-'));
  try {
    const zip = execFileSync('git', ['archive', '--format=zip', baseline, '--',
      ...publicFiles, ...templateSources], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
    for (const [name, bytes] of Object.entries(unzipSync(zip))) {
      if (name.endsWith('/')) continue;
      const dest = path.resolve(staging, name);
      if (!dest.startsWith(staging + path.sep)) throw new Error('Invalid archive path');
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, bytes);
    }
    // The pinned template generator builds a blank download with no actual accounts.
    execFileSync(process.execPath, [path.join(staging, 'scripts/build-template.mjs')], { cwd: staging });
    await fs.mkdir(target, { recursive: true });
    for (const name of ['index.html', 'comparison.css', 'comparison.js', 'preview-data.js']) {
      await fs.copyFile(path.join(root, 'compare', name), path.join(target, name));
    }
    const sample = await fs.readFile(path.join(staging, 'data/sample.json'), 'utf8');
    const fixture = '<script type="application/json" id="kokuti-site-data">' +
      sample.replaceAll('<', '\\u003c') + '</script><script src="../preview-data.js"></script>';
    for (const [side, source] of [['before', staging], ['after', pages]]) {
      const dest = path.join(target, side);
      for (const file of [...publicFiles, 'builder/template.zip']) {
        await fs.mkdir(path.dirname(path.join(dest, file)), { recursive: true });
        await fs.cp(path.join(source, file), path.join(dest, file), { recursive: true });
      }
      const html = await fs.readFile(path.join(dest, 'index.html'), 'utf8');
      await fs.writeFile(path.join(dest, 'index.html'), html.replace('</head>', () => fixture + '</head>'));
      await fs.writeFile(path.join(dest, 'data/sample.json'), sample);
    }
    console.log('Comparison ready: dist/pages/compare/ (baseline ' + baseline.slice(0, 7) + ')');
  } finally {
    // Remove only the unique temporary directory created above.
    await fs.rm(staging, { recursive: true, force: true });
  }
}
