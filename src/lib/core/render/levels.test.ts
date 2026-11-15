import { describe, expect, it } from 'vitest';
import { levelsLine } from './levels';

describe('the air as modelled for a year', () => {
	it('tells each level kept here, in one sentence for the year', () => {
		expect(
			levelsLine([
				{ kind: 'nitrogen dioxide', year: '2022', scale: 1, value: 23 },
				{ kind: 'fine particles', year: '2022', scale: 10, value: 8.4 }
			])
		).toBe(
			'As modelled for 2022, the air here held on average 23 micrograms of nitrogen dioxide in each cubic metre, and 8.4 of fine particles.'
		);
	});

	it('tells one alone, a whole level with no tenth, and nothing where none is kept', () => {
		expect(levelsLine([{ kind: 'fine particles', year: '2022', scale: 10, value: 9 }])).toBe(
			'As modelled for 2022, the air here held on average 9.0 micrograms of fine particles in each cubic metre.'
		);
		expect(levelsLine([])).toBeUndefined();
		expect(levelsLine(undefined)).toBeUndefined();
	});
});
