/**
 * One-off: align Academic learner uid with ParentMIS shule code (04001807526).
 * Run: node scripts/repair-aimable-student.mjs
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';

const p = new PrismaClient();
const id = '5c8d6532-57a0-45b7-a03a-99da868b4095';
const code = '04001807526';

const updated = await p.student.update({
  where: { id },
  data: {
    studentUid: code,
    studentCode: code,
    firstName: 'Aimable',
    lastName: 'Mukarwego',
  },
});
console.log('student', updated.id, updated.studentUid);

await p.$executeRawUnsafe(
  `UPDATE report_card_publications SET student_code = $1 WHERE student_id = $2`,
  code,
  id
);
console.log('publications updated for', id);
await p.$disconnect();
