<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Background from '#lib/components/Background.svelte';
	import TopBar from '#lib/components/TopBar.svelte';
	import CustomizePanel from '#lib/components/CustomizePanel.svelte';
	import { settings, store } from '#lib/settings.svelte.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import { site } from '#lib/data/site.ts';
	import { loadCatalog } from '#lib/catalog.svelte.ts';

	let { children } = $props();

	let tabHidden = $state(false);

	onMount(() => {
		store.load();
		loadCatalog();
		const onVisibility = () => (tabHidden = document.hidden);
		document.addEventListener('visibilitychange', onVisibility);
		return () => document.removeEventListener('visibilitychange', onVisibility);
	});

	$effect(() => {
		if (store.loaded) store.save();
	});

	$effect(() => {
		document.documentElement.style.setProperty('--accent', settings.accent);
	});

	const cloaked = $derived(
		store.loaded && settings.cloak.enabled && (settings.cloak.mode === 'always' || tabHidden)
	);
	const pageTitle = $derived(ui.current?.name ?? page.data.title);
	const title = $derived(
		cloaked ? settings.cloak.title || '\u200e' : pageTitle ? `${pageTitle} · ${site.name}` : site.name
	);
	$effect(() => {
		const link = document.getElementById('favicon') as HTMLLinkElement | null;
		if (link) link.href = cloaked && settings.cloak.icon ? settings.cloak.icon : '/favicon.svg';
	});

	function onkeydown(e: KeyboardEvent) {
		if (!settings.panic.enabled || ui.capturingKey || e.key !== settings.panic.key) return;
		const el = e.target as HTMLElement | null;
		if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
		e.preventDefault();
		window.location.replace(settings.panic.url || 'https://www.google.com');
	}

	// shh
	function boom() {
		while (true) location.reload();
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<svelte:window {onkeydown} />

<Background />
<TopBar />

<div class="passthrough relative z-10 flex min-h-dvh flex-col">
	<main class="flex-1">
		{@render children()}
	</main>
	<footer class="mx-auto w-full max-w-7xl px-4 py-8 text-xs text-subtle sm:px-6">
		© {site.name}<button
			type="button"
			onclick={boom}
			aria-hidden="true"
			tabindex="-1"
			class="ml-0.5 cursor-default opacity-40 select-none hover:opacity-40"
		>.</button>
	</footer>
</div>

<CustomizePanel />
