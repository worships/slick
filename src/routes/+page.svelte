<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowRight, Search } from '@lucide/svelte';
	import { catalog, PER_PAGE } from '#lib/catalog.svelte.ts';
	import { site } from '#lib/data/site.ts';
	import ItemCard from '#lib/components/ItemCard.svelte';
	import SkeletonGrid from '#lib/components/SkeletonGrid.svelte';

	let q = $state('');
	let input: HTMLInputElement;

	const ready = $derived(catalog.status === 'ready');
	const featured = $derived(catalog.games.filter((g) => g.featured).slice(0, 6));
	const firstPage = $derived(catalog.games.slice(0, PER_PAGE));
	const hasMore = $derived(catalog.games.length > PER_PAGE);

	function search(e: SubmitEvent) {
		e.preventDefault();
		goto(q.trim() ? `/games/?q=${encodeURIComponent(q.trim())}` : '/games/');
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
			e.preventDefault();
			input.focus();
		}
	}
</script>

<svelte:window {onkeydown} />

<section class="mx-auto flex min-h-[78dvh] max-w-5xl flex-col items-center justify-center px-4 pt-24 pb-12 text-center sm:px-6">
	<h1 data-interactive class="font-display text-6xl font-bold tracking-tighter text-fg sm:text-8xl">
		{site.name}
	</h1>
	<p data-interactive class="mt-5 max-w-md text-base text-muted sm:text-lg">{site.tagline}</p>

	<form onsubmit={search} class="mt-10 w-full max-w-xl">
		<label
			class="glass group flex h-14 items-center gap-3 rounded-2xl px-4 shadow-[0_20px_60px_-25px_rgb(0_0_0/0.9)] transition focus-within:border-accent/50"
		>
			<Search class="size-5 shrink-0 text-subtle transition group-focus-within:text-accent" />
			<input
				bind:this={input}
				bind:value={q}
				type="search"
				placeholder="Search games..."
				class="h-full min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-subtle"
			/>
			<kbd class="hidden rounded-md border border-line-strong px-2 py-0.5 font-mono text-xs text-subtle sm:block">/</kbd>
			<button type="submit" class="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-[#0b0b12] transition hover:brightness-110" aria-label="Search">
				<ArrowRight class="size-4" />
			</button>
		</label>
	</form>
</section>

{#if !ready || featured.length}
	<section class="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
		<h2 data-interactive class="mb-5 font-display text-2xl font-semibold tracking-tight text-fg">Featured</h2>
		{#if ready}
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
				{#each featured as item (item.id)}
					<ItemCard {item} />
				{/each}
			</div>
		{:else}
			<SkeletonGrid count={6} class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" />
		{/if}
	</section>
{/if}

<section class="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
	<div class="mb-5 flex items-end justify-between">
		<h2 data-interactive class="font-display text-2xl font-semibold tracking-tight text-fg">Games</h2>
		<a href="/games/" class="focus-ring flex items-center gap-1 rounded-md text-sm text-muted hover:text-fg">
			View all <ArrowRight class="size-3.5" />
		</a>
	</div>
	{#if ready}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each firstPage as item (item.id)}
				<ItemCard {item} />
			{/each}
		</div>

		<div class="mt-10 flex flex-col items-center gap-3">
			<p data-interactive class="text-xs text-subtle">Showing {firstPage.length} of {catalog.games.length} games</p>
			{#if hasMore}
				<a href="/games/?page=2" class="btn">Next page <ArrowRight class="size-4" /></a>
			{/if}
		</div>
	{:else if catalog.status === 'error'}
		<p data-interactive class="text-sm text-muted">Couldn't load the games. Check your connection and refresh.</p>
	{:else}
		<SkeletonGrid count={PER_PAGE} class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" />
	{/if}
</section>
