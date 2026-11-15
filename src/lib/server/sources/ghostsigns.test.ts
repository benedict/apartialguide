import { describe, expect, it } from 'vitest';
import { ghostSignRecords } from './ghostsigns';

// An invented map in the shape Google's My Maps writes: no real sign.
const place = (name: string, lon: number, lat: number) =>
	`<Placemark><name>${name}\n</name><description><![CDATA[<img src="https://example.invalid/a.jpg" />]]></description><Point><coordinates>\n ${lon},${lat},0\n</coordinates></Point></Placemark>`;
const kml = `<?xml version="1.0"?><kml><Document><name>Invented Signs</name>
<Folder><name>Ghost Signs in the Book</name>${place('Invented Bakers [012]', -0.08, 51.38)}${place('Inventa Ales | J. Invent &amp; Sons', -0.07, 51.381)}</Folder>
<Folder><name>Other Ghostsigns</name>${place('Faded Ghostsign', -0.075, 51.38)}${place('Far Off Teas', 1.5, 52)}</Folder>
<Folder><name>Ghost Signs that have Disappeared</name>${place('Removals Invented', -0.071, 51.382)}</Folder>
<Folder><name>Tours</name>${place('A tour', -0.07, 51.38)}</Folder>
</Document></kml>`;

describe('ghostSignRecords', () => {
	it('keeps each sign’s words and place in the box, whether it has gone, and never its photograph', () => {
		const records = ghostSignRecords(kml, '-0.1,51.3,0,51.4');
		expect(records.map((r) => [r.at, r.claims])).toEqual([
			[[51.38, -0.08], { name: 'Invented Bakers', kind: 'ghost sign' }],
			[[51.381, -0.07], { name: 'Inventa Ales | J. Invent & Sons', kind: 'ghost sign' }],
			[[51.382, -0.071], { name: 'Removals Invented', kind: 'ghost sign', gone: 'yes' }]
		]);
		expect(JSON.stringify(records)).not.toMatch(/example\.invalid|img|\[012\]/);
	});

	it('leaves out a sign the map names only as faded, a tour, and anything outside the box', () => {
		const names = ghostSignRecords(kml, '-0.1,51.3,0,51.4').map((r) => r.claims.name);
		expect(names).not.toContain('Faded Ghostsign');
		expect(names).not.toContain('A tour');
		expect(names).not.toContain('Far Off Teas');
	});

	it('gives each record an id from its place and words, so the same sign is the same record', () => {
		const [a] = ghostSignRecords(kml, '-0.1,51.3,0,51.4');
		const [b] = ghostSignRecords(kml, '-0.1,51.3,0,51.4');
		expect(a.id).toBe(b.id);
		expect(a.id).toMatch(/^[0-9a-f]{8,}$/);
	});
});
