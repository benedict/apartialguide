import type { AreaNote } from '../../core/adapters/records';
import { parseCsv } from './trees';

/**
 * Each ward's latest election from Democracy Club's export of candidates and results (CC BY 4.0),
 * as a note for the ward its GSS code names: when it was held, its turnout as a percentage as
 * given, and those it elected with their parties as found. Only the elected are kept: a candidate
 * who was not elected is taken out here, so their name reaches nothing. A poll that was cancelled
 * is passed over, as is a ward no one was elected in.
 */
export function electionNotes(csv: string): AreaNote[] {
	const rows = parseCsv(csv, (r) => r.cancelled_poll !== 't' && r.elected === 't' && !!r.gss);
	const latest = new Map<string, Record<string, string>[]>();
	for (const r of rows) {
		const kept = latest.get(r.gss);
		const date = kept?.[0].election_date ?? '';
		if (r.election_date > date) latest.set(r.gss, [r]);
		else if (r.election_date === date && kept) kept.push(r);
	}
	return [...latest].map(([area, elected]) => {
		const turnout = elected[0].turnout_percentage;
		return {
			area,
			claims: {
				date: elected[0].election_date,
				...(turnout ? { turnout } : {}),
				elected: elected.map((r) => `${r.person_name} (${r.party_name})`).join('; ')
			}
		};
	});
}
