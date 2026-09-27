// Shared Noto Sans font registration for all PDFs. Registered once, imported by every
// PDF document component. Noto Sans covers Turkish's extended Latin characters
// (ş, ğ, ı, İ, ç, ö, ü), which is why it's used everywhere instead of a Helvetica default.
import path from 'path';
import { Font } from '@react-pdf/renderer';

let registered = false;

export const FONT_FAMILY = 'Noto Sans';

export function registerFonts(): void {
  if (registered) return;
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: path.join(fontsDir, 'NotoSans-Regular.ttf'), fontWeight: 'normal' },
      { src: path.join(fontsDir, 'NotoSans-Bold.ttf'), fontWeight: 'bold' },
    ],
  });
  registered = true;
}
