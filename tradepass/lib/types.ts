export type TradeCode = '309A';
export type VoiceMode = 'live' | 'simulated';
export type EmploymentStatus = 'unverified' | 'requested' | 'verified' | 'partial' | 'failed';
export type RequestStatus = 'sent' | 'form_submitted' | 'interviewing' | 'completed' | 'failed';
export type ConfirmField = 'consent' | 'identity' | 'company' | 'role' | 'dates' | 'hours' | 'duties';
export const CONFIRM_FIELDS: ConfirmField[] = ['consent', 'identity', 'company', 'role', 'dates', 'hours', 'duties'];

export interface TranscriptLine {
  speaker: 'agent' | 'worker' | 'employer';
  original: string; // Turkish
  english: string | null;
  atSec?: number;
}
export interface IntakeRecord {
  mode: VoiceMode; conversationId: string | null;
  transcript: TranscriptLine[];
  source: 'elevenlabs' | 'fallback';
  completedAt: string;
}
export interface Reference {
  name: string; title: string;
  email: string | null; phone: string | null;
  language: string; timezone: string;
}
export interface Worker {
  id: string; name: string; trade: TradeCode; homeCountry: string;
  preferredLanguage: string; contractorName: string; currentRole: string; createdAt: string;
  intake: IntakeRecord | null;
}
export interface Employment {
  id: string; workerId: string; employerName: string; city: string; country: string;
  startDate: string; endDate: string | null; // 'YYYY-MM'
  hoursPerWeek: number; roleTitle: string;
  tasks: string[];                    // English, CLAIMED by the worker
  reference: Reference;
  status: EmploymentStatus;
  latestRequestId: string | null;
  attemptLog: string[];
  origin: 'seed' | 'voice_intake';
}
export interface DutyOption { id: string; en: string; tr: string; skillSetIds: string[]; }
export interface SkillSet { id: string; code: string; title: string; keywords: string[]; provisional: boolean; }

export interface EmployerAnswers {
  companyName: string; city: string; country: string;
  supervisorName: string; supervisorTitle: string;
  roleTitle: string;
  startDate: string; endDate: string; // 'YYYY-MM'
  hoursPerWeek: number;
  dutyIds: string[];
  dutyNotesTr: string;
  submittedAt: string;
}
export interface FieldConfirmation {
  field: ConfirmField;
  status: 'confirmed' | 'corrected' | 'unclear';
  note: string | null;
  atSec?: number;
}
export interface AuditEvent { at: string; type: string; detail: string; }
export interface AuditTrail {
  ip: string | null; userAgent: string | null; clientTimezone: string | null;
  events: AuditEvent[];
  interviewMode: VoiceMode | null;
  conversationId: string | null;
  transcriptSource: 'elevenlabs' | 'client' | 'simulated' | null;
  videoSha256: string | null; videoBytes: number | null;
  videoMimeType: string | null; videoDurationSec: number | null;
}
export interface VerificationResult {
  confirmedRoleTitle: string;
  confirmedStartDate: string; confirmedEndDate: string;
  confirmedHoursPerWeek: number;
  confirmedDutyIds: string[];
  confirmedTasks: string[];
  discrepancies: string[];
  allFieldsConfirmed: boolean;
  outcome: 'verified' | 'partial' | 'failed';
  verifiedHours: number;
  summaryEnglish: string;
}
export interface VerificationRequest {
  id: string; token: string; employmentId: string; workerId: string;
  status: RequestStatus;
  createdAt: string; completedAt: string | null;
  answers: EmployerAnswers | null;
  transcript: TranscriptLine[];
  confirmations: FieldConfirmation[];
  videoFile: string | null;
  audit: AuditTrail;
  result: VerificationResult | null;
  error: string | null;
}
export interface SkillSetCoverage {
  skillSetId: string; code: string; title: string; provisional: boolean;
  status: 'verified' | 'claimed' | 'gap';
  evidence: { source: 'claimed' | 'verified'; employmentId: string; text: string }[];
}
export interface Assessment {
  workerId: string; trade: TradeCode; requiredHours: number;
  claimedHours: number; verifiedHours: number;
  coverage: SkillSetCoverage[]; verifiedCount: number; totalSkillSets: number;
  readyToSubmit: boolean; blockers: string[];
}
export interface WorkerDetail { worker: Worker; employments: Employment[]; requests: VerificationRequest[]; }

export const emptyAudit = (): AuditTrail => ({
  ip: null, userAgent: null, clientTimezone: null, events: [], interviewMode: null,
  conversationId: null, transcriptSource: null,
  videoSha256: null, videoBytes: null, videoMimeType: null, videoDurationSec: null,
});
