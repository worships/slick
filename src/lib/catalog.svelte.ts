import type { Component } from 'svelte';
import {
	BookOpen,
	Box,
	Brain,
	Calculator,
	Car,
	Code,
	Compass,
	Crosshair,
	Factory,
	Footprints,
	Gamepad2,
	Ghost,
	Joystick,
	Music,
	Palette,
	Puzzle,
	Swords,
	Trophy,
	Users,
	Wrench
} from '@lucide/svelte';
import { site } from '#lib/data/site.ts';

export type CatalogItem = {
	id: string;
	name: string;
	category?: string;
	type: 'url' | 'html' | 'flash';
	src: string;
	thumb?: string;
	featured?: boolean;
	// split files and how many pieces each has, relative to src's folder
	parts?: Record<string, number>;
	kind: 'game' | 'app';
};

export const perPage = 20;

export const categoryIcons: Record<string, Component> = {
	Action: Swords,
	Code: Code,
	Create: Palette,
	Music: Music,
	Study: BookOpen,
	Tools: Wrench,
	Adventure: Compass,
	Arcade: Joystick,
	Horror: Ghost,
	Math: Calculator,
	Multiplayer: Users,
	Platformer: Footprints,
	Puzzle: Puzzle,
	Racing: Car,
	Sandbox: Box,
	Shooter: Crosshair,
	Simulation: Factory,
	Sports: Trophy,
	Strategy: Brain,
	Other: Gamepad2
};

export const catalog = $state({
	games: [] as CatalogItem[],
	apps: [] as CatalogItem[],
	status: 'idle' as 'idle' | 'loading' | 'ready' | 'error'
});

export async function loadCatalog() {
	if (catalog.status === 'loading' || catalog.status === 'ready') return;
	catalog.status = 'loading';
	try {
		const res = await fetch(site.catalogUrl || '/catalog.json');
		if (!res.ok) throw new Error(`${res.status}`);
		const data = await res.json();
		// files stored in the catalog repo are served from /catalog/ here, or from wherever catalogUrl points
		const base = site.catalogUrl ? new URL('.', site.catalogUrl) : new URL('/catalog/', location.origin);
		const resolve = (path?: string) => (path && !/^(https?:|\/)/i.test(path) ? new URL(path, base).href : path);
		const load = (kind: CatalogItem['kind']) => (item: CatalogItem) => ({
			...item,
			src: resolve(item.src)!,
			thumb: resolve(item.thumb),
			kind
		});
		catalog.games = (data.games ?? []).map(load('game'));
		catalog.apps = (data.apps ?? []).map(load('app'));
		catalog.status = 'ready';
	} catch (e) {
		console.error('Could not load the catalog', e);
		catalog.status = 'error';
	}
}

export function findItem(id: string) {
	return catalog.games.find((g) => g.id === id) ?? catalog.apps.find((a) => a.id === id);
}
