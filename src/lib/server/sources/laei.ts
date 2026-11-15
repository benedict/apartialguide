import { encodeRow, type LevelGrid } from '../../core/valuegrid';
import type { Raster } from './noise';

/**
 * An ESRI ASCII grid, as the London Atmospheric Emissions Inventory writes its modelled levels: a
 * header of six lines, then rows of values from the north, in the grid's own metres (British
 * National Grid); its no-data value read as no value.
 */
export function readAsc(text: string): Raster {
	const lines = text.split('\n');
	const head: Record<string, number> = {};
	for (const line of lines.slice(0, 6)) {
		const [key, value] = line.trim().split(/\s+/);
		head[key.toUpperCase()] = Number(value);
	}
	const width = head.NCOLS;
	const height = head.NROWS;
	const cell = head.CELLSIZE;
	const west = head.XLLCORNER;
	const north = head.YLLCORNER + height * cell;
	const nodata = head.NODATA_VALUE;
	const rows = new Map<number, number[]>();
	const row = (r: number) => {
		let values = rows.get(r);
		if (!values) rows.set(r, (values = lines[6 + r].trim().split(/\s+/).map(Number)));
		return values;
	};
	return {
		width,
		height,
		west,
		north,
		cell,
		at(x, y) {
			const col = Math.floor((x - west) / cell);
			const r = Math.floor((north - y) / cell);
			if (col < 0 || r < 0 || col >= width || r >= height) return undefined;
			const value = row(r)[col];
			return value === nodata || !Number.isFinite(value) ? undefined : value;
		}
	};
}

/**
 * Levels over the box as a grid of about `cellM` metres a cell, latitude and longitude, from a
 * sampler that gives the level at a point, or nothing where the source has none: kept as the level
 * times `scale`, rounded, so 8.36 at a scale of 10 is kept as 84 and said as 8.4.
 */
export function levelGrid(
	sample: (lat: number, lon: number) => number | undefined,
	bbox: string,
	{ kind, year, scale, cellM }: { kind: string; year: string; scale: number; cellM: number }
): LevelGrid {
	const [w, s, e, n] = bbox.split(',').map(Number);
	const dLat = cellM / 111_320;
	const dLon = cellM / (111_320 * Math.cos((((s + n) / 2) * Math.PI) / 180));
	const rows: string[] = [];
	for (let lat = s; lat < n; lat += dLat) {
		const codes: number[] = [];
		for (let lon = w; lon < e; lon += dLon) {
			const level = sample(lat + dLat / 2, lon + dLon / 2);
			codes.push(level === undefined || !(level > 0) ? 0 : Math.max(1, Math.round(level * scale)));
		}
		rows.push(encodeRow(codes));
	}
	return { kind, year, scale, south: s, west: w, dLat, dLon, rows };
}
