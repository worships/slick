<!-- Svelte port of Animate UI's FireworksBackground (https://animate-ui.com/docs/components/backgrounds/fireworks) -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { rgbStr, shift } from '#lib/color.ts';

	type Range = { min: number; max: number } | number;
	type Props = {
		population?: number;
		themed?: boolean;
		accent?: string;
		fireworkSpeed?: Range;
		fireworkSize?: Range;
		particleSpeed?: Range;
		particleSize?: Range;
	};

	let {
		population = 1,
		themed = false,
		accent = '#818cf8',
		fireworkSpeed = { min: 4, max: 8 },
		fireworkSize = { min: 2, max: 5 },
		particleSpeed = { min: 2, max: 7 },
		particleSize = { min: 1, max: 5 }
	}: Props = $props();

	const rand = (min: number, max: number) => Math.random() * (max - min) + min;
	const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);
	const randColor = () => `hsl(${randInt(0, 360)}, 100%, 50%)`;
	const getValueByRange = (r: Range) => (typeof r === 'number' ? r : rand(r.min, r.max));

	const palette = $derived(
		themed
			? [accent, rgbStr(shift(accent, 35, 95, 65)), rgbStr(shift(accent, -35, 95, 62)), '#ffffff']
			: null
	);
	const getColor = () => (palette ? palette[randInt(0, palette.length)] : randColor());

	type Particle = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		color: string;
		alpha: number;
		decay: number;
		size: number;
	};

	type Firework = {
		x: number;
		y: number;
		targetY: number;
		color: string;
		size: number;
		vx: number;
		vy: number;
		trail: { x: number; y: number }[];
		trailLength: number;
	};

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		let maxX = 0;
		let maxY = 0;
		let raf = 0;
		let launchTimer: ReturnType<typeof setTimeout>;

		const setCanvasSize = () => {
			maxX = window.innerWidth;
			maxY = maxX * (container.offsetHeight / container.offsetWidth);
			canvas.width = maxX;
			canvas.height = maxY;
		};
		setCanvasSize();
		window.addEventListener('resize', setCanvasSize);

		const explosions: Particle[] = [];
		const fireworks: Firework[] = [];

		const createFirework = (x: number, y: number, targetY: number): Firework => {
			const angle = -Math.PI / 2 + rand(-0.3, 0.3);
			const speed = getValueByRange(fireworkSpeed);
			return {
				x,
				y,
				targetY,
				color: getColor(),
				size: getValueByRange(fireworkSize),
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				trail: [],
				trailLength: randInt(10, 25)
			};
		};

		const explode = (f: Firework) => {
			const n = randInt(50, 150);
			for (let i = 0; i < n; i++) {
				const dir = rand(0, Math.PI * 2);
				const speed = getValueByRange(particleSpeed);
				explosions.push({
					x: f.x,
					y: f.y,
					vx: Math.cos(dir) * speed,
					vy: Math.sin(dir) * speed,
					color: f.color,
					alpha: 1,
					decay: rand(0.005, 0.02),
					size: getValueByRange(particleSize)
				});
			}
		};

		const launchFirework = () => {
			fireworks.push(
				createFirework(rand(maxX * 0.1, maxX * 0.9), maxY, rand(maxY * 0.1, maxY * 0.4))
			);
			launchTimer = setTimeout(launchFirework, rand(300, 800) / Math.max(population, 0.05));
		};
		launchFirework();

		const animate = () => {
			ctx.clearRect(0, 0, maxX, maxY);

			for (let i = fireworks.length - 1; i >= 0; i--) {
				const f = fireworks[i];
				f.trail.push({ x: f.x, y: f.y });
				if (f.trail.length > f.trailLength) f.trail.shift();
				f.x += f.vx;
				f.y += f.vy;
				f.vy += 0.02;
				if (f.vy >= 0 || f.y <= f.targetY) {
					explode(f);
					fireworks.splice(i, 1);
					continue;
				}
				ctx.save();
				ctx.beginPath();
				if (f.trail.length > 1) {
					ctx.moveTo(f.trail[0].x, f.trail[0].y);
					for (const p of f.trail) ctx.lineTo(p.x, p.y);
				} else {
					ctx.moveTo(f.x, f.y);
					ctx.lineTo(f.x, f.y);
				}
				ctx.strokeStyle = f.color;
				ctx.lineWidth = f.size;
				ctx.lineCap = 'round';
				ctx.stroke();
				ctx.restore();
			}

			for (let i = explosions.length - 1; i >= 0; i--) {
				const p = explosions[i];
				p.vx *= 0.98;
				p.vy *= 0.98;
				p.vy += 0.05;
				p.x += p.vx;
				p.y += p.vy;
				p.alpha -= p.decay;
				if (p.alpha <= 0) {
					explosions.splice(i, 1);
					continue;
				}
				ctx.save();
				ctx.globalAlpha = p.alpha;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				ctx.fillStyle = p.color;
				ctx.fill();
				ctx.restore();
			}

			raf = requestAnimationFrame(animate);
		};
		animate();

		const handleClick = (e: MouseEvent) => {
			fireworks.push(createFirework(e.clientX, maxY, e.clientY));
		};
		container.addEventListener('click', handleClick);

		return () => {
			window.removeEventListener('resize', setCanvasSize);
			container.removeEventListener('click', handleClick);
			cancelAnimationFrame(raf);
			clearTimeout(launchTimer);
		};
	});
</script>

<div class="fireworks" bind:this={container}>
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.fireworks {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: radial-gradient(ellipse at bottom, #15151f 0%, #050507 100%);
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
</style>
