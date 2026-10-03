<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import {
		AppWindow,
		Check,
		Eye,
		EyeOff,
		ImageUp,
		Keyboard,
		MousePointer2,
		Palette,
		RotateCcw,
		Settings2,
		Siren,
		VenetianMask,
		X
	} from '@lucide/svelte';
	import { backgrounds } from '#lib/backgrounds/index.ts';
	import { accents, settings, store } from '#lib/settings.svelte.ts';
	import { cloakPresets } from '#lib/data/cloaks.ts';
	import { openInAboutBlank } from '#lib/cloak.ts';
	import { site } from '#lib/data/site.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import Switch from './Switch.svelte';

	type Tab = 'appearance' | 'cloak' | 'panic';
	const tabs: { id: Tab; label: string; icon: typeof Palette }[] = [
		{ id: 'appearance', label: 'Appearance', icon: Palette },
		{ id: 'cloak', label: 'Tab cloak', icon: VenetianMask },
		{ id: 'panic', label: 'Panic key', icon: Siren }
	];
	let tab = $state<Tab>('appearance');

	const activeBg = $derived(backgrounds.find((b) => b.id === settings.background)!);

	function onkeydown(e: KeyboardEvent) {
		if (ui.capturingKey) {
			e.preventDefault();
			if (e.key !== 'Escape') settings.panic.key = e.key;
			ui.capturingKey = false;
			return;
		}
		if (e.key === 'Escape' && ui.panelOpen) ui.panelOpen = false;
	}

	function pickPreset(id: string) {
		const p = cloakPresets.find((c) => c.id === id);
		if (!p) return;
		settings.cloak.preset = p.id;
		settings.cloak.title = p.title;
		settings.cloak.icon = p.icon;
		settings.cloak.enabled = true;
	}

	let iconError = $state('');
	function uploadIcon(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		if (file.size > 256 * 1024) {
			iconError = 'Pick an image under 256 KB.';
			return;
		}
		iconError = '';
		const reader = new FileReader();
		reader.onload = () => {
			settings.cloak.icon = String(reader.result);
			settings.cloak.preset = 'custom';
		};
		reader.readAsDataURL(file);
	}

	const keyLabel = (k: string) => (k === ' ' ? 'Space' : k.length === 1 ? k.toUpperCase() : k);
	const fmt = (v: number, step: number) => (step < 1 ? v.toFixed(step < 0.1 ? 2 : 1) : String(v));
</script>

<svelte:window {onkeydown} />

<button
	type="button"
	onclick={() => (ui.panelOpen = !ui.panelOpen)}
	class="focus-ring glass fixed right-4 bottom-4 z-50 grid size-12 place-items-center rounded-2xl text-fg shadow-[0_10px_40px_-10px_rgb(0_0_0/0.8)] transition hover:border-accent/50 hover:text-accent sm:right-6 sm:bottom-6"
	aria-label={ui.panelOpen ? 'Close customization' : 'Customize site'}
	aria-expanded={ui.panelOpen}
>
	<Settings2 class="size-5 transition-transform duration-500 {ui.panelOpen ? 'rotate-90' : ''}" />
</button>

{#if ui.panelOpen}
	<button
		type="button"
		class="fixed inset-0 z-40 cursor-default"
		aria-label="Close customization"
		tabindex="-1"
		onclick={() => (ui.panelOpen = false)}
		transition:fade={{ duration: 150 }}
	></button>

	<div
		role="dialog"
		aria-label="Customize"
		class="fixed right-4 bottom-20 left-4 z-50 flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl border border-line-strong bg-panel shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] backdrop-blur-2xl sm:right-6 sm:bottom-22 sm:left-auto sm:w-[400px]"
		transition:fly={{ y: 16, duration: 220 }}
	>
		<div class="flex items-center justify-between px-5 pt-4 pb-3">
			<div>
				<h2 class="font-display text-base font-semibold text-fg">Customize</h2>
				<p class="text-xs text-subtle">Saves automatically</p>
			</div>
			<button
				type="button"
				class="focus-ring grid size-8 place-items-center rounded-lg text-muted hover:bg-white/6 hover:text-fg"
				onclick={() => (ui.panelOpen = false)}
				aria-label="Close"
			>
				<X class="size-4" />
			</button>
		</div>

		<div class="mx-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-black/30 p-1" role="tablist">
			{#each tabs as t (t.id)}
				<button
					type="button"
					role="tab"
					aria-selected={tab === t.id}
					onclick={() => (tab = t.id)}
					class="focus-ring flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition
						{tab === t.id ? 'bg-white/10 text-fg' : 'text-muted hover:text-fg'}"
				>
					<t.icon class="size-3.5 {tab === t.id ? 'text-accent' : ''}" />
					{t.label}
				</button>
			{/each}
		</div>

		<div class="mt-3 flex-1 overflow-y-auto px-5 pb-5">
			{#if tab === 'appearance'}
				<section class="space-y-3">
					<h3 class="label">Background</h3>
					<div class="grid grid-cols-3 gap-2">
						{#each backgrounds as bg (bg.id)}
							{@const active = settings.background === bg.id}
							<button
								type="button"
								onclick={() => store.setBackground(bg.id)}
								class="focus-ring relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition
									{active
									? 'border-accent/70 bg-accent/12 text-fg'
									: 'border-line bg-white/3 text-muted hover:border-line-strong hover:text-fg'}"
								aria-pressed={active}
							>
								<bg.icon class="size-5 {active ? 'text-accent' : ''}" strokeWidth={1.75} />
								{bg.name}
								{#if active}
									<Check class="absolute top-1.5 right-1.5 size-3 text-accent" strokeWidth={3} />
								{/if}
							</button>
						{/each}
					</div>

					{#if activeBg.options.length || activeBg.hint}
						<div class="space-y-3.5 rounded-xl border border-line bg-white/2 p-3.5">
							<div class="flex items-center justify-between">
								<p class="text-xs font-medium text-fg">
									{activeBg.name}
								</p>
								{#if activeBg.options.length}
									<button
										type="button"
										onclick={() => store.resetBackgroundOptions(activeBg.id)}
										class="focus-ring flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-subtle hover:text-fg"
									>
										<RotateCcw class="size-3" /> Reset
									</button>
								{/if}
							</div>

							{#if activeBg.hint}
								<p class="flex items-center gap-1.5 text-[11px] text-muted">
									<MousePointer2 class="size-3 text-accent" />
									{activeBg.hint}
								</p>
							{/if}

							{#each activeBg.options as opt (opt.key)}
								{@const values = settings.bgOptions[activeBg.id]}
								{#if opt.type === 'range'}
									<label class="block">
										<span class="mb-1.5 flex justify-between text-xs text-muted">
											{opt.label}
											<span class="font-mono text-fg/80 tabular-nums">{fmt(Number(values[opt.key]), opt.step)}</span>
										</span>
										<input
											type="range"
											class="range"
											min={opt.min}
											max={opt.max}
											step={opt.step}
											value={values[opt.key]}
											oninput={(e) => (values[opt.key] = Number(e.currentTarget.value))}
										/>
									</label>
								{:else if opt.type === 'toggle'}
									<div class="flex items-center justify-between text-xs text-muted">
										{opt.label}
										<Switch label={opt.label} bind:checked={() => Boolean(values[opt.key]), (v) => (values[opt.key] = v)} />
									</div>
								{:else}
									<div class="flex items-center justify-between gap-3 text-xs text-muted">
										{opt.label}
										<div class="flex rounded-lg border border-line bg-black/30 p-0.5">
											{#each opt.choices as choice (choice)}
												<button
													type="button"
													onclick={() => (values[opt.key] = choice)}
													class="focus-ring rounded-md px-2.5 py-1 capitalize transition
														{values[opt.key] === choice ? 'bg-white/10 text-fg' : 'text-subtle hover:text-fg'}"
												>
													{choice}
												</button>
											{/each}
										</div>
									</div>
								{/if}
							{/each}
						</div>
					{/if}

					<label class="block pt-1">
						<span class="mb-1.5 flex justify-between text-xs text-muted">
							Dim background
							<span class="font-mono text-fg/80 tabular-nums">{Math.round(settings.dim * 100)}%</span>
						</span>
						<input type="range" class="range" min="0" max="0.85" step="0.05" bind:value={settings.dim} />
					</label>
				</section>

				<section class="mt-6 space-y-3">
					<h3 class="label">Accent color</h3>
					<div class="flex flex-wrap items-center gap-2">
						{#each accents as a (a.value)}
							<button
								type="button"
								onclick={() => (settings.accent = a.value)}
								class="focus-ring grid size-8 place-items-center rounded-full border-2 transition
									{settings.accent === a.value ? 'border-white/90' : 'border-transparent hover:scale-110'}"
								style="background: {a.value}"
								aria-label={a.name}
								title={a.name}
							>
								{#if settings.accent === a.value}<Check class="size-3.5 text-black/70" strokeWidth={3} />{/if}
							</button>
						{/each}
						<label
							class="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-line-strong text-muted hover:text-fg"
							title="Custom color"
						>
							<Palette class="size-3.5" />
							<input type="color" class="absolute inset-0 cursor-pointer opacity-0" bind:value={settings.accent} />
						</label>
					</div>
				</section>
			{:else if tab === 'cloak'}
				<section class="space-y-4">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-sm font-medium text-fg">Tab cloak</p>
							<p class="mt-0.5 text-xs text-muted">Change the tab title and icon.</p>
						</div>
						<Switch label="Enable tab cloak" bind:checked={settings.cloak.enabled} />
					</div>

					<div class="rounded-xl border border-line bg-black/40 p-2.5">
						<div class="flex w-fit max-w-full items-center gap-2 rounded-t-lg bg-white/8 px-3 py-1.5">
							{#if settings.cloak.enabled && settings.cloak.icon}
								<img src={settings.cloak.icon} alt="" class="size-4 rounded-sm" />
							{:else}
								<img src="/favicon.svg" alt="" class="size-4" />
							{/if}
							<span class="truncate text-xs text-fg/90">
								{settings.cloak.enabled ? settings.cloak.title || 'Untitled' : site.name}
							</span>
							<X class="size-3 shrink-0 text-subtle" />
						</div>
					</div>

					<div class="flex rounded-lg border border-line bg-black/30 p-0.5 text-xs">
						<button
							type="button"
							onclick={() => (settings.cloak.mode = 'always')}
							class="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition
								{settings.cloak.mode === 'always' ? 'bg-white/10 text-fg' : 'text-subtle hover:text-fg'}"
						>
							<EyeOff class="size-3.5" /> Always
						</button>
						<button
							type="button"
							onclick={() => (settings.cloak.mode = 'hidden')}
							class="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition
								{settings.cloak.mode === 'hidden' ? 'bg-white/10 text-fg' : 'text-subtle hover:text-fg'}"
						>
							<Eye class="size-3.5" /> When tab is hidden
						</button>
					</div>

					<div>
						<h3 class="label mb-2">Presets</h3>
						<div class="grid grid-cols-3 gap-2">
							{#each cloakPresets as p (p.id)}
								{@const active = settings.cloak.preset === p.id}
								<button
									type="button"
									onclick={() => pickPreset(p.id)}
									class="focus-ring flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[11px] transition
										{active ? 'border-accent/70 bg-accent/12 text-fg' : 'border-line bg-white/3 text-muted hover:text-fg'}"
								>
									<img src={p.icon} alt="" class="size-5 rounded-sm" loading="lazy" />
									<span class="w-full truncate text-center">{p.name}</span>
								</button>
							{/each}
						</div>
					</div>

					<div class="space-y-2.5">
						<h3 class="label">Custom</h3>
						<input
							class="field"
							placeholder="Tab title"
							bind:value={settings.cloak.title}
							oninput={() => (settings.cloak.preset = 'custom')}
						/>
						<div class="flex gap-2">
							<input
								class="field"
								placeholder="Icon URL (https://…/favicon.ico)"
								bind:value={settings.cloak.icon}
								oninput={() => (settings.cloak.preset = 'custom')}
							/>
							<label
								class="focus-ring grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-line bg-white/4 text-muted hover:text-fg"
								title="Upload icon"
							>
								<ImageUp class="size-4" />
								<input type="file" accept="image/*" class="sr-only" onchange={uploadIcon} />
							</label>
						</div>
						{#if iconError}<p class="text-xs text-rose-300">{iconError}</p>{/if}
					</div>

					<div class="rounded-xl border border-line bg-white/2 p-3.5">
						<p class="flex items-center gap-2 text-sm font-medium text-fg">
							<AppWindow class="size-4 text-accent" /> about:blank mode
						</p>
						<p class="mt-1 text-xs text-muted">
							Opens the site in an about:blank tab so it won't show up in your history.
						</p>
						<button type="button" class="btn-accent mt-3 w-full" onclick={() => openInAboutBlank()}>
							Open in about:blank
						</button>
					</div>
				</section>
			{:else}
				<section class="space-y-4">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-sm font-medium text-fg">Panic key</p>
							<p class="mt-0.5 text-xs text-muted">Press it to leave the site instantly.</p>
						</div>
						<Switch label="Enable panic key" bind:checked={settings.panic.enabled} />
					</div>

					<div>
						<h3 class="label mb-2">Key</h3>
						<button
							type="button"
							onclick={() => (ui.capturingKey = true)}
							class="focus-ring flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition
								{ui.capturingKey ? 'border-accent/70 bg-accent/10 text-fg' : 'border-line bg-white/4 text-muted hover:text-fg'}"
						>
							<span class="flex items-center gap-2"><Keyboard class="size-4" />
								{ui.capturingKey ? 'Press any key…' : 'Change key'}</span>
							<kbd class="rounded-md border border-line-strong bg-black/40 px-2 py-0.5 font-mono text-xs text-fg">
								{keyLabel(settings.panic.key)}
							</kbd>
						</button>
					</div>

					<label class="block">
						<span class="label mb-2 block">Redirect to</span>
						<input class="field" placeholder="https://classroom.google.com" bind:value={settings.panic.url} />
					</label>
					<p class="text-xs text-subtle">Won't trigger while you're typing.</p>
				</section>
			{/if}
		</div>

		<div class="flex justify-end border-t border-line px-5 py-3">
			<button
				type="button"
				onclick={() => confirm('Reset everything? This clears your settings, favorites and saved proxies.') && store.reset()}
				class="focus-ring flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-subtle hover:text-rose-300"
			>
				<RotateCcw class="size-3" /> Reset all
			</button>
		</div>
	</div>
{/if}

<style>
	.label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--subtle);
	}
</style>
