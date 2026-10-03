<!-- Svelte port of Animate UI's StarsBackground (https://animate-ui.com/docs/components/backgrounds/stars) -->
<script lang="ts">
	import { Spring } from 'svelte/motion';

	type Props = { speed?: number; factor?: number; starColor?: string };

	let { speed = 1, factor = 0.05, starColor = '#fff' }: Props = $props();

	// higher = faster (Animate UI's version takes seconds per loop)
	const duration = $derived(50 / Math.max(speed, 0.05));

	const layers = [
		{ count: 1000, size: 1, mult: 1 },
		{ count: 400, size: 2, mult: 2 },
		{ count: 200, size: 3, mult: 3 }
	];

	function generateStars(count: number, color: string) {
		const shadows: string[] = [];
		for (let i = 0; i < count; i++) {
			const x = Math.floor(Math.random() * 4000) - 2000;
			const y = Math.floor(Math.random() * 4000) - 2000;
			shadows.push(`${x}px ${y}px ${color}`);
		}
		return shadows.join(', ');
	}

	let shadows = $state<string[]>([]);
	$effect(() => {
		shadows = layers.map((l) => generateStars(l.count, starColor));
	});

	const offset = new Spring({ x: 0, y: 0 }, { stiffness: 0.04, damping: 0.6 });

	function onmousemove(e: MouseEvent) {
		offset.target = {
			x: -(e.clientX - window.innerWidth / 2) * factor,
			y: -(e.clientY - window.innerHeight / 2) * factor
		};
	}
</script>

<svelte:window {onmousemove} />

<div class="stars">
	<div style="transform: translate3d({offset.current.x}px, {offset.current.y}px, 0)">
		{#each layers as layer, i (i)}
			<div class="layer" style="animation-duration: {duration * layer.mult}s">
				<div
					class="star"
					style="width: {layer.size}px; height: {layer.size}px; box-shadow: {shadows[i] ?? 'none'}"
				></div>
				<div
					class="star"
					style="top: 2000px; width: {layer.size}px; height: {layer.size}px; box-shadow: {shadows[i] ?? 'none'}"
				></div>
			</div>
		{/each}
	</div>
</div>

<style>
	.stars {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: radial-gradient(ellipse at bottom, #262626 0%, #000 100%);
	}
	.layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 2000px;
		animation: drift linear infinite;
		will-change: transform;
	}
	.star {
		position: absolute;
		border-radius: 9999px;
		background: transparent;
	}
	@keyframes drift {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(-2000px);
		}
	}
</style>
