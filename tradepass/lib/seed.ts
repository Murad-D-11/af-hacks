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
const E_BURSA = 'e_bursa';
const E_KOCAELI = 'e_kocaeli';
const E_OKSANA = 'e_oksana_kyiv';
const E_CARLOS = 'e_carlos_monterrey';
const R_BURSA = 'r_bursa';
const R_OKSANA = 'r_oksana_kyiv';

// A fixed 64-hex placeholder "sha256" for seeded evidence (no real video file backs it).
const FIXED_SHA256 = 'a3f1c9e7b2d4f6081a5c3e9b7d1f2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f';

function bursaAudit(): AuditTrail {
  const audit = emptyAudit();
  audit.ip = '78.171.44.12';
  audit.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
  audit.clientTimezone = 'Europe/Istanbul';
  audit.interviewMode = 'live';
  audit.conversationId = 'seed-verify-bursa';
  audit.transcriptSource = 'elevenlabs';
  audit.videoSha256 = FIXED_SHA256;
  audit.videoBytes = 8_421_776;
  audit.videoMimeType = 'video/webm';
  audit.videoDurationSec = 142;
  audit.events = [
    { at: '2026-09-10T09:12:00.000Z', type: 'request_created', detail: 'Verification request created for Bursa Enerji Sistemleri.' },
    { at: '2026-09-11T06:03:22.000Z', type: 'link_opened', detail: 'Employer opened the verification link.' },
    { at: '2026-09-11T06:11:47.000Z', type: 'form_submitted', detail: 'Employer submitted the Turkish employer form.' },
    { at: '2026-09-11T06:12:05.000Z', type: 'interview_started', detail: 'Video interview session started (live mode).' },
    { at: '2026-09-11T06:15:10.000Z', type: 'video_uploaded', detail: 'Interview video uploaded and fingerprinted.' },
    { at: '2026-09-11T06:15:12.000Z', type: 'interview_completed', detail: 'All fields confirmed; request marked completed.' },
  ];
  return audit;
}

function bursaResult(): VerificationResult {
  const verifiedHours = hoursFor('2019-06', '2022-05', 40); // 6235
  return {
    confirmedRoleTitle: 'Electrician',
    confirmedStartDate: '2019-06',
    confirmedEndDate: '2022-05',
    confirmedHoursPerWeek: 40,
    confirmedDutyIds: ['d_panels', 'd_lighting', 'd_testing', 'd_grounding'],
    confirmedTasks: [
      'wiring distribution panels',
      'installing lighting circuits',
      'testing with multimeters and insulation testers',
      'installing grounding and bonding',
    ],
    discrepancies: [],
    allFieldsConfirmed: true,
    outcome: 'verified',
    verifiedHours,
    summaryEnglish: 'Ahmet Kaya confirmed Emre Yıldız worked as an Electrician at Bursa Enerji Sistemleri from June 2019 to May 2022, 40 hours per week, wiring distribution panels, installing lighting circuits, testing with multimeters, and installing grounding and bonding. All fields confirmed, no discrepancies.',
  };
}

function bursaRequest(): VerificationRequest {
  return {
    id: R_BURSA,
    token: 'seed-bursa',
    employmentId: E_BURSA,
    workerId: W_EMRE,
    status: 'completed',
    createdAt: '2026-09-10T09:12:00.000Z',
    completedAt: '2026-09-12T00:00:00.000Z',
    answers: {
      companyName: 'Bursa Enerji Sistemleri',
      city: 'Bursa',
      country: 'Türkiye',
      supervisorName: 'Ahmet Kaya',
      supervisorTitle: 'Şantiye Şefi',
      roleTitle: 'Elektrikçi',
      startDate: '2019-06',
      endDate: '2022-05',
      hoursPerWeek: 40,
      dutyIds: ['d_panels', 'd_lighting', 'd_testing', 'd_grounding'],
      dutyNotesTr: 'Dağıtım panoları, aydınlatma devreleri, ölçüm ve topraklama işleri yaptım.',
      submittedAt: '2026-09-11T06:11:47.000Z',
    },
    transcript: [
      { speaker: 'agent', original: 'Merhaba Ahmet Bey. Ben TradePass\'in otomatik asistanıyım. Emre Yıldız\'ın Kanada, Ontario\'daki elektrikçi lisans başvurusu için kısa bir görüntülü doğrulama yapacağız. Kabul ediyor musunuz?', english: "Hello Mr. Ahmet. I'm TradePass's automated assistant. We'll do a short video verification for Emre Yıldız's electrician licence application in Ontario, Canada. Do you agree?" },
      { speaker: 'employer', original: 'Evet, kabul ediyorum.', english: 'Yes, I agree.' },
      { speaker: 'agent', original: 'Teşekkürler. Tüm bilgileriniz onaylandı. Görüşme tamamlandı.', english: 'Thank you. All your information has been confirmed. The interview is complete.' },
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
    videoFile: null, // "Recording on file" — no actual video for this older, already-verified request.
    audit: bursaAudit(),
    result: bursaResult(),
    error: null,
  };
}

function bursaEmployment(): Employment {
  return {
    id: E_BURSA,
    workerId: W_EMRE,
    employerName: 'Bursa Enerji Sistemleri',
    city: 'Bursa',
    country: 'Türkiye',
    startDate: '2019-06',
    endDate: '2022-05',
    hoursPerWeek: 40,
    roleTitle: 'Electrician',
    tasks: ['wiring distribution panels', 'installing lighting circuits', 'testing with multimeters and insulation testers', 'installing grounding and bonding'],
    reference: { name: 'Ahmet Kaya', title: 'Site Manager', email: null, phone: null, language: 'tr', timezone: 'Europe/Istanbul' },
    status: 'verified',
    latestRequestId: R_BURSA,
    attemptLog: [],
    origin: 'seed',
  };
}

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
    attemptLog: [
      '2026-08-30: Worker emailed a letter template to the employer. No response.',
      '2026-09-12: Employer returned a letter, unsigned, with no hours or duties listed.',
    ],
    origin: 'voice_intake',
  };
}

function emreIntakeTranscript() {
  return [
    { speaker: 'agent' as const, original: 'Merhaba Emre. Ben TradePass\'in otomatik asistanıyım. Ontario elektrikçi lisans başvurunuz için geçmiş işlerinizi sizin anlatımınızla kaydedeceğim. Hazır mısınız?', english: "Hello Emre. I'm TradePass's automated assistant. For your Ontario electrician licence application, I'll record your past jobs in your own words. Are you ready?" },
    { speaker: 'worker' as const, original: 'Evet, hazırım.', english: 'Yes, I\'m ready.' },
    { speaker: 'agent' as const, original: 'Kocaeli\'deki işinizden başlayalım. Şirketin adı neydi?', english: 'Let\'s start with your job in Kocaeli. What was the company name?' },
    { speaker: 'worker' as const, original: 'Kocaeli Endüstri Elektrik. 2013 Haziran\'dan 2019 Mart\'a kadar, haftada 45 saat, endüstriyel elektrikçi olarak çalıştım.', english: 'Kocaeli Endüstri Elektrik. I worked from June 2013 to March 2019, 45 hours a week, as an industrial electrician.' },
  ];
}

function emreWorker(scenario: 'full' | 'intake'): Worker {
  return {
    id: W_EMRE,
    name: 'Emre Yıldız',
    trade: '309A',
    homeCountry: 'Türkiye',
    preferredLanguage: 'tr',
    contractorName: 'Grand River Electric Ltd.',
    currentRole: 'General Labourer',
    createdAt: '2026-08-01T00:00:00.000Z',
    intake: scenario === 'full'
      ? {
          mode: 'live',
          conversationId: 'seed-intake',
          transcript: emreIntakeTranscript(),
          source: 'elevenlabs',
          completedAt: '2026-09-20T00:00:00.000Z',
        }
      : null,
  };
}

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
    { at: '2026-09-06T07:34:05.000Z', type: 'interview_completed', detail: 'Interview completed with one unclear field.' },
  ];
  return audit;
}

function oksanaResult(): VerificationResult {
  const verifiedHours = hoursFor('2012-01', '2021-12', 40); // 20784
  return {
    confirmedRoleTitle: 'Electrician',
    confirmedStartDate: '2012-01',
    confirmedEndDate: '2021-12',
    confirmedHoursPerWeek: 40,
    confirmedDutyIds: ['d_panels', 'd_lighting', 'd_grounding'],
    confirmedTasks: ['wiring distribution panels', 'installing lighting circuits', 'installing grounding and bonding'],
    discrepancies: [],
    allFieldsConfirmed: false,
    outcome: 'partial',
    verifiedHours,
    summaryEnglish: 'Employer confirmed company, role, dates, hours and duties. The supervisor title was unclear on the recording and needs a follow-up.',
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
      dutyIds: ['d_panels', 'd_lighting', 'd_grounding'],
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
      { field: 'role', status: 'unclear', note: 'Audio unclear on exact supervisor title.' },
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
    tasks: ['wiring distribution panels', 'installing lighting circuits', 'installing grounding and bonding'],
    reference: { name: 'Ihor Petrenko', title: 'Site Supervisor', email: null, phone: null, language: 'uk', timezone: 'Europe/Kyiv' },
    status: 'partial',
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
    tasks: ['wiring PLC control panels', 'troubleshooting motors and drives'],
    reference: { name: 'Javier Ramírez', title: 'Plant Supervisor', email: null, phone: null, language: 'es', timezone: 'America/Monterrey' },
    status: 'unverified',
    latestRequestId: null,
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
  const workers: Worker[] = [emreWorker(scenario), oksanaWorker(), carlosWorker()];
  const employments: Employment[] = [bursaEmployment(), oksanaEmployment(), carlosEmployment()];
  const requests: VerificationRequest[] = [bursaRequest(), oksanaRequest()];

  if (scenario === 'full') {
    employments.push(kocaeliEmployment());
  }

  return { workers, employments, requests };
}
