<script lang="ts">
	import { fade } from 'svelte/transition';
	import { backgrounds } from '#lib/backgrounds/index.ts';
	import { settings, store } from '#lib/settings.svelte.ts';

	const def = $derived(backgrounds.find((b) => b.id === settings.background) ?? backgrounds[0]);
	const opts = $derived(settings.bgOptions[def.id] ?? {});
</script>

<div class="fixed inset-0 z-0 isolate overflow-hidden bg-bg" aria-hidden="true">
	{#if store.loaded && def.component}
		{#key def.id}
			<div class="absolute inset-0" in:fade={{ duration: 600 }}>
				<def.component {...opts} accent={settings.accent} />
			</div>
		{/key}
	{/if}

	<div
		class="pointer-events-none absolute inset-0 bg-black transition-opacity duration-500"
		style="opacity: {settings.dim}"
	></div>
</div>
