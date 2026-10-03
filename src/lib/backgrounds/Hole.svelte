<!-- Svelte port of Animate UI's HoleBackground (https://animate-ui.com/docs/components/backgrounds/hole) -->
<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		strokeColor?: string;
		numberOfLines?: number;
		numberOfDiscs?: number;
		particleRGBColor?: [number, number, number];
		themed?: boolean;
		accent?: string;
	};

	let {
		strokeColor = '#737373',
		numberOfLines = 50,
		numberOfDiscs = 50,
		particleRGBColor = [255, 255, 255],
		themed = true,
		accent = '#818cf8'
	}: Props = $props();

	type Disc = { p: number; x: number; y: number; w: number; h: number };
	type Point = { x: number; y: number };
	type HoleParticle = { x: number; sx: number; dx: number; y: number; vy: number; p: number; r: number; c: string };

	let canvas: HTMLCanvasElement;

	const hole = {
		discs: [] as Disc[],
		lines: [] as Point[][],
		particles: [] as HoleParticle[],
		clip: {} as { disc?: Disc; i?: number; path?: Path2D },
		startDisc: { x: 0, y: 0, w: 0, h: 0 },
		endDisc: { x: 0, y: 0, w: 0, h: 0 },
		rect: { width: 0, height: 0 },
		render: { width: 0, height: 0, dpi: 1 },
		particleArea: { sx: 0, sw: 0, ex: 0, ew: 0, h: 0 },
		linesCanvas: null as HTMLCanvasElement | null
	};

	const easeInExpo = (p: number) => (p === 0 ? 0 : Math.pow(2, 10 * (p - 1)));
	const tweenValue = (start: number, end: number, p: number, ease = false) =>
		start + (end - start) * (ease ? easeInExpo(p) : p);

	function tweenDisc(disc: Disc) {
		const { startDisc, endDisc } = hole;
		disc.x = tweenValue(startDisc.x, endDisc.x, disc.p);
		disc.y = tweenValue(startDisc.y, endDisc.y, disc.p, true);
		disc.w = tweenValue(startDisc.w, endDisc.w, disc.p);
		disc.h = tweenValue(startDisc.h, endDisc.h, disc.p);
	}

	function setSize() {
		const rect = canvas.getBoundingClientRect();
		hole.rect = { width: rect.width, height: rect.height };
		hole.render = { width: rect.width, height: rect.height, dpi: window.devicePixelRatio || 1 };
		canvas.width = hole.render.width * hole.render.dpi;
		canvas.height = hole.render.height * hole.render.dpi;
	}

	function setDiscs() {
		const { width, height } = hole.rect;
		hole.discs = [];
		hole.startDisc = { x: width * 0.5, y: height * 0.45, w: width * 0.75, h: height * 0.7 };
		hole.endDisc = { x: width * 0.5, y: height * 0.95, w: 0, h: 0 };
		let prevBottom = height;
		hole.clip = {};
		for (let i = 0; i < numberOfDiscs; i++) {
			const disc = { p: i / numberOfDiscs, x: 0, y: 0, w: 0, h: 0 };
			tweenDisc(disc);
			const bottom = disc.y + disc.h;
			if (bottom <= prevBottom) hole.clip = { disc: { ...disc }, i };
			prevBottom = bottom;
			hole.discs.push(disc);
		}
		const d = hole.clip.disc!;
		const clipPath = new Path2D();
		clipPath.ellipse(d.x, d.y, d.w, d.h, 0, 0, Math.PI * 2);
		clipPath.rect(d.x - d.w, 0, d.w * 2, d.y);
		hole.clip.path = clipPath;
	}

	function setLines() {
		const { width, height } = hole.rect;
		hole.lines = Array.from({ length: numberOfLines }, () => []);
		const linesAngle = (Math.PI * 2) / numberOfLines;
		for (const disc of hole.discs) {
			for (let i = 0; i < numberOfLines; i++) {
				const angle = i * linesAngle;
				hole.lines[i].push({
					x: disc.x + Math.cos(angle) * disc.w,
					y: disc.y + Math.sin(angle) * disc.h
				});
			}
		}
		const off = document.createElement('canvas');
		off.width = width;
		off.height = height;
		const ctx = off.getContext('2d');
		if (!ctx) return;
		const clip = hole.clip.path!;
		for (const line of hole.lines) {
			ctx.save();
			let lineIsIn = false;
			line.forEach((p1, j) => {
				if (j === 0) return;
				const p0 = line[j - 1];
				if (!lineIsIn && (ctx.isPointInPath(clip, p1.x, p1.y) || ctx.isPointInStroke(clip, p1.x, p1.y))) {
					lineIsIn = true;
				} else if (lineIsIn) {
					ctx.clip(clip);
				}
				ctx.beginPath();
				ctx.moveTo(p0.x, p0.y);
				ctx.lineTo(p1.x, p1.y);
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.closePath();
			});
			ctx.restore();
		}
		hole.linesCanvas = off;
	}

	function initParticle(start = false): HoleParticle {
		const a = hole.particleArea;
		const sx = a.sx + a.sw * Math.random();
		const ex = a.ex + a.ew * Math.random();
		const [r, g, b] = particleRGBColor;
		return {
			x: sx,
			sx,
			dx: ex - sx,
			y: start ? a.h * Math.random() : a.h,
			vy: 0.5 + Math.random(),
			p: 0,
			r: 0.5 + Math.random() * 4,
			c: `rgba(${r}, ${g}, ${b}, ${Math.random()})`
		};
	}

	function setParticles() {
		const { width, height } = hole.rect;
		const disc = hole.clip.disc!;
		hole.particleArea = { sw: disc.w * 0.5, ew: disc.w * 2, h: height * 0.85, sx: 0, ex: 0 };
		hole.particleArea.sx = (width - hole.particleArea.sw) / 2;
		hole.particleArea.ex = (width - hole.particleArea.ew) / 2;
		hole.particles = Array.from({ length: 100 }, () => initParticle(true));
	}

	function drawDiscs(ctx: CanvasRenderingContext2D) {
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = 2;
		const outer = hole.startDisc;
		ctx.beginPath();
		ctx.ellipse(outer.x, outer.y, outer.w, outer.h, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.closePath();
		const clipDisc = hole.clip.disc!;
		hole.discs.forEach((disc, i) => {
			if (i % 5 !== 0) return;
			const clipped = disc.w < clipDisc.w - 5;
			if (clipped) {
				ctx.save();
				ctx.clip(hole.clip.path!);
			}
			ctx.beginPath();
			ctx.ellipse(disc.x, disc.y, disc.w, disc.h, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.closePath();
			if (clipped) ctx.restore();
		});
	}

	function drawParticles(ctx: CanvasRenderingContext2D) {
		ctx.save();
		ctx.clip(hole.clip.path!);
		for (const p of hole.particles) {
			ctx.fillStyle = p.c;
			ctx.beginPath();
			ctx.rect(p.x, p.y, p.r, p.r);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();
	}

	function move() {
		for (const disc of hole.discs) {
			disc.p = (disc.p + 0.001) % 1;
			tweenDisc(disc);
		}
		hole.particles.forEach((p, idx) => {
			p.p = 1 - p.y / hole.particleArea.h;
			p.x = p.sx + p.dx * p.p;
			p.y -= p.vy;
			if (p.y < 0) hole.particles[idx] = initParticle();
		});
	}

	let ready = $state(false);

	function init() {
		setSize();
		setDiscs();
		setLines();
		setParticles();
	}

	$effect(() => {
		void [numberOfLines, numberOfDiscs, strokeColor, particleRGBColor];
		if (ready) init();
	});

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		let raf = 0;
		init();
		ready = true;

		const tick = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.save();
			ctx.scale(hole.render.dpi, hole.render.dpi);
			move();
			drawDiscs(ctx);
			if (hole.linesCanvas) ctx.drawImage(hole.linesCanvas, 0, 0);
			drawParticles(ctx);
			ctx.restore();
			raf = requestAnimationFrame(tick);
		};
		tick();

		window.addEventListener('resize', init);
		return () => {
			window.removeEventListener('resize', init);
			cancelAnimationFrame(raf);
		};
	});
</script>

<div class="hole" style="--hole-tint: {themed ? accent : '#a900ff'}">
	<canvas bind:this={canvas}></canvas>
	<div class="aurora"></div>
	<div class="scanlines"></div>
</div>

<style>
	.hole {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: #000;
		isolation: isolate;
	}
	.hole::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		display: block;
		width: 140%;
		height: 140%;
		background: radial-gradient(ellipse at 50% 55%, transparent 10%, black 50%);
		transform: translate3d(-50%, -50%, 0);
	}
	.hole::after {
		content: '';
		position: absolute;
		z-index: 5;
		top: 50%;
		left: 50%;
		display: block;
		width: 100%;
		height: 100%;
		background: radial-gradient(ellipse at 50% 75%, var(--hole-tint) 20%, transparent 75%);
		transform: translate3d(-50%, -50%, 0);
		mix-blend-mode: overlay;
	}
	canvas {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		opacity: 0.2;
	}
	.aurora {
		position: absolute;
		top: -71.5%;
		left: 50%;
		z-index: 3;
		width: 30%;
		height: 140%;
		border-bottom-left-radius: 9999px;
		border-bottom-right-radius: 9999px;
		filter: blur(64px);
		opacity: 0.75;
		mix-blend-mode: plus-lighter;
		transform: translate3d(-50%, 0, 0);
		background: linear-gradient(
				20deg,
				#00f8f1,
				#ffbd1e20 16.5%,
				#fe848f 33%,
				#fe848f20 49.5%,
				#00f8f1 66%,
				#00f8f160 85.5%,
				#ffbd1e 100%
			)
			0 100% / 100% 200%;
		animation: aurora 5s linear infinite;
	}
	.scanlines {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 7;
		width: 100%;
		height: 100%;
		background: repeating-linear-gradient(transparent, transparent 1px, white 1px, white 2px);
		mix-blend-mode: overlay;
		opacity: 0.5;
	}
	@keyframes aurora {
		from {
			background-position: 0% 100%;
		}
		to {
			background-position: 0% 300%;
		}
	}
</style>
