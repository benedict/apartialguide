import { describe, expect, it } from 'vitest';
import { currentAirFacts } from './air';
import { airNow } from '../render/air';

describe('currentAirFacts (Open-Meteo air quality)', () => {
	it('reads the European air quality index now, observed when it was measured', () => {
		const facts = currentAirFacts({ current: { time: '2026-10-29T09:00', european_aqi: 32 } });
		expect(facts).toEqual([
			expect.objectContaining({
				subject: 'air/now',
				claim: { key: 'air:index', value: '32' },
				observed: '2026-10-29T09:00'
			})
		]);
	});

	it('is nothing without an answer', () => {
		expect(currentAirFacts({})).toEqual([]);
		expect(currentAirFacts({ current: { time: 't', european_aqi: null } })).toEqual([]);
	});
});

describe('airNow', () => {
	const said = (n: number) => airNow(currentAirFacts({ current: { time: 't', european_aqi: n } }));

	it('says the air in the index’s own bands, with its number', () => {
		expect(said(12)).toBe('The air: good, 12 on the European index.');
		expect(said(32)).toBe('The air: fair, 32 on the European index.');
		expect(said(55)).toBe('The air: moderate, 55 on the European index.');
		expect(said(70)).toBe('The air: poor, 70 on the European index.');
		expect(said(90)).toBe('The air: very poor, 90 on the European index.');
		expect(said(130)).toBe('The air: extremely poor, 130 on the European index.');
	});

	it('says nothing without word of it', () => {
		expect(airNow([])).toBeUndefined();
	});
});

describe('the air in more detail: what makes it, and pollen', () => {
	const answer = {
		current: {
			time: '2026-05-10T09:00',
			european_aqi: 45,
			european_aqi_pm2_5: 20,
			european_aqi_pm10: 12,
			european_aqi_nitrogen_dioxide: 45,
			european_aqi_ozone: 30,
			european_aqi_sulphur_dioxide: 2,
			grass_pollen: 34.4,
			birch_pollen: 0.4,
			alder_pollen: 0,
			mugwort_pollen: null,
			olive_pollen: 0,
			ragweed_pollen: 0
		}
	};

	it('reads each pollutant’s part of the index and each pollen, as given', () => {
		const keys = currentAirFacts(answer).map((f) => `${f.claim.key}=${f.claim.value}`);
		expect(keys).toEqual(
			expect.arrayContaining([
				'air:index=45',
				'air:nitrogen_dioxide=45',
				'air:pm2_5=20',
				'pollen:grass=34.4',
				'pollen:birch=0.4'
			])
		);
		expect(keys.join(' ')).not.toContain('mugwort');
	});

	it('names what makes the index, beyond good, and the pollen of a grain or more, by the forecast', () => {
		expect(airNow(currentAirFacts(answer))).toBe(
			'The air: moderate, 45 on the European index, the most of it nitrogen dioxide. Pollen in the air, by the forecast: grass, 34 grains a cubic metre.'
		);
	});

	it('says no more than the index when the air is good and there is no pollen', () => {
		const good = {
			current: { ...answer.current, european_aqi: 12, grass_pollen: 0, birch_pollen: 0 }
		};
		expect(airNow(currentAirFacts(good))).toBe('The air: good, 12 on the European index.');
	});
});
