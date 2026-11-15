import { describe, expect, it } from 'vitest';
import { destination, type LatLon } from './geo';
import { fixedClock } from './facts';
import { Narrator } from './narrator';
import { SyntheticMap } from './testing/synthetic';
import { compileWorld } from './adventure/world';

const O = SyntheticMap.ORIGIN;
const square = (half: number): LatLon[] => {
	const [n, e, s, w] = [0, 90, 180, 270].map((b) => destination(O, b, half));
	return [
		[n[0], w[1]],
		[n[0], e[1]],
		[s[0], e[1]],
		[s[0], w[1]],
		[n[0], w[1]]
	];
};

describe('zones with holes', () => {
	it('puts a point in a hole outside the zone, as another rock lies there instead', () => {
		const map = new SyntheticMap();
		map.way([map.node(O), map.nodeFrom(O, 90, 40)]);
		const n = Narrator.fromOsm(map.toData(), {
			clock: fixedClock('2026-11-08'),
			records: [
				{
					source: 'Invented rocks',
					prefix: 'rock',
					retrieved: '2026-11-08',
					records: [],
					overlay: true,
					areas: [
						{
							id: 'r1',
							name: 'INVENTED GROUP',
							kind: 'bedrock',
							rings: [square(500)],
							holes: [square(50)]
						}
					]
				}
			]
		});
		expect(n.zonesAt(O)).toEqual([]);
		expect(n.zonesAt(destination(O, 0, 200)).map((z) => z.name)).toEqual(['INVENTED GROUP']);
	});
});

describe('zones from a grid of values', () => {
	it('puts a point in a grid’s zone, its band as the claim, and none where the grid gives no band', () => {
		const map = new SyntheticMap();
		map.way([map.node(O), map.nodeFrom(O, 90, 40)]);
		const [lat, lon] = O;
		const n = Narrator.fromOsm(map.toData(), {
			clock: fixedClock('2026-11-15'),
			records: [
				{
					source: 'Invented noise',
					prefix: 'noise',
					retrieved: '2026-11-15',
					records: [],
					grids: [
						{
							name: 'road noise',
							kind: 'road noise',
							south: lat - 0.0005,
							west: lon - 0.0005,
							dLat: 0.001,
							dLon: 0.001,
							rows: ['2,0'],
							bands: ['', '65 to 70 decibels', '70 to 75 decibels']
						}
					]
				}
			]
		});
		expect(n.zonesAt(O).map((z) => [z.name, z.kind, z.claims])).toEqual([
			['road noise', 'road noise', { band: '70 to 75 decibels' }]
		]);
		expect(n.zonesAt([lat, lon + 0.001])).toEqual([]);
	});
});

describe('levels from a grid', () => {
	it('gives each level kept where a point lies, and compiles them onto the place', () => {
		const map = new SyntheticMap();
		map.way([map.node(O), map.nodeFrom(O, 90, 40)]);
		const [lat, lon] = O;
		const cells = { south: lat - 0.01, west: lon - 0.01, dLat: 0.02, dLon: 0.02, year: '2022' };
		const n = Narrator.fromOsm(map.toData(), {
			clock: fixedClock('2026-11-15'),
			records: [
				{
					source: 'Invented air',
					prefix: 'air',
					retrieved: '2026-11-15',
					records: [],
					levels: [
						{ ...cells, kind: 'nitrogen dioxide', scale: 1, rows: ['23'] },
						{ ...cells, kind: 'fine particles', scale: 10, rows: ['84'] }
					]
				}
			]
		});
		expect(n.levelsAt(O)).toEqual([
			{ kind: 'nitrogen dioxide', year: '2022', scale: 1, value: 23 },
			{ kind: 'fine particles', year: '2022', scale: 10, value: 8.4 }
		]);
		expect(n.levelsAt([lat + 1, lon])).toEqual([]);
		const stops = Object.values(compileWorld(n).stops);
		expect(stops.every((s) => s.levels?.length === 2)).toBe(true);
	});
});
