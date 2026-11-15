import { encodeRow, type ValueGrid } from '../../core/valuegrid';

/** A grid of values read from a TIFF, and where it lies: its western edge, northern edge and cell. */
export interface Raster {
	width: number;
	height: number;
	west: number;
	north: number;
	cell: number;
	/** The value of the cell a point in the grid's own metres falls in, if it falls in one. */
	at(x: number, y: number): number | undefined;
}

/**
 * A TIFF of 32-bit floats, uncompressed, in strips or tiles, either byte order, placed by its
 * ModelTransformation, as the Environment Agency's coverage service writes the noise maps.
 */
export function readTiff(bytes: Uint8Array): Raster {
	const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const little = v.getUint8(0) === 0x49;
	const u16 = (at: number) => v.getUint16(at, little);
	const u32 = (at: number) => v.getUint32(at, little);
	const ifd = u32(4);
	const tags = new Map<number, { type: number; count: number; at: number }>();
	for (let i = 0; i < u16(ifd); i++) {
		const at = ifd + 2 + i * 12;
		tags.set(u16(at), { type: u16(at + 2), count: u32(at + 4), at: at + 8 });
	}
	const size = (type: number) => (type === 3 ? 2 : type === 12 ? 8 : 4);
	const list = (tag: number): number[] => {
		const t = tags.get(tag);
		if (!t) return [];
		const at = t.count * size(t.type) > 4 ? u32(t.at) : t.at;
		return Array.from({ length: t.count }, (_, i) => {
			const p = at + i * size(t.type);
			return t.type === 3 ? u16(p) : t.type === 12 ? v.getFloat64(p, little) : u32(p);
		});
	};
	const [width] = list(256);
	const [height] = list(257);
	const [compression] = list(259);
	if (compression !== 1) throw new Error(`a TIFF compressed (${compression}) is not read here`);
	const m = list(34264);
	const [cell, , , x0, , , , y0] = m;
	// GeoTIFF's raster type (GeoKey 1025): 2 puts each value at its cell's centre, not its corner.
	const keys = list(34735);
	let pointed = false;
	for (let i = 4; i + 3 < keys.length; i += 4) if (keys[i] === 1025) pointed = keys[i + 3] === 2;
	const west = pointed ? x0 - cell / 2 : x0;
	const north = pointed ? y0 + cell / 2 : y0;
	const tiled = tags.has(322);
	const blockW = tiled ? list(322)[0] : width;
	const blockH = tiled ? list(323)[0] : (list(278)[0] ?? height);
	const offsets = tiled ? list(324) : list(273);
	const across = Math.ceil(width / blockW);
	const value = (col: number, row: number) => {
		const block = Math.floor(row / blockH) * across + Math.floor(col / blockW);
		const within = (row % blockH) * blockW + (col % blockW);
		return v.getFloat32(offsets[block] + within * 4, little);
	};
	return {
		width,
		height,
		west,
		north,
		cell,
		at(x, y) {
			const col = Math.floor((x - west) / cell);
			const row = Math.floor((north - y) / cell);
			return col < 0 || row < 0 || col >= width || row >= height ? undefined : value(col, row);
		}
	};
}

/** The bands of loud road noise, by the day-evening-night average; quieter ground has none. */
export const NOISE_BANDS = ['', '65 to 70 decibels', '70 to 75 decibels', '75 decibels or more'];
const codeOf = (db: number | undefined) =>
	db === undefined || !(db >= 65) ? 0 : db >= 75 ? 3 : db >= 70 ? 2 : 1;

/** About ten metres, the noise maps' own cell, in degrees of latitude. */
const CELL_M = 10;

/**
 * Road noise over the box as a grid of bands, about ten metres a cell, latitude and longitude, from
 * a sampler that gives the noise map's value in decibels at a point.
 */
export function noiseGrid(
	sample: (lat: number, lon: number) => number | undefined,
	bbox: string
): ValueGrid {
	const [w, s, e, n] = bbox.split(',').map(Number);
	const dLat = CELL_M / 111_320;
	const dLon = CELL_M / (111_320 * Math.cos((((s + n) / 2) * Math.PI) / 180));
	const rows: string[] = [];
	for (let lat = s; lat < n; lat += dLat) {
		const codes: number[] = [];
		for (let lon = w; lon < e; lon += dLon)
			codes.push(codeOf(sample(lat + dLat / 2, lon + dLon / 2)));
		rows.push(encodeRow(codes));
	}
	return {
		name: 'road noise',
		kind: 'road noise',
		south: s,
		west: w,
		dLat,
		dLon,
		rows,
		bands: NOISE_BANDS
	};
}
