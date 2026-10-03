<!-- Svelte port of Animate UI's HexagonBackground (https://animate-ui.com/docs/components/backgrounds/hexagon) -->
<script lang="ts">
	type Props = { hexagonSize?: number; hexagonMargin?: number; accent?: string };

	let { hexagonSize = 75, hexagonMargin = 3, accent = '#818cf8' }: Props = $props();

	const hexagonWidth = $derived(hexagonSize);
	const hexagonHeight = $derived(hexagonSize * 1.1);
	// rows overlap by a quarter of their height, plus enough that diagonal gaps match vertical ones
	const rowSpacing = $derived(hexagonHeight * 0.75 + hexagonMargin * 0.87);
	const computedMarginTop = $derived(rowSpacing - hexagonHeight);
	const oddRowMarginLeft = $derived(-(hexagonSize / 2));
	const evenRowMarginLeft = $derived(hexagonMargin / 2);

	let vw = $state(0);
	let vh = $state(0);

	const rows = $derived(vh ? Math.ceil(vh / rowSpacing) + 1 : 0);
	const columns = $derived(vw ? Math.ceil(vw / hexagonWidth) + 1 : 0);
</script>

<svelte:window bind:innerWidth={vw} bind:innerHeight={vh} />

<div class="hexagon-bg" style="--hexagon-margin: {hexagonMargin}px; --hex-accent: {accent}">
	<div class="grid">
		{#each { length: rows }, rowIndex (rowIndex)}
			<div
				class="row"
				style="margin-top: {computedMarginTop}px; margin-left: {((rowIndex + 1) % 2 === 0
					? evenRowMarginLeft
					: oddRowMarginLeft) - 10}px"
			>
				{#each { length: columns }, colIndex (colIndex)}
					<div
						class="hex"
						style="width: {hexagonWidth}px; height: {hexagonHeight}px; margin-left: {hexagonMargin}px"
					></div>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	.hexagon-bg {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: #171717; /* neutral-900 */
	}
	.grid {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	.row {
		display: flex;
	}
	.hex {
		position: relative;
		flex-shrink: 0;
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
	}
	.hex::before,
	.hex::after {
		content: '';
		position: absolute;
		background: #0a0a0a; /* neutral-950 */
		transition: background-color 1s;
	}
	.hex::before {
		inset: 0;
	}
	.hex::after {
		inset: var(--hexagon-margin);
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
	}
	.hex:hover::before {
		background: color-mix(in oklab, var(--hex-accent) 70%, #0a0a0a);
		transition-duration: 0s;
	}
	.hex:hover::after {
		background: color-mix(in oklab, var(--hex-accent) 14%, #0a0a0a);
		transition-duration: 0s;
	}
</style>
