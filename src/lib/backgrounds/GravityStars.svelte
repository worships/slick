<!-- Svelte port of Animate UI's GravityStarsBackground (https://animate-ui.com/docs/components/backgrounds/gravity-stars) -->
<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		starsCount?: number;
		starsSize?: number;
		starsOpacity?: number;
		glowIntensity?: number;
		glowAnimation?: 'instant' | 'ease' | 'spring';
		movementSpeed?: number;
		mouseInfluence?: number;
		mouseGravity?: 'attract' | 'repel';
		gravityStrength?: number;
		starsInteraction?: boolean;
		starsInteractionType?: 'bounce' | 'merge';
		themed?: boolean;
		accent?: string;
	};

	let {
		starsCount = 75,
		starsSize = 2,
		starsOpacity = 0.75,
		glowIntensity = 15,
		glowAnimation = 'ease',
		movementSpeed = 0.3,
		mouseInfluence = 100,
		mouseGravity = 'attract',
		gravityStrength = 75,
		starsInteraction = false,
		starsInteractionType = 'bounce',
		themed = true,
		accent = '#818cf8'
	}: Props = $props();

	type Particle = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		size: number;
		opacity: number;
		baseOpacity: number;
		mass: number;
		glowMultiplier: number;
		glowVelocity: number;
	};

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;

	let stars: Particle[] = [];
	let w = 800;
	let h = 600;
	let dpr = 1;
	let mouse = { x: -9999, y: -9999 };

	const makeStar = (): Particle => {
		const angle = Math.random() * Math.PI * 2;
		const speed = movementSpeed * (0.5 + Math.random() * 0.5);
		return {
			x: Math.random() * w,
			y: Math.random() * h,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			size: Math.random() * starsSize + 1,
			opacity: starsOpacity,
			baseOpacity: starsOpacity,
			mass: Math.random() * 0.5 + 0.5,
			glowMultiplier: 1,
			glowVelocity: 0
		};
	};

	$effect(() => {
		void starsSize;
		stars = Array.from({ length: starsCount }, makeStar);
	});
	$effect(() => {
		const opacity = starsOpacity;
		const speed = movementSpeed;
		for (const p of stars) {
			p.baseOpacity = opacity;
			p.opacity = opacity;
			const spd = Math.hypot(p.vx, p.vy);
			if (spd > 0) {
				p.vx *= speed / spd;
				p.vy *= speed / spd;
			}
		}
	});

	function onmousemove(e: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}
	function ontouchmove(e: TouchEvent) {
		const t = e.touches[0];
		if (!t) return;
		const rect = canvas.getBoundingClientRect();
		mouse = { x: t.clientX - rect.left, y: t.clientY - rect.top };
	}

	function updateStars() {
		for (let i = 0; i < stars.length; i++) {
			const p = stars[i];
			const dx = mouse.x - p.x;
			const dy = mouse.y - p.y;
			const dist = Math.hypot(dx, dy);

			if (dist < mouseInfluence && dist > 0) {
				const force = (mouseInfluence - dist) / mouseInfluence;
				const nx = dx / dist;
				const ny = dy / dist;
				const g = force * (gravityStrength * 0.001);
				const sign = mouseGravity === 'attract' ? 1 : -1;
				p.vx += nx * g * sign;
				p.vy += ny * g * sign;
				p.opacity = Math.min(1, p.baseOpacity + force * 0.4);

				const target = 1 + force * 2;
				const cur = p.glowMultiplier;
				if (glowAnimation === 'instant') p.glowMultiplier = target;
				else if (glowAnimation === 'ease') p.glowMultiplier = cur + (target - cur) * 0.15;
				else {
					p.glowVelocity = p.glowVelocity * 0.85 + (target - cur) * 0.2;
					p.glowMultiplier = cur + p.glowVelocity;
				}
			} else {
				p.opacity = Math.max(p.baseOpacity * 0.3, p.opacity - 0.02);
				const cur = p.glowMultiplier;
				if (glowAnimation === 'instant') p.glowMultiplier = 1;
				else if (glowAnimation === 'ease') p.glowMultiplier = Math.max(1, cur + (1 - cur) * 0.08);
				else {
					p.glowVelocity = p.glowVelocity * 0.9 + (1 - cur) * 0.15;
					p.glowMultiplier = Math.max(1, cur + p.glowVelocity);
				}
			}

			if (starsInteraction) {
				for (let j = i + 1; j < stars.length; j++) {
					const o = stars[j];
					const dx2 = o.x - p.x;
					const dy2 = o.y - p.y;
					const d = Math.hypot(dx2, dy2);
					const minD = p.size + o.size + 5;
					if (d < minD && d > 0) {
						if (starsInteractionType === 'bounce') {
							const nx = dx2 / d;
							const ny = dy2 / d;
							const speed = (p.vx - o.vx) * nx + (p.vy - o.vy) * ny;
							if (speed < 0) continue;
							const impulse = (2 * speed) / (p.mass + o.mass);
							p.vx -= impulse * o.mass * nx;
							p.vy -= impulse * o.mass * ny;
							o.vx += impulse * p.mass * nx;
							o.vy += impulse * p.mass * ny;
							const overlap = minD - d;
							p.x -= nx * overlap * 0.5;
							p.y -= ny * overlap * 0.5;
							o.x += nx * overlap * 0.5;
							o.y += ny * overlap * 0.5;
						} else {
							const mergeForce = (minD - d) / minD;
							p.glowMultiplier += mergeForce * 0.5;
							o.glowMultiplier += mergeForce * 0.5;
							const af = mergeForce * 0.01;
							p.vx += dx2 * af;
							p.vy += dy2 * af;
							o.vx -= dx2 * af;
							o.vy -= dy2 * af;
						}
					}
				}
			}

			p.x += p.vx;
			p.y += p.vy;
			p.vx += (Math.random() - 0.5) * 0.001;
			p.vy += (Math.random() - 0.5) * 0.001;
			p.vx *= 0.999;
			p.vy *= 0.999;

			if (p.x < 0) p.x = w;
			if (p.x > w) p.x = 0;
			if (p.y < 0) p.y = h;
			if (p.y > h) p.y = 0;
		}
	}

	function drawStars(ctx: CanvasRenderingContext2D) {
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		const color = themed ? accent : '#ffffff';
		for (const p of stars) {
			ctx.save();
			ctx.shadowColor = color;
			ctx.shadowBlur = glowIntensity * p.glowMultiplier * 2;
			ctx.globalAlpha = p.opacity;
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(p.x * dpr, p.y * dpr, p.size * dpr, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		let raf = 0;

		const resize = () => {
			const rect = container.getBoundingClientRect();
			dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
			canvas.width = Math.max(1, Math.floor(rect.width * dpr));
			canvas.height = Math.max(1, Math.floor(rect.height * dpr));
			w = rect.width;
			h = rect.height;
			for (const p of stars) {
				p.x = Math.random() * w;
				p.y = Math.random() * h;
			}
		};
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(container);

		const animate = () => {
			updateStars();
			drawStars(ctx);
			raf = requestAnimationFrame(animate);
		};
		raf = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	});
</script>

<svelte:window {onmousemove} {ontouchmove} />

<div class="gravity" bind:this={container}>
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.gravity {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: radial-gradient(ellipse at top, #10101a 0%, #050507 100%);
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
