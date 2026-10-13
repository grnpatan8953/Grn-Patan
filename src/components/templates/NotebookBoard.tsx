import React from 'react';
import { BoardSlot, BoardTemplateConfig, NotebookDetails } from '../../types';

interface TemplateBoardProps {
  slot: BoardSlot;
  config: BoardTemplateConfig;
  showSlotBadge?: boolean;
  onSlotClick?: () => void;
  isInteractive?: boolean;
}

export const NotebookBoard: React.FC<TemplateBoardProps> = ({
  slot,
  config,
  showSlotBadge = false,
  onSlotClick,
  isInteractive = false,
}) => {
  const hasProduct = Boolean(slot.product || slot.displayName || slot.displaySp > 0);
  const footerText = slot.customFooter ?? config.footerText;
  const mrp = slot.displayMrp || (slot.product ? slot.product.mrp : 60);
  const sp = slot.displaySp || (slot.product ? slot.product.retail : 45);

  const isCustomMode = slot.templateMode === 'CUSTOM';
  const fontFamily = isCustomMode && slot.customFontFamily ? slot.customFontFamily : config.fontFamily;
  const borderWidth = isCustomMode && slot.customBorderThicknessPt !== undefined ? slot.customBorderThicknessPt : config.borderWidthPt;

  const isBackgroundImg = slot.imagePlacementMode === 'BACKGROUND' && Boolean(slot.imageUrl);
  const bgOpacity = slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0;
  const imgFilter =
    slot.imageFilter === 'grayscale'
      ? 'grayscale(100%)'
      : slot.imageFilter === 'lighten'
      ? 'brightness(135%) contrast(85%)'
      : 'none';

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

  // Dedicated notebook specs & tiered price calculations
  const nb: NotebookDetails = slot.notebookDetails || {
    brand: slot.displayName || 'PREMIUM NOTE BOOK',
    ruling: 'SINGLE LINE / FOUR LINE / SQUARE',
    size: 'SIZE: 24 × 18 CM',
    pages: '172 PAGES • 58 GSM PAPER',
    baseSp: sp,
    mrp: mrp,
    price3Pcs: Math.round(sp * 3 * 0.95),
    save3Pcs: mrp * 3 - Math.round(sp * 3 * 0.95),
    price6Pcs: Math.round(sp * 6 * 0.92),
    save6Pcs: mrp * 6 - Math.round(sp * 6 * 0.92),
    price12Pcs: Math.round(sp * 12 * 0.88),
    save12Pcs: mrp * 12 - Math.round(sp * 12 * 0.88),
  };

  const s1 = Math.max(0, mrp - sp);

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
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black text-white text-[10px] font-mono font-bold tracking-wider uppercase print:hidden z-30 opacity-75">
          NOTEBOOK BOARD #{slot.slotIndex + 1}
        </div>
      )}

      {/* MODE A: BACKGROUND IMAGE */}
      {isBackgroundImg && (
        <div
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: bgOpacity }}
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
        <div className="relative z-10 w-full h-full flex flex-col justify-between items-center py-1">
          {/* Header Title */}
          <div className="w-full text-center border-b-2 border-black pb-1.5">
            <h2
              style={{
                fontSize: `${config.productNameFontSizePt}pt`,
                fontWeight: 900,
                lineHeight: 1,
              }}
              className="font-black uppercase tracking-tight text-black"
            >
              {nb.brand || slot.displayName || 'CLASSMATE NOTE BOOK'}
            </h2>
            <div className="flex justify-center items-center gap-2 mt-1 text-xs font-black uppercase tracking-wider text-neutral-800">
              <span>{nb.size}</span>
              <span>•</span>
              <span>{nb.pages}</span>
              <span>•</span>
              <span>{nb.ruling}</span>
            </div>
          </div>

          {/* Center Promo Price Block */}
          <div className="w-full my-auto flex items-center justify-center gap-3 py-1">
            {/* MODE B: PRODUCT IMAGE INSIDE BOARD */}
            {!isBackgroundImg && slot.imageUrl && (
              <div className="w-20 h-20 max-h-20 overflow-hidden flex items-center justify-center border-2 border-black p-0.5 bg-neutral-50 flex-shrink-0">
                <img
                  src={slot.imageUrl}
                  alt={slot.displayName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            <div className="flex flex-col items-center">
              <div className="inline-block bg-black text-white text-[11px] font-black uppercase px-3 py-0.5 tracking-wider mb-0.5">
                1 PCS ONLY RATE
              </div>
              <div className="flex items-baseline justify-center tracking-tight leading-none text-black">
                <span
                  style={{ fontSize: `${config.rupeeSymbolSizePt}pt`, fontWeight: 900 }}
                  className="font-black mr-1 select-none"
                >
                  ₹
                </span>
                <span
                  style={{ fontSize: `${config.priceFontSizePt}pt`, fontWeight: 900 }}
                  className="font-black tracking-tight"
                >
                  {nb.baseSp || sp}
                </span>
                <span
                  style={{ fontSize: `${config.onlyFontSizePt}pt`, fontWeight: 900 }}
                  className="font-black uppercase ml-2"
                >
                  ONLY
                </span>
              </div>
              <div className="text-xs font-black uppercase text-neutral-700 tracking-wide mt-0.5">
                MRP: ₹{mrp}/- &nbsp;&nbsp;|&nbsp;&nbsp; SAVE: ₹{s1}/-
              </div>
            </div>
          </div>

          {/* Wholesale Bulk Tiered Price Table (Master Page 7 specific) */}
          <div className="w-full my-1">
            <div className="bg-black text-white text-center text-[10px] font-black uppercase tracking-wider py-0.5">
              BULK DISCOUNT & SAVINGS PRICE LIST
            </div>
            <table className="w-full border-collapse border-2 border-black text-center text-xs font-black uppercase">
              <thead>
                <tr className="bg-neutral-200 border-b border-black text-[10px]">
                  <th className="py-1 px-1.5 border-r border-black">PACK QTY</th>
                  <th className="py-1 px-1.5 border-r border-black">MRP</th>
                  <th className="py-1 px-1.5 border-r border-black bg-amber-200 text-black">OFFER SP</th>
                  <th className="py-1 px-1.5">YOU SAVE</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b border-black text-[11px]">
                <tr>
                  <td className="py-1 px-1 border-r border-black font-extrabold">1 PCS</td>
                  <td className="py-1 px-1 border-r border-black text-neutral-600 line-through">
                    ₹{mrp}/-
                  </td>
                  <td className="py-1 px-1 border-r border-black font-black bg-amber-100 text-black">
                    ₹{nb.baseSp || sp}/-
                  </td>
                  <td className="py-1 px-1 font-black text-emerald-800">SAVE ₹{s1}/-</td>
                </tr>
                <tr>
                  <td className="py-1 px-1 border-r border-black font-extrabold">3 PCS PACK</td>
                  <td className="py-1 px-1 border-r border-black text-neutral-600 line-through">
                    ₹{mrp * 3}/-
                  </td>
                  <td className="py-1 px-1 border-r border-black font-black bg-amber-100 text-black">
                    ₹{nb.price3Pcs}/-
                  </td>
                  <td className="py-1 px-1 font-black text-emerald-800">SAVE ₹{nb.save3Pcs}/-</td>
                </tr>
                <tr>
                  <td className="py-1 px-1 border-r border-black font-extrabold">6 PCS PACK</td>
                  <td className="py-1 px-1 border-r border-black text-neutral-600 line-through">
                    ₹{mrp * 6}/-
                  </td>
                  <td className="py-1 px-1 border-r border-black font-black bg-amber-100 text-black">
                    ₹{nb.price6Pcs}/-
                  </td>
                  <td className="py-1 px-1 font-black text-emerald-800">SAVE ₹{nb.save6Pcs}/-</td>
                </tr>
                <tr className="bg-neutral-50">
                  <td className="py-1 px-1 border-r border-black font-black">12 PCS (1 DOZEN)</td>
                  <td className="py-1 px-1 border-r border-black text-neutral-600 line-through">
                    ₹{mrp * 12}/-
                  </td>
                  <td className="py-1 px-1 border-r border-black font-black bg-amber-200 text-black">
                    ₹{nb.price12Pcs}/-
                  </td>
                  <td className="py-1 px-1 font-black text-emerald-800">
                    SAVE ₹{nb.save12Pcs}/-
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional Custom Text Boxes */}
          {(slot.additionalTextBoxes || []).map((box) => (
            <div
              key={box.id}
              style={{
                fontSize: `${box.fontSizePt}pt`,
                fontWeight: (box.fontWeight as any) || '900',
                color: box.color || '#000000',
                marginTop: '1mm',
                ...getTransformStyle(box.id),
              }}
              className="px-1 py-0.5 rounded-xs"
            >
              {box.text}
            </div>
          ))}

          {/* Bottom Footer */}
          <div
            style={{
              fontSize: `${config.footerFontSizePt}pt`,
              fontWeight: 900,
              letterSpacing: '0.02em',
              lineHeight: 1,
              ...getTransformStyle('footer'),
            }}
            className="w-full text-center uppercase font-black text-black select-none pt-1 border-t border-black mt-1"
          >
            {footerText}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center w-full text-neutral-400 p-6">
          <div className="border-2 border-dashed border-neutral-300 w-full h-full flex flex-col items-center justify-center p-4 rounded-xl">
            <span className="font-black text-base uppercase tracking-wider text-neutral-500">
              NOTE BOOK 1 (SLOT #{slot.slotIndex + 1})
            </span>
            <span className="text-xs font-bold text-amber-600 mt-2 uppercase">
              + ADD BOARD
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
