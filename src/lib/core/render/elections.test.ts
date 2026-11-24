import { describe, expect, it } from 'vitest';
import { electionLine } from './elections';

describe('electionLine (a ward’s last election, as recorded)', () => {
	it('tells when, how many voted and whom they elected', () => {
		expect(
			electionLine({
				'elections:date': '2026-05-07',
				'elections:turnout': '48.11',
				'elections:elected':
					'Ann Example (Invented Party); Bo Example (Other Party); Cy Example (Invented Party)'
			})
		).toBe(
			'In May 2026, 48% of those who could vote here did, and elected Ann Example (Invented Party), Bo Example (Other Party) and Cy Example (Invented Party).'
		);
	});

	it('tells whom an election elected where it gives no turnout, and nothing without an election', () => {
		expect(
			electionLine({
				'elections:date': '2022-06-30',
				'elections:elected': 'Ann Example (Invented Party)'
			})
		).toBe('In June 2022, it elected Ann Example (Invented Party).');
		expect(electionLine({})).toBeUndefined();
		expect(electionLine(undefined)).toBeUndefined();
	});
});
