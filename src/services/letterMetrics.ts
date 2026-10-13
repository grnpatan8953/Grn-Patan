/**
 * letterMetrics.ts
 * Precision Letter Size (Inches) Calculator for Canva Editor
 * Measures the ACTUAL VISIBLE LETTERING (ink glyph boundaries), not the empty bounding box container.
 * 
 * Standard Print / CSS Typography Constants:
 * 1 inch = 25.4 mm = 72 pt (PostScript / DTP point) = 96 CSS pixels (CSS 1in standard).
 * 1 pt = 1/72 inch = 0.352778 mm = 1.333333 CSS px.
 */

export interface LetterDimension {
  id: string;
  label: string;
  sampleText: string;
  fontSizePt: number;
  letterHeightInches: number;
  letterWidthInches: number;
  totalWidthInches: number;
  letterHeightMm: number;
  letterWidthMm: number;
  totalWidthMm: number;
}

// Offscreen canvas singleton for measuring text glyph metrics
let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureCanvas.width = 1000;
    measureCanvas.height = 400;
  }
  if (!measureCtx) {
    measureCtx = measureCanvas.getContext('2d');
  }
  return measureCtx;
}

/**
 * Measures actual ink dimensions of visible lettering in inches.
 * @param text The exact visible text content
 * @param fontSizePt Effective font size in points (pt)
 * @param fontFamily Font family used
 * @param scale Element transform scale factor (default 1.0)
 */
export function measureVisibleTextInches(
  text: string,
  fontSizePt: number,
  fontFamily: string = "'Barlow Condensed', sans-serif",
  scale: number = 1.0
): {
  letterHeightInches: number;
  letterWidthInches: number;
  totalWidthInches: number;
  letterHeightMm: number;
  letterWidthMm: number;
  totalWidthMm: number;
} {
  const cleanText = (text || '').trim();
  const effectivePt = Math.max(4, (fontSizePt || 12) * (scale || 1.0));
  const fontSizePx = effectivePt * (96 / 72); // 1 pt = 96/72 px = 1.3333px

  const ctx = getMeasureContext();
  if (ctx && cleanText) {
    try {
      ctx.font = `900 ${fontSizePx}px ${fontFamily}`;
      const metrics = ctx.measureText(cleanText);

      // actualBoundingBox measures the true ink boundaries of visible glyphs!
      if (
        typeof metrics.actualBoundingBoxAscent === 'number' &&
        typeof metrics.actualBoundingBoxDescent === 'number'
      ) {
        const inkHeightPx = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        let inkWidthPx = metrics.width;
        if (
          typeof metrics.actualBoundingBoxRight === 'number' &&
          typeof metrics.actualBoundingBoxLeft === 'number'
        ) {
          inkWidthPx = metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft;
        }

        const heightInches = inkHeightPx / 96;
        const totalWidthInches = inkWidthPx / 96;
        const visibleChars = Math.max(1, cleanText.replace(/\s+/g, '').length);
        const singleLetterWidthInches = totalWidthInches / visibleChars;

        return {
          letterHeightInches: Number(heightInches.toFixed(2)),
          letterWidthInches: Number(singleLetterWidthInches.toFixed(2)),
          totalWidthInches: Number(totalWidthInches.toFixed(2)),
          letterHeightMm: Number((heightInches * 25.4).toFixed(1)),
          letterWidthMm: Number((singleLetterWidthInches * 25.4).toFixed(1)),
          totalWidthMm: Number((totalWidthInches * 25.4).toFixed(1)),
        };
      }
    } catch {}
  }

  // Typographic cap-height mathematical formula:
  // For uppercase letters & digits in condensed fonts (Barlow, Anton, Impact):
  // Cap-height is ~71% to 73% of font point size.
  // Single numeral / capital width is ~44% of font point size.
  const heightInches = (effectivePt * 0.72) / 72;
  const singleLetterWidthInches = (effectivePt * 0.44) / 72;
  const visibleChars = Math.max(1, cleanText.replace(/\s+/g, '').length);
  const totalWidthInches = singleLetterWidthInches * visibleChars;

  return {
    letterHeightInches: Number(heightInches.toFixed(2)),
    letterWidthInches: Number(singleLetterWidthInches.toFixed(2)),
    totalWidthInches: Number(totalWidthInches.toFixed(2)),
    letterHeightMm: Number((heightInches * 25.4).toFixed(1)),
    letterWidthMm: Number((singleLetterWidthInches * 25.4).toFixed(1)),
    totalWidthMm: Number((totalWidthInches * 25.4).toFixed(1)),
  };
}
