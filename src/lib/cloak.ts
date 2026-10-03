import { settings } from '#lib/settings.svelte.ts';
import type { FrameSource } from '#lib/player.ts';

// The address bar and history only ever show about:blank.
export function openInAboutBlank(source: FrameSource = { src: location.origin + '/' }) {
	const win = window.open('about:blank', '_blank');
	if (!win) {
		alert('Your browser blocked the pop-up. Allow pop-ups for this site and try again.');
		return false;
	}
	const doc = win.document;
	doc.title = settings.cloak.enabled ? settings.cloak.title : 'New Tab';
	if (settings.cloak.enabled && settings.cloak.icon) {
		const link = doc.createElement('link');
		link.rel = 'icon';
		link.href = settings.cloak.icon;
		doc.head.appendChild(link);
	}
	Object.assign(doc.body.style, { margin: '0', height: '100vh', overflow: 'hidden', background: '#000' });
	const frame = doc.createElement('iframe');
	if ('src' in source) frame.src = source.src;
	else frame.srcdoc = source.srcdoc;
	frame.allow = 'fullscreen; autoplay; clipboard-write; gamepad; pointer-lock';
	Object.assign(frame.style, { border: '0', width: '100%', height: '100%' });
	doc.body.appendChild(frame);
	return true;
}
