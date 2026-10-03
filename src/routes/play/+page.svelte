<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { AppWindow, ArrowLeft, LoaderCircle, Maximize, RotateCw, SearchX, Star } from '@lucide/svelte';
	import { catalog, findItem } from '#lib/catalog.svelte.ts';
	import { frameSource, type FrameSource } from '#lib/player.ts';
	import { settings, store } from '#lib/settings.svelte.ts';
	import { openInAboutBlank } from '#lib/cloak.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import ItemCard from '#lib/components/ItemCard.svelte';
	import Thumb from '#lib/components/Thumb.svelte';

	// searchParams can't be read during prerender
	let mounted = $state(false);
	onMount(() => (mounted = true));

	const id = $derived(mounted ? page.url.searchParams.get('id') : null);
	const item = $derived(id && catalog.status === 'ready' ? findItem(id) : undefined);
	const missing = $derived(mounted && catalog.status === 'ready' && !item);

	const list = $derived(item?.kind === 'app' ? catalog.apps : catalog.games);
	const back = $derived(item?.kind === 'app' ? '/apps/' : '/games/');
	const more = $derived(
		item ? list.filter((i) => i.id !== item.id && i.category === item.category).slice(0, 5) : []
	);
	const fav = $derived(item ? settings.favorites.includes(item.id) : false);

	let source = $state<FrameSource | null>(null);
	let error = $state('');
	let reloadKey = $state(0);
	let attempt = $state(0);
	let frameWrap = $state<HTMLDivElement>();

	$effect(() => {
		ui.current = item ?? null;
		return () => (ui.current = null);
	});

	$effect(() => {
		if (!item) return;
		void attempt;
		const target = item;
		let cancelled = false;
		source = null;
		error = '';
		frameSource(target)
			.then((s) => !cancelled && (source = s))
			.catch((e) => !cancelled && (error = e.message));
		return () => (cancelled = true);
	});
</script>

<section class="mx-auto max-w-7xl px-4 pt-24 pb-10 sm:px-6">
	{#if missing}
		<div data-interactive class="glass mt-10 flex flex-col items-center rounded-2xl px-6 py-20 text-center">
			<SearchX class="size-8 text-subtle" />
			<p class="mt-3 font-display text-lg font-semibold text-fg">Game not found</p>
			<p class="mt-1 text-sm text-muted">It may have been removed from the catalog.</p>
			<a href="/games/" class="btn mt-5">Browse games</a>
		</div>
	{:else}
		<div class="glass flex flex-wrap items-center gap-3 rounded-2xl p-2.5 pr-3">
			<a href={back} class="focus-ring grid size-10 place-items-center rounded-xl text-muted hover:bg-white/6 hover:text-fg" aria-label="Back">
				<ArrowLeft class="size-4.5" />
			</a>
			{#if item}
				<Thumb {item} compact class="size-10 shrink-0 rounded-xl" />
				<div class="min-w-0 flex-1" data-interactive>
					<h1 class="truncate font-display text-base font-semibold text-fg">{item.name}</h1>
					<p class="truncate text-xs text-subtle">
						{item.category ?? 'Other'}{item.type === 'flash' ? ' · Flash' : ''}
					</p>
				</div>
			{:else}
				<div class="size-10 shrink-0 animate-pulse rounded-xl bg-white/6"></div>
				<div class="h-4 w-40 flex-1 animate-pulse rounded bg-white/6"></div>
			{/if}

			<div class="flex items-center gap-1">
				<button
					type="button"
					class="tool {fav ? 'text-amber-300' : ''}"
					disabled={!item}
					onclick={() => item && store.toggleFavorite(item.id)}
					aria-pressed={fav}
					aria-label={fav ? 'Unfavorite' : 'Favorite'}
					title={fav ? 'Unfavorite' : 'Favorite'}
				>
					<Star class="size-4" fill={fav ? 'currentColor' : 'none'} />
				</button>
				<button type="button" class="tool" disabled={!source} onclick={() => reloadKey++} aria-label="Reload" title="Reload">
					<RotateCw class="size-4" />
				</button>
				<button
					type="button"
					class="tool"
					disabled={!source}
					onclick={() => frameWrap?.requestFullscreen()}
					aria-label="Fullscreen"
					title="Fullscreen"
				>
					<Maximize class="size-4" />
				</button>
				<button
					type="button"
					class="tool"
					disabled={!source}
					onclick={() => source && openInAboutBlank(source)}
					aria-label="Open in about:blank"
					title="Open in about:blank"
				>
					<AppWindow class="size-4" />
				</button>
			</div>
		</div>

		<div
			bind:this={frameWrap}
			class="mt-4 h-[calc(100dvh-12rem)] min-h-[420px] overflow-hidden rounded-2xl border border-line bg-black shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]"
		>
			{#if error}
				<div data-interactive class="flex size-full flex-col items-center justify-center gap-2 p-6 text-center">
					<p class="font-display text-lg font-semibold text-fg">This game didn't load</p>
					<p class="max-w-sm text-sm text-muted">{error}</p>
					<button type="button" class="btn mt-3" onclick={() => attempt++}>Try again</button>
				</div>
			{:else if source}
				{#key reloadKey}
					{#if 'src' in source}
						<iframe
							src={source.src}
							title={item?.name}
							class="size-full border-0"
							allow="fullscreen; autoplay; gamepad; clipboard-write; pointer-lock"
							allowfullscreen
						></iframe>
					{:else}
						<iframe
							srcdoc={source.srcdoc}
							title={item?.name}
							class="size-full border-0"
							allow="fullscreen; autoplay; gamepad; clipboard-write; pointer-lock"
							allowfullscreen
						></iframe>
					{/if}
				{/key}
			{:else}
				<div class="grid size-full place-items-center">
					<LoaderCircle class="size-7 animate-spin text-subtle" />
				</div>
			{/if}
		</div>

		{#if more.length}
			<h2 data-interactive class="mt-12 mb-5 font-display text-xl font-semibold tracking-tight text-fg">
				More {item?.category?.toLowerCase() === 'other' ? 'games' : `${item?.category} games`}
			</h2>
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				{#each more as m (m.id)}
					<ItemCard item={m} />
				{/each}
			</div>
		{/if}
	{/if}
</section>

<style>
	.tool {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.65rem;
		color: var(--muted);
		transition:
			background-color 0.15s,
			color 0.15s;
		outline: none;
	}
	.tool:hover {
		background: rgb(255 255 255 / 0.07);
		color: var(--fg);
	}
	.tool:focus-visible {
		box-shadow: 0 0 0 2px var(--accent);
	}
	.tool:disabled {
		opacity: 0.35;
		pointer-events: none;
	}
</style>
