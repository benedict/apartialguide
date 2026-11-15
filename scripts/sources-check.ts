/**
 * `npm run sources:check`: for each place in `data/places.json`, the sources it is in that it has
 * never fetched, from its records folder's file names alone (`server/register.ts`, `checkPlace`).
 * It fails on any missing, or on a wait no longer needed; it needs no snapshot and asks no one.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { checkPlace, REGISTER, type Place } from '../src/lib/server/register';

const { places } = JSON.parse(
	readFileSync(process.env.PLACES_PATH ?? 'data/places.json', 'utf8')
) as {
	places: Place[];
};
let failed = 0;
for (const place of places) {
	const files = readdirSync(place.records, { withFileTypes: true })
		.filter((f) => f.isFile())
		.map((f) => f.name);
	const { missing, waiting, stale } = checkPlace(place, files);
	console.log(
		`${place.name}: ${missing.length ? `missing ${missing.join(', ')}` : 'nothing missing'}`
	);
	for (const { source, why } of waiting) console.log(`  waiting for ${source}: ${why}`);
	for (const source of missing) {
		const needs = (REGISTER[source] as { needs?: string }).needs;
		console.log(`  ${source}: never fetched${needs ? ` (needs ${needs})` : ''}`);
	}
	for (const source of stale) console.log(`  ${source}: fetched now, so no longer waiting`);
	failed += missing.length + stale.length;
}
if (failed) {
	console.error(
		`\nFetch what is missing (PLACE=<name> npm run records:place), or say why it waits in data/places.json.`
	);
	process.exit(1);
}
