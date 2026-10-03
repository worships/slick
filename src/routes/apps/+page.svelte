<script lang="ts">
	import { LayoutGrid } from '@lucide/svelte';
	import CatalogView from '#lib/components/CatalogView.svelte';
	import { catalog } from '#lib/catalog.svelte.ts';
</script>

<CatalogView
	items={catalog.apps}
	title="Apps"
	description="Sites and tools that aren't games."
	icon={LayoutGrid}
	noun="apps"
/>
