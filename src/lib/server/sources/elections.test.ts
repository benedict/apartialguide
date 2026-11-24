import { describe, expect, it } from 'vitest';
import { electionNotes } from './elections';

// An invented export in the form Democracy Club's CSV takes, with the fields asked for.
const head =
	'person_id,person_name,election_id,ballot_paper_id,election_date,election_current,party_name,party_id,post_label,cancelled_poll,seats_contested,elected,gss,turnout_percentage';
const row = (o: Partial<Record<string, string>>) => {
	const r = {
		person_id: '1',
		person_name: 'Ann Example',
		election_id: 'local.inventa.2026-05-07',
		ballot_paper_id: 'local.inventa.east.2026-05-07',
		election_date: '2026-05-07',
		election_current: 'f',
		party_name: 'Invented Party',
		party_id: 'PP1',
		post_label: 'Inventa East',
		cancelled_poll: 'f',
		seats_contested: '2',
		elected: 't',
		gss: 'E05000001',
		turnout_percentage: '48.11',
		...o
	};
	return head
		.split(',')
		.map((k) => {
			const v = (r as Record<string, string>)[k];
			return /[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
		})
		.join(',');
};

describe('electionNotes (each ward’s latest election, for its ward)', () => {
	it('keeps the latest election in each ward, its turnout, and only those elected', () => {
		const csv = [
			head,
			row({
				person_name: 'Old Example',
				election_date: '2022-05-05',
				ballot_paper_id: 'local.inventa.east.2022-05-05'
			}),
			row({}),
			row({ person_name: 'Bo Example', party_name: 'Other Party, Ltd' }),
			row({ person_name: 'Not Elected', elected: 'f' })
		].join('\n');
		expect(electionNotes(csv)).toEqual([
			{
				area: 'E05000001',
				claims: {
					date: '2026-05-07',
					turnout: '48.11',
					elected: 'Ann Example (Invented Party); Bo Example (Other Party, Ltd)'
				}
			}
		]);
	});

	it('passes over a poll that was cancelled, and a ward no one was elected in', () => {
		const csv = [head, row({ cancelled_poll: 't' }), row({ gss: 'E05000002', elected: 'f' })].join(
			'\n'
		);
		expect(electionNotes(csv)).toEqual([]);
	});
});
