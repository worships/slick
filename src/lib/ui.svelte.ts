import type { CatalogItem } from '#lib/catalog.svelte.ts';

export const ui = $state({
	panelOpen: false,
	capturingKey: false, // true while picking a panic key
	current: null as CatalogItem | null // what's open in the player
});
