import { describe, expect, it } from 'vitest';
import { checkPlace, REGISTER, type Place } from './register';

// An invented place and invented file names: only the names' prefixes matter.
const inventa: Place = {
	name: 'inventa',
	snapshot: 'inventa',
	records: 'data/records/inventa',
	in: ['england'],
	waiting: { epc: 'needs a key' }
};
const everyEnglishFile = Object.values(REGISTER)
	.filter((s) => s.reach === 'england')
	.flatMap((s) => s.writes.map((p) => `${p}-2026-01-01.json`));

describe('the register of sources', () => {
	it('finds nothing missing where every source the place is in has written a file', () => {
		const files = everyEnglishFile.filter((f) => !f.startsWith('epc-'));
		expect(checkPlace(inventa, files)).toEqual({
			missing: [],
			waiting: [{ source: 'epc', why: 'needs a key' }],
			stale: []
		});
	});

	it('names a source that was never fetched, and one fetched in part', () => {
		// protected writes listed buildings and protected trees: the trees alone is not enough.
		const files = everyEnglishFile.filter(
			(f) => !f.startsWith('floodzone-') && !f.startsWith('listed-') && !f.startsWith('epc-')
		);
		expect(checkPlace(inventa, files).missing).toEqual(['protected', 'floodzones']);
	});

	it('counts a file fetched for one area, or with nothing in it, as fetched', () => {
		const files = everyEnglishFile
			.filter((f) => !f.startsWith('hygiene-') && !f.startsWith('epc-'))
			.concat('hygiene.shirley-2026-01-01.json');
		expect(checkPlace(inventa, files).missing).toEqual([]);
	});

	it('asks nothing of a place that the source does not reach', () => {
		expect(checkPlace(inventa, everyEnglishFile).missing).not.toContain('ghostsigns');
		const london: Place = { ...inventa, in: ['england', 'london'], waiting: {} };
		expect(checkPlace(london, everyEnglishFile).missing).toEqual([
			'planning',
			'air',
			'ghostsigns',
			'trees'
		]);
	});

	it('calls a wait stale once the source has been fetched, so the list does not rot', () => {
		expect(checkPlace(inventa, everyEnglishFile).stale).toEqual(['epc']);
	});

	it('ignores files that are not records, and folders', () => {
		const files = [
			...everyEnglishFile.filter((f) => !f.startsWith('epc-')),
			'request.env',
			'README.md'
		];
		expect(checkPlace(inventa, files)).toMatchObject({ missing: [], stale: [] });
	});
});
