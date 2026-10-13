import React from 'react';
import { BoardSlot, BoardTemplateConfig } from '../../types';

interface TemplateBoardProps {
  slot: BoardSlot;
  config: BoardTemplateConfig;
  showSlotBadge?: boolean;
  onSlotClick?: () => void;
  isInteractive?: boolean;
}

export const FullPageBoard: React.FC<TemplateBoardProps> = ({
  slot,
  config,
  showSlotBadge = false,
  onSlotClick,
  isInteractive = false,
}) => {
  const hasProduct = Boolean(slot.product || slot.displayName || slot.displaySp > 0);
  const footerText = slot.customFooter ?? config.footerText;
  const isTypeB = slot.boardType === 'MRP_SAVE';
  const mrp = slot.displayMrp || (slot.product ? slot.product.mrp : 0);
  const sp = slot.displaySp || (slot.product ? slot.product.retail : 0);
  const save = slot.displaySave !== undefined ? slot.displaySave : Math.max(0, mrp - sp);

  const isCustomMode = slot.templateMode === 'CUSTOM';
  const fontFamily = isCustomMode && slot.customFontFamily ? slot.customFontFamily : config.fontFamily;
  const borderWidth = isCustomMode && slot.customBorderThicknessPt !== undefined ? slot.customBorderThicknessPt : config.borderWidthPt;
  const priceSize = isCustomMode && slot.customPriceFontSizePt !== undefined ? slot.customPriceFontSizePt : config.priceFontSizePt;
  const nameSize = isCustomMode && slot.customNameFontSizePt !== undefined ? slot.customNameFontSizePt : config.productNameFontSizePt;
  const textAlign = isCustomMode && slot.customTextAlign ? slot.customTextAlign : 'center';

  const isBackgroundImg = slot.imagePlacementMode === 'BACKGROUND' && Boolean(slot.imageUrl);
  const bgOpacity = slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0;
  const imgFilter =
    slot.imageFilter === 'grayscale'
      ? 'grayscale(100%)'
      : slot.imageFilter === 'lighten'
      ? 'brightness(135%) contrast(85%)'
      : 'none';
  const imgWidthPct = slot.productImageWidthPct || 0.50;

  const textBackingClass = slot.textBacking ? 'bg-white/85 px-4 py-1 rounded-xs' : '';
  const textShadowStyle: React.CSSProperties = slot.textShadow
    ? { textShadow: '0 2px 4px #fff, 0 0 2px #fff' }
    : {};

  const transforms = slot.elementTransforms || {};
  const getTransformStyle = (id: string): React.CSSProperties => {
    const t = transforms[id];
    if (!t) return {};
    if (t.hidden) return { display: 'none' };
    return {
      transform: `translate(${t.x || 0}px, ${t.y || 0}px) scale(${t.scale || 1})`,
      zIndex: t.zIndex || 10,
      position: 'relative',
    };
  };

  return (
    <div
      onClick={isInteractive ? onSlotClick : undefined}
      style={{
        width: `${config.cardWidthMm}mm`,
        height: `${config.cardHeightMm}mm`,
        border: `${borderWidth}pt solid #000000`,
        fontFamily,
        boxSizing: 'border-box',
        padding: `${config.paddingMm}mm`,
      }}
      className={`relative flex flex-col justify-between items-center text-black bg-white select-none overflow-hidden ${
        isInteractive ? 'cursor-pointer hover:bg-amber-50/40 transition-colors' : ''
      }`}
    >
      {/* SCREEN-ONLY slot badge */}
      {showSlotBadge && (
        <div className="absolute top-3 left-3 px-3 py-1 bg-black text-white text-xs font-mono font-bold tracking-wider uppercase print:hidden z-30 opacity-75">
          FULL PAGE POSTER (1/1)
        </div>
      )}

      {/* MODE A: BACKGROUND IMAGE BEHIND TEXT */}
      {isBackgroundImg && (
        <div
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: bgOpacity,
            filter: imgFilter,
            ...getTransformStyle('background-image'),
          }}
        >
          <img
            src={slot.imageUrl}
            alt=""
            className={`w-full h-full ${
              slot.imageFit === 'cover' ? 'object-cover' : 'object-contain'
            }`}
          />
        </div>
      )}

      {hasProduct ? (
        <>
          <div
            className={`relative z-10 flex-1 flex flex-col justify-start items-${
              textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'center'
            } w-full my-auto px-6`}
          >
            {/* MODE B: PRODUCT IMAGE INSIDE BOARD */}
            {!isBackgroundImg && slot.imageUrl && (
              <div
                style={{
                  width: `${imgWidthPct * 100}%`,
                  maxHeight: '45%',
                  margin: '0 auto 8px auto',
                  filter: imgFilter,
                  opacity: slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0,
                  ...getTransformStyle('product-image'),
                }}
                className="flex items-center justify-center overflow-hidden"
              >
                <img
                  src={slot.imageUrl}
                  alt={slot.displayName}
                  className={`max-h-full max-w-full ${
                    slot.imageFit === 'cover' ? 'object-cover w-full h-full' : 'object-contain'
                  }`}
                />
              </div>
            )}

            {/* Price Block: ₹ [SP] ONLY */}
            <div
              style={textShadowStyle}
              className={`flex items-baseline justify-center tracking-tight leading-none text-black ${textBackingClass} mt-4`}
            >
              <span
                style={{
                  fontSize: `${config.rupeeSymbolSizePt}pt`,
                  marginRight: '6pt',
                  fontWeight: 900,
                  ...getTransformStyle('rupee'),
                }}
                className="font-black select-none"
              >
                ₹
              </span>
              <span
                style={{
                  fontSize: `${priceSize}pt`,
                  fontWeight: 900,
                  lineHeight: 0.88,
                  letterSpacing: '-0.02em',
                  ...getTransformStyle('price'),
                }}
                className="font-black"
              >
                {sp}
              </span>
              <span
                style={{
                  fontSize: `${config.onlyFontSizePt}pt`,
                  marginLeft: '12pt',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  ...getTransformStyle('only'),
                }}
                className="font-black uppercase"
              >
                ONLY
              </span>
            </div>

            {/* Product Name */}
            <div
              style={{
                fontSize: `${nameSize}pt`,
                fontWeight: 900,
                lineHeight: 1.04,
                marginTop: '6mm',
                letterSpacing: '0.01em',
                textAlign,
                ...getTransformStyle('name'),
              }}
              className={`font-black uppercase max-w-full px-4 break-words text-neutral-900 whitespace-pre-line ${textBackingClass}`}
            >
              {slot.displayName || 'UNTITLED PRODUCT'}
            </div>

            {/* Optional Pack/Set text */}
            {slot.packText && (
              <div
                style={{
                  fontSize: `${config.packTextFontSizePt}pt`,
                  fontWeight: 800,
                  marginTop: '4mm',
                  letterSpacing: '0.03em',
                  textAlign,
                  ...getTransformStyle('pack'),
                }}
                className={`font-black uppercase tracking-wide text-neutral-900 ${textBackingClass}`}
              >
                {slot.packText}
              </div>
            )}

            {/* TYPE B: MRP + SAVE LINE */}
            {isTypeB && (
              <div
                style={{
                  fontSize: `${config.saveFontSizePt || 30}pt`,
                  fontWeight: 800,
                  marginTop: '4mm',
                  letterSpacing: '0.02em',
                  textAlign,
                  ...getTransformStyle('mrp-save'),
                }}
                className={`font-black uppercase tracking-tight text-neutral-900 ${textBackingClass}`}
              >
                (MRP:- ₹{mrp}/- &nbsp;&nbsp;&nbsp; SAVE:- ₹{save}/-)
              </div>
            )}

            {/* Additional Custom Text Boxes */}
            {(slot.additionalTextBoxes || []).map((box) => (
              <div
                key={box.id}
                style={{
                  fontSize: `${box.fontSizePt}pt`,
                  fontWeight: (box.fontWeight as any) || '900',
                  color: box.color || '#000000',
                  marginTop: '4mm',
                  ...getTransformStyle(box.id),
                }}
                className={`px-3 py-1 rounded-xs ${textBackingClass}`}
              >
                {box.text}
              </div>
            ))}
          </div>

          {/* Bottom Footer Line */}
          <div
            style={{
              fontSize: `${config.footerFontSizePt}pt`,
              fontWeight: 900,
              letterSpacing: '0.02em',
              lineHeight: 1,
              ...getTransformStyle('footer'),
            }}
            className={`relative z-10 w-full text-center uppercase font-black text-black select-none pt-4 ${textBackingClass}`}
          >
            {isTypeB ? '' : footerText}
          </div>
        </>
      ) : (
        /* Empty Slot State */
        <div className="flex-1 flex flex-col justify-center items-center w-full text-neutral-400 p-8">
          <div className="border-4 border-dashed border-neutral-300 w-full h-full flex flex-col items-center justify-center p-8 rounded-lg">
            <span className="font-black text-2xl uppercase tracking-wider text-neutral-500">
              FULL A4 POSTER (1/1)
            </span>
            <span className="text-base font-bold text-amber-600 mt-4 uppercase">
              + ADD BOARD
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
