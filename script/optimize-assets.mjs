import { execSync } from 'node:child_process';
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');

function walk(dir, exts) {
	const results = [];
	const list = readdirSync(dir);
	for (const name of list) {
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) {
			results.push(...walk(full, exts));
		} else if (exts.includes(extname(name).toLowerCase())) {
			results.push(full);
		}
	}
	return results;
}

function toMb(bytes) {
	return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function convertImages() {
	const targets = ['.png', '.jpg', '.jpeg'];
	const allFiles = [];
	for (const dir of ['img', 'img/Illustration', 'img/about', 'img/activity', 'img/covers', 'img/timeline']) {
		const d = join(publicDir, dir);
		if (existsSync(d)) allFiles.push(...walk(d, targets));
	}

	let saved = 0;
	let processed = 0;

	for (const file of allFiles) {
		processed++;
		const srcSize = statSync(file).size;
		const webpPath = file.replace(/\.(png|jpe?g)$/i, '.webp');

		try {
			execSync(`bun x sharp-cli --input "${file}" --output "${webpPath}" --webp.quality 80`, { stdio: 'pipe' });

			if (existsSync(webpPath)) {
				const dstSize = statSync(webpPath).size;
				if (dstSize < srcSize) {
					saved += (srcSize - dstSize);
				} else {
					unlinkSync(webpPath);
				}
			}
		} catch (e) {
			console.log(`  skip: ${file} (${e.message})`);
		}
	}

	console.log(`  done: ${processed} files, saved ${toMb(saved)}`);
}

function convertFont() {
	const ttfFile = join(publicDir, 'font', 'AlimamaShuHeiTi-Bold.ttf');
	const woff2File = join(publicDir, 'font', 'AlimamaShuHeiTi-Bold.woff2');

	if (!existsSync(ttfFile)) {
		console.log('  font file not found, skipping');
		return;
	}

	const srcSize = statSync(ttfFile).size;

	try {
		execSync(`pyftsubset "${ttfFile}" --output-file="${woff2File}" --flavor=woff2 --unicodes="U+20-7E,U+4E00-9FFF,U+3000-303F,U+FF00-FFEF"`, { stdio: 'pipe' });
	} catch {
		console.log('  fonttools not available, skipping woff2 conversion');
		return;
	}

	if (existsSync(woff2File)) {
		const dstSize = statSync(woff2File).size;
		console.log(`  font: ${toMb(srcSize)} -> ${toMb(dstSize)} (${((1 - dstSize / srcSize) * 100).toFixed(0)}% saved)`);
	}
}

function updateCssFontRef() {
	const cssFile = join(root, 'src', 'styles', 'index.css');
	if (!existsSync(cssFile)) return;

	let content = readFileSync(cssFile, 'utf-8');
	if (content.includes('woff2')) {
		console.log('  font CSS already updated');
		return;
	}

	content = content.replace(
		'src: url(\'/font/AlimamaShuHeiTi-Bold.ttf\')',
		'src: url(\'/font/AlimamaShuHeiTi-Bold.woff2\') format(\'woff2\'), url(\'/font/AlimamaShuHeiTi-Bold.ttf\') format(\'truetype\')'
	);
	writeFileSync(cssFile, content, 'utf-8');
	console.log('  updated font reference in CSS');
}

console.log('\n===== Asset Optimization =====\n');

console.log('[1/3] Converting images to WebP...');
convertImages();

console.log('\n[2/3] Converting font to WOFF2...');
convertFont();

console.log('\n[3/3] Updating CSS references...');
updateCssFontRef();

console.log('\n===== Done =====\n');