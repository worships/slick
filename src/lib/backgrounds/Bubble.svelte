<!-- Svelte port of Animate UI's BubbleBackground (https://animate-ui.com/docs/components/backgrounds/bubble) -->
<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { rgbList, rgbStr, shift } from '#lib/color.ts';

	type Props = { interactive?: boolean; themed?: boolean; accent?: string };

	let { interactive = true, themed = false, accent = '#818cf8' }: Props = $props();

	const uid = $props.id();

	const original = {
		first: '18,113,255',
		second: '221,74,255',
		third: '0,220,255',
		fourth: '200,50,50',
		fifth: '180,180,50',
		sixth: '140,100,255',
		from: '#4c1d95', // violet-900
		to: '#1e3a8a' // blue-900
	};

	const colors = $derived(
		themed
			? {
					first: rgbList(shift(accent, 0, 95, 55)),
					second: rgbList(shift(accent, 50, 90, 62)),
					third: rgbList(shift(accent, -45, 90, 58)),
					fourth: rgbList(shift(accent, 160, 70, 45)),
					fifth: rgbList(shift(accent, 100, 70, 50)),
					sixth: rgbList(shift(accent, 20, 95, 68)),
					from: rgbStr(shift(accent, 25, 70, 20)),
					to: rgbStr(shift(accent, -25, 70, 16))
				}
			: original
	);

	const mouse = new Spring({ x: 0, y: 0 }, { stiffness: 0.08, damping: 0.7 });

	function onmousemove(e: MouseEvent) {
		if (!interactive) return;
		mouse.target = { x: e.clientX - window.innerWidth / 2, y: e.clientY - window.innerHeight / 2 };
	}
</script>

<svelte:window {onmousemove} />

<div
	class="bubble"
	style="
		--first-color: {colors.first};
		--second-color: {colors.second};
		--third-color: {colors.third};
		--fourth-color: {colors.fourth};
		--fifth-color: {colors.fifth};
		--sixth-color: {colors.sixth};
		background: linear-gradient(to bottom right, {colors.from}, {colors.to});
	"
>
	<svg xmlns="http://www.w3.org/2000/svg" class="defs" aria-hidden="true">
		<defs>
			<filter id="goo-{uid}">
				<feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur" />
				<feColorMatrix
					in="blur"
					mode="matrix"
					values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
					result="goo"
				/>
				<feBlend in="SourceGraphic" in2="goo" />
			</filter>
		</defs>
	</svg>

	<div class="blobs" style="filter: url(#goo-{uid}) blur(40px)">
		<div class="blob c1"></div>

		<div class="ring r2">
			<div class="blob-inline c2"></div>
		</div>

		<div class="ring r3">
			<div class="blob c3"></div>
		</div>

		<div class="blob c4"></div>

		<div class="ring r5">
			<div class="blob c5"></div>
		</div>

		{#if interactive}
			<div
				class="blob c6"
				style="transform: translate3d({mouse.current.x}px, {mouse.current.y}px, 0)"
			></div>
		{/if}
	</div>
</div>

<style>
	.bubble {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	.defs {
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 0;
	}
	.blobs {
		position: absolute;
		inset: 0;
	}
	.blob,
	.blob-inline {
		border-radius: 9999px;
		mix-blend-mode: hard-light;
		will-change: transform;
	}
	.blob {
		position: absolute;
	}
	.ring {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: spin linear infinite;
		will-change: transform;
	}

	.c1 {
		width: 80%;
		height: 80%;
		top: 10%;
		left: 10%;
		background: radial-gradient(circle at center, rgba(var(--first-color), 0.8) 0%, rgba(var(--first-color), 0) 50%);
		animation: float-y 30s ease-in-out infinite;
	}

	.r2 {
		transform-origin: calc(50% - 400px);
		animation-duration: 20s;
	}
	.c2 {
		width: 80%;
		height: 80%;
		background: radial-gradient(circle at center, rgba(var(--second-color), 0.8) 0%, rgba(var(--second-color), 0) 50%);
	}

	.r3 {
		transform-origin: calc(50% + 400px);
		animation-duration: 40s;
	}
	.c3 {
		width: 80%;
		height: 80%;
		top: calc(50% + 200px);
		left: calc(50% - 500px);
		background: radial-gradient(circle at center, rgba(var(--third-color), 0.8) 0%, rgba(var(--third-color), 0) 50%);
	}

	.c4 {
		width: 80%;
		height: 80%;
		top: 10%;
		left: 10%;
		opacity: 0.7;
		background: radial-gradient(circle at center, rgba(var(--fourth-color), 0.8) 0%, rgba(var(--fourth-color), 0) 50%);
		animation: float-x 40s ease-in-out infinite;
	}

	.r5 {
		transform-origin: calc(50% - 800px) calc(50% + 200px);
		animation-duration: 20s;
	}
	.c5 {
		width: 160%;
		height: 160%;
		top: calc(50% - 80%);
		left: calc(50% - 80%);
		background: radial-gradient(circle at center, rgba(var(--fifth-color), 0.8) 0%, rgba(var(--fifth-color), 0) 50%);
	}

	.c6 {
		width: 100%;
		height: 100%;
		opacity: 0.7;
		background: radial-gradient(circle at center, rgba(var(--sixth-color), 0.8) 0%, rgba(var(--sixth-color), 0) 50%);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes float-y {
		0%,
		100% {
			transform: translateY(-50px);
		}
		50% {
			transform: translateY(50px);
		}
	}
	@keyframes float-x {
		0%,
		100% {
			transform: translateX(-50px);
		}
		50% {
			transform: translateX(50px);
		}
	}
</style>
