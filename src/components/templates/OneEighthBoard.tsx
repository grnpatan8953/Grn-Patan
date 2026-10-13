import React from 'react';
import { BoardSlot, BoardTemplateConfig, SelectedElementType } from '../../types';

export interface OneEighthBoardProps {
  slot: BoardSlot;
  config: BoardTemplateConfig;
  showSlotBadge?: boolean;
  onSlotClick?: () => void;
  isInteractive?: boolean;

  // Editor mode props (when hosted in Canva-style VisualBoardEditor)
  isEditorMode?: boolean;
  selectedId?: SelectedElementType | null;
  editingId?: string | null;
  editingText?: string;
  onSelectElement?: (id: SelectedElementType) => void;
  onElementMouseDown?: (e: React.MouseEvent, id: SelectedElementType) => void;
  onElementDoubleClick?: (id: string, initialText: string) => void;
  onEditingTextChange?: (val: string) => void;
  onCommitEditing?: () => void;
  renderBoundingBox?: (id: SelectedElementType) => React.ReactNode;
}

export const OneEighthBoard: React.FC<OneEighthBoardProps> = ({
  slot,
  config,
  showSlotBadge = false,
  onSlotClick,
  isInteractive = false,
  isEditorMode = false,
  selectedId,
  editingId,
  editingText = '',
  onSelectElement,
  onElementMouseDown,
  onElementDoubleClick,
  onEditingTextChange,
  onCommitEditing,
  renderBoundingBox,
}) => {
  const hasProduct = Boolean(slot.product || slot.displayName || slot.displaySp > 0);
  const footerText = slot.customFooter ?? config.footerText;
  const isTypeB = slot.boardType === 'MRP_SAVE';
  const mrp = slot.displayMrp || (slot.product ? slot.product.mrp : 0);
  const sp = slot.displaySp || (slot.product ? slot.product.retail : 0);
  const save = slot.displaySave !== undefined ? slot.displaySave : Math.max(0, mrp - sp);

  const isCustomMode =
    slot.templateMode === 'CUSTOM' ||
    Boolean(
      slot.customFontFamily ||
      slot.customPriceFontSizePt !== undefined ||
      slot.customNameFontSizePt !== undefined ||
      slot.customBorderThicknessPt !== undefined ||
      slot.customFooterFontSizePt !== undefined ||
      slot.customSaveFontSizePt !== undefined ||
      slot.isManualLayout
    );
  const fontFamily = isCustomMode && slot.customFontFamily ? slot.customFontFamily : config.fontFamily;
  const borderWidth =
    isCustomMode && slot.customBorderThicknessPt !== undefined
      ? slot.customBorderThicknessPt
      : config.borderWidthPt;
  const priceSize =
    isCustomMode && slot.customPriceFontSizePt !== undefined
      ? slot.customPriceFontSizePt
      : config.priceFontSizePt;
  const nameSize =
    isCustomMode && slot.customNameFontSizePt !== undefined
      ? slot.customNameFontSizePt
      : config.productNameFontSizePt;
  const packSize =
    isCustomMode && slot.customPackFontSizePt !== undefined
      ? slot.customPackFontSizePt
      : config.packTextFontSizePt;
  const footerSize =
    isCustomMode && slot.customFooterFontSizePt !== undefined
      ? slot.customFooterFontSizePt
      : config.footerFontSizePt;
  const saveSize =
    isCustomMode && slot.customSaveFontSizePt !== undefined
      ? slot.customSaveFontSizePt
      : config.saveFontSizePt || 14;
  const textAlign = isCustomMode && slot.customTextAlign ? slot.customTextAlign : 'center';

  const combinedNameStr = (slot.displayName || 'UNTITLED PRODUCT') + (slot.packText ? '\n' + slot.packText : '');
  const totalNameLen = combinedNameStr.length;
  const autoFittedNameSize = totalNameLen > 22
    ? Math.max(9, nameSize - Math.min(6, Math.floor((totalNameLen - 22) / 8) * 1.5))
    : nameSize;

  // Dynamic Fitting for 1/8 Footer (Type A & Type B)
  // If the user or a named design explicitly sets a custom font size, respect it directly!
  // If uncustomized, auto-fit longer text so it never overflows below the bottom border.
  const calculateFittedFontSize = (text: string, baseSizePt: number, isExplicitCustom: boolean): number => {
    if (!text) return baseSizePt;
    if (isExplicitCustom) return baseSizePt;
    const charLen = text.length;
    let fitted = baseSizePt;
    const estWidth = charLen * baseSizePt * 0.60;
    if (estWidth > 260) {
      fitted = Math.max(7, Math.floor((260 / (charLen * 0.60)) * 10) / 10);
    }
    return Math.min(fitted, 14);
  };

  const effectiveFooterSize = calculateFittedFontSize(
    footerText || '',
    footerSize,
    Boolean(slot.customFooterFontSizePt)
  );
  const effectiveSaveSize = calculateFittedFontSize(
    `(MRP:- ₹${mrp}/-   SAVE:- ₹${save}/-)`,
    saveSize,
    Boolean(slot.customSaveFontSizePt)
  );

  // Images
  const isBackgroundImg = slot.imagePlacementMode === 'BACKGROUND' && Boolean(slot.imageUrl);
  const isInsideImg = !isBackgroundImg && Boolean(slot.imageUrl);
  const bgOpacity = slot.imageOpacity !== undefined ? slot.imageOpacity : 0.25;
  const imgFilter =
    slot.imageFilter === 'grayscale'
      ? 'grayscale(100%)'
      : slot.imageFilter === 'lighten'
      ? 'brightness(135%) contrast(85%)'
      : 'none';

  const textBackingClass = slot.textBacking ? 'bg-white/85 px-1 py-0.5 rounded-xs' : '';
  const textShadowStyle: React.CSSProperties = slot.textShadow
    ? { textShadow: '0 1px 2px #fff, 0 0 1px #fff' }
    : {};

  const transforms = slot.elementTransforms || {};
  const getTransformStyle = (id: string): React.CSSProperties => {
    const t = transforms[id];
    if (!t) return {};
    if (t.hidden) return { display: 'none' };
    let y = t.y || 0;
    // Prevent dragging from pushing footer text below the bottom border (+2px max),
    // but allow full upward repositioning across the card (-120px max)
    if (id === 'footer' || id === 'mrp-save') {
      y = Math.min(Math.max(y, -120), 2);
    }
    return {
      transform: `translate(${t.x || 0}px, ${y}px) scale(${t.scale || 1})`,
      zIndex: t.zIndex || 10,
    };
  };

  const handlePointerDown = (e: React.MouseEvent, id: SelectedElementType) => {
    if (isEditorMode) {
      e.stopPropagation();
      onSelectElement?.(id);
      onElementMouseDown?.(e, id);
    }
  };

  const handleDblClick = (e: React.MouseEvent, id: string, initialText: string) => {
    if (isEditorMode) {
      e.stopPropagation();
      onElementDoubleClick?.(id, initialText);
    }
  };

  // Focus Star Check
  const showFocusStar = Boolean(
    slot.isFocusBoard ||
      (slot.isFocusProduct && slot.focusStatus === 'APPROVED' && slot.starConfig?.visible !== false)
  );

  return (
    <div
      onClick={!isEditorMode && isInteractive ? onSlotClick : undefined}
      style={{
        width: '105mm',
        height: '74.25mm',
        border: `${borderWidth}pt solid #000000`,
        fontFamily,
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: '#ffffff',
      }}
      className={`select-none overflow-hidden ${
        !isEditorMode && isInteractive ? 'cursor-pointer hover:bg-amber-50/40 transition-colors' : ''
      }`}
    >
      {/* SCREEN-ONLY slot badge. Strictly hidden in print! */}
      {showSlotBadge && (
        <div className="absolute top-1 left-1.5 px-1.5 py-0.5 bg-black text-white text-[9px] font-mono font-bold tracking-wider rounded-none uppercase print:hidden z-30 opacity-75 pointer-events-none">
          SLOT #{slot.slotIndex + 1}
        </div>
      )}

      {/* MODE A: BACKGROUND IMAGE BEHIND TEXT */}
      {isBackgroundImg && (
        <div
          onMouseDown={(e) => handlePointerDown(e, 'background-image')}
          style={{
            opacity: bgOpacity,
            filter: imgFilter,
            zIndex: 1,
            cursor: isEditorMode ? 'move' : 'default',
            ...getTransformStyle('background-image'),
          }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <img
            src={slot.imageUrl}
            alt=""
            className={`w-full h-full pointer-events-none ${
              slot.imageFit === 'cover' ? 'object-cover' : 'object-contain'
            }`}
          />
          {isEditorMode && renderBoundingBox?.('background-image')}
        </div>
      )}

      {hasProduct ? (
        <>
          {/* MODE B: PRODUCT IMAGE INSIDE BOARD (Positioned so it doesn't overlap important text) */}
          {isInsideImg && (
            <div
              onMouseDown={(e) => handlePointerDown(e, 'product-image')}
              style={{
                position: 'absolute',
                top: '4mm',
                left: '4mm',
                width: `${(slot.productImageWidthPct || 0.35) * 105}mm`,
                maxHeight: '34mm',
                zIndex: 15,
                filter: imgFilter,
                opacity: slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0,
                cursor: isEditorMode ? 'move' : 'default',
                ...getTransformStyle('product-image'),
              }}
              className="flex items-center justify-center"
            >
              <img
                src={slot.imageUrl}
                alt={slot.displayName}
                className={`max-h-full max-w-full pointer-events-none ${
                  slot.imageFit === 'cover' ? 'object-cover w-full h-full' : 'object-contain'
                }`}
              />
              {isEditorMode && renderBoundingBox?.('product-image')}
            </div>
          )}

          {/* WORD-STYLE FIVE-POINT STAR */}
          {showFocusStar && (
            <div
              onMouseDown={(e) => handlePointerDown(e, 'focus-star')}
              style={{
                position: 'absolute',
                top: '3mm',
                right: '4mm',
                width: '16mm',
                height: '16mm',
                zIndex: 25,
                cursor: isEditorMode ? 'move' : 'default',
                ...getTransformStyle('focus-star'),
              }}
              className="flex items-center justify-center select-none pointer-events-auto"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-black stroke-white stroke-[3]">
                  <polygon points="50,3 61,35 95,35 68,55 78,88 50,68 22,88 32,55 5,35 39,35" />
                </svg>
              </div>
              {isEditorMode && renderBoundingBox?.('focus-star')}
            </div>
          )}

          {/* 
            ========================================================================
            PRICE ZONE: Upper region (top: 3.5mm, height: 33mm)
            Word Measurements:
            - Price: 1.30" × 2.15" = 33.02 mm H × 54.61 mm W
            - ONLY:  0.52" × 0.86" = 13.21 mm H × 21.84 mm W
            - ₹:     0.51" × 0.44" = 12.95 mm H × 11.18 mm W
            Total width: ~92mm fits in 105mm (margins ~6.5mm)
            ========================================================================
          */}
          <div
            style={{
              position: 'absolute',
              top: '3.5mm',
              left: '5mm',
              right: '5mm',
              height: '33mm',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              zIndex: 20,
              ...textShadowStyle,
            }}
            className="tracking-tight leading-none text-black select-none"
          >
            {/* ₹ RUPEE SYMBOL (Independent Word object: 12.95mm H × 11.18mm W) */}
            <div
              onMouseDown={(e) => handlePointerDown(e, 'rupee')}
              style={{
                fontSize: `${config.rupeeSymbolSizePt || 42}pt`,
                fontWeight: 900,
                marginRight: '2.5mm',
                lineHeight: 1,
                cursor: isEditorMode ? 'move' : 'default',
                ...getTransformStyle('rupee'),
              }}
              className="relative font-black select-none flex items-center justify-center p-0.5"
            >
              <span>₹</span>
              {isEditorMode && renderBoundingBox?.('rupee')}
            </div>

            {/* PRICE DIGITS (Independent Word object: 33.02mm H × 54.61mm W) */}
            <div
              onMouseDown={(e) => handlePointerDown(e, 'price')}
              onDoubleClick={(e) => handleDblClick(e, 'price', String(sp))}
              style={{
                fontSize: `${priceSize}pt`,
                fontWeight: 900,
                lineHeight: 0.82,
                letterSpacing: '-0.04em',
                cursor: isEditorMode ? 'move' : 'default',
                ...getTransformStyle('price'),
              }}
              className="relative font-black select-none flex items-center justify-center p-0.5"
            >
              {isEditorMode && editingId === 'price' ? (
                <input
                  autoFocus
                  type="text"
                  value={editingText}
                  onChange={(e) => onEditingTextChange?.(e.target.value)}
                  onBlur={onCommitEditing}
                  onKeyDown={(e) => e.key === 'Enter' && onCommitEditing?.()}
                  className="w-28 bg-white border-2 border-blue-600 px-1 font-black text-black outline-none text-center"
                />
              ) : (
                <span>{sp}</span>
              )}
              {isEditorMode && renderBoundingBox?.('price')}
            </div>

            {/* ONLY TEXT (Independent Word object: 13.21mm H × 21.84mm W) */}
            <div
              onMouseDown={(e) => handlePointerDown(e, 'only')}
              onDoubleClick={(e) => handleDblClick(e, 'only', 'ONLY')}
              style={{
                fontSize: `${config.onlyFontSizePt || 26}pt`,
                fontWeight: 900,
                marginLeft: '3mm',
                letterSpacing: '0.04em',
                lineHeight: 1,
                cursor: isEditorMode ? 'move' : 'default',
                ...getTransformStyle('only'),
              }}
              className="relative font-black uppercase select-none flex items-center justify-center p-0.5"
            >
              {isEditorMode && editingId === 'only' ? (
                <input
                  autoFocus
                  type="text"
                  value={editingText}
                  onChange={(e) => onEditingTextChange?.(e.target.value)}
                  onBlur={onCommitEditing}
                  onKeyDown={(e) => e.key === 'Enter' && onCommitEditing?.()}
                  className="w-20 bg-white border-2 border-blue-600 px-1 font-black text-black outline-none text-center"
                />
              ) : (
                <span>ONLY</span>
              )}
              {isEditorMode && renderBoundingBox?.('only')}
            </div>
          </div>

          {/* 
            ========================================================================
            PRODUCT NAME: Middle region
            Word object: 0.66" × 3.61" = 16.76 mm H × 91.69 mm W
            When no pack line is present, fills up to 23mm height so there is NO
            giant blank middle gap!
            ========================================================================
          */}
          {/* 
            ========================================================================
            PRODUCT NAME & PACK/SIZE GROUP: Unified Middle Region (Task 1 requirement)
            ========================================================================
          */}
          <div
            onMouseDown={(e) => handlePointerDown(e, 'name')}
            onDoubleClick={(e) => handleDblClick(e, 'name', slot.displayName)}
            style={{
              position: 'absolute',
              top: '37.5mm',
              left: '5mm',
              right: '5mm',
              height: '23mm',
              display: 'flex',
              flexDirection: 'column',
              alignItems: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
              justifyContent: 'center',
              zIndex: 20,
              cursor: isEditorMode ? 'move' : 'default',
              ...getTransformStyle('name'),
            }}
            className="select-none"
          >
            {isEditorMode && editingId === 'name' ? (
              <textarea
                autoFocus
                rows={2}
                value={editingText}
                onChange={(e) => onEditingTextChange?.(e.target.value)}
                onBlur={onCommitEditing}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onCommitEditing?.()}
                className="w-full bg-white border-2 border-blue-600 px-1 font-black text-black text-xs uppercase outline-none resize-none text-center"
              />
            ) : (
              <div
                style={{
                  fontSize: `${autoFittedNameSize}pt`,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: '0.01em',
                  textAlign,
                  maxHeight: '100%',
                }}
                className={`w-full font-black uppercase break-words text-neutral-900 whitespace-pre-line overflow-hidden ${textBackingClass}`}
              >
                <div>{slot.displayName || 'UNTITLED PRODUCT'}</div>
                {slot.packText && <div className="text-[0.88em] opacity-90 mt-0.5">{slot.packText}</div>}
              </div>
            )}
            {isEditorMode && renderBoundingBox?.('name')}
          </div>

          {/* 
            ========================================================================
            FOOTER / MRP-SAVE LINE (Bottom zone: bottom: 2.5mm, height: 8.2mm)
            Word object: 0.37" × 3.62" = 9.40 mm H × 91.95 mm W
            Strictly bounded inside allocated area so it NEVER overlaps bottom border.
            ========================================================================
          */}
          {isTypeB ? (
            /* TYPE B: MRP + SAVE LINE */
            <div
              onMouseDown={(e) => handlePointerDown(e, 'mrp-save')}
              style={{
                position: 'absolute',
                bottom: '2.5mm',
                left: '3mm',
                right: '3mm',
                minHeight: '8.2mm',
                display: 'flex',
                alignItems: 'center',
                justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
                overflow: isEditorMode ? 'visible' : 'hidden',
                zIndex: 20,
                cursor: isEditorMode ? 'move' : 'default',
                ...getTransformStyle('mrp-save'),
              }}
              className="select-none"
            >
              <div
                style={{
                  fontSize: `${effectiveSaveSize}pt`,
                  fontWeight: 900,
                  letterSpacing: slot.customLetterSpacing || '0.01em',
                  lineHeight: 1.1,
                  textAlign,
                  whiteSpace: 'nowrap',
                  overflow: isEditorMode ? 'visible' : 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
                className={`w-full font-black uppercase text-neutral-900 tracking-tight ${textBackingClass}`}
              >
                (MRP:- ₹{mrp}/- &nbsp;&nbsp;&nbsp; SAVE:- ₹{save}/-)
              </div>
              {isEditorMode && renderBoundingBox?.('mrp-save')}
            </div>
          ) : (
            /* TYPE A: FOOTER LINE (e.g. FINAL PRICE ON THE PRODUCT) */
            <div
              onMouseDown={(e) => handlePointerDown(e, 'footer')}
              onDoubleClick={(e) => handleDblClick(e, 'footer', footerText)}
              style={{
                position: 'absolute',
                bottom: '2.5mm',
                left: '3mm',
                right: '3mm',
                minHeight: '8.2mm',
                display: 'flex',
                alignItems: 'center',
                justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
                overflow: isEditorMode ? 'visible' : 'hidden',
                zIndex: 20,
                cursor: isEditorMode ? 'move' : 'default',
                ...getTransformStyle('footer'),
              }}
              className="select-none"
            >
              {isEditorMode && editingId === 'footer' ? (
                <input
                  autoFocus
                  type="text"
                  value={editingText}
                  onChange={(e) => onEditingTextChange?.(e.target.value)}
                  onBlur={onCommitEditing}
                  onKeyDown={(e) => e.key === 'Enter' && onCommitEditing?.()}
                  className="w-full bg-white border-2 border-blue-600 px-1 font-black text-black text-xs uppercase outline-none text-center"
                />
              ) : (
                <div
                  style={{
                    fontSize: `${effectiveFooterSize}pt`,
                    fontWeight: 900,
                    letterSpacing: slot.customLetterSpacing || '0.01em',
                    lineHeight: 1.1,
                    textAlign,
                    whiteSpace: 'nowrap',
                    overflow: isEditorMode ? 'visible' : 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}
                  className={`w-full uppercase font-black text-black tracking-wide ${textBackingClass}`}
                >
                  {footerText}
                </div>
              )}
              {isEditorMode && renderBoundingBox?.('footer')}
            </div>
          )}

          {/* ADDITIONAL CUSTOM TEXT BOXES */}
          {(slot.additionalTextBoxes || []).map((box) => (
            <div
              key={box.id}
              onMouseDown={(e) => handlePointerDown(e, box.id)}
              onDoubleClick={(e) => handleDblClick(e, box.id, box.text)}
              style={{
                position: 'absolute',
                left: '5mm',
                top: '50mm',
                zIndex: 25,
                fontSize: `${box.fontSizePt}pt`,
                fontWeight: (box.fontWeight as any) || '900',
                color: box.color || '#000000',
                cursor: isEditorMode ? 'move' : 'default',
                ...getTransformStyle(box.id),
              }}
              className={`select-none px-1 py-0.5 ${textBackingClass}`}
            >
              {isEditorMode && editingId === box.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editingText}
                  onChange={(e) => onEditingTextChange?.(e.target.value)}
                  onBlur={onCommitEditing}
                  onKeyDown={(e) => e.key === 'Enter' && onCommitEditing?.()}
                  className="bg-white border-2 border-blue-600 px-1 text-black font-black outline-none"
                />
              ) : (
                <span>{box.text}</span>
              )}
              {isEditorMode && renderBoundingBox?.(box.id)}
            </div>
          ))}
        </>
      ) : (
        /* Empty Slot State */
        <div className="absolute inset-0 flex flex-col justify-center items-center text-neutral-400 p-2">
          <div className="border-2 border-dashed border-neutral-300 w-full h-full flex flex-col items-center justify-center p-2 rounded">
            <span className="font-black text-xs uppercase tracking-wider text-neutral-500 print:hidden">
              SLOT #{slot.slotIndex + 1}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
