import type { Fact } from '../facts';
import { POLLENS, POLLUTANTS } from '../adapters/air';

/** The European air quality index's own bands, upper bounds first to last. */
const BANDS: [number, string][] = [
	[20, 'good'],
	[40, 'fair'],
	[60, 'moderate'],
	[80, 'poor'],
	[100, 'very poor'],
	[Infinity, 'extremely poor']
];

/** Each pollutant's code read as its words, a fixed list. */
const POLLUTANT_WORDS: Record<(typeof POLLUTANTS)[number], string> = {
	pm2_5: 'fine particles',
	pm10: 'coarser particles',
	nitrogen_dioxide: 'nitrogen dioxide',
	ozone: 'ozone',
	sulphur_dioxide: 'sulphur dioxide'
};

/**
 * "The air: fair, 32 on the European index, the most of it nitrogen dioxide.", from the facts about
 * the air now, or nothing; and the pollen of a grain or more a cubic metre, as forecast.
 */
export function airNow(facts: readonly Fact[]): string | undefined {
	const air = new Map(
		facts.filter((f) => f.subject === 'air/now').map((f) => [f.claim.key, f.claim.value])
	);
	const index = air.get('air:index');
	if (index === undefined) return undefined;
	const n = Number(index);
	const band = BANDS.find(([upTo]) => n <= upTo)![1];
	// The index is the highest of its parts: the pollutant whose part it is, beyond good air.
	const worst = band === 'good' ? undefined : POLLUTANTS.find((p) => air.get(`air:${p}`) === index);
	const made = worst ? `, the most of it ${POLLUTANT_WORDS[worst]}` : '';
	const pollen = POLLENS.flatMap((p) => {
		const grains = Math.round(Number(air.get(`pollen:${p}`) ?? 0));
		return grains >= 1 ? [`${p}, ${grains} grain${grains === 1 ? '' : 's'} a cubic metre`] : [];
	});
	const pollenLine = pollen.length
		? ` Pollen in the air, by the forecast: ${pollen.join('; ')}.`
		: '';
	return `The air: ${band}, ${index} on the European index${made}.${pollenLine}`;
}
