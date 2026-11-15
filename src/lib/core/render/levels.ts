import type { Level } from '../valuegrid';

/** A level as kept, to its scale's places: a level kept in tenths keeps its tenth, "9.0". */
const said = ({ value, scale }: Level) => value.toFixed(Math.max(0, Math.round(Math.log10(scale))));

/**
 * The levels kept at a place, such as the air as modelled for a year, in one sentence a year:
 * "As modelled for 2022, the air here held on average 23 micrograms of nitrogen dioxide in each
 * cubic metre, and 8.4 of fine particles." Told on looking; nothing where none is kept.
 */
export function levelsLine(levels: readonly Level[] | undefined): string | undefined {
	if (!levels?.length) return undefined;
	const years = [...new Set(levels.map((l) => l.year))];
	return years
		.map((year) => {
			const [first, ...rest] = levels.filter((l) => l.year === year);
			const others = rest.map((l) => `, and ${said(l)} of ${l.kind}`).join('');
			return `As modelled for ${year}, the air here held on average ${said(first)} micrograms of ${first.kind} in each cubic metre${others}.`;
		})
		.join(' ');
}
