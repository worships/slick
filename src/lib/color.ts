export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
	let h = hex.replace('#', '').trim();
	if (h.length === 3) h = [...h].map((c) => c + c).join('');
	const n = parseInt(h.slice(0, 6), 16);
	if (Number.isNaN(n)) return [129, 140, 248];
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l * 100];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
	else if (max === g) h = (b - r) / d + 2;
	else h = (r - g) / d + 4;
	return [h * 60, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
	h = ((h % 360) + 360) % 360;
	s = Math.max(0, Math.min(100, s)) / 100;
	l = Math.max(0, Math.min(100, l)) / 100;
	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function shift(hex: string, deg: number, sat?: number, light?: number): RGB {
	const [h, s, l] = rgbToHsl(hexToRgb(hex));
	return hslToRgb(h + deg, sat ?? s, light ?? l);
}

export function mix(a: RGB, b: RGB, t: number): RGB {
	return [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t)
	];
}

export const rgbStr = (c: RGB) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
export const rgbList = (c: RGB) => `${c[0]},${c[1]},${c[2]}`;
