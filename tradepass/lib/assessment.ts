import type { DB } from './store';
import { readDb } from './store';
import type { Assessment, Employment, SkillSetCoverage, VerificationRequest } from './types';
import { hoursFor } from './hours';
import { REQUIRED_HOURS_309A, SKILL_SETS_309A, dutyById, matchSkillSets } from './skills/309A';

type CoverageSource = 'verified' | 'claimed';
type EvidenceEntry = { source: CoverageSource; employmentId: string; text: string };

/**
 * An employment counts as verified evidence when its latest request is 'completed'
 * with result.outcome 'verified' or 'partial'. See Context Pack "Assessment rule".
 */
function latestCompletedRequest(employment: Employment, requests: VerificationRequest[]): VerificationRequest | null {
  if (!employment.latestRequestId) return null;
  const req = requests.find(r => r.id === employment.latestRequestId);
  if (!req) return null;
  if (req.status !== 'completed') return null;
  if (!req.result) return null;
  if (req.result.outcome !== 'verified' && req.result.outcome !== 'partial') return null;
  return req;
}

export function computeAssessmentFromDb(db: DB, workerId: string): Assessment {
  const employments = db.employments.filter(e => e.workerId === workerId);

  let claimedHours = 0;
  let verifiedHours = 0;

  // skillSetId -> evidence entries, tagged by source (verified wins over claimed at aggregation time).
  const evidenceBySkillSet = new Map<string, EvidenceEntry[]>();
  const addEvidence = (skillSetId: string, entry: EvidenceEntry) => {
    const list = evidenceBySkillSet.get(skillSetId) ?? [];
    list.push(entry);
    evidenceBySkillSet.set(skillSetId, list);
  };

  const unverifiedEmployers: string[] = [];

  for (const employment of employments) {
    claimedHours += hoursFor(employment.startDate, employment.endDate, employment.hoursPerWeek);

    const completedRequest = latestCompletedRequest(employment, db.requests);

    if (completedRequest && completedRequest.result) {
      verifiedHours += completedRequest.result.verifiedHours;

      for (const dutyId of completedRequest.result.confirmedDutyIds) {
        const duty = dutyById(dutyId);
        if (!duty) continue;
        for (const skillSetId of duty.skillSetIds) {
          addEvidence(skillSetId, { source: 'verified', employmentId: employment.id, text: duty.en });
        }
      }
    } else {
      unverifiedEmployers.push(employment.employerName);

      for (const task of employment.tasks) {
        const skillSets = matchSkillSets(task);
        for (const skillSet of skillSets) {
          addEvidence(skillSet.id, { source: 'claimed', employmentId: employment.id, text: task });
        }
      }
    }
  }

  const coverage: SkillSetCoverage[] = SKILL_SETS_309A.map(skillSet => {
    const entries = evidenceBySkillSet.get(skillSet.id) ?? [];
    const hasVerified = entries.some(e => e.source === 'verified');
    const hasClaimed = entries.some(e => e.source === 'claimed');
    const status: SkillSetCoverage['status'] = hasVerified ? 'verified' : hasClaimed ? 'claimed' : 'gap';
    return {
      skillSetId: skillSet.id,
      code: skillSet.code,
      title: skillSet.title,
      provisional: skillSet.provisional,
      status,
      evidence: entries,
    };
  });

  const verifiedCount = coverage.filter(c => c.status === 'verified').length;
  const totalSkillSets = SKILL_SETS_309A.length;
  const claimedOnlyCount = coverage.filter(c => c.status === 'claimed').length;

  const readyToSubmit = verifiedHours >= REQUIRED_HOURS_309A && verifiedCount === totalSkillSets;

  const blockers: string[] = [];
  if (verifiedHours < REQUIRED_HOURS_309A) {
    const remaining = REQUIRED_HOURS_309A - verifiedHours;
    blockers.push(`${remaining.toLocaleString('en-CA')} more verified hours needed`);
  }
  if (claimedOnlyCount > 0) {
    blockers.push(`${claimedOnlyCount.toLocaleString('en-CA')} skill sets supported only by the worker's own claims`);
  }
  for (const employerName of unverifiedEmployers) {
    blockers.push(`Employer not yet verified: ${employerName}`);
  }

  return {
    workerId,
    trade: '309A',
    requiredHours: REQUIRED_HOURS_309A,
    claimedHours,
    verifiedHours,
    coverage,
    verifiedCount,
    totalSkillSets,
    readyToSubmit,
    blockers,
  };
}

export function computeAssessment(workerId: string): Assessment {
  return computeAssessmentFromDb(readDb(), workerId);
}
