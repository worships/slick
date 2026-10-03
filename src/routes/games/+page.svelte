<script lang="ts">
	import { Gamepad2 } from '@lucide/svelte';
	import CatalogView from '#lib/components/CatalogView.svelte';
	import { catalog } from '#lib/catalog.svelte.ts';
</script>

<CatalogView
	items={catalog.games}
	title="Games"
	description="Star a game to add it to your favorites."
	icon={Gamepad2}
	noun="games"
/>
