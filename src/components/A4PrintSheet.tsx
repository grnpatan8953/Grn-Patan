import React from 'react';
import { BoardSlot, BoardTemplateConfig } from '../types';
import { BoardCard } from './BoardCard';
import { VisualBoardEditor } from './VisualBoardEditor';

interface A4PrintSheetProps {
  slots: BoardSlot[];
  config: BoardTemplateConfig;
  activeSlotIndex?: number | null;
  onSelectSlot?: (index: number) => void;
  interactive?: boolean;
  isVisualEditorMode?: boolean;
  onUpdateSlotData?: (slotIndex: number, updated: Partial<BoardSlot>) => void;
}

export const A4PrintSheet: React.FC<A4PrintSheetProps> = ({
  slots,
  config,
  activeSlotIndex,
  onSelectSlot,
  interactive = false,
  isVisualEditorMode = false,
  onUpdateSlotData,
}) => {
  // Ensure we have exactly config.slotsCount slots
  const fullSlots: BoardSlot[] = Array.from({ length: config.slotsCount }, (_, idx) => {
    return (
      slots[idx] || {
        slotIndex: idx,
        productId: null,
        product: null,
        displayName: '',
        packText: '',
        displaySp: 0,
        displayMrp: 0,
        displaySave: 0,
        boardType: 'FINAL_PRICE',
        showMrp: config.showMrpDefault,
      }
    );
  });

  return (
    <div className="a4-sheet-wrapper flex justify-center items-start print:m-0 print:p-0">
      <div
        id="a4-printable-page"
        style={{
          width: '210mm',
          height: '297mm',
          maxWidth: '210mm',
          maxHeight: '297mm',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          display: 'grid',
          gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          gridTemplateRows: `repeat(${config.rows}, 1fr)`,
          pageBreakInside: 'avoid',
          pageBreakAfter: 'always',
          overflow: 'hidden',
        }}
        className="a4-page shadow-2xl print:shadow-none mx-auto border border-neutral-300 print:border-none select-none"
      >
        {fullSlots.map((slot, index) => {
          const isSelected = interactive && activeSlotIndex === index;
          const hasProduct = Boolean(slot.product || slot.displayName || slot.displaySp > 0);

          return (
            <div
              key={index}
              onClick={() => onSelectSlot?.(index)}
              className={`relative flex items-center justify-center ${
                isSelected ? 'ring-4 ring-amber-500 ring-inset z-20' : ''
              }`}
            >
              {isVisualEditorMode && isSelected && hasProduct ? (
                /* IN-PLACE CANVA-STYLE INTERACTIVE VISUAL BOARD EDITOR */
                <VisualBoardEditor
                  slot={slot}
                  config={config}
                  isActive={true}
                  onUpdateSlot={(upd) => onUpdateSlotData?.(index, upd)}
                  onCloseEditor={() => onSelectSlot?.(-1)}
                />
              ) : (
                <BoardCard
                  slot={slot}
                  config={config}
                  showSlotBadge={interactive}
                  isInteractive={interactive}
                  onSlotClick={() => onSelectSlot?.(index)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
