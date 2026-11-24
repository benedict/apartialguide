import { monthYear } from './words';

/** Names in a list: "A", "A and B", "A, B and C". */
const listed = (names: readonly string[]) =>
	names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/**
 * A ward's last election, as the record keeps it, told on coming into the ward: "In May 2026, 48%
 * of those who could vote here did, and elected Ann Example (Invented Party)." The turnout is
 * given to the whole, and those elected by name and party as found.
 */
export function electionLine(claims: Record<string, string> | undefined): string | undefined {
	const date = claims?.['elections:date'];
	const elected = claims?.['elections:elected'];
	if (!date || !elected) return undefined;
	const when = monthYear(date);
	const whom = listed(elected.split('; '));
	const turnout = Number(claims['elections:turnout']);
	return claims['elections:turnout'] && Number.isFinite(turnout)
		? `In ${when}, ${Math.round(turnout)}% of those who could vote here did, and elected ${whom}.`
		: `In ${when}, it elected ${whom}.`;
}
