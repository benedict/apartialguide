import type { LatLon } from './geo';

/**
 * Values another source keeps on a grid over the map, such as road noise: a band's code in each
 * cell, latitude and longitude, from the south-west corner; each row kept as runs of codes. Code 0
 * is no band, and says nothing.
 */
export interface ValueGrid {
	/** The zone's name, the same for every band, so a step between bands of it says nothing. */
	name: string;
	kind: string;
	south: number;
	west: number;
	dLat: number;
	dLon: number;
	/** Rows from the south, each as runs: "0x3,2x2,1" is 0, 0, 0, 2, 2, 1. */
	rows: string[];
	/** The words for each code, the source's bands; the first, for 0, unused. */
	bands: string[];
}

/** A row of codes as runs. */
export function encodeRow(codes: readonly number[]): string {
	const runs: string[] = [];
	for (let i = 0; i < codes.length;) {
		let j = i;
		while (j < codes.length && codes[j] === codes[i]) j++;
		runs.push(j - i > 1 ? `${codes[i]}x${j - i}` : String(codes[i]));
		i = j;
	}
	return runs.join(',');
}

/** A row's runs as its codes. */
export function decodeRow(row: string): number[] {
	if (!row) return [];
	return row.split(',').flatMap((run) => {
		const [code, times] = run.split('x');
		return Array<number>(times ? Number(times) : 1).fill(Number(code));
	});
}

const decoded = new WeakMap<ValueGrid, Map<number, number[]>>();

/** The band the grid gives where a point lies, if any. */
export function valueAt(grid: ValueGrid, [lat, lon]: LatLon): string | undefined {
	const r = Math.floor((lat - grid.south) / grid.dLat);
	const c = Math.floor((lon - grid.west) / grid.dLon);
	if (r < 0 || r >= grid.rows.length || c < 0) return undefined;
	let rows = decoded.get(grid);
	if (!rows) decoded.set(grid, (rows = new Map()));
	let row = rows.get(r);
	if (!row) rows.set(r, (row = decodeRow(grid.rows[r])));
	const code = row[c];
	return code ? grid.bands[code] : undefined;
}
