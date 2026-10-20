/**
 * Re-pull HR + IAM + Timetable staff for every school and refresh PrintCard rows
 * (updates personCode, removes stale TR0010… / duplicate timetable personIds).
 *
 *   cd PrintCardMIS/Backend && npx tsx scripts/resync-all-staff-cards.ts
 *   npx tsx scripts/resync-all-staff-cards.ts --dry-run
 */
import { fetchIamOrganizations, upstreamClients } from '../src/clients/upstream.client';
import { mergeAllStaffSources } from '../src/services/staff-merge.service';
import { resyncStaffCardsFromRoster } from '../src/services/card-record.service';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const schools = await fetchIamOrganizations();
  console.log(`Schools: ${schools.length}${dryRun ? ' (dry-run)' : ''}\n`);

  let totalPruned = 0;
  let totalDeduped = 0;

  for (const school of schools) {
    const organizationId = school.id;
    const [hrRows, iamRows, timetableRows] = await Promise.all([
      upstreamClients.listStaffFromHr(organizationId),
      upstreamClients.listStaffFromIam(organizationId),
      upstreamClients.listStaffFromTimetable(organizationId),
    ]);
    const roster = mergeAllStaffSources(hrRows, iamRows, timetableRows);

    if (dryRun) {
      console.log(`${school.name}: roster ${roster.length} (hr ${hrRows.length}, iam ${iamRows.length}, tt ${timetableRows.length})`);
      continue;
    }

    const { pruned, deduped } = await resyncStaffCardsFromRoster(organizationId, roster);
    totalPruned += pruned;
    totalDeduped += deduped;
    if (pruned + deduped > 0 || roster.length > 0) {
      console.log(
        `${school.name}: roster ${roster.length}, removed stale ${pruned}, deduped ${deduped}`
      );
    }
  }

  if (!dryRun) {
    console.log(`\nDone. Removed stale: ${totalPruned}, deduped by name: ${totalDeduped}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
