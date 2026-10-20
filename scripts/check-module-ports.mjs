#!/usr/bin/env node
/**
 * Check which ShulePlus module ports from docs/PORTS.md are listening.
 * Usage: node scripts/check-module-ports.mjs
 */
import net from 'node:net';

const MODULES = [
  { name: 'Authentication FE', port: 3000 },
  { name: 'IAM API', port: 3001 },
  { name: 'Notification Service', port: 3002 },
  { name: 'Academic BE', port: 3003 },
  { name: 'Academic FE', port: 3004 },
  { name: 'Student Management BE', port: 3052 },
  { name: 'Student Management FE', port: 3053 },
  { name: 'HR BE', port: 3005 },
  { name: 'HR FE', port: 3006 },
  { name: 'Payroll FE', port: 3008 },
  { name: 'Teacher Portal BE', port: 3009 },
  { name: 'Timetable BE', port: 3010 },
  { name: 'Timetable FE', port: 3011 },
  { name: 'Babyeyi BE', port: 3012 },
  { name: 'Babyeyi FE', port: 3013 },
  { name: 'School Fees BE', port: 3014 },
  { name: 'School Fees FE', port: 3015 },
  { name: 'Nesa FE', port: 3016 },
  { name: 'Teacher Portal FE', port: 3017 },
  { name: 'TichaPortal BFF', port: 4000 },
  { name: 'TichaPortal FE', port: 5173 },
  { name: 'Nesa BE', port: 3018 },
  { name: 'Assets BE', port: 3020 },
  { name: 'Assets FE', port: 3021 },
  { name: 'Budget BE', port: 3022 },
  { name: 'Budget FE', port: 3023 },
  { name: 'Attendance BE', port: 3024 },
  { name: 'Attendance FE', port: 3025 },
  { name: 'Payroll BE', port: 3026 },
  { name: 'Procurement BE', port: 3030 },
  { name: 'Procurement FE', port: 3031 },
  { name: 'Student Discipline BE', port: 3032 },
  { name: 'Student Discipline FE', port: 3033 },
  { name: 'Action Plan BE', port: 3034 },
  { name: 'Action Plan FE', port: 3035 },
  { name: 'Cafeteria FE', port: 3042 },
  { name: 'Cafeteria BE', port: 3043 },
  { name: 'Inventory BE', port: 3044 },
  { name: 'Inventory FE', port: 3045 },
  { name: 'Task MIS BE', port: 3046 },
  { name: 'Task MIS FE', port: 3047 },
  { name: 'Parent MIS BE', port: 3048 },
  { name: 'Parent MIS FE', port: 3049 },
  { name: 'KaziAvance BE', port: 4400 },
  { name: 'KaziAvance FE', port: 4401 },
];

function probe(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(800, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const rows = [];
for (const m of MODULES) {
  const up = await probe(m.port);
  rows.push({ ...m, up });
}

const upCount = rows.filter((r) => r.up).length;
console.log(`ShulePlus module ports — ${upCount}/${rows.length} listening\n`);
console.log('PORT   STATUS      SERVICE');
console.log('-----  ----------  -----------------------');
for (const r of rows) {
  console.log(
    `${String(r.port).padEnd(5)}  ${(r.up ? 'LISTENING' : 'down').padEnd(10)}  ${r.name}`
  );
}
