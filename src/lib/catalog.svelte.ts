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
	source?: string;
	kind: 'game' | 'app';
};

export const PER_PAGE = 20;

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
		catalog.games = (data.games ?? []).map((g: CatalogItem) => ({ ...g, kind: 'game' }));
		catalog.apps = (data.apps ?? []).map((a: CatalogItem) => ({ ...a, kind: 'app' }));
		catalog.status = 'ready';
	} catch (e) {
		console.error('Could not load the catalog', e);
		catalog.status = 'error';
	}
}

export function findItem(id: string) {
	return catalog.games.find((g) => g.id === id) ?? catalog.apps.find((a) => a.id === id);
}
