import { describe, expect, it } from 'vitest';
import { gridSquare, radonAreas, readDbf } from './radon';

/** A DBF file of invented rows, in the shape the atlas's file has: TILE, CLASS_MAX, VERSION. */
function dbf(rows: [string, number][]): Uint8Array {
	const fields: [string, string, number][] = [
		['TILE', 'C', 6],
		['CLASS_MAX', 'N', 10],
		['VERSION', 'C', 8]
	];
	const header = 32 + fields.length * 32 + 1;
	const record = 1 + fields.reduce((s, [, , l]) => s + l, 0);
	const out = new Uint8Array(header + rows.length * record + 1);
	const view = new DataView(out.buffer);
	out[0] = 3;
	view.setUint32(4, rows.length, true);
	view.setUint16(8, header, true);
	view.setUint16(10, record, true);
	fields.forEach(([name, type, length], i) => {
		const at = 32 + i * 32;
		out.set(new TextEncoder().encode(name), at);
		out[at + 11] = type.charCodeAt(0);
		out[at + 16] = length;
	});
	out[header - 1] = 0x0d;
	rows.forEach(([tile, cls], i) => {
		const at = header + i * record;
		out[at] = 0x20;
		const text = tile.padEnd(6) + String(cls).padStart(10) + 'v'.padEnd(8);
		out.set(new TextEncoder().encode(text), at + 1);
	});
	return out;
}

describe('gridSquare', () => {
	it('reads an Ordnance Survey kilometre square as its south-west corner', () => {
		expect(gridSquare('TQ3366')).toEqual([533000, 166000]);
		expect(gridSquare('SP2972')).toEqual([429000, 272000]);
		expect(gridSquare('NL5479')).toEqual([54000, 779000]);
		expect(gridSquare('XX')).toBeUndefined();
	});
});

describe('readDbf', () => {
	it('reads each row of a DBF file by its fields, trimmed', () => {
		expect(readDbf(dbf([['TQ3366', 2]]))).toEqual([
			{ TILE: 'TQ3366', CLASS_MAX: '2', VERSION: 'v' }
		]);
	});
});

describe('radonAreas', () => {
	it('keeps each square in the box of class 2 or above, as an area of its band, and none of class 1', () => {
		const rows = readDbf(
			dbf([
				['TQ3366', 1],
				['TQ3367', 3],
				['TQ3368', 6],
				['SP2972', 4]
			])
		);
		const areas = radonAreas(rows, '-0.12,51.37,-0.05,51.40');
		expect(areas.map((a) => [a.id, a.kind, a.name, a.claims])).toEqual([
			['TQ3367', 'radon', '3 to 5%', { class: '3' }],
			['TQ3368', 'radon', '30% or more', { class: '6' }]
		]);
		const [lat, lon] = areas[0].rings[0][0];
		expect(lat).toBeGreaterThan(51.37);
		expect(lat).toBeLessThan(51.39);
		expect(lon).toBeGreaterThan(-0.1);
		expect(lon).toBeLessThan(-0.06);
		expect(areas[0].rings[0]).toHaveLength(5);
	});
});
