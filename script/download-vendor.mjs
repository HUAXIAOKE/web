import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vendorDir = join(__dirname, '..', 'public', 'vendor');
const faDir = join(vendorDir, 'fontawesome', 'webfonts');

mkdirSync(faDir, { recursive: true });

const downloads = [
  ['fontawesome/all.min.css', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'],
  ['fontawesome/webfonts/fa-solid-900.woff2', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2'],
  ['fontawesome/webfonts/fa-solid-900.ttf', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.ttf'],
  ['fontawesome/webfonts/fa-regular-400.woff2', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-regular-400.woff2'],
  ['fontawesome/webfonts/fa-regular-400.ttf', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-regular-400.ttf'],
  ['fontawesome/webfonts/fa-brands-400.woff2', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-brands-400.woff2'],
  ['fontawesome/webfonts/fa-brands-400.ttf', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-brands-400.ttf'],
];

for (const [dest, url] of downloads) {
  const outPath = join(vendorDir, dest);
  console.log(`  ${dest}`);
  execSync(`curl -sL -o "${outPath}" "${url}"`, { stdio: 'pipe' });
}

const cssPath = join(vendorDir, 'fontawesome', 'all.min.css');
let css = readFileSync(cssPath, 'utf-8');
css = css.replace(/..\/webfonts\//g, '/vendor/fontawesome/webfonts/');
writeFileSync(cssPath, css, 'utf-8');
console.log('  fontawesome paths fixed');
console.log(`\n  Done: ${downloads.length} files`);
