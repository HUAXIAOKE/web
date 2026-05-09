import { defineConfig } from 'astro/config';

export default defineConfig({
	vite: {
		server: {
			proxy: {
				'/api': {
					target: 'http://localhost:1037',
					changeOrigin: true,
					agent: false,
				},
				'/audio': {
					target: 'http://localhost:1037',
					changeOrigin: true,
					agent: false,
				},
				'/img/uploads': {
					target: 'http://localhost:1037',
					changeOrigin: true,
					agent: false,
				},
				'/joinus': {
					target: 'https://huaxiaoke.work',
					changeOrigin: true,
					secure: true,
					agent: false,
				},
			},
		},
	},
});
