import type { AreaRecord } from '../../core/areas';
import type { LatLon } from '../../core/geo';
import { fromNationalGrid } from '../gpkg';

/** The 25 letters of an Ordnance Survey grid square, read from the top left; I is not used. */
const LETTERS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

/** A letter's place in its 5×5 square, in units of the square's side: east, north. */
function cell(letter: string): [number, number] | undefined {
	const i = LETTERS.indexOf(letter);
	return i < 0 ? undefined : [i % 5, 4 - Math.floor(i / 5)];
}

/**
 * An Ordnance Survey kilometre square ("TQ3366") as the easting and northing of its south-west
 * corner, in metres. The first letter is the 500 km square, counted from the false origin's SV.
 */
export function gridSquare(ref: string): [number, number] | undefined {
	const m = /^([A-Z])([A-Z])(\d\d)(\d\d)$/.exec(ref.trim());
	if (!m) return undefined;
	const big = cell(m[1]);
	const small = cell(m[2]);
	if (!big || !small) return undefined;
	// The false origin lies at S's south-west corner: S is (2, 1) in the grid of 500 km squares.
	const e = (big[0] - 2) * 500_000 + small[0] * 100_000 + Number(m[3]) * 1000;
	const n = (big[1] - 1) * 500_000 + small[1] * 100_000 + Number(m[4]) * 1000;
	return [e, n];
}

/** Each row of a DBF file, by its fields, trimmed. */
export function readDbf(bytes: Uint8Array): Record<string, string>[] {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const count = view.getUint32(4, true);
	const header = view.getUint16(8, true);
	const size = view.getUint16(10, true);
	const decoder = new TextDecoder('latin1');
	const fields: { name: string; length: number }[] = [];
	for (let at = 32; bytes[at] !== 0x0d && at < header; at += 32) {
		const name = decoder.decode(bytes.subarray(at, at + 11)).replace(/\0.*$/, '');
		fields.push({ name, length: bytes[at + 16] });
	}
	const rows: Record<string, string>[] = [];
	for (let r = 0; r < count; r++) {
		let at = header + r * size;
		if (bytes[at] === 0x2a) continue; // a row marked deleted
		at++;
		const row: Record<string, string> = {};
		for (const f of fields) {
			row[f.name] = decoder.decode(bytes.subarray(at, at + f.length)).trim();
			at += f.length;
		}
		rows.push(row);
	}
	return rows;
}

/**
 * The band of homes each class estimates at or above the radon action level, as the atlas's
 * user guide gives it (BGS/UKHSA, Table 1): a code from a fixed list, read as its words.
 */
export const RADON_BANDS: Record<string, string> = {
	'2': '1 to 3%',
	'3': '3 to 5%',
	'4': '5 to 10%',
	'5': '10 to 30%',
	'6': '30% or more'
};

/**
 * The atlas's kilometre squares that reach into the box, each as an area of its class's band.
 * A square of class 1, below 1%, is no radon affected area and is left out, so crossing from
 * one affected square to another of the same band says nothing, and leaving the last says so.
 */
export function radonAreas(rows: readonly Record<string, string>[], bbox: string): AreaRecord[] {
	const [w, s, e, n] = bbox.split(',').map(Number);
	const areas: AreaRecord[] = [];
	for (const row of rows) {
		const band = RADON_BANDS[row.CLASS_MAX];
		const corner = band && gridSquare(row.TILE);
		if (!corner) continue;
		const [x, y] = corner;
		const ring = [
			[x, y],
			[x + 1000, y],
			[x + 1000, y + 1000],
			[x, y + 1000],
			[x, y]
		].map((p): LatLon => {
			const [lon, lat] = fromNationalGrid(p);
			return [lat, lon];
		});
		const inBox = ring.some(([lat, lon]) => lat >= s && lat <= n && lon >= w && lon <= e);
		if (!inBox) continue;
		areas.push({
			id: row.TILE,
			name: band,
			kind: 'radon',
			rings: [ring],
			claims: { class: row.CLASS_MAX }
		});
	}
	return areas;
}
