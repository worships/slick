import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import tailwindcss from '@tailwindcss/vite';
import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const mimeTypes: Record<string, string> = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.wasm': 'application/wasm',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.swf': 'application/x-shockwave-flash',
	'.mp3': 'audio/mpeg',
	'.ogg': 'audio/ogg',
	'.wav': 'audio/wav',
	'.mp4': 'video/mp4',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf'
};

// Game files kept in the catalog repo are served at /catalog/games/ by the dev server
// and copied into the build.
function catalogGames(): Plugin {
	const source = resolve('catalog/games');
	return {
		name: 'slick-catalog-games',
		configureServer(server) {
			server.middlewares.use('/catalog/games', (req, res, next) => {
				const file = join(source, decodeURIComponent((req.url ?? '/').split('?')[0]));
				if (!file.startsWith(source) || !existsSync(file) || !statSync(file).isFile()) return next();
				res.setHeader('Content-Type', mimeTypes[extname(file).toLowerCase()] ?? 'application/octet-stream');
				createReadStream(file).pipe(res);
			});
		},
		writeBundle(options) {
			if (this.environment?.name !== 'client' || !options.dir || !existsSync(source)) return;
			cpSync(source, join(options.dir, 'catalog/games'), { recursive: true });
		}
	};
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		catalogGames(),
		sveltekit({
			adapter: adapter({ fallback: '404.html' })
		})
	]
});
