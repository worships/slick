<script lang="ts">
	let { checked = $bindable(false), label }: { checked?: boolean; label: string } = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	onclick={() => (checked = !checked)}
	class="focus-ring relative inline-flex h-5.5 w-9.5 shrink-0 items-center rounded-full border transition-colors
		{checked ? 'border-accent/60 bg-accent' : 'border-line-strong bg-white/8'}"
>
	<span
		class="inline-block size-4 rounded-full bg-white shadow transition-transform duration-200
			{checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}"
	></span>
</button>
