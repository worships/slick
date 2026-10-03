<!-- Svelte port of Animate UI's GradientBackground (https://animate-ui.com/docs/components/backgrounds/gradient) -->
<script lang="ts">
	import { rgbStr, shift } from '#lib/color.ts';

	type Props = { duration?: number; themed?: boolean; accent?: string };

	let { duration = 15, themed = true, accent = '#818cf8' }: Props = $props();

	const stops = $derived(
		themed
			? [rgbStr(shift(accent, -40, 85, 55)), accent, rgbStr(shift(accent, 45, 85, 62))]
			: ['#3b82f6', '#a855f7', '#ec4899']
	);
</script>

<div
	class="gradient"
	style="background-image: linear-gradient(to bottom right, {stops.join(', ')}); animation-duration: {duration}s"
></div>

<style>
	.gradient {
		position: absolute;
		inset: 0;
		background-size: 400% 400%;
		animation: pan ease-in-out infinite;
	}
	@keyframes pan {
		0%,
		100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
	}
</style>
