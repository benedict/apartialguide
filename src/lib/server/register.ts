/**
 * The register of sources: what each fetcher in `scripts/records.ts` writes, and where it reaches,
 * so each place's records can be checked for a source never fetched (`checkPlace`, `npm run
 * sources:check`). The fetchers are typed over this table's keys, so a source added there cannot
 * be left out here.
 *
 * Reach is what the records show, not what a source may claim: `london` for what only Croydon has
 * (Kenilworth's box gave none), `england` for what both have, and wider is not checked. A place
 * beyond England would need each source looked at again.
 */

export type Reach = 'england' | 'london';

export interface SourceEntry {
	/** The prefixes of the files it writes: some write more than one. */
	writes: readonly string[];
	reach: Reach;
	/** What a fetch needs that the script cannot get for itself: a key or a file downloaded by hand. */
	needs?: string;
}

export const REGISTER = {
	hygiene: { writes: ['hygiene'], reach: 'england' },
	protected: { writes: ['listed', 'tree'], reach: 'england' },
	planning: { writes: ['planning'], reach: 'london' },
	plaques: { writes: ['plaque'], reach: 'england' },
	prices: { writes: ['price'], reach: 'england' },
	crime: { writes: ['crime'], reach: 'england' },
	wards: { writes: ['ward'], reach: 'england' },
	wildlife: { writes: ['wildlife'], reach: 'england' },
	postcodes: { writes: ['postcode'], reach: 'england' },
	companies: { writes: ['company'], reach: 'england' },
	pubs: { writes: ['pub'], reach: 'england' },
	noise: { writes: ['noise'], reach: 'england' },
	radon: { writes: ['radon'], reach: 'england' },
	ghostsigns: { writes: ['ghostsign'], reach: 'london' },
	traffic: { writes: ['traffic'], reach: 'england' },
	epc: { writes: ['epc'], reach: 'england', needs: 'EPC_API_KEY' },
	geograph: { writes: ['geograph'], reach: 'england', needs: 'GEOGRAPH_API_KEY' },
	britannia: {
		writes: ['roman'],
		reach: 'england',
		needs: 'BRITANNIA_GPKG, from the private data repository'
	},
	heritage: { writes: ['heritage'], reach: 'england' },
	floodzones: { writes: ['floodzone'], reach: 'england' },
	floods: { writes: ['flood'], reach: 'england' },
	benches: { writes: ['bench'], reach: 'england' },
	trees: { writes: ['trees'], reach: 'london' }
} as const satisfies Record<string, SourceEntry>;

export type SourceKey = keyof typeof REGISTER;

/** A place the walk has records for, as `data/places.json` lists it. */
export interface Place {
	name: string;
	/** The name its snapshots go by (`SNAPSHOT_NAME`). */
	snapshot: string;
	/** Its records' folder; only the files directly in it are its own. */
	records: string;
	in: readonly Reach[];
	/** Sources it does not have yet, each with why: anything else it lacks is missing. */
	waiting: Partial<Record<SourceKey, string>>;
}

export interface Check {
	missing: SourceKey[];
	waiting: { source: SourceKey; why: string }[];
	/** Waits no longer needed, as the source's files are there. */
	stale: SourceKey[];
}

/** A record file's prefix: `listed.shirley-2026-01-01.json` is `listed`. */
const prefixOf = (file: string) =>
	/\.json$/.test(file) ? file.split('/').at(-1)!.split(/[-.]/)[0] : undefined;

/** Which of the sources a place is in it has never fetched, from its folder's file names alone. */
export function checkPlace(place: Place, files: readonly string[]): Check {
	const have = new Set(files.map(prefixOf).filter(Boolean));
	const check: Check = { missing: [], waiting: [], stale: [] };
	for (const [key, entry] of Object.entries(REGISTER) as [SourceKey, SourceEntry][]) {
		if (!place.in.includes(entry.reach)) continue;
		const fetched = entry.writes.every((p) => have.has(p));
		const why = place.waiting[key];
		if (fetched) {
			if (why !== undefined) check.stale.push(key);
		} else if (why !== undefined) check.waiting.push({ source: key, why });
		else check.missing.push(key);
	}
	return check;
}
