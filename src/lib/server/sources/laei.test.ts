import { describe, expect, it } from 'vitest';
import { decodeRow } from '../../core/valuegrid';
import { levelGrid, readAsc } from './laei';

// An invented grid in the form the London inventory writes: two rows, three columns, from the north.
const ASC = [
	'NCOLS 3 ',
	'NROWS 2 ',
	'XLLCORNER 500000 ',
	'YLLCORNER 150000 ',
	'CELLSIZE 20 ',
	'NODATA_value -9999 ',
	'21.4 22.6 -9999',
	'17.04 18.5 19.96',
	''
].join('\n');

describe('the modelled air, read from its grid', () => {
	it('reads the cell a point falls in, from the north, and nothing where there is no data', () => {
		const grid = readAsc(ASC);
		expect([grid.width, grid.height, grid.west, grid.north, grid.cell]).toEqual([
			3, 2, 500000, 150040, 20
		]);
		expect(grid.at(500010, 150030)).toBe(21.4);
		expect(grid.at(500050, 150010)).toBe(19.96);
		expect(grid.at(500050, 150030)).toBeUndefined();
		expect(grid.at(499990, 150010)).toBeUndefined();
	});

	it('keeps the levels on a grid of the box by their scale, and nought where there is none', () => {
		// A sampler that gives 17.04 in the west half of the box, 8.36 in the east, none to the north.
		const sample = (lat: number, lon: number) =>
			lat > 51.001 ? undefined : lon < -0.9985 ? 17.04 : 8.36;
		const grid = levelGrid(sample, '-1,51,-0.997,51.002', {
			kind: 'nitrogen dioxide',
			year: '2022',
			scale: 10,
			cellM: 111.32
		});
		expect([grid.kind, grid.year, grid.scale]).toEqual(['nitrogen dioxide', '2022', 10]);
		expect(grid.rows.map(decodeRow)[0].slice(0, 2)).toEqual([170, 84]);
		expect(decodeRow(grid.rows.at(-1)!).every((c) => c === 0)).toBe(true);
	});
});
