<script lang="ts">
	let { count = 10, class: cls = '' }: { count?: number; class?: string } = $props();
</script>

<div class={cls} aria-hidden="true">
	{#each { length: count }, i (i)}
		<div class="overflow-hidden rounded-2xl border border-line bg-[rgb(10_10_16/0.55)]">
			<div class="aspect-4/3 animate-pulse bg-white/4"></div>
			<div class="space-y-2 px-3.5 py-3">
				<div class="h-3 w-2/3 animate-pulse rounded bg-white/8"></div>
				<div class="h-2.5 w-1/3 animate-pulse rounded bg-white/5"></div>
			</div>
		</div>
	{/each}
</div>
