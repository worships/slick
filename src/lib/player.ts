import type { CatalogItem } from '#lib/catalog.svelte.ts';

const ruffleUrl = 'https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle@0.6.0/ruffle.js';

// Keeps a value from closing the <script> it's embedded in.
const jsValue = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

// Big files are stored as file.part1, file.part2, ... This script runs before the game
// and joins them back together whenever the game asks for the original file.
function joinPartsScript(parts: Record<string, number>) {
	return `<script>(() => {
const parts = new Map(Object.entries(${jsValue(parts)}));
const types = { wasm: 'application/wasm', js: 'text/javascript', json: 'application/json', swf: 'application/x-shockwave-flash' };
const realFetch = window.fetch.bind(window);
const joined = new Map();
const match = (url) => {
	try {
		const u = new URL(url, document.baseURI);
		u.search = u.hash = '';
		return parts.has(u.href) ? u.href : null;
	} catch { return null; }
};
const join = (url) => {
	if (!joined.has(url)) {
		const pieces = Array.from({ length: parts.get(url) }, (_, i) =>
			realFetch(url + '.part' + (i + 1)).then((r) => {
				if (!r.ok) throw new Error('Missing ' + url + '.part' + (i + 1));
				return r.blob();
			})
		);
		joined.set(url, Promise.all(pieces).then((b) => new Blob(b, { type: types[url.split('.').pop()] || 'application/octet-stream' })));
	}
	return joined.get(url);
};
window.fetch = (input, init) => {
	const url = match(input instanceof Request ? input.url : String(input));
	if (!url) return realFetch(input, init);
	return join(url).then((blob) => new Response(blob, { headers: { 'Content-Type': blob.type, 'Content-Length': String(blob.size) } }));
};
const open = XMLHttpRequest.prototype.open;
const send = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
	const target = match(url);
	this.__parts = target ? { method, target, rest } : null;
	return open.call(this, method, url, ...rest);
};
XMLHttpRequest.prototype.send = function (body) {
	const p = this.__parts;
	if (!p) return send.call(this, body);
	join(p.target).then(
		(blob) => {
			open.call(this, p.method, URL.createObjectURL(blob), ...p.rest);
			send.call(this, body);
		},
		() => send.call(this, body)
	);
};
})();</script>`;
}

function absoluteParts(item: CatalogItem) {
	const folder = new URL('.', new URL(item.src, location.href));
	return Object.fromEntries(Object.entries(item.parts ?? {}).map(([file, count]) => [new URL(file, folder).href, count]));
}

function ruffleDocument(item: CatalogItem) {
	return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}ruffle-player{width:100%;height:100%;display:block}</style>
${item.parts ? joinPartsScript(absoluteParts(item)) : ''}
<script src="${ruffleUrl}"></script>
</head>
<body>
<script>
window.RufflePlayer = window.RufflePlayer || {};
window.RufflePlayer.config = { autoplay: "on", unmuteOverlay: "hidden", splashScreen: false, letterbox: "on" };
const player = window.RufflePlayer.newest().createPlayer();
document.body.appendChild(player);
player.ruffle().load(${jsValue(new URL(item.src, location.href).href)});
</script>
</body>
</html>`;
}

// Injected pages report their address as about:srcdoc, which breaks games that build URLs
// from document.URL (Unity does). Point it at the game's real folder instead.
const realUrlScript = `<script>for (const key of ['URL', 'documentURI']) Object.defineProperty(document, key, { get: () => document.baseURI });</script>`;

// Fetches the game's page and adds a <base> so its relative links still work from inside the
// player. jsDelivr serves HTML as plain text, so its games always go through here.
async function htmlDocument(item: CatalogItem) {
	const src = new URL(item.src, location.href).href;
	const res = await fetch(src);
	if (!res.ok) throw new Error(`Couldn't load the game (${res.status})`);
	const html = await res.text();
	const head = `<base href="${new URL('.', src).href}">${realUrlScript}${item.parts ? joinPartsScript(absoluteParts(item)) : ''}`;
	return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + head) : head + html;
}

export type FrameSource = { src: string } | { srcdoc: string };

export async function frameSource(item: CatalogItem): Promise<FrameSource> {
	if (item.type === 'flash') return { srcdoc: ruffleDocument(item) };
	const fromJsDelivr = new URL(item.src, location.href).hostname === 'cdn.jsdelivr.net';
	if (item.type === 'html' || item.parts || fromJsDelivr) return { srcdoc: await htmlDocument(item) };
	// absolute, so it still works inside an about:blank tab
	return { src: new URL(item.src, location.href).href };
}
