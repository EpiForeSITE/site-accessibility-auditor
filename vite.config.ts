import { cpSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

function copyExtensionFiles() {
	return {
		name: 'copy-extension-files',
		closeBundle() {
			const dist = resolve(__dirname, 'dist');

			cpSync(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'));
			cpSync(resolve(__dirname, 'src/icons'), resolve(dist, 'icons'), { recursive: true });

			// Vite nests HTML under dist/src/{dir}/ — move to dist/{dir}/ and fix paths.
			// Original: dist/src/devtools/devtools.html  ->  dist/devtools/devtools.html
			// Paths computed by Vite use ../../ (two dirs up from src/X/), but after
			// moving one level shallower we need ../ (one dir up from X/).
			const srcDir = resolve(dist, 'src');
			if (existsSync(srcDir)) {
				for (const dir of ['devtools', 'panel', 'panel-touch-viz', 'panel-color-audit', 'panel-tab-order']) {
					const htmlSrc = join(srcDir, dir, `${dir}.html`);
					const htmlDest = join(dist, dir, `${dir}.html`);
					if (existsSync(htmlSrc)) {
						let html = readFileSync(htmlSrc, 'utf-8');
						html = html.replaceAll('../../', '../');
						writeFileSync(htmlDest, html);
					}
				}
				rmSync(srcDir, { recursive: true, force: true });
			}
		}
	};
}

export default defineConfig({
	plugins: [svelte(), tailwindcss(), copyExtensionFiles()],
	base: './',
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				devtools: resolve(__dirname, 'src/devtools/devtools.html'),
				panel: resolve(__dirname, 'src/panel/panel.html'),
				'panel-touch-viz': resolve(__dirname, 'src/panel-touch-viz/panel-touch-viz.html'),
				'panel-color-audit': resolve(__dirname, 'src/panel-color-audit/panel-color-audit.html'),
			'panel-tab-order': resolve(__dirname, 'src/panel-tab-order/panel-tab-order.html')
			},
			output: {
				entryFileNames: '[name]/[name].js',
				chunkFileNames: 'shared/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash][extname]'
			}
		},
		target: 'esnext',
		minify: false
	}
});
