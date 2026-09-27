// EN: Minimal, targeted translations for safety/instructional messages that must reach
// the employer/reference in their own language, even though the rest of the employer
// flow (app/verify/[token]) is Turkish-only. This is NOT general i18n infrastructure —
// just enough to translate specific strings keyed by the Reference.language ISO code
// already captured in the data model (see lib/types.ts, lib/seed.ts).
//
// Reference.language is a free-typed ISO-639-1-ish code (seed data uses 'tr', 'uk', 'es').
// Unrecognized codes fall back to English, which is the most likely second language for
// a site supervisor abroad.

export type SupportedRefLanguage = 'tr' | 'uk' | 'es' | 'en';

function normalizeLanguage(language: string | null | undefined): SupportedRefLanguage {
  const code = (language ?? '').trim().toLowerCase().slice(0, 2);
  if (code === 'tr' || code === 'uk' || code === 'es') return code;
  return 'en';
}

const SHOW_ID_MESSAGE: Record<SupportedRefLanguage, string> = {
  tr: 'Lütfen fotoğraflı iş/kimlik kartınızı kameraya yaklaştırıp 5 saniye kadar sabit tutun.',
  uk: 'Будь ласка, покажіть своє робоче/ідентифікаційне посвідчення з фотографією камері й тримайте його нерухомо приблизно 5 секунд.',
  es: 'Por favor, muestre su identificación laboral con foto a la cámara y manténgala quieta durante unos 5 segundos.',
  en: 'Please hold your photo work ID/badge up to the camera and keep it steady for about 5 seconds.',
};

/** Returns the "hold up your ID for the camera" instruction in the reference's own
 * language, given the raw Reference.language code from the data model. */
export function showIdMessage(language: string | null | undefined): string {
  return SHOW_ID_MESSAGE[normalizeLanguage(language)];
}
