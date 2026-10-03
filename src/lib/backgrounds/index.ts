import type { Component } from 'svelte';
import {
	Blend,
	CircleOff,
	CloudRain,
	Droplets,
	Hexagon as HexagonIcon,
	Orbit,
	PartyPopper,
	Sparkles,
	Tornado
} from '@lucide/svelte';

import Rain from './Rain.svelte';
import Stars from './Stars.svelte';
import GravityStars from './GravityStars.svelte';
import Bubble from './Bubble.svelte';
import Fireworks from './Fireworks.svelte';
import Gradient from './Gradient.svelte';
import Hexagon from './Hexagon.svelte';
import Hole from './Hole.svelte';

export type BackgroundId =
	| 'rain'
	| 'stars'
	| 'gravity-stars'
	| 'bubble'
	| 'fireworks'
	| 'gradient'
	| 'hexagon'
	| 'hole'
	| 'none';

export type BgOption =
	| {
			key: string;
			label: string;
			type: 'range';
			min: number;
			max: number;
			step: number;
			default: number;
	  }
	| { key: string; label: string; type: 'toggle'; default: boolean }
	| { key: string; label: string; type: 'select'; choices: string[]; default: string };

export type BackgroundDef = {
	id: BackgroundId;
	name: string;
	icon: Component;
	component: Component<any> | null;
	// dim level set when this background is picked
	dim: number;
	hint?: string;
	options: BgOption[];
};

const themed = (def = true): BgOption => ({
	key: 'themed',
	label: 'Use accent colors',
	type: 'toggle',
	default: def
});

export const backgrounds: BackgroundDef[] = [
	{
		id: 'rain',
		name: 'Rain',
		icon: CloudRain,
		component: Rain,
		dim: 0,
		options: [
			{ key: 'density', label: 'Density', type: 'range', min: 0.2, max: 2.5, step: 0.1, default: 1 },
			{ key: 'speed', label: 'Speed', type: 'range', min: 0.3, max: 2, step: 0.1, default: 1 },
			{ key: 'wind', label: 'Wind', type: 'range', min: -1, max: 1, step: 0.05, default: 0.15 },
			{ key: 'lightning', label: 'Lightning', type: 'toggle', default: true },
			{ key: 'splashes', label: 'Splashes', type: 'toggle', default: true }
		]
	},
	{
		id: 'stars',
		name: 'Stars',
		icon: Sparkles,
		component: Stars,
		dim: 0,
		hint: 'Parallax follows your cursor',
		options: [
			{ key: 'speed', label: 'Speed', type: 'range', min: 0.25, max: 4, step: 0.25, default: 1 },
			{ key: 'factor', label: 'Parallax', type: 'range', min: 0, max: 0.15, step: 0.01, default: 0.05 }
		]
	},
	{
		id: 'gravity-stars',
		name: 'Gravity Stars',
		icon: Orbit,
		component: GravityStars,
		dim: 0,
		hint: 'Stars react to your cursor',
		options: [
			{ key: 'starsCount', label: 'Stars', type: 'range', min: 20, max: 250, step: 5, default: 75 },
			{ key: 'starsSize', label: 'Size', type: 'range', min: 1, max: 5, step: 0.5, default: 2 },
			{ key: 'glowIntensity', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, default: 15 },
			{ key: 'movementSpeed', label: 'Drift', type: 'range', min: 0, max: 2, step: 0.05, default: 0.3 },
			{ key: 'mouseInfluence', label: 'Cursor reach', type: 'range', min: 20, max: 300, step: 10, default: 100 },
			{ key: 'mouseGravity', label: 'Cursor gravity', type: 'select', choices: ['attract', 'repel'], default: 'attract' },
			{ key: 'starsInteraction', label: 'Star collisions', type: 'toggle', default: false },
			{ key: 'starsInteractionType', label: 'Collision type', type: 'select', choices: ['bounce', 'merge'], default: 'bounce' },
			themed()
		]
	},
	{
		id: 'bubble',
		name: 'Bubble',
		icon: Droplets,
		component: Bubble,
		dim: 0.35,
		options: [{ key: 'interactive', label: 'Follow cursor', type: 'toggle', default: true }, themed(false)]
	},
	{
		id: 'fireworks',
		name: 'Fireworks',
		icon: PartyPopper,
		component: Fireworks,
		dim: 0,
		hint: 'Click anywhere empty to launch one',
		options: [
			{ key: 'population', label: 'Frequency', type: 'range', min: 0.25, max: 4, step: 0.25, default: 1 },
			themed(false)
		]
	},
	{
		id: 'gradient',
		name: 'Gradient',
		icon: Blend,
		component: Gradient,
		dim: 0.45,
		options: [
			{ key: 'duration', label: 'Cycle (seconds)', type: 'range', min: 4, max: 40, step: 1, default: 15 },
			themed()
		]
	},
	{
		id: 'hexagon',
		name: 'Hexagon',
		icon: HexagonIcon,
		component: Hexagon,
		dim: 0,
		hint: 'Hover the grid to light it up',
		options: [
			{ key: 'hexagonSize', label: 'Size', type: 'range', min: 51, max: 150, step: 1, default: 75 },
			{ key: 'hexagonMargin', label: 'Gap', type: 'range', min: 1, max: 8, step: 1, default: 3 }
		]
	},
	{
		id: 'hole',
		name: 'Hole',
		icon: Tornado,
		component: Hole,
		dim: 0.25,
		options: [
			{ key: 'numberOfLines', label: 'Lines', type: 'range', min: 10, max: 100, step: 5, default: 50 },
			{ key: 'numberOfDiscs', label: 'Discs', type: 'range', min: 20, max: 100, step: 5, default: 50 },
			themed()
		]
	},
	{
		id: 'none',
		name: 'None',
		icon: CircleOff,
		component: null,
		dim: 0,
		options: []
	}
];

export function defaultBgOptions() {
	return Object.fromEntries(
		backgrounds.map((b) => [b.id, Object.fromEntries(b.options.map((o) => [o.key, o.default]))])
	) as Record<BackgroundId, Record<string, number | boolean | string>>;
}
