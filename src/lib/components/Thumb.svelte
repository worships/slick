<script lang="ts">
	import { Gamepad2 } from '@lucide/svelte';
	import { categoryIcons, type CatalogItem } from '#lib/catalog.svelte.ts';

	let { item, compact = false, class: cls = '' }: { item: CatalogItem; compact?: boolean; class?: string } =
		$props();

	let broken = $state(false);
	const Icon = $derived(categoryIcons[item.category ?? ''] ?? Gamepad2);
</script>

<div class="relative overflow-hidden bg-[color-mix(in_oklab,var(--accent)_10%,#0c0c13)] {cls}">
	{#if item.thumb && !broken}
		<img
			src={item.thumb}
			alt=""
			class="absolute inset-0 size-full object-cover"
			loading="lazy"
			decoding="async"
			onerror={() => (broken = true)}
		/>
	{:else}
		<div class="absolute inset-0 grid place-items-center">
			<Icon class="{compact ? 'size-5' : 'size-10'} text-accent/80" strokeWidth={1.6} />
		</div>
	{/if}
</div>
