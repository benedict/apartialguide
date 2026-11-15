import { describe, expect, it } from 'vitest';
import { noiseGrid, readTiff, NOISE_BANDS } from './noise';
import { valueAt } from '../../core/valuegrid';

/** An invented TIFF of 32-bit floats in one strip, little-endian, with its place in metres. */
function tiff(
	width: number,
	height: number,
	values: number[],
	origin: [number, number],
	cell: number
) {
	const entries: [number, number, number, number][] = [
		[256, 3, 1, width],
		[257, 3, 1, height],
		[258, 3, 1, 32],
		[259, 3, 1, 1],
		[273, 4, 1, 0], // strip offset, set below
		[277, 3, 1, 1],
		[278, 3, 1, height],
		[279, 4, 1, width * height * 4],
		[339, 3, 1, 3],
		[34264, 12, 16, 0] // ModelTransformation, set below
	];
	const ifd = 8;
	const ifdSize = 2 + entries.length * 12 + 4;
	const transformAt = ifd + ifdSize;
	const dataAt = transformAt + 16 * 8;
	const out = new ArrayBuffer(dataAt + values.length * 4);
	const v = new DataView(out);
	v.setUint8(0, 0x49);
	v.setUint8(1, 0x49);
	v.setUint16(2, 42, true);
	v.setUint32(4, ifd, true);
	v.setUint16(ifd, entries.length, true);
	entries.forEach(([tag, type, count, value], i) => {
		const at = ifd + 2 + i * 12;
		v.setUint16(at, tag, true);
		v.setUint16(at + 2, type, true);
		v.setUint32(at + 4, count, true);
		const val = tag === 273 ? dataAt : tag === 34264 ? transformAt : value;
		if (type === 3) v.setUint16(at + 8, val, true);
		else v.setUint32(at + 8, val, true);
	});
	const m = [cell, 0, 0, origin[0], 0, -cell, 0, origin[1], 0, 0, 0, 0, 0, 0, 0, 1];
	m.forEach((x, i) => v.setFloat64(transformAt + i * 8, x, true));
	values.forEach((x, i) => v.setFloat32(dataAt + i * 4, x, true));
	return new Uint8Array(out);
}

describe('readTiff', () => {
	it('reads a grid of floats and where it lies, its first row the northern', () => {
		const t = readTiff(tiff(2, 2, [70, 50, 66, -96], [500000, 200020], 10));
		expect([t.width, t.height, t.west, t.north, t.cell]).toEqual([2, 2, 500000, 200020, 10]);
		expect(t.at(500005, 200015)).toBe(70);
		expect(t.at(500015, 200005)).toBe(-96);
		expect(t.at(499995, 200015)).toBeUndefined();
	});
});

describe('noiseGrid', () => {
	it('bands the loud ground, 65 decibels or more, and leaves the rest as no band', () => {
		// An invented place: loud to the west of a line, quiet to the east.
		const grid = noiseGrid((lat, lon) => (lon < -0.1 ? 72 : 50), '-0.101,51.38,-0.099,51.381');
		expect(grid.bands).toEqual(NOISE_BANDS);
		expect(valueAt(grid, [51.3805, -0.1005])).toBe('70 to 75 decibels');
		expect(valueAt(grid, [51.3805, -0.0995])).toBeUndefined();
	});
});
