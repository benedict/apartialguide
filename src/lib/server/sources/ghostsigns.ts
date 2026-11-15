import { createHash } from 'node:crypto';
import type { SourceRecord } from '../../core/adapters/records';
import { inBox } from './box';

/** The folders of signs on Sam Roberts' map of London's ghost signs; its tours and boroughs are not signs. */
const SIGNS = /ghost ?signs/i;
const GONE = /disappeared/i;
/** A name that says only that a sign is too faded to read is no words of its own. */
const UNREAD = /^faded ghost ?sign$/i;

const unescape = (s: string) =>
	s
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&');

const tag = (xml: string, name: string) =>
	new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml)?.[1];

/**
 * Ghost signs from the map that goes with Ghost Signs: A London Story (Google's My Maps, as KML):
 * each sign's words as found, where it is, and whether it has gone; never its photograph, and never
 * the book's number after its name ("[012]"), which is the book's, not the sign's.
 */
export function ghostSignRecords(kml: string, bbox: string): SourceRecord[] {
	const records: SourceRecord[] = [];
	for (const [, folder] of kml.matchAll(/<Folder>([\s\S]*?)<\/Folder>/g)) {
		const title = unescape(tag(folder, 'name') ?? '').trim();
		if (!SIGNS.test(title)) continue;
		const gone = GONE.test(title);
		for (const [, placemark] of folder.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)) {
			const name = unescape(tag(placemark, 'name') ?? '')
				.trim()
				.replace(/\s*\[\d+\]$/, '');
			const [lon, lat] = (tag(placemark, 'coordinates') ?? '').trim().split(',').map(Number);
			if (!name || UNREAD.test(name) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
			if (!inBox([lat, lon], bbox)) continue;
			const id = createHash('sha1').update(`${lat},${lon}|${name}`).digest('hex').slice(0, 12);
			records.push({
				id,
				at: [lat, lon],
				claims: { name, kind: 'ghost sign', ...(gone ? { gone: 'yes' } : {}) }
			});
		}
	}
	return records;
}
