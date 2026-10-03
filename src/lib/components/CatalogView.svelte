<script lang="ts">
	import { onMount, tick, type Component } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { ChevronLeft, ChevronRight, Search, SearchX, Star } from '@lucide/svelte';
	import { catalog, PER_PAGE, type CatalogItem } from '#lib/catalog.svelte.ts';
	import { settings } from '#lib/settings.svelte.ts';
	import ItemCard from './ItemCard.svelte';
	import SkeletonGrid from './SkeletonGrid.svelte';

	type Props = {
		items: CatalogItem[];
		title: string;
		description: string;
		icon: Component;
		noun: string;
	};

	let { items, title, description, icon: Icon, noun }: Props = $props();

	let q = $state('');
	let category = $state('All');
	let page = $state(1);
	let input: HTMLInputElement;
	let gridTop: HTMLElement;

	const hasFlash = $derived(items.some((i) => i.type === 'flash'));
	const categories = $derived([
		'All',
		'Favorites',
		...(hasFlash ? ['Flash'] : []),
		...[...new Set(items.map((i) => i.category ?? 'Other'))].sort((a, b) =>
			a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)
		)
	]);

	const filtered = $derived.by(() => {
		const needle = q.trim().toLowerCase();
		return items.filter((i) => {
			if (category === 'Favorites' && !settings.favorites.includes(i.id)) return false;
			if (category === 'Flash' && i.type !== 'flash') return false;
			if (!['All', 'Favorites', 'Flash'].includes(category) && (i.category ?? 'Other') !== category) return false;
			return !needle || i.name.toLowerCase().includes(needle);
		});
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
	const current = $derived(Math.min(page, totalPages));
	const pageItems = $derived(filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE));

	// 1 … 4 5 6 … 39
	const pageList = $derived.by(() => {
		const pages = new Set([1, totalPages, current - 1, current, current + 1]);
		const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
		const out: (number | '…')[] = [];
		sorted.forEach((p, i) => {
			if (i && p - sorted[i - 1] > 1) out.push('…');
			out.push(p);
		});
		return out;
	});

	onMount(() => {
		const params = new URLSearchParams(location.search);
		q = params.get('q') ?? '';
		page = Math.max(1, Number(params.get('page')) || 1);
	});

	function syncUrl() {
		const url = new URL(location.href);
		if (page > 1) url.searchParams.set('page', String(page));
		else url.searchParams.delete('page');
		replaceState(url, {});
	}

	async function goTo(p: number) {
		page = Math.min(Math.max(1, p), totalPages);
		syncUrl();
		await tick();
		gridTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function resetPage() {
		if (page !== 1) {
			page = 1;
			syncUrl();
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
			e.preventDefault();
			input.focus();
		}
	}
</script>

<svelte:window {onkeydown} />

<section class="mx-auto max-w-7xl px-4 pt-28 pb-10 sm:px-6">
	<div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
		<div data-interactive>
			<div class="mb-4 grid size-11 place-items-center rounded-2xl border border-accent/30 bg-accent/12 text-accent">
				<Icon class="size-5" />
			</div>
			<h1 class="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">{title}</h1>
			<p class="mt-2 max-w-xl text-muted">{description}</p>
		</div>

		<label class="glass relative flex h-11 w-full items-center rounded-xl md:w-80">
			<Search class="pointer-events-none absolute left-3.5 size-4 text-subtle" />
			<input
				bind:this={input}
				bind:value={q}
				oninput={resetPage}
				type="search"
				placeholder="Search {noun}..."
				class="h-full w-full bg-transparent pr-10 pl-10 text-sm text-fg outline-none placeholder:text-subtle"
			/>
			<kbd class="pointer-events-none absolute right-3 rounded border border-line-strong px-1.5 font-mono text-[10px] text-subtle">/</kbd>
		</label>
	</div>

	<div class="mt-8 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
		{#each categories as c (c)}
			<button
				type="button"
				onclick={() => {
					category = c;
					resetPage();
				}}
				class="focus-ring flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm backdrop-blur-md transition
					{category === c
					? 'border-accent/60 bg-accent/15 text-fg'
					: 'border-line bg-white/3 text-muted hover:border-line-strong hover:text-fg'}"
			>
				{#if c === 'Favorites'}<Star class="size-3.5 {category === c ? 'text-amber-300' : ''}" />{/if}
				{c}
			</button>
		{/each}
	</div>

	<p bind:this={gridTop} class="mt-6 mb-4 scroll-mt-24 text-xs text-subtle">
		{#if catalog.status === 'ready'}
			{filtered.length}
			{filtered.length === 1 ? noun.replace(/s$/, '') : noun}{#if totalPages > 1}, page {current} of {totalPages}{/if}
		{:else}
			&nbsp;
		{/if}
	</p>

	{#if catalog.status === 'error'}
		<div data-interactive class="glass flex flex-col items-center rounded-2xl px-6 py-16 text-center">
			<SearchX class="size-8 text-subtle" />
			<p class="mt-3 font-medium text-fg">Couldn't load the {noun}</p>
			<p class="mt-1 text-sm text-muted">Check your connection and refresh.</p>
		</div>
	{:else if catalog.status !== 'ready'}
		<SkeletonGrid count={PER_PAGE} class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" />
	{:else if pageItems.length}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each pageItems as item (item.id)}
				<ItemCard {item} />
			{/each}
		</div>

		{#if totalPages > 1}
			<nav class="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pages">
				<button type="button" class="btn px-3!" disabled={current === 1} onclick={() => goTo(current - 1)} aria-label="Previous page">
					<ChevronLeft class="size-4" />
				</button>
				{#each pageList as p, i (i)}
					{#if p === '…'}
						<span class="px-1 text-subtle">…</span>
					{:else}
						<button
							type="button"
							onclick={() => goTo(p)}
							aria-current={current === p ? 'page' : undefined}
							class="focus-ring h-10 min-w-10 rounded-xl border px-2 text-sm tabular-nums transition
								{current === p ? 'border-accent/60 bg-accent/15 text-fg' : 'border-line bg-white/3 text-muted hover:text-fg'}"
						>
							{p}
						</button>
					{/if}
				{/each}
				<button type="button" class="btn px-3!" disabled={current === totalPages} onclick={() => goTo(current + 1)} aria-label="Next page">
					<ChevronRight class="size-4" />
				</button>
			</nav>
		{/if}
	{:else}
		<div data-interactive class="glass flex flex-col items-center rounded-2xl px-6 py-16 text-center">
			{#if !items.length}
				<Icon class="size-8 text-subtle" />
				<p class="mt-3 font-medium text-fg">Nothing here yet</p>
			{:else if category === 'Favorites' && !q}
				<Star class="size-8 text-subtle" />
				<p class="mt-3 font-medium text-fg">No favorites yet</p>
				<p class="mt-1 text-sm text-muted">Star something and it'll show up here.</p>
			{:else}
				<SearchX class="size-8 text-subtle" />
				<p class="mt-3 font-medium text-fg">No results{q ? ` for "${q}"` : ''}</p>
			{/if}
		</div>
	{/if}
</section>
