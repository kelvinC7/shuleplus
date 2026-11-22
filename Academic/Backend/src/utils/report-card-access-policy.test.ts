import assert from 'node:assert/strict';

type Policy = 'PAID_ONLY' | 'ALL_PARENTS';

function normalizeAccessPolicy(v?: string | null): Policy {
  return String(v || '').toUpperCase() === 'ALL_PARENTS' ? 'ALL_PARENTS' : 'PAID_ONLY';
}

function canExposeReport(params: { published: boolean; accessPolicy: Policy; feesAllowed: boolean; overrideAllowed?: boolean }) {
  if (!params.published) return false;
  if (params.overrideAllowed) return true;
  if (params.accessPolicy === 'ALL_PARENTS') return true;
  return params.feesAllowed;
}

function run() {
  assert.equal(normalizeAccessPolicy('ALL_PARENTS'), 'ALL_PARENTS');
  assert.equal(normalizeAccessPolicy('all_parents'), 'ALL_PARENTS');
  assert.equal(normalizeAccessPolicy('PAID_ONLY'), 'PAID_ONLY');
  assert.equal(normalizeAccessPolicy(undefined), 'PAID_ONLY');

  assert.equal(canExposeReport({ published: false, accessPolicy: 'ALL_PARENTS', feesAllowed: true }), false);
  assert.equal(canExposeReport({ published: true, accessPolicy: 'ALL_PARENTS', feesAllowed: false }), true);
  assert.equal(canExposeReport({ published: true, accessPolicy: 'PAID_ONLY', feesAllowed: false }), false);
  assert.equal(canExposeReport({ published: true, accessPolicy: 'PAID_ONLY', feesAllowed: true }), true);
  assert.equal(canExposeReport({ published: true, accessPolicy: 'PAID_ONLY', feesAllowed: false, overrideAllowed: true }), true);

  console.log('report-card-access-policy: all tests passed');
}

run();
