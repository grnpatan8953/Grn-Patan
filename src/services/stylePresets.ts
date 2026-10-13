import { BoardSlot, BoardTemplateConfig, BoardTypographyStyle } from '../types';

export interface StylePreset {
  id: BoardTypographyStyle;
  label: string;
  tag: string;
  description: string;
  fontFamily: string;
  fontWeight: string;
  letterSpacing: string;
  previewPrice: string;
  previewName: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'ORIGINAL_WORD_MASTER',
    label: 'ORIGINAL WORD MASTER',
    tag: 'WORD MASTER (PAGE 5)',
    description: 'Heavy black condensed lettering faithful to Microsoft Word page 5 design.',
    fontFamily: "'Barlow Condensed', 'Anton', 'Impact', 'Arial Black', sans-serif",
    fontWeight: '900',
    letterSpacing: '-0.03em',
    previewPrice: '₹229 ONLY',
    previewName: 'BOYS FANCY SHIRT',
  },
  {
    id: 'EXTRA_BOLD',
    label: 'EXTRA BOLD',
    tag: 'MAXIMUM PUNCH',
    description: 'Stronger, high-contrast price digits and heavy product name for maximum visibility.',
    fontFamily: "'Anton', 'Impact', 'Arial Black', sans-serif",
    fontWeight: '900',
    letterSpacing: '-0.02em',
    previewPrice: '₹229 ONLY',
    previewName: 'BOYS FANCY SHIRT',
  },
  {
    id: 'CONDENSED',
    label: 'CONDENSED',
    tag: 'COMPACT FIT',
    description: 'Ultra-compact condensed lettering ideal for longer product names without overflowing.',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: '800',
    letterSpacing: '-0.01em',
    previewPrice: '₹229 ONLY',
    previewName: 'BOYS FANCY SHIRT (3-PIECE)',
  },
  {
    id: 'CUSTOM',
    label: 'CUSTOM',
    tag: 'USER PRESETS',
    description: 'Preserves user-selected font size, font family, and manual element adjustments.',
    fontFamily: "'Barlow Condensed', 'Anton', sans-serif",
    fontWeight: '900',
    letterSpacing: 'normal',
    previewPrice: '₹229 ONLY',
    previewName: 'CUSTOM DESIGN',
  },
];

export function applyStylePreset(
  slot: BoardSlot,
  config: BoardTemplateConfig,
  styleId: BoardTypographyStyle
): BoardSlot {
  const updated: BoardSlot = {
    ...slot,
    typographyStyle: styleId,
  };

  if (styleId === 'ORIGINAL_WORD_MASTER') {
    updated.templateMode = 'MASTER';
    updated.customFontFamily = "'Barlow Condensed', 'Anton', 'Impact', 'Arial Black', sans-serif";
    updated.customPriceFontSizePt = config.priceFontSizePt;
    updated.customNameFontSizePt = config.productNameFontSizePt;
    updated.customPackFontSizePt = config.packTextFontSizePt;
    updated.customFooterFontSizePt = config.footerFontSizePt;
    updated.customSaveFontSizePt = config.saveFontSizePt;
    // Reset element offsets for clean master alignment
    const transforms = { ...(slot.elementTransforms || {}) };
    delete transforms['price'];
    delete transforms['rupee'];
    delete transforms['only'];
    delete transforms['name'];
    delete transforms['pack'];
    delete transforms['footer'];
    updated.elementTransforms = transforms;
  } else if (styleId === 'EXTRA_BOLD') {
    updated.templateMode = 'CUSTOM';
    updated.customFontFamily = "'Anton', 'Impact', 'Arial Black', sans-serif";
    updated.customPriceFontSizePt = Math.round(config.priceFontSizePt * 1.12);
    updated.customNameFontSizePt = Math.round(config.productNameFontSizePt * 1.15);
    updated.customPackFontSizePt = Math.round((config.packTextFontSizePt || 14) * 1.1);
    updated.customFooterFontSizePt = config.footerFontSizePt;
    updated.customSaveFontSizePt = config.saveFontSizePt;
  } else if (styleId === 'CONDENSED') {
    updated.templateMode = 'CUSTOM';
    updated.customFontFamily = "'Barlow Condensed', sans-serif";
    updated.customPriceFontSizePt = config.priceFontSizePt;
    updated.customNameFontSizePt = Math.max(14, Math.round(config.productNameFontSizePt * 0.92));
    updated.customPackFontSizePt = config.packTextFontSizePt;
    updated.customFooterFontSizePt = config.footerFontSizePt;
    updated.customSaveFontSizePt = config.saveFontSizePt;
  } else if (styleId === 'CUSTOM') {
    updated.templateMode = 'CUSTOM';
  }

  return updated;
}
