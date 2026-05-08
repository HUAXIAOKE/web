import { readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

let BACKEND_PORT = process.env.BACKEND_PORT ?? '3001';
try {
	const portFile = resolve(process.cwd(), '.backend-port');
	const port = readFileSync(portFile, 'utf-8').trim();
	if (port && /^\d+$/.test(port)) BACKEND_PORT = port;
} catch {
	// 未找到 .backend-port 时用 env 或默认 3001
}
export default defineConfig({
	define: {
		'import.meta.env.VITE_BACKEND_PORT': JSON.stringify(String(BACKEND_PORT)),
	},
	server: {
		proxy: {
			'/api': {
				target: `http://localhost:${BACKEND_PORT}`,
				changeOrigin: true,
			},
		},
	},
	build: {
		lib: {
			entry: 'src/index.ts',
			name: 'JoinUs',
			fileName: 'joinus',
			formats: ['umd', 'es'],
		},
		rollupOptions: {
			output: {
				assetFileNames: 'joinus.[ext]',
			},
		},
	},
	plugins: [cssInjectedByJsPlugin()],
});
