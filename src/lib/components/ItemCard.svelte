<script lang="ts">
	import { Star } from '@lucide/svelte';
	import type { CatalogItem } from '#lib/catalog.svelte.ts';
	import { settings, store } from '#lib/settings.svelte.ts';
	import Thumb from './Thumb.svelte';

	let { item }: { item: CatalogItem } = $props();

	const fav = $derived(settings.favorites.includes(item.id));
</script>

<div
	class="group relative overflow-hidden rounded-2xl border border-line bg-[rgb(10_10_16/0.55)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-accent/50"
>
	<Thumb {item} class="aspect-4/3 transition duration-500 group-hover:scale-[1.04]" />
	<div class="flex items-center gap-2 px-3.5 py-3">
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-medium text-fg" title={item.name}>{item.name}</p>
			<p class="truncate text-xs text-subtle">{item.category ?? 'Other'}</p>
		</div>
		{#if item.type === 'flash'}
			<span class="rounded-md border border-line px-1.5 py-0.5 text-[10px] tracking-wide text-subtle uppercase">
				Flash
			</span>
		{/if}
	</div>

	<a href="/play/?id={item.id}" class="focus-ring absolute inset-0 z-10 rounded-2xl" aria-label="Play {item.name}"></a>

	<button
		type="button"
		onclick={() => store.toggleFavorite(item.id)}
		class="focus-ring absolute top-2.5 right-2.5 z-20 grid size-8 place-items-center rounded-lg border border-white/10 bg-black/50 backdrop-blur-md transition
			{fav ? 'text-amber-300 opacity-100' : 'text-white/70 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-white'}"
		aria-label={fav ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
		aria-pressed={fav}
	>
		<Star class="size-4" fill={fav ? 'currentColor' : 'none'} />
	</button>
</div>
