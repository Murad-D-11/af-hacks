// Run with: npx tsx scripts/check-assessment.ts
// Builds the full seed in memory (no filesystem writes) and asserts the assessment
// engine's "before" and "after" numbers from the Context Pack / TASK B2.
import { buildSeed } from '../lib/seed';
import { computeAssessmentFromDb } from '../lib/assessment';
import type { DB } from '../lib/store';
import type { VerificationRequest } from '../lib/types';
import { emptyAudit } from '../lib/types';

const WORKER_ID = 'w_emre';
const E_KOCAELI = 'e_kocaeli';

let failures = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  OK   ${label}: ${JSON.stringify(actual)}`);
  } else {
    failures++;
    console.error(`  FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function main() {
  const db: DB = buildSeed('full');

  console.log('--- BEFORE (full seed, Kocaeli unverified) ---');
  const before = computeAssessmentFromDb(db, WORKER_ID);
  assertEqual(before.verifiedHours, 6235, 'verifiedHours');
  assertEqual(before.claimedHours, 19875, 'claimedHours');
  assertEqual(`${before.verifiedCount}/${before.totalSkillSets}`, '3/8', 'coverage');
  assertEqual(before.readyToSubmit, false, 'readyToSubmit');

  // Add an in-memory completed Kocaeli verification request (employer-confirmed dates
  // differ from the worker's claim: 2013-07 vs claimed 2013-06).
  const kocaeliDutyIds = ['d_mcc', 'd_plc', 'd_motors', 'd_drawings', 'd_conduit', 'd_loto'];
  const kocaeliRequest: VerificationRequest = {
    id: 'r_kocaeli',
    token: 'seed-kocaeli',
    employmentId: E_KOCAELI,
    workerId: WORKER_ID,
    status: 'completed',
    createdAt: '2026-09-21T00:00:00.000Z',
    completedAt: '2026-09-22T00:00:00.000Z',
    answers: {
      companyName: 'Kocaeli Endüstri Elektrik',
      city: 'Kocaeli',
      country: 'Türkiye',
      supervisorName: 'Murat Demir',
      supervisorTitle: 'Elektrik Süpervizörü',
      roleTitle: 'Endüstriyel Elektrikçi',
      startDate: '2013-07',
      endDate: '2019-03',
      hoursPerWeek: 45,
      dutyIds: kocaeliDutyIds,
      dutyNotesTr: '',
      submittedAt: '2026-09-21T12:00:00.000Z',
    },
    transcript: [],
    confirmations: [
      { field: 'consent', status: 'confirmed', note: null },
      { field: 'identity', status: 'confirmed', note: null },
      { field: 'company', status: 'confirmed', note: null },
      { field: 'role', status: 'confirmed', note: null },
      { field: 'dates', status: 'corrected', note: 'Worker claimed June 2013; employer states July 2013.' },
      { field: 'hours', status: 'confirmed', note: null },
      { field: 'duties', status: 'confirmed', note: null },
    ],
    videoFile: null,
    audit: emptyAudit(),
    result: {
      confirmedRoleTitle: 'Industrial Electrician',
      confirmedStartDate: '2013-07',
      confirmedEndDate: '2019-03',
      confirmedHoursPerWeek: 45,
      confirmedDutyIds: kocaeliDutyIds,
      confirmedTasks: [
        'installing motor control centres',
        'wiring PLC control panels',
        'troubleshooting motors and drives',
        'reading and revising electrical drawings',
        'installing conduit and cable tray',
        'lockout/tagout and site safety',
      ],
      discrepancies: ["Worker claimed June 2013; employer states July 2013."],
      allFieldsConfirmed: false,
      outcome: 'verified',
      verifiedHours: 13445,
      summaryEnglish: 'Murat Demir confirmed Emre Yıldız worked as an Industrial Electrician at Kocaeli Endüstri Elektrik from July 2013 to March 2019, 45 hours per week, across six duties. One date discrepancy flagged.',
    },
    error: null,
  };

  const afterDb: DB = {
    ...db,
    requests: [...db.requests, kocaeliRequest],
    employments: db.employments.map(e =>
      e.id === E_KOCAELI ? { ...e, status: 'verified', latestRequestId: kocaeliRequest.id } : e
    ),
  };

  console.log('--- AFTER (Kocaeli verified) ---');
  const after = computeAssessmentFromDb(afterDb, WORKER_ID);
  assertEqual(after.verifiedHours, 19680, 'verifiedHours');
  assertEqual(`${after.verifiedCount}/${after.totalSkillSets}`, '8/8', 'coverage');
  assertEqual(after.readyToSubmit, true, 'readyToSubmit');

  console.log('');
  if (failures > 0) {
    console.error(`${failures} assertion(s) failed.`);
    process.exit(1);
  }
  console.log('All assertions passed.');
}

main();
