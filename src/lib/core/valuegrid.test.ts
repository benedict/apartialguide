import { describe, expect, it } from 'vitest';
import {
	encodeRow,
	decodeRow,
	levelAt,
	valueAt,
	type LevelGrid,
	type ValueGrid
} from './valuegrid';

describe('a grid of values over the map', () => {
	it('keeps a row as runs of codes, and reads it back', () => {
		const row = [0, 0, 0, 2, 2, 1, 0];
		expect(encodeRow(row)).toBe('0x3,2x2,1,0');
		expect(decodeRow('0x3,2x2,1,0')).toEqual(row);
	});

	it('gives the band where a point lies, and nothing outside the grid or where the code is nought', () => {
		// An invented grid of two rows and three columns, south-west corner first.
		const grid: ValueGrid = {
			name: 'road noise',
			kind: 'road noise',
			south: 51,
			west: -1,
			dLat: 0.001,
			dLon: 0.001,
			rows: [encodeRow([0, 1, 2]), encodeRow([3, 0, 1])],
			bands: ['', '65 to 70 decibels', '70 to 75 decibels', '75 decibels or more']
		};
		expect(valueAt(grid, [51.0005, -0.9985])).toBe('65 to 70 decibels');
		expect(valueAt(grid, [51.0015, -0.9995])).toBe('75 decibels or more');
		expect(valueAt(grid, [51.0005, -0.9995])).toBeUndefined();
		expect(valueAt(grid, [52, -0.9995])).toBeUndefined();
	});
});

describe('a grid of levels over the map', () => {
	it('gives the level where a point lies, by its scale, and nothing where the code is nought', () => {
		// Invented levels: codes are tenths, so 84 is 8.4.
		const grid: LevelGrid = {
			kind: 'fine particles',
			year: '2022',
			scale: 10,
			south: 51,
			west: -1,
			dLat: 0.001,
			dLon: 0.001,
			rows: [encodeRow([0, 84, 90])]
		};
		expect(levelAt(grid, [51.0005, -0.9985])).toBe(8.4);
		expect(levelAt(grid, [51.0005, -0.9975])).toBe(9);
		expect(levelAt(grid, [51.0005, -0.9995])).toBeUndefined();
		expect(levelAt(grid, [52, -0.9985])).toBeUndefined();
	});
});
