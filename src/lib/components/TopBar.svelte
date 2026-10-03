<script lang="ts">
	import { page } from '$app/state';
	import { Gamepad2, Globe, House, LayoutGrid } from '@lucide/svelte';
	import { ui } from '#lib/ui.svelte.ts';
	import Logo from './Logo.svelte';

	const links = [
		{ href: '/', label: 'Home', icon: House },
		{ href: '/games/', label: 'Games', icon: Gamepad2 },
		{ href: '/apps/', label: 'Apps', icon: LayoutGrid },
		{ href: '/proxies/', label: 'Proxies', icon: Globe }
	];

	let scrollY = $state(0);
	const scrolled = $derived(scrollY > 8);

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		if (path.startsWith('/play/')) return href === (ui.current?.kind === 'app' ? '/apps/' : '/games/');
		return path.startsWith(href);
	}
</script>

<svelte:window bind:scrollY />

<header
	class="fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300
		{scrolled ? 'border-line bg-bg/35 backdrop-blur-xl' : 'border-transparent bg-transparent'}"
>
	<nav class="mx-auto flex h-16 max-w-7xl items-center gap-1 px-4 sm:px-6">
		<a href="/" class="focus-ring mr-auto rounded-xl" aria-label="Home">
			<Logo />
		</a>

		{#each links as link (link.href)}
			{@const active = isActive(link.href)}
			<a
				href={link.href}
				class="focus-ring flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors
					{active ? 'bg-white/8 text-fg' : 'text-muted hover:bg-white/5 hover:text-fg'}"
				aria-current={active ? 'page' : undefined}
			>
				<link.icon class="size-4 {active ? 'text-accent' : ''}" />
				<span class="hidden sm:inline">{link.label}</span>
			</a>
		{/each}
	</nav>
</header>
