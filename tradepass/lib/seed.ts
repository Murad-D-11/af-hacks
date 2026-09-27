import type { DB } from './store';
import type {
  Worker, Employment, VerificationRequest, AuditTrail, VerificationResult,
} from './types';
import { emptyAudit } from './types';
import { hoursFor } from './hours';

// Fixed ids so the demo script and seed docs can refer to them by name.
const W_EMRE = 'w_emre';
const W_OKSANA = 'w_oksana';
const W_CARLOS = 'w_carlos';
const E_KOCAELI = 'e_kocaeli';
const E_OKSANA = 'e_oksana_kyiv';
const E_CARLOS = 'e_carlos_monterrey';
const R_OKSANA = 'r_oksana_kyiv';
const R_CARLOS = 'r_carlos_monterrey';

// EN: Emre Yıldız is the LIVE DEMO worker: he starts completely empty and unverified
// (no intake, one employment with zero progress) so the pitch can show every value on
// this page change in real time — voice intake, then employer verification. Oksana and
// Carlos are the opposite: seeded as fully verified, all 8/8 skill sets, well past the
// 9,000-hour bar, so the app has a "finished application" to contrast against.

function kocaeliEmployment(): Employment {
  return {
    id: E_KOCAELI,
    workerId: W_EMRE,
    employerName: 'Kocaeli Endüstri Elektrik',
    city: 'Kocaeli',
    country: 'Türkiye',
    startDate: '2013-06',
    endDate: '2019-03',
    hoursPerWeek: 45,
    roleTitle: 'Industrial Electrician',
    tasks: [
      'installing motor control centres',
      'wiring PLC control panels',
      'troubleshooting motors and drives',
      'reading and revising electrical drawings',
      'installing conduit and cable tray',
      'lockout/tagout and site safety',
    ],
    reference: { name: 'Murat Demir', title: 'Electrical Supervisor', email: null, phone: null, language: 'tr', timezone: 'Europe/Istanbul' },
    status: 'unverified',
    latestRequestId: null,
    attemptLog: [],
    origin: 'voice_intake',
  };
}

// EN: Emre always starts with NO intake recorded and NO verification progress,
// regardless of scenario — 'full' vs 'intake' no longer changes his starting state,
// since the whole point of this worker is to demo the app moving from zero to
// something live during the pitch (voice intake, then employer verification).
function emreWorker(): Worker {
  return {
    id: W_EMRE,
    name: 'Emre Yıldız',
    trade: '309A',
    homeCountry: 'Türkiye',
    preferredLanguage: 'tr',
    contractorName: 'Grand River Electric Ltd.',
    currentRole: 'General Labourer',
    createdAt: '2026-08-01T00:00:00.000Z',
    intake: null,
  };
}

// EN: All 10 duty ids, one covering each of the 8 skill sets (U5 and U6 each get two
// duties). Confirming every duty on a single completed request gives 8/8 skill-set
// coverage in one shot — used for both Oksana's and Carlos's fully-verified requests.
const ALL_DUTY_IDS = ['d_mcc', 'd_plc', 'd_motors', 'd_drawings', 'd_conduit', 'd_loto', 'd_panels', 'd_lighting', 'd_testing', 'd_grounding'];
const ALL_DUTY_TASKS = [
  'installing motor control centres',
  'wiring PLC control panels',
  'troubleshooting motors and drives',
  'reading and revising electrical drawings',
  'installing conduit and cable tray',
  'lockout/tagout and site safety',
  'wiring distribution panels',
  'installing lighting circuits',
  'testing with multimeters and insulation testers',
  'installing grounding and bonding',
];

function oksanaAudit(): AuditTrail {
  const audit = emptyAudit();
  audit.ip = '176.36.22.5';
  audit.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
  audit.clientTimezone = 'Europe/Kyiv';
  audit.interviewMode = 'live';
  audit.conversationId = 'seed-verify-oksana';
  audit.transcriptSource = 'elevenlabs';
  audit.videoSha256 = 'b7e2d4f6a8c0e2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4c6e8b0d2f4a6c8e0b2';
  audit.videoBytes = 7_918_240;
  audit.videoMimeType = 'video/webm';
  audit.videoDurationSec = 128;
  audit.events = [
    { at: '2026-09-05T08:00:00.000Z', type: 'request_created', detail: 'Verification request created for Kyiv Energo Montazh.' },
    { at: '2026-09-06T07:20:00.000Z', type: 'link_opened', detail: 'Employer opened the verification link.' },
    { at: '2026-09-06T07:30:00.000Z', type: 'form_submitted', detail: 'Employer submitted the Ukrainian employer form.' },
    { at: '2026-09-06T07:31:00.000Z', type: 'interview_started', detail: 'Video interview session started (live mode).' },
    { at: '2026-09-06T07:34:00.000Z', type: 'video_uploaded', detail: 'Interview video uploaded and fingerprinted.' },
    { at: '2026-09-06T07:34:05.000Z', type: 'interview_completed', detail: 'All fields confirmed; request marked completed.' },
  ];
  return audit;
}

function oksanaResult(): VerificationResult {
  const verifiedHours = hoursFor('2012-01', '2021-12', 40); // 20784 — well past the 9,000-hour bar
  return {
    confirmedRoleTitle: 'Electrician',
    confirmedStartDate: '2012-01',
    confirmedEndDate: '2021-12',
    confirmedHoursPerWeek: 40,
    confirmedDutyIds: ALL_DUTY_IDS,
    confirmedTasks: ALL_DUTY_TASKS,
    discrepancies: [],
    allFieldsConfirmed: true,
    outcome: 'verified',
    verifiedHours,
    summaryEnglish: 'Ihor Petrenko confirmed Oksana Kovalenko worked as an Electrician at Kyiv Energo Montazh from January 2012 to December 2021, 40 hours per week, covering all 309A duties. All fields confirmed, no discrepancies.',
  };
}

function oksanaRequest(): VerificationRequest {
  return {
    id: R_OKSANA,
    token: 'seed-oksana',
    employmentId: E_OKSANA,
    workerId: W_OKSANA,
    status: 'completed',
    createdAt: '2026-09-05T08:00:00.000Z',
    completedAt: '2026-09-06T07:34:05.000Z',
    answers: {
      companyName: 'Kyiv Energo Montazh',
      city: 'Kyiv',
      country: 'Ukraine',
      supervisorName: 'Ihor Petrenko',
      supervisorTitle: 'Site Supervisor',
      roleTitle: 'Electrician',
      startDate: '2012-01',
      endDate: '2021-12',
      hoursPerWeek: 40,
      dutyIds: ALL_DUTY_IDS,
      dutyNotesTr: '',
      submittedAt: '2026-09-06T07:30:00.000Z',
    },
    transcript: [
      { speaker: 'agent', original: 'Hello Mr. Petrenko. This is TradePass\'s automated assistant confirming Oksana Kovalenko\'s work history.', english: 'Hello Mr. Petrenko. This is TradePass\'s automated assistant confirming Oksana Kovalenko\'s work history.' },
      { speaker: 'employer', original: 'Yes, that is correct.', english: 'Yes, that is correct.' },
    ],
    confirmations: [
      { field: 'consent', status: 'confirmed', note: null },
      { field: 'identity', status: 'confirmed', note: null },
      { field: 'company', status: 'confirmed', note: null },
      { field: 'role', status: 'confirmed', note: null },
      { field: 'dates', status: 'confirmed', note: null },
      { field: 'hours', status: 'confirmed', note: null },
      { field: 'duties', status: 'confirmed', note: null },
    ],
    videoFile: null,
    audit: oksanaAudit(),
    result: oksanaResult(),
    error: null,
  };
}

function oksanaEmployment(): Employment {
  return {
    id: E_OKSANA,
    workerId: W_OKSANA,
    employerName: 'Kyiv Energo Montazh',
    city: 'Kyiv',
    country: 'Ukraine',
    startDate: '2012-01',
    endDate: '2021-12',
    hoursPerWeek: 40,
    roleTitle: 'Electrician',
    tasks: ALL_DUTY_TASKS,
    reference: { name: 'Ihor Petrenko', title: 'Site Supervisor', email: null, phone: null, language: 'uk', timezone: 'Europe/Kyiv' },
    status: 'verified',
    latestRequestId: R_OKSANA,
    attemptLog: [],
    origin: 'seed',
  };
}

function oksanaWorker(): Worker {
  return {
    id: W_OKSANA,
    name: 'Oksana Kovalenko',
    trade: '309A',
    homeCountry: 'Ukraine',
    preferredLanguage: 'uk',
    contractorName: 'Grand River Electric Ltd.',
    currentRole: 'Electrician Helper',
    createdAt: '2026-08-05T00:00:00.000Z',
    intake: null,
  };
}

function carlosAudit(): AuditTrail {
  const audit = emptyAudit();
  audit.ip = '187.169.44.90';
  audit.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
  audit.clientTimezone = 'America/Monterrey';
  audit.interviewMode = 'live';
  audit.conversationId = 'seed-verify-carlos';
  audit.transcriptSource = 'elevenlabs';
  audit.videoSha256 = 'c8f3e5a7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3';
  audit.videoBytes = 8_102_512;
  audit.videoMimeType = 'video/webm';
  audit.videoDurationSec = 135;
  audit.events = [
    { at: '2026-08-20T14:00:00.000Z', type: 'request_created', detail: 'Verification request created for Electricistas Industriales de Monterrey.' },
    { at: '2026-08-21T13:10:00.000Z', type: 'link_opened', detail: 'Employer opened the verification link.' },
    { at: '2026-08-21T13:22:00.000Z', type: 'form_submitted', detail: 'Employer submitted the Spanish employer form.' },
    { at: '2026-08-21T13:23:00.000Z', type: 'interview_started', detail: 'Video interview session started (live mode).' },
    { at: '2026-08-21T13:26:15.000Z', type: 'video_uploaded', detail: 'Interview video uploaded and fingerprinted.' },
    { at: '2026-08-21T13:26:18.000Z', type: 'interview_completed', detail: 'All fields confirmed; request marked completed.' },
  ];
  return audit;
}

function carlosResult(): VerificationResult {
  const verifiedHours = hoursFor('2015-03', '2023-08', 44); // ~19,240 — well past the 9,000-hour bar
  return {
    confirmedRoleTitle: 'Industrial Electrician',
    confirmedStartDate: '2015-03',
    confirmedEndDate: '2023-08',
    confirmedHoursPerWeek: 44,
    confirmedDutyIds: ALL_DUTY_IDS,
    confirmedTasks: ALL_DUTY_TASKS,
    discrepancies: [],
    allFieldsConfirmed: true,
    outcome: 'verified',
    verifiedHours,
    summaryEnglish: 'Javier Ramírez confirmed Carlos Mendoza worked as an Industrial Electrician at Electricistas Industriales de Monterrey from March 2015 to August 2023, 44 hours per week, covering all 309A duties. All fields confirmed, no discrepancies.',
  };
}

function carlosRequest(): VerificationRequest {
  return {
    id: R_CARLOS,
    token: 'seed-carlos',
    employmentId: E_CARLOS,
    workerId: W_CARLOS,
    status: 'completed',
    createdAt: '2026-08-20T14:00:00.000Z',
    completedAt: '2026-08-21T13:26:18.000Z',
    answers: {
      companyName: 'Electricistas Industriales de Monterrey',
      city: 'Monterrey',
      country: 'Mexico',
      supervisorName: 'Javier Ramírez',
      supervisorTitle: 'Supervisor de Planta',
      roleTitle: 'Electricista Industrial',
      startDate: '2015-03',
      endDate: '2023-08',
      hoursPerWeek: 44,
      dutyIds: ALL_DUTY_IDS,
      dutyNotesTr: '',
      submittedAt: '2026-08-21T13:22:00.000Z',
    },
    transcript: [
      { speaker: 'agent', original: 'Hola, señor Ramírez. Este es el asistente automático de TradePass confirmando el historial laboral de Carlos Mendoza.', english: "Hello, Mr. Ramírez. This is TradePass's automated assistant confirming Carlos Mendoza's work history." },
      { speaker: 'employer', original: 'Sí, correcto.', english: 'Yes, correct.' },
    ],
    confirmations: [
      { field: 'consent', status: 'confirmed', note: null },
      { field: 'identity', status: 'confirmed', note: null },
      { field: 'company', status: 'confirmed', note: null },
      { field: 'role', status: 'confirmed', note: null },
      { field: 'dates', status: 'confirmed', note: null },
      { field: 'hours', status: 'confirmed', note: null },
      { field: 'duties', status: 'confirmed', note: null },
    ],
    videoFile: null,
    audit: carlosAudit(),
    result: carlosResult(),
    error: null,
  };
}

function carlosEmployment(): Employment {
  return {
    id: E_CARLOS,
    workerId: W_CARLOS,
    employerName: 'Electricistas Industriales de Monterrey',
    city: 'Monterrey',
    country: 'Mexico',
    startDate: '2015-03',
    endDate: '2023-08',
    hoursPerWeek: 44,
    roleTitle: 'Industrial Electrician',
    tasks: ALL_DUTY_TASKS,
    reference: { name: 'Javier Ramírez', title: 'Plant Supervisor', email: null, phone: null, language: 'es', timezone: 'America/Monterrey' },
    status: 'verified',
    latestRequestId: R_CARLOS,
    attemptLog: [],
    origin: 'seed',
  };
}

function carlosWorker(): Worker {
  return {
    id: W_CARLOS,
    name: 'Carlos Mendoza',
    trade: '309A',
    homeCountry: 'Mexico',
    preferredLanguage: 'es',
    contractorName: 'Grand River Electric Ltd.',
    currentRole: 'General Labourer',
    createdAt: '2026-08-10T00:00:00.000Z',
    intake: null,
  };
}

export function buildSeed(scenario: 'full' | 'intake'): DB {
  // EN: Emre has zero verification progress in both scenarios now — 'intake' vs
  // 'full' only used to change his starting intake state, but he never had an intake
  // to begin with here, so both scenarios currently produce the same seed for him.
  // The distinction is kept for forward compatibility / demo-script clarity even
  // though it's a no-op today.
  void scenario;

  const workers: Worker[] = [emreWorker(), oksanaWorker(), carlosWorker()];
  const employments: Employment[] = [kocaeliEmployment(), oksanaEmployment(), carlosEmployment()];
  const requests: VerificationRequest[] = [oksanaRequest(), carlosRequest()];

  return { workers, employments, requests };
}
