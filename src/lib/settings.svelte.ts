import { backgrounds, defaultBgOptions, type BackgroundId } from '#lib/backgrounds/index.ts';

export const STORAGE_KEY = 'slick:settings';

export type OptionValue = number | boolean | string;

export type CustomProxy = { id: string; name: string; url: string };

export type Settings = {
	background: BackgroundId;
	bgOptions: Record<BackgroundId, Record<string, OptionValue>>;
	dim: number;
	accent: string;
	cloak: {
		enabled: boolean;
		preset: string;
		title: string;
		icon: string;
		mode: 'always' | 'hidden';
	};
	panic: { enabled: boolean; key: string; url: string };
	favorites: string[];
	proxies: CustomProxy[];
};

export const accents = [
	{ name: 'Indigo', value: '#818cf8' },
	{ name: 'Violet', value: '#a78bfa' },
	{ name: 'Sky', value: '#38bdf8' },
	{ name: 'Teal', value: '#2dd4bf' },
	{ name: 'Emerald', value: '#34d399' },
	{ name: 'Amber', value: '#fbbf24' },
	{ name: 'Rose', value: '#fb7185' },
	{ name: 'Fuchsia', value: '#e879f9' }
];

function defaults(): Settings {
	return {
		background: 'rain',
		bgOptions: defaultBgOptions(),
		dim: backgrounds.find((b) => b.id === 'rain')!.dim,
		accent: accents[0].value,
		cloak: {
			enabled: false,
			preset: 'classroom',
			title: 'Home',
			icon: 'https://ssl.gstatic.com/classroom/favicon.png',
			mode: 'always'
		},
		panic: { enabled: false, key: '`', url: 'https://classroom.google.com' },
		favorites: [],
		proxies: []
	};
}

// keeps new settings keys working for people with older saved data
function merge<T>(base: T, saved: unknown): T {
	if (saved === null || typeof saved !== 'object' || Array.isArray(saved)) {
		return (saved ?? base) as T;
	}
	if (base === null || typeof base !== 'object' || Array.isArray(base)) return saved as T;
	const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
	for (const [k, v] of Object.entries(saved)) {
		out[k] = k in out ? merge(out[k], v) : v;
	}
	return out as T;
}

export const settings = $state<Settings>(defaults());

let loaded = $state(false);

export const store = {
	get loaded() {
		return loaded;
	},
	load() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) Object.assign(settings, merge(defaults(), JSON.parse(raw)));
		} catch {
			// bad or blocked storage, keep defaults
		}
		loaded = true;
	},
	save() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
		} catch {
			// storage disabled
		}
	},
	reset() {
		Object.assign(settings, defaults());
	},
	setBackground(id: BackgroundId) {
		settings.background = id;
		settings.dim = backgrounds.find((b) => b.id === id)?.dim ?? 0;
	},
	resetBackgroundOptions(id: BackgroundId) {
		settings.bgOptions[id] = defaultBgOptions()[id];
	},
	toggleFavorite(id: string) {
		const i = settings.favorites.indexOf(id);
		if (i === -1) settings.favorites.push(id);
		else settings.favorites.splice(i, 1);
	}
};
