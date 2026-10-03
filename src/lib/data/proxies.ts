export type Proxy = {
	id: string;
	name: string;
	url: string; // %s gets replaced with the URL typed into the launcher
	description?: string;
	tag?: string;
};

export const proxies: Proxy[] = [
	{ id: 'proxy-1', name: 'Proxy Slot 1', url: '', tag: 'Placeholder', description: 'Add a proxy URL in src/lib/data/proxies.ts.' },
	{ id: 'proxy-2', name: 'Proxy Slot 2', url: '', tag: 'Placeholder', description: 'Add a proxy URL in src/lib/data/proxies.ts.' },
	{ id: 'proxy-3', name: 'Proxy Slot 3', url: '', tag: 'Placeholder', description: 'Add a proxy URL in src/lib/data/proxies.ts.' }
];

export function proxyLaunchUrl(proxyUrl: string, target: string) {
	if (!proxyUrl) return '';
	let t = target.trim();
	if (t && !/^https?:\/\//i.test(t)) {
		t = /^[^\s]+\.[^\s]+$/.test(t) ? `https://${t}` : `https://www.google.com/search?q=${encodeURIComponent(t)}`;
	}
	return proxyUrl.includes('%s') ? proxyUrl.replace('%s', encodeURIComponent(t)) : proxyUrl;
}
