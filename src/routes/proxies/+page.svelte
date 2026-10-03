<script lang="ts">
	import { ArrowRight, Globe, Link2Off, Plus, Rocket, Trash2, User } from '@lucide/svelte';
	import { proxies as builtIn, proxyLaunchUrl, type Proxy } from '#lib/data/proxies.ts';
	import { settings } from '#lib/settings.svelte.ts';

	const all = $derived<(Proxy & { custom?: boolean })[]>([
		...builtIn,
		...settings.proxies.map((p) => ({ ...p, tag: 'Yours', custom: true }))
	]);
	const usable = $derived(all.filter((p) => p.url));

	let selectedId = $state('');
	const selected = $derived(usable.find((p) => p.id === selectedId) ?? usable[0]);
	let target = $state('');

	function launch(e: SubmitEvent) {
		e.preventDefault();
		if (!selected) return;
		window.open(proxyLaunchUrl(selected.url, target), '_blank', 'noopener');
	}

	let name = $state('');
	let url = $state('');
	let formError = $state('');

	function addProxy(e: SubmitEvent) {
		e.preventDefault();
		const u = url.trim();
		if (!name.trim() || !u) {
			formError = 'Give it a name and a URL.';
			return;
		}
		if (!/^https?:\/\//i.test(u)) {
			formError = 'The URL should start with https://';
			return;
		}
		settings.proxies.push({ id: `custom-${Date.now().toString(36)}`, name: name.trim(), url: u });
		name = url = formError = '';
	}

	function remove(id: string) {
		settings.proxies = settings.proxies.filter((p) => p.id !== id);
	}

	const host = (u: string) => {
		try {
			return new URL(u.replace('%s', '')).host;
		} catch {
			return u;
		}
	};
</script>

<section class="mx-auto max-w-7xl px-4 pt-28 pb-10 sm:px-6">
	<div data-interactive>
		<h1 class="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">Proxies</h1>
		<p class="mt-2 max-w-xl text-muted">
			Pick a proxy, enter a URL or search, and hit Launch.
		</p>
	</div>

	<form onsubmit={launch} class="glass mt-8 flex flex-col gap-2 rounded-2xl p-2 sm:flex-row">
		<select
			bind:value={selectedId}
			disabled={!usable.length}
			class="h-12 rounded-xl border border-line bg-black/40 px-3 text-sm text-fg outline-none focus:border-accent/60 disabled:opacity-50 sm:w-56"
			aria-label="Proxy"
		>
			{#each usable as p (p.id)}
				<option value={p.id}>{p.name}</option>
			{:else}
				<option value="">No proxies set up</option>
			{/each}
		</select>
		<input
			bind:value={target}
			disabled={!usable.length}
			placeholder={usable.length ? 'Enter a URL or search…' : 'Add a proxy URL below to start'}
			class="h-12 min-w-0 flex-1 rounded-xl bg-transparent px-3 text-base text-fg outline-none placeholder:text-subtle disabled:opacity-50"
		/>
		<button type="submit" class="btn-accent h-12! px-5!" disabled={!usable.length}>
			Launch <ArrowRight class="size-4" />
		</button>
	</form>

	<div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each all as p (p.id)}
			<div data-interactive class="glass flex flex-col rounded-2xl p-5">
				<div class="flex items-start justify-between gap-3">
					<div class="flex items-center gap-3">
						<span class="grid size-10 place-items-center rounded-xl border border-line bg-white/4 {p.url ? 'text-accent' : 'text-subtle'}">
							{#if p.custom}<User class="size-4.5" />{:else}<Globe class="size-4.5" />{/if}
						</span>
						<div>
							<p class="font-medium text-fg">{p.name}</p>
							<p class="text-xs text-subtle">{p.url ? host(p.url) : 'No URL set'}</p>
						</div>
					</div>
					{#if p.tag}
						<span class="rounded-md border border-line px-1.5 py-0.5 text-[10px] tracking-wide text-subtle uppercase">{p.tag}</span>
					{/if}
				</div>
				{#if p.description}<p class="mt-4 text-sm text-muted">{p.description}</p>{/if}
				<div class="mt-auto flex gap-2 pt-5">
					{#if p.url}
						<a href={proxyLaunchUrl(p.url, '')} target="_blank" rel="noreferrer" class="btn flex-1">
							<Rocket class="size-4" /> Open
						</a>
					{:else}
						<span class="btn flex-1 opacity-45"><Link2Off class="size-4" /> Not configured</span>
					{/if}
					{#if p.custom}
						<button type="button" class="btn px-3! hover:text-rose-300" onclick={() => remove(p.id)} aria-label="Remove {p.name}">
							<Trash2 class="size-4" />
						</button>
					{/if}
				</div>
			</div>
		{/each}

		<form onsubmit={addProxy} class="flex flex-col gap-2.5 rounded-2xl border border-dashed border-line-strong bg-white/2 p-5 backdrop-blur-md">
			<p class="flex items-center gap-2 font-medium text-fg"><Plus class="size-4 text-accent" /> Add your own</p>
			<p class="text-xs text-subtle">
				Saved in this browser. Use <code class="font-mono text-muted">%s</code> where the site URL goes, like
				<code class="font-mono text-muted">https://proxy.example/go?url=%s</code>
			</p>
			<input class="field" placeholder="Name" bind:value={name} />
			<input class="field" placeholder="https://…" bind:value={url} />
			{#if formError}<p class="text-xs text-rose-300">{formError}</p>{/if}
			<button type="submit" class="btn-accent mt-1">Save proxy</button>
		</form>
	</div>
</section>
