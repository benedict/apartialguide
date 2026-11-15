/**
 * `PLACE=kenilworth npm run records:place`: fetches the sources a place in `data/places.json` is in
 * and has never fetched (`checkPlace`), nothing else, into its own records folder, by running
 * `scripts/records.ts` with its snapshot's name. By hand only: it asks others' servers. A source
 * that needs a key or a file (`needs`) is asked only where that is set, and named as skipped
 * otherwise. SNAPSHOTS_DIR (as `../apartialguide-data/snapshots`) reads a private snapshot where
 * it is kept, so none is copied in here.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { checkPlace, REGISTER, type Place, type SourceKey } from '../src/lib/server/register';

const wanted = process.env.PLACE;
const { places } = JSON.parse(
	readFileSync(process.env.PLACES_PATH ?? 'data/places.json', 'utf8')
) as {
	places: Place[];
};
const place = places.find((p) => p.name === wanted);
if (!place) {
	console.error(`No place called ${wanted}. There are: ${places.map((p) => p.name).join(', ')}`);
	process.exit(1);
}
const files = readdirSync(place.records, { withFileTypes: true })
	.filter((f) => f.isFile())
	.map((f) => f.name);
const { missing } = checkPlace(place, files);
// The variable each source's need names first, as `BRITANNIA_GPKG, from …`.
const varOf = (key: SourceKey) => (REGISTER[key] as { needs?: string }).needs?.split(/[ ,]/)[0];
const ready = missing.filter((k) => !varOf(k) || process.env[varOf(k)!]);
for (const k of missing.filter((k) => !ready.includes(k)))
	console.log(`${k}: skipped, as ${varOf(k)} is not set`);
if (!ready.length) {
	console.log(`${place.name}: nothing to fetch`);
	process.exit(0);
}
console.log(`${place.name}: fetching ${ready.join(', ')}`);
execFileSync('npx', ['tsx', 'scripts/records.ts'], {
	stdio: 'inherit',
	env: {
		...process.env,
		SNAPSHOT_NAME: place.snapshot,
		RECORDS_OUT: place.records,
		SOURCES: ready.join(',')
	}
});
