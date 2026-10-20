import fs from 'fs';

const prod = fs.readFileSync('.next/static/chunks/692.9fc3d990ee15f6e3.js', 'utf8');

const patterns = [
  'nextDisabled',
  '_otpSent',
  'otpSent',
  'Request verification',
  'Verify & Submit',
  'function tN',
  '6===er',
  'e0&&e5',
  'e1(!1)',
  'maskPhone',
  'function _',
  'function R(',
  'function F(',
  'function P(',
  'export interface',
  'HandoffStudent',
];

for (const p of patterns) {
  const idx = prod.indexOf(p);
  if (idx >= 0) {
    console.log(`\n=== ${p} @ ${idx} ===`);
    console.log(prod.slice(idx, idx + 350));
  } else {
    console.log(`\n=== ${p}: NOT FOUND ===`);
  }
}

// Find helper components at start before STEPS
const stepsIdx = prod.indexOf('let O=r.Z2,Y=[');
console.log('\n=== HELPERS BEFORE STEPS ===\n', prod.slice(stepsIdx - 3000, stepsIdx + 100));
