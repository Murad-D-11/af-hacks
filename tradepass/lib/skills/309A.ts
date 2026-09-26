import type { SkillSet, DutyOption } from '../types';

export const REQUIRED_HOURS_309A = 9000;

// U1–U4 titles are from the official 309A Apprenticeship Training Standard.
// U5–U8 are PROVISIONAL groupings: replace titles from the official STO PDF before the pitch.
export const SKILL_SETS_309A: SkillSet[] = [
  { id: 'U1', code: 'U1', title: 'Protect Self and Others', keywords: ['safety', 'lockout', 'tagout', 'ppe', 'hazard'], provisional: false },
  { id: 'U2', code: 'U2', title: 'Read, Interpret and Revise Schematic Drawings and Documentation', keywords: ['drawing', 'schematic', 'blueprint', 'documentation'], provisional: false },
  { id: 'U3', code: 'U3', title: 'Select, Maintain and Use Tools and Equipment', keywords: ['multimeter', 'tester', 'test equipment', 'tools'], provisional: false },
  { id: 'U4', code: 'U4', title: 'Install, Maintain and Repair Wiring Systems', keywords: ['conduit', 'cable tray', 'raceway', 'wiring system'], provisional: false },
  { id: 'U5', code: 'U5', title: 'Power Distribution Systems', keywords: ['distribution panel', 'switchgear', 'grounding', 'bonding', 'panelboard'], provisional: true },
  { id: 'U6', code: 'U6', title: 'Motors and Motor Controls', keywords: ['motor', 'drive', 'mcc'], provisional: true },
  { id: 'U7', code: 'U7', title: 'Lighting Systems', keywords: ['lighting'], provisional: true },
  { id: 'U8', code: 'U8', title: 'Control Systems and Automation', keywords: ['plc', 'automation'], provisional: true },
];

export const DUTIES_309A: DutyOption[] = [
  { id: 'd_mcc', en: 'installing motor control centres', tr: 'Motor kontrol merkezi kurulumu', skillSetIds: ['U6'] },
  { id: 'd_plc', en: 'wiring PLC control panels', tr: 'PLC kontrol panosu kablolaması', skillSetIds: ['U8'] },
  { id: 'd_motors', en: 'troubleshooting motors and drives', tr: 'Motor ve sürücü arızalarını tespit edip giderme', skillSetIds: ['U6'] },
  { id: 'd_drawings', en: 'reading and revising electrical drawings', tr: 'Elektrik projelerini okuma ve revize etme', skillSetIds: ['U2'] },
  { id: 'd_conduit', en: 'installing conduit and cable tray', tr: 'Kablo kanalı ve kablo tavası döşeme', skillSetIds: ['U4'] },
  { id: 'd_loto', en: 'lockout/tagout and site safety', tr: 'Kilitleme-etiketleme ve iş güvenliği', skillSetIds: ['U1'] },
  { id: 'd_panels', en: 'wiring distribution panels', tr: 'Dağıtım panosu kablolaması', skillSetIds: ['U5'] },
  { id: 'd_lighting', en: 'installing lighting circuits', tr: 'Aydınlatma devresi kurulumu', skillSetIds: ['U7'] },
  { id: 'd_testing', en: 'testing with multimeters and insulation testers', tr: 'Multimetre ve izolasyon test cihazıyla ölçüm', skillSetIds: ['U3'] },
  { id: 'd_grounding', en: 'installing grounding and bonding', tr: 'Topraklama ve eşpotansiyel bağlantı', skillSetIds: ['U5'] },
];

export const dutyById = (id: string) => DUTIES_309A.find(d => d.id === id) ?? null;

export function matchSkillSets(task: string): SkillSet[] {
  const t = task.toLowerCase();
  const exact = DUTIES_309A.find(d => d.en.toLowerCase() === t);
  if (exact) return SKILL_SETS_309A.filter(s => exact.skillSetIds.includes(s.id));
  return SKILL_SETS_309A.filter(s => s.keywords.some(k => t.includes(k)));
}
