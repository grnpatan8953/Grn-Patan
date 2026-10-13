import React from 'react';
import { BoardSlot, BoardTemplateConfig } from '../../types';

interface TemplateBoardProps {
  slot: BoardSlot;
  config: BoardTemplateConfig;
  showSlotBadge?: boolean;
  onSlotClick?: () => void;
  isInteractive?: boolean;
}

export const RoundBoard: React.FC<TemplateBoardProps> = ({
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
  const sp = slot.displaySp || (slot.product ? slot.product.retail : 199);
  const save = slot.displaySave !== undefined ? slot.displaySave : Math.max(0, mrp - sp);

  // PRIORITY 9 & RULE B: Default ROUND BOARD must show ONLY ₹SP ONLY
  // No product name, no MRP, no SAVE, no footer, no pack text unless user explicitly toggles it
  const shouldShowName = slot.hideProductName === false;
  const shouldShowPack = slot.hidePackText === false && Boolean(slot.packText);
  const shouldShowMrpSave = slot.hideMrp === false && slot.hideSave === false && isTypeB;
  const shouldShowFooter = slot.hideFooter === false;

  const isCustomMode = slot.templateMode === 'CUSTOM';
  const fontFamily = isCustomMode && slot.customFontFamily ? slot.customFontFamily : config.fontFamily;
  const borderWidth = isCustomMode && slot.customBorderThicknessPt !== undefined ? slot.customBorderThicknessPt : config.borderWidthPt;
  const priceSize = isCustomMode && slot.customPriceFontSizePt !== undefined
    ? slot.customPriceFontSizePt
    : (!shouldShowName ? 54 : config.priceFontSizePt);
  const nameSize = isCustomMode && slot.customNameFontSizePt !== undefined ? slot.customNameFontSizePt : config.productNameFontSizePt;

  const isBackgroundImg = slot.imagePlacementMode === 'BACKGROUND' && Boolean(slot.imageUrl);
  const bgOpacity = slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0;
  const imgFilter =
    slot.imageFilter === 'grayscale'
      ? 'grayscale(100%)'
      : slot.imageFilter === 'lighten'
      ? 'brightness(135%) contrast(85%)'
      : 'none';
  const imgWidthPct = slot.productImageWidthPct || 0.40;

  const textBackingClass = slot.textBacking ? 'bg-white/85 px-1 py-0.2 rounded-xs' : '';
  const textShadowStyle: React.CSSProperties = slot.textShadow
    ? { textShadow: '0 1px 2px #fff, 0 0 1px #fff' }
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
        fontFamily,
        boxSizing: 'border-box',
      }}
      className={`relative flex items-center justify-center p-0.5 select-none ${
        isInteractive ? 'cursor-pointer' : ''
      }`}
    >
      {/* SCREEN-ONLY slot badge. Strictly hidden in print! */}
      {showSlotBadge && (
        <div className="absolute top-0.5 left-1 px-1 py-0.2 bg-black text-white text-[8px] font-mono font-bold tracking-wider rounded uppercase print:hidden z-30 opacity-75">
          #{slot.slotIndex + 1}
        </div>
      )}

      {/* The Master Oval Label Container */}
      <div
        style={{
          width: '96%',
          height: '95%',
          borderRadius: '50% / 50%',
          border: `${borderWidth}pt solid #000000`,
          boxSizing: 'border-box',
          padding: `${config.paddingMm}mm`,
        }}
        className={`relative flex flex-col justify-between items-center text-black bg-white overflow-hidden text-center transition-colors ${
          isInteractive ? 'hover:bg-amber-50/50' : ''
        }`}
      >
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
          <div className="relative z-10 w-full h-full flex flex-col justify-between items-center py-0.5">
            <div className="h-0.5" />

            {/* Core Price Section */}
            <div className="flex-1 flex flex-col justify-center items-center w-full px-1 my-auto">
              {/* MODE B: PRODUCT IMAGE INSIDE BOARD */}
              {!isBackgroundImg && slot.imageUrl && (
                <div
                  style={{
                    width: `${imgWidthPct * 100}%`,
                    maxHeight: '34%',
                    margin: '0 auto 2px auto',
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

              <div
                style={textShadowStyle}
                className={`flex items-baseline justify-center tracking-tight leading-none text-black ${textBackingClass}`}
              >
                <span
                  style={{
                    fontSize: `${config.rupeeSymbolSizePt}pt`,
                    marginRight: '1.5pt',
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
                    marginLeft: '2.5pt',
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
                  lineHeight: 1.02,
                  marginTop: '0.8mm',
                  letterSpacing: '0.01em',
                  ...getTransformStyle('name'),
                }}
                className={`font-black uppercase max-w-[90%] px-1 break-words text-neutral-900 whitespace-pre-line ${textBackingClass}`}
              >
                {slot.displayName || 'UNTITLED'}
              </div>

              {/* Optional Pack/Set */}
              {slot.packText && (
                <div
                  style={{
                    fontSize: `${config.packTextFontSizePt}pt`,
                    fontWeight: 800,
                    marginTop: '0.5mm',
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
                    fontSize: `${config.saveFontSizePt || 9}pt`,
                    fontWeight: 800,
                    marginTop: '0.5mm',
                    letterSpacing: '0.01em',
                    ...getTransformStyle('mrp-save'),
                  }}
                  className={`font-black uppercase tracking-tight text-neutral-900 ${textBackingClass}`}
                >
                  (MRP:₹{mrp} SAVE:₹{save})
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
                    marginTop: '0.5mm',
                    ...getTransformStyle(box.id),
                  }}
                  className={`px-1 py-0.2 rounded-xs ${textBackingClass}`}
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
              className={`w-full text-center uppercase font-black text-black select-none pb-0.5 ${textBackingClass}`}
            >
              {isTypeB ? '' : footerText}
            </div>
          </div>
        ) : (
          /* Empty Oval Slot State */
          <div className="flex-1 flex flex-col justify-center items-center w-full text-neutral-400 p-1">
            <span className="font-black text-[10px] uppercase text-neutral-400">
              #{slot.slotIndex + 1}
            </span>
            <span className="text-[9px] font-bold text-amber-600 uppercase mt-0.5">
              + ADD
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
