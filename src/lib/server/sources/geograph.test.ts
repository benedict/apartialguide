import { describe, expect, it } from 'vitest';
import { dumpPhotos, geographRecords, myriadsOf } from './geograph';

const box = '-0.09,51.37,-0.06,51.39';
const photo = (o: Record<string, unknown>) => ({
	id: 1,
	title: 'Long Street, looking east',
	lat: 51.38,
	long: -0.07,
	taken: '2009-05-02',
	realname: 'Ann Example',
	...o
});

describe('geographRecords (photographs and their titles)', () => {
	it('keeps the latest photograph in each patch, its title as found, when taken and by whom', () => {
		expect(
			geographRecords(
				{
					items: [
						photo({ id: 1, taken: '2005-01-01', title: 'Older' }),
						photo({ id: 2 }),
						photo({ id: 3, lat: 52 }),
						photo({ id: 4, title: '' })
					]
				},
				box
			)
		).toEqual([
			{
				id: '2',
				at: [51.38, -0.07],
				observed: '2009-05-02',
				claims: {
					name: 'Long Street, looking east',
					kind: 'photograph',
					taken: '2009-05',
					by: 'Ann Example'
				}
			}
		]);
	});

	it('keeps a month or a year where that is all the date gives, and none where there is no date', () => {
		const kept = geographRecords(
			{
				items: [
					photo({ id: 1, taken: '2005-03-00' }),
					photo({ id: 2, lat: 51.385, taken: '2007-00-00' }),
					photo({ id: 3, lat: 51.375, taken: '0000-00-00' })
				]
			},
			box
		);
		expect(kept.map((r) => [r.id, r.observed, r.claims.taken])).toEqual([
			['1', '2005-03', '2005-03'],
			['2', '2007', '2007']
		]);
	});

	it('never keeps a photograph without its photographer, as the licence asks for the credit', () => {
		expect(geographRecords({ items: [photo({ realname: '' })] }, box)).toEqual([]);
	});
});

describe('dumpPhotos (the rows of a Geograph dump)', () => {
	// An invented dump in the dump's own form: Windows-1252 bytes, quotes escaped with a backslash.
	const sql = [
		"INSERT INTO `gridimage_base` VALUES (11,3,'Ann Example','Invented Lane\\'s End','geograph','2009-05-02','TQ3366',733,166,'51.380000','-0.070000',1),",
		"(12,4,'Bo Example','\x93Quoted\x94 \x96 Place','accepted','2010-00-00','TQ3366',733,166,'51.381000','-0.071000',1),",
		"(13,5,'Cy Example','Turned away','rejected','2011-01-01','TQ3366',733,166,'51.382000','-0.072000',1);"
	].join('\n');
	const bytes = Uint8Array.from(sql, (c) => c.charCodeAt(0));

	it('reads each row, its words as Windows-1252, and leaves out what was not accepted', () => {
		expect(dumpPhotos(bytes)).toEqual([
			{
				id: '11',
				title: "Invented Lane's End",
				realname: 'Ann Example',
				taken: '2009-05-02',
				lat: 51.38,
				long: -0.07
			},
			{
				id: '12',
				title: '“Quoted” – Place',
				realname: 'Bo Example',
				taken: '2010-00-00',
				lat: 51.381,
				long: -0.071
			}
		]);
	});
});

describe('myriadsOf (the 100 km squares a box reaches)', () => {
	it('names the Ordnance Survey squares of a box, once each', () => {
		expect(myriadsOf('-0.16,51.29,0.00,51.42')).toEqual(['TQ']);
		expect(myriadsOf('-1.62,52.31,-1.54,52.37')).toEqual(['SP']);
		// A box across the line between TQ and TL, at northing 200 km.
		expect(myriadsOf('-0.10,51.66,-0.05,51.70')).toEqual(['TL', 'TQ']);
	});
});
