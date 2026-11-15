import type { Fact } from '../facts';

/** The pollutants the European index is made of, as Open-Meteo names their parts of it. */
export const POLLUTANTS = [
	'pm2_5',
	'pm10',
	'nitrogen_dioxide',
	'ozone',
	'sulphur_dioxide'
] as const;
/** The pollen Open-Meteo forecasts for Europe, in grains a cubic metre. */
export const POLLENS = ['alder', 'birch', 'grass', 'mugwort', 'olive', 'ragweed'] as const;

/** Open-Meteo's air quality now, as its air quality API answers with `current`. */
export interface OpenMeteoAir {
	current?: { time?: string; european_aqi?: number | null } & Record<string, unknown>;
}

/** The fields to ask of Open-Meteo for the air now: the index, its parts, and pollen. */
export const AIR_FIELDS = [
	'european_aqi',
	...POLLUTANTS.map((p) => `european_aqi_${p}`),
	...POLLENS.map((p) => `${p}_pollen`)
].join(',');

/** The air now, as facts about now, observed when Open-Meteo gave it: the index, its parts, pollen. */
export function currentAirFacts(answer: OpenMeteoAir): Fact[] {
	const now = answer.current ?? {};
	const { time, european_aqi } = now;
	if (!time || typeof european_aqi !== 'number') return [];
	const fact = (key: string, value: number): Fact => ({
		id: `air:now:${key}`,
		subject: 'air/now',
		claim: { key, value: String(value) },
		source: 'Open-Meteo.com',
		observed: time,
		reach: 0,
		geometry: []
	});
	const given = (name: string) =>
		typeof now[name] === 'number' ? (now[name] as number) : undefined;
	return [
		fact('air:index', european_aqi),
		...POLLUTANTS.flatMap((p) => {
			const v = given(`european_aqi_${p}`);
			return v === undefined ? [] : [fact(`air:${p}`, v)];
		}),
		...POLLENS.flatMap((p) => {
			const v = given(`${p}_pollen`);
			return v === undefined || v <= 0 ? [] : [fact(`pollen:${p}`, v)];
		})
	];
}
