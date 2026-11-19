import type { SourceRecord } from '../../core/adapters/records';
import { toNationalGrid } from '../gpkg';
import { inBox } from './box';

interface Photo {
	id?: number | string;
	guid?: string;
	title?: string;
	lat?: number | string;
	long?: number | string;
	lon?: number | string;
	taken?: string;
	imagetaken?: string;
	imageTaken?: string;
	/** The photographer, whose credit the licence asks for beside each use. */
	realname?: string;
	author?: string;
}

/** The patch a photograph stands for, one per patch, the latest: about 100 m. */
const PATCH = 0.001;

/**
 * When a photograph was taken, to the month or the year where that is all its date gives
 * ("2005-03-00" is March 2005, "2007-00-00" is 2007), as `observed` and as the claim told.
 */
function takenOf(date: string | undefined): { observed: string; taken: string } | undefined {
	const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(date ?? '');
	if (!m || m[1] === '0000') return undefined;
	const [, year, month, day] = m;
	if (month === '00') return { observed: year, taken: year };
	if (Number(month) > 12) return undefined;
	const ym = `${year}-${month}`;
	return { observed: day && day !== '00' ? `${ym}-${day}` : ym, taken: ym };
}

/**
 * Photographs from Geograph: the latest in each patch of about 100 m, its title as found, when
 * taken and by whom. One without its photographer is not kept, as the licence (CC BY-SA) asks
 * for the credit wherever the photograph's title is told.
 */
export function geographRecords(answer: { items?: Photo[] }, box: string): SourceRecord[] {
	const latest = new Map<string, SourceRecord>();
	for (const p of answer.items ?? []) {
		const lat = Number(p.lat);
		const lon = Number(p.long ?? p.lon);
		const title = p.title?.trim();
		const by = (p.realname ?? p.author)?.trim();
		const when = takenOf(p.taken ?? p.imagetaken ?? p.imageTaken);
		if (!title || !by || !when) continue;
		if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inBox([lat, lon], box)) continue;
		const key = `${Math.floor(lat / PATCH)}|${Math.floor(lon / PATCH)}`;
		if ((latest.get(key)?.observed ?? '') >= when.observed) continue;
		latest.set(key, {
			id: String(p.id ?? p.guid ?? key),
			at: [lat, lon],
			observed: when.observed,
			claims: { name: title, kind: 'photograph', taken: when.taken, by }
		});
	}
	return [...latest.values()];
}

/**
 * Windows-1252's characters for the bytes 0x80 to 0x9F (curly quotes, dashes, the euro); the five
 * it leaves unassigned stay as they are. Node's own decoder reads these bytes as Latin-1.
 */
const CP1252 =
	'\u20ac\u0081\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u008d\u017d\u008f\u0090\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u009d\u017e\u0178';

/** Bytes as Windows-1252 text. */
function windows1252(bytes: Uint8Array): string {
	let text = '';
	for (let i = 0; i < bytes.length; i += 65536)
		text += String.fromCharCode(
			...Array.from(bytes.subarray(i, i + 65536), (b) =>
				b >= 0x80 && b < 0xa0 ? CP1252.charCodeAt(b - 0x80) : b
			)
		);
	return text;
}

/** A quoted SQL string, its backslash escapes read: `\'` is `'`, `\n` a new line. */
const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', '0': '\0' };
const unquote = (s: string) => s.replace(/\\(.)/gs, (_, c: string) => ESCAPES[c] ?? c);

const STR = `'((?:[^'\\\\]|\\\\.)*)'`;
const ROW = new RegExp(
	`\\((\\d+),\\d+,${STR},${STR},'(\\w+)','([\\d-]+)','\\w*',\\d+,\\d+,'([-\\d.]+)','([-\\d.]+)',\\d+\\)`,
	'g'
);

/**
 * The photographs in a Geograph dump of its `gridimage_base` table (`gridimage_base-<myriad>.mysql.gz`,
 * from data.geograph.org.uk, unzipped): each row's id, photographer, title, date taken and place,
 * the words read as Windows-1252, which the dump is written in whatever its schema says; only
 * those the project accepted.
 */
export function dumpPhotos(bytes: Uint8Array): Photo[] {
	const text = windows1252(bytes);
	const photos: Photo[] = [];
	for (const m of text.matchAll(ROW)) {
		const [, id, realname, title, status, taken, lat, long] = m;
		if (status !== 'geograph' && status !== 'accepted') continue;
		photos.push({
			id,
			title: unquote(title),
			realname: unquote(realname),
			taken,
			lat: Number(lat),
			long: Number(long)
		});
	}
	return photos;
}

/** The two letters of the Ordnance Survey's 100 km square holding a point in its own metres. */
function myriadAt(x: number, y: number): string {
	const e = Math.floor(x / 100_000);
	const n = Math.floor(y / 100_000);
	// Lettered A to Z without I, five by five from the top left: the first letter the 500 km
	// square, counted from the false origin's S, the second the 100 km square within it.
	const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
	const first = 19 - n - ((19 - n) % 5) + Math.floor((e + 10) / 5);
	const second = (((19 - n) * 5) % 25) + (e % 5);
	return letters[first] + letters[second];
}

/** The 100 km squares a box reaches, each once, in order: Geograph's dumps come one to each. */
export function myriadsOf(bbox: string): string[] {
	const [w, s, e, n] = bbox.split(',').map(Number);
	const found = new Set<string>();
	for (const lon of [w, e])
		for (const lat of [s, n]) {
			const [x, y] = toNationalGrid([lon, lat]);
			found.add(myriadAt(x, y));
		}
	return [...found].sort();
}
