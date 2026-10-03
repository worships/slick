import type { CatalogItem } from '#lib/catalog.svelte.ts';

const RUFFLE = 'https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle@0.6.0/ruffle.js';

// Keeps a URL from closing the <script> it's embedded in.
const jsString = (s: string) => JSON.stringify(s).replace(/</g, '\\u003c');

function ruffleDocument(swf: string) {
	return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}ruffle-player{width:100%;height:100%;display:block}</style>
<script src="${RUFFLE}"></script>
</head>
<body>
<script>
window.RufflePlayer = window.RufflePlayer || {};
window.RufflePlayer.config = { autoplay: "on", unmuteOverlay: "hidden", splashScreen: false, letterbox: "on" };
const player = window.RufflePlayer.newest().createPlayer();
document.body.appendChild(player);
player.ruffle().load(${jsString(swf)});
</script>
</body>
</html>`;
}

// jsDelivr serves HTML as text/plain, so fetch the page and point its relative URLs back at the CDN.
async function htmlDocument(src: string) {
	const res = await fetch(src);
	if (!res.ok) throw new Error(`Couldn't load the game (${res.status})`);
	const html = await res.text();
	const base = `<base href="${new URL('.', src).href}">`;
	return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + base) : base + html;
}

export type FrameSource = { src: string } | { srcdoc: string };

export async function frameSource(item: CatalogItem): Promise<FrameSource> {
	if (item.type === 'flash') return { srcdoc: ruffleDocument(item.src) };
	if (item.type === 'html') return { srcdoc: await htmlDocument(item.src) };
	// absolute, so it still works inside an about:blank tab
	return { src: new URL(item.src, location.href).href };
}
