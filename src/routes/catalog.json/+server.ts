import { json } from '@sveltejs/kit';
import data from '#catalog/games.json';

export const prerender = true;
export const trailingSlash = 'never';

export const GET = () => json(data);
