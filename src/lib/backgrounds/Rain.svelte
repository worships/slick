<script lang="ts">
	import { onMount } from 'svelte';
	import { hexToRgb, mix, type RGB } from '#lib/color.ts';

	type Props = {
		density?: number;
		speed?: number;
		wind?: number;
		lightning?: boolean;
		splashes?: boolean;
		accent?: string;
	};

	let {
		density = 1,
		speed = 1,
		wind = 0.15,
		lightning = true,
		splashes = true,
		accent = '#818cf8'
	}: Props = $props();

	let canvas: HTMLCanvasElement;
	let flashEl: HTMLDivElement;

	type Drop = { x: number; y: number; z: number; len: number; vy: number };
	type Splash = { x: number; y: number; vx: number; vy: number; life: number; max: number };
	type Bolt = { points: [number, number][][]; age: number };

	const dropColor = $derived<RGB>(mix(hexToRgb(accent), [214, 226, 255], 0.6));

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		let w = 0;
		let h = 0;
		let dpr = 1;
		let raf = 0;
		let last = performance.now();

		const drops: Drop[] = [];
		const splashArr: Splash[] = [];
		let bolt: Bolt | null = null;
		let flash = 0;
		let nextStrike = 4 + Math.random() * 6;

		const respawn = (d: Drop, anywhere: boolean) => {
			d.z = 0.25 + Math.random() * 0.75;
			d.x = Math.random() * (w + 300) - 150;
			d.y = anywhere ? Math.random() * h : -Math.random() * h * 0.25 - 30;
			d.len = 8 + d.z * 24;
			d.vy = 420 + d.z * 950;
		};

		const targetCount = () =>
			Math.max(40, Math.min(1600, Math.round(((w * h) / 5200) * density)));

		const syncCount = () => {
			const target = targetCount();
			while (drops.length < target) {
				const d = { x: 0, y: 0, z: 0, len: 0, vy: 0 };
				respawn(d, true);
				drops.push(d);
			}
			if (drops.length > target) drops.length = target;
		};

		const resize = () => {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			const rect = canvas.getBoundingClientRect();
			w = rect.width;
			h = rect.height;
			canvas.width = Math.max(1, Math.floor(w * dpr));
			canvas.height = Math.max(1, Math.floor(h * dpr));
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			syncCount();
		};

		const makeBolt = (): Bolt => {
			const branch = (x: number, y: number, len: number, spread: number) => {
				const pts: [number, number][] = [[x, y]];
				const steps = 14 + Math.floor(Math.random() * 10);
				for (let i = 0; i < steps; i++) {
					x += (Math.random() - 0.5) * spread;
					y += len / steps;
					pts.push([x, y]);
				}
				return pts;
			};
			const main = branch(w * (0.15 + Math.random() * 0.7), -10, h * (0.45 + Math.random() * 0.3), 60);
			const fork = main[Math.floor(main.length * (0.3 + Math.random() * 0.3))];
			return { points: [main, branch(fork[0], fork[1], h * 0.2, 45)], age: 0 };
		};

		const frame = (now: number) => {
			const dt = Math.min((now - last) / 1000, 0.05);
			last = now;
			syncCount();

			ctx.clearRect(0, 0, w, h);
			const [r, g, b] = dropColor;
			const windX = wind * 320;

			// one stroke per depth layer instead of one per drop
			const layers: Drop[][] = [[], [], []];
			for (const d of drops) {
				d.y += d.vy * speed * dt;
				d.x += windX * d.z * speed * dt;
				const ground = h - 4 - (1 - d.z) * h * 0.18;
				if (d.y > ground) {
					if (splashes && d.z > 0.5 && Math.random() < 0.55) {
						const n = 2 + Math.floor(Math.random() * 3);
						for (let i = 0; i < n; i++) {
							const max = 0.25 + Math.random() * 0.3;
							splashArr.push({
								x: d.x,
								y: ground,
								vx: (Math.random() - 0.5) * 140 * d.z + windX * 0.2,
								vy: -(60 + Math.random() * 140) * d.z,
								life: max,
								max
							});
						}
					}
					respawn(d, false);
				}
				if (d.x > w + 150) d.x -= w + 300;
				else if (d.x < -150) d.x += w + 300;
				layers[d.z < 0.5 ? 0 : d.z < 0.8 ? 1 : 2].push(d);
			}

			const alphas = [0.16, 0.28, 0.46];
			const widths = [0.8, 1.1, 1.5];
			ctx.lineCap = 'round';
			for (let i = 0; i < 3; i++) {
				ctx.beginPath();
				for (const d of layers[i]) {
					const slant = (windX * d.z) / d.vy;
					ctx.moveTo(d.x, d.y);
					ctx.lineTo(d.x - slant * d.len, d.y - d.len);
				}
				ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alphas[i]})`;
				ctx.lineWidth = widths[i];
				ctx.stroke();
			}

			for (let i = splashArr.length - 1; i >= 0; i--) {
				const s = splashArr[i];
				s.life -= dt;
				if (s.life <= 0) {
					splashArr.splice(i, 1);
					continue;
				}
				s.vy += 900 * dt;
				s.x += s.vx * dt;
				s.y += s.vy * dt;
				ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(s.life / s.max) * 0.55})`;
				ctx.fillRect(s.x, s.y, 1.6, 1.6);
			}

			if (lightning) {
				nextStrike -= dt;
				if (nextStrike <= 0) {
					bolt = makeBolt();
					flash = 1;
					nextStrike = 8 + Math.random() * 14;
				}
			}
			if (bolt) {
				bolt.age += dt;
				const a = Math.max(0, 1 - bolt.age / 0.35) * (bolt.age < 0.08 || bolt.age > 0.14 ? 1 : 0.3);
				if (a <= 0) bolt = null;
				else {
					ctx.save();
					ctx.shadowColor = accent;
					ctx.shadowBlur = 18;
					ctx.strokeStyle = `rgba(235, 240, 255, ${a})`;
					bolt.points.forEach((pts, i) => {
						ctx.lineWidth = i === 0 ? 2 : 1.1;
						ctx.beginPath();
						ctx.moveTo(pts[0][0], pts[0][1]);
						for (const [x, y] of pts) ctx.lineTo(x, y);
						ctx.stroke();
					});
					ctx.restore();
				}
			}
			flash *= Math.exp(-dt * 5);
			flashEl.style.opacity = String(flash * 0.16);

			raf = requestAnimationFrame(frame);
		};

		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(canvas);
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	});
</script>

<div class="rain" style="--rain-accent: {accent}">
	<canvas bind:this={canvas}></canvas>
	<div class="flash" bind:this={flashEl}></div>
</div>

<style>
	.rain {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: #08090f;
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.flash {
		position: absolute;
		inset: 0;
		opacity: 0;
		background: color-mix(in oklab, var(--rain-accent) 25%, #fff);
		mix-blend-mode: screen;
		pointer-events: none;
	}
</style>
