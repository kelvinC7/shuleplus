/**
 * Copies shared Session Access Denied UI into every module Frontend.
 * Run: node scripts/sync-session-access-ui.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PKG = path.join(ROOT, 'packages', 'session-access-ui');

const MODULES = [
  'ActionPlanMIS/Frontend',
  'AssetsPortal/Frontend',
  'Attendance/Frontend',
  'BabyeyiWizard/Frontend',
  'Budget/Frontend',
  'Cafeteria/Frontend',
  'HR/Frontend',
  'InventoryMIS/Frontend',
  'KaziAvance/Frontend',
  'NesaDashboard/Frontend',
  'ParentMIS/Frontend',
  'Payroll/Frontend',
  'ProcurementMIS/Frontend',
  'SampleModule/Frontend',
  'SchoolFeesPortal/Frontend',
  'SchoolUniformMIS/Frontend',
  'ShuleKitMIS/Frontend',
  'StudentDiscpline/Frontend',
  'TaskMIS/Frontend',
  'TeacherPortal/Frontend',
  'Timetable/Frontend',
  'Academic/Frontend_react',
];

const FILES = ['session-expired-illustration.tsx', 'session-access-denied-screen.tsx'];

let ok = 0;
for (const moduleRel of MODULES) {
  const srcRoot = path.join(ROOT, moduleRel, 'src');
  if (!fs.existsSync(srcRoot)) {
    console.log(`skip (no src): ${moduleRel}`);
    continue;
  }
  const destDir = path.join(srcRoot, 'components', 'session-access');
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of FILES) {
    fs.copyFileSync(path.join(PKG, file), path.join(destDir, file));
  }
  fs.writeFileSync(
    path.join(destDir, 'index.ts'),
    `export { SessionExpiredIllustration } from './session-expired-illustration';\nexport { SessionAccessDeniedScreen } from './session-access-denied-screen';\n`
  );
  console.log(`copied -> ${moduleRel}/src/components/session-access`);
  ok += 1;
}
console.log(`Done. Synced ${ok} modules.`);
