import type { Employment, TranscriptLine } from '../types';

export interface SimulatedIntakeLine {
  speaker: 'agent' | 'worker';
  atSec: number;
  original: string; // Turkish
  english: string;
}

/**
 * A timed Turkish/English script for the simulated (no-credits) intake conversation.
 * Timestamps are seconds from the start of the session; the intake page schedules each
 * line on a timer and speaks agent lines with speechSynthesis('tr-TR').
 */
export const SIMULATED_INTAKE_SCRIPT: SimulatedIntakeLine[] = [
  {
    speaker: 'agent',
    atSec: 0,
    original: "Merhaba Emre Yıldız. Ben TradePass'in otomatik asistanıyım. Ontario elektrikçi lisans başvurunuz için geçmiş işlerinizi sizin anlatımınızla kaydedeceğim. Bunlar sizin beyanınız olacak; daha sonra eski işverenleriniz tarafından doğrulanacak. Hazır mısınız?",
    english: "Hello Emre Yıldız. I'm TradePass's automated assistant. I'll record your past jobs in your own words for your Ontario electrician licence application. These will be your claims; your former employers will verify them later. Are you ready?",
  },
  {
    speaker: 'worker',
    atSec: 8,
    original: 'Evet, hazırım.',
    english: "Yes, I'm ready.",
  },
  {
    speaker: 'agent',
    atSec: 11,
    original: 'Hangi şirkette ve nerede çalıştınız?',
    english: 'Which company did you work for, and where?',
  },
  {
    speaker: 'worker',
    atSec: 14,
    original: "Kocaeli'de, Kocaeli Endüstri Elektrik'te.",
    english: 'In Kocaeli, at Kocaeli Endüstri Elektrik.',
  },
  {
    speaker: 'agent',
    atSec: 18,
    original: 'Hangi tarihler arasında?',
    english: 'Between which dates?',
  },
  {
    speaker: 'worker',
    atSec: 21,
    original: "2013 Haziran'dan 2019 Mart'a kadar.",
    english: 'From June 2013 to March 2019.',
  },
  {
    speaker: 'agent',
    atSec: 25,
    original: 'Haftada kaç saat çalıştınız ve pozisyonunuz neydi?',
    english: 'How many hours a week did you work, and what was your position?',
  },
  {
    speaker: 'worker',
    atSec: 28,
    original: 'Haftada 45 saat, endüstriyel elektrikçiydim.',
    english: '45 hours a week; I was an industrial electrician.',
  },
  {
    speaker: 'agent',
    atSec: 32,
    original: 'Başlıca görevleriniz nelerdi?',
    english: 'What were your main duties?',
  },
  {
    speaker: 'worker',
    atSec: 35,
    original: 'Motor kontrol merkezlerini kurdum, PLC kontrol panolarının kablolamasını yaptım, motor ve sürücü arızalarını giderdim, elektrik projelerini okuyup revize ettim, kablo kanalı ve tavası döşedim, kilitleme-etiketleme ve iş güvenliği kurallarına uydum.',
    english: 'I installed motor control centres, wired PLC control panels, fixed motor and drive faults, read and revised electrical drawings, installed conduit and cable tray, and followed lockout/tagout and safety rules.',
  },
  {
    speaker: 'agent',
    atSec: 48,
    original: 'Şefinizin adı ve ünvanı neydi?',
    english: "What was your supervisor's name and title?",
  },
  {
    speaker: 'worker',
    atSec: 51,
    original: 'Elektrik şefi Murat Demir.',
    english: 'Electrical supervisor Murat Demir.',
  },
  {
    speaker: 'agent',
    atSec: 55,
    original: 'Başka bir işiniz var mı?',
    english: 'Do you have another job to add?',
  },
  {
    speaker: 'worker',
    atSec: 58,
    original: 'Hayır, bu kadar.',
    english: "No, that's all.",
  },
  {
    speaker: 'agent',
    atSec: 61,
    original: 'Teşekkürler Emre Bey, bilgilerinizi kaydettim. İyi günler.',
    english: "Thank you, Emre. I've recorded your information. Have a good day.",
  },
];

export function simulatedScriptToTranscript(): TranscriptLine[] {
  return SIMULATED_INTAKE_SCRIPT.map(line => ({
    speaker: line.speaker,
    original: line.original,
    english: line.english,
    atSec: line.atSec,
  }));
}

/**
 * The canned Kocaeli employment produced by the simulated script (and used as the
 * fallback whenever a live conversation can't be parsed). Mirrors the Context Pack's
 * seeded e_kocaeli exactly, so scenario=intake and scenario=full agree once the worker
 * completes intake.
 */
export const CANNED_KOCAELI_EMPLOYMENT: Omit<Employment, 'workerId'> = {
  id: 'e_kocaeli',
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
  reference: {
    name: 'Murat Demir',
    title: 'Electrical Supervisor',
    email: null,
    phone: null,
    language: 'tr',
    timezone: 'Europe/Istanbul',
  },
  status: 'unverified',
  latestRequestId: null,
  attemptLog: [
    '2026-08-30: Worker emailed a letter template to the employer. No response.',
    '2026-09-12: Employer returned a letter, unsigned, with no hours or duties listed.',
  ],
  origin: 'voice_intake',
};
