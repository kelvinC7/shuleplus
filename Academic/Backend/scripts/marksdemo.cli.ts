/**
 * CLI for sample Quiz / Exam marks (report preview).
 *
 * Usage:
 *   npm run marks:demo -- apply --class "P1" --year "2025-2026" --term "Term 1"
 *   npm run marks:demo -- apply --phase exam ...
 *   npm run marks:demo -- disable
 *   npm run marks:demo -- status
 */

import { prisma } from '../src/config/database';
import { marksDemoService, type MarksDemoPhase } from '../src/services/marks-demo.service';

function readFlag(args: string[], name: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);

  const i = args.indexOf(name);
  if (i === -1) return undefined;
  let value = args[i + 1];
  if (!value || value.startsWith('-')) return undefined;
  // npm on Windows splits "Term 1" into two argv entries after --term
  if (name === '--term' && args[i + 2] && !args[i + 2].startsWith('-')) {
    value = `${value} ${args[i + 2]}`;
  }
  return value;
}

function parseArgs(argv: string[]) {
  const cmd = (argv[0] ?? 'help').toLowerCase();
  const phaseRaw = readFlag(argv, '--phase') ?? readFlag(argv, '-p');
  const phase = (phaseRaw === 'exam' || phaseRaw === 'all' ? phaseRaw : 'quiz') as MarksDemoPhase;
  return {
    cmd,
    organizationId: readFlag(argv, '--org') ?? process.env.MARKS_DEMO_ORG_ID,
    classId: readFlag(argv, '--class-id'),
    className: readFlag(argv, '--class') ?? readFlag(argv, '-c'),
    stream: readFlag(argv, '--stream'),
    academicYear: readFlag(argv, '--year') ?? readFlag(argv, '-y') ?? process.env.MARKS_DEMO_YEAR,
    term: readFlag(argv, '--term') ?? readFlag(argv, '-t') ?? process.env.MARKS_DEMO_TERM,
    phase,
  };
}

async function resolveOrganizationId(explicit?: string): Promise<string> {
  if (explicit?.trim()) return explicit.trim();
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
  if (tenant?.organizationId) return tenant.organizationId;
  throw new Error('Set MARKS_DEMO_ORG_ID or pass --org <organizationId>.');
}

function printHelp() {
  console.log(`
Marks demo — seed Quiz / Exam marks for report previews

Commands:
  apply     Create or refresh demo assessments + marks
  disable   Remove all demo-tagged assessments (marks cascade)
  status    Show demo assessment counts

Options (apply):
  --org, --class-id, --class "P1", --year "2025-2026", --term "Term 1"  (or --term=Term 1 on Windows/npm)
  --phase quiz | exam | all   (default: quiz — add exam later with --phase exam)

Env: MARKS_DEMO_ORG_ID, MARKS_DEMO_YEAR, MARKS_DEMO_TERM

After apply, open Academic → Report Cards for that class/year/term.
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.cmd === 'help' || args.cmd === '-h' || args.cmd === '--help') {
    printHelp();
    return;
  }

  const organizationId = await resolveOrganizationId(args.organizationId);

  if (args.cmd === 'status') {
    const data = await marksDemoService.status(organizationId, args.classId);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (args.cmd === 'disable' || args.cmd === 'off' || args.cmd === 'remove') {
    const data = await marksDemoService.remove(organizationId, args.classId);
    console.log(`Removed ${data.deletedAssessments} demo assessment(s).`);
    return;
  }

  if (args.cmd === 'apply') {
    if (!args.academicYear || !args.term) {
      throw new Error('apply requires --year and --term (or MARKS_DEMO_YEAR / MARKS_DEMO_TERM).');
    }
    if (!args.classId && !args.className) {
      throw new Error('apply requires --class "ClassName" or --class-id.');
    }
    const data = await marksDemoService.apply({
      organizationId,
      classId: args.classId,
      className: args.className,
      stream: args.stream,
      academicYear: args.academicYear,
      term: args.term,
      phase: args.phase,
    });
    console.log('\nMarks demo applied.\n');
    if (data.rosterNote) console.log(`Note: ${data.rosterNote}\n`);
    console.log(JSON.stringify(data, null, 2));
    console.log('\nNext: Academic frontend → /report-cards — pick this class, year, and term.');
    if (args.phase === 'quiz') {
      console.log('Tip: run again with --phase exam to add end-of-term exam marks for full term reports.');
    }
    return;
  }

  printHelp();
  process.exit(1);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
