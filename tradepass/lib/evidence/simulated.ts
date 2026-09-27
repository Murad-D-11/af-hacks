// Developer A's simulated interview script (no ElevenLabs credits used). Used when
// NEXT_PUBLIC_VOICE_MODE=simulated, or as a fallback if a live session fails to start.
// The agent's lines are spoken client-side with speechSynthesis('tr-TR'); this module
// only builds the timed step data — no browser APIs here, so it's safely importable
// from both client and server code.
import type { EmployerAnswers, FieldConfirmation, TranscriptLine } from '../types';
import { DUTIES_309A } from '../skills/309A';
import { monthTr, monthEn } from '../hours';

export interface SimulatedStep {
  atSec: number;
  line?: TranscriptLine;
  confirm?: FieldConfirmation;
}

function dutyLabels(dutyIds: string[]): { tr: string[]; en: string[] } {
  const tr: string[] = [];
  const en: string[] = [];
  for (const id of dutyIds) {
    const duty = DUTIES_309A.find((d) => d.id === id);
    if (duty) {
      tr.push(duty.tr);
      en.push(duty.en);
    }
  }
  return { tr, en };
}

/**
 * Builds the full simulated verification interview as a sequence of timed steps, driven
 * entirely by the employer's own submitted answers (never the worker's claim). Total
 * runtime is ~70s, matching a real verification call's pacing.
 */
export function simulatedInterview(answers: EmployerAnswers): SimulatedStep[] {
  const { tr: dutiesTr, en: dutiesEn } = dutyLabels(answers.dutyIds);
  const dutiesTrJoined = dutiesTr.join(', ');
  const dutiesEnJoined = dutiesEn.join(', ');

  const supervisorName = answers.supervisorName;
  const supervisorTitle = answers.supervisorTitle;
  const startTr = monthTr(answers.startDate);
  const endTr = monthTr(answers.endDate);
  const startEn = monthEn(answers.startDate);
  const endEn = monthEn(answers.endDate);

  const steps: SimulatedStep[] = [
    {
      atSec: 0,
      line: {
        speaker: 'agent',
        original: `Merhaba ${supervisorName} Bey. Ben TradePass'in otomatik asistanıyım. Emre Yıldız'ın Kanada, Ontario'daki elektrikçi lisans başvurusu için kısa bir görüntülü doğrulama yapacağız. Bu görüşmenin görüntüsü ve sesi kaydedilecek ve yalnızca bu başvuru için kullanılacak. Kabul ediyor musunuz?`,
        english:
          "Hello Mr. Murat Demir. I'm TradePass's automated assistant. We'll do a short video verification for Emre Yıldız's electrician licence application in Ontario, Canada. The video and audio of this session will be recorded and used only for this application. Do you agree?",
        atSec: 0,
      },
    },
    {
      atSec: 8,
      line: { speaker: 'employer', original: 'Evet, kabul ediyorum.', english: 'Yes, I agree.', atSec: 8 },
      confirm: { field: 'consent', status: 'confirmed', note: null, atSec: 8 },
    },
    {
      atSec: 11,
      line: {
        speaker: 'agent',
        original: 'Adınızı ve ünvanınızı söyler misiniz?',
        english: 'Could you state your name and title?',
        atSec: 11,
      },
    },
    {
      atSec: 14,
      line: {
        speaker: 'employer',
        original: `${supervisorName}, ${supervisorTitle.toLowerCase()}.`,
        english: `${supervisorName}, ${supervisorTitle}.`,
        atSec: 14,
      },
      confirm: { field: 'identity', status: 'confirmed', note: null, atSec: 14 },
    },
    {
      atSec: 18,
      line: {
        speaker: 'agent',
        original: `Emre, ${answers.companyName}'te çalıştı. Doğru mu?`,
        english: `Emre worked at ${answers.companyName}. Correct?`,
        atSec: 18,
      },
    },
    {
      atSec: 21,
      line: { speaker: 'employer', original: 'Evet, doğru.', english: 'Yes, correct.', atSec: 21 },
      confirm: { field: 'company', status: 'confirmed', note: null, atSec: 21 },
    },
    {
      atSec: 24,
      line: {
        speaker: 'agent',
        original: `Pozisyonu ${answers.roleTitle}. Doğru mu?`,
        english: `His position was ${answers.roleTitle}. Correct?`,
        atSec: 24,
      },
    },
    {
      atSec: 27,
      line: { speaker: 'employer', original: 'Evet.', english: 'Yes.', atSec: 27 },
      confirm: { field: 'role', status: 'confirmed', note: null, atSec: 27 },
    },
    {
      atSec: 30,
      line: {
        speaker: 'agent',
        original: `${startTr}'ten ${endTr}'a kadar çalıştı. Doğru mu?`,
        english: `He worked from ${startEn} to ${endEn}. Correct?`,
        atSec: 30,
      },
    },
    {
      atSec: 34,
      line: {
        speaker: 'employer',
        original: `Evet, ${startTr}'te başladı.`,
        english: `Yes, he started in ${startEn}.`,
        atSec: 34,
      },
      confirm: { field: 'dates', status: 'confirmed', note: null, atSec: 34 },
    },
    {
      atSec: 38,
      line: {
        speaker: 'agent',
        original: `Haftada ${answers.hoursPerWeek} saat çalıştı. Doğru mu?`,
        english: `He worked ${answers.hoursPerWeek} hours per week. Correct?`,
        atSec: 38,
      },
    },
    {
      atSec: 41,
      line: {
        speaker: 'employer',
        original: `Evet, ${answers.hoursPerWeek} saat.`,
        english: `Yes, ${answers.hoursPerWeek} hours.`,
        atSec: 41,
      },
      confirm: { field: 'hours', status: 'confirmed', note: null, atSec: 41 },
    },
    {
      atSec: 45,
      line: {
        speaker: 'agent',
        original: `${dutiesTrJoined}. Doğru mu?`,
        english: `${dutiesEnJoined}. Correct?`,
        atSec: 45,
      },
    },
    {
      atSec: 52,
      line: { speaker: 'employer', original: 'Evet, hepsini yaptı.', english: 'Yes, he did all of them.', atSec: 52 },
      confirm: { field: 'duties', status: 'confirmed', note: null, atSec: 52 },
    },
    {
      atSec: 56,
      line: {
        speaker: 'agent',
        original: "Emre'nin yaptığı tipik bir projeyi kısaca anlatır mısınız?",
        english: 'Could you briefly describe a typical project Emre did?',
        atSec: 56,
      },
    },
    {
      atSec: 60,
      line: {
        speaker: 'employer',
        original:
          'Bir otomotiv fabrikasında yeni üretim hattının motor kontrol merkezlerini ve PLC panolarını kurdu.',
        english:
          'At a car factory he installed the motor control centres and PLC panels for a new production line.',
        atSec: 60,
      },
    },
    {
      atSec: 68,
      line: {
        speaker: 'agent',
        original: 'Zaman ayırdığınız için teşekkürler. İyi günler.',
        english: 'Thank you for your time. Have a good day.',
        atSec: 68,
      },
    },
  ];

  return steps;
}
