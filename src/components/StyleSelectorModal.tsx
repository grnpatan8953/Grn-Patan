import React, { useState } from 'react';
import { Type, Check, Sparkles, X } from 'lucide-react';
import { BoardSlot, BoardTemplateConfig, BoardTypographyStyle } from '../types';
import { STYLE_PRESETS, StylePreset } from '../services/stylePresets';

interface StyleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlot: BoardSlot;
  config: BoardTemplateConfig;
  onApplyStyleToSlot: (styleId: BoardTypographyStyle) => void;
  onApplyStyleToAllSlots: (styleId: BoardTypographyStyle) => void;
}

export const StyleSelectorModal: React.FC<StyleSelectorModalProps> = ({
  isOpen,
  onClose,
  currentSlot,
  config,
  onApplyStyleToSlot,
  onApplyStyleToAllSlots,
}) => {
  const currentStyleId = currentSlot.typographyStyle || (currentSlot.templateMode === 'MASTER' ? 'ORIGINAL_WORD_MASTER' : 'CUSTOM');
  const [selectedStyle, setSelectedStyle] = useState<BoardTypographyStyle>(currentStyleId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 rounded-lg text-black">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span>BOARD TYPOGRAPHY &amp; STYLES</span>
                <span className="text-[10px] bg-neutral-800 text-amber-400 px-2 py-0.5 rounded font-mono">
                  Slot #{currentSlot.slotIndex + 1}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Choose a balanced typography preset or customize your layout
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {STYLE_PRESETS.map((preset: StylePreset) => {
            const isSelected = selectedStyle === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => setSelectedStyle(preset.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-neutral-800/90 shadow-md ring-1 ring-amber-500'
                    : 'border-neutral-700 bg-neutral-950/60 hover:border-neutral-600 hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white tracking-wide uppercase">
                        {preset.label}
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                        {preset.tag}
                      </span>
                      {currentStyleId === preset.id && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{preset.description}</p>

                    {/* Live Typography Preview Box */}
                    <div className="mt-3 bg-white text-black p-3 rounded-lg border border-neutral-300 flex flex-col items-center justify-center select-none">
                      <div
                        style={{
                          fontFamily: preset.fontFamily,
                          fontWeight: preset.fontWeight,
                          letterSpacing: preset.letterSpacing,
                        }}
                        className="text-2xl sm:text-3xl font-black leading-none tracking-tight text-center"
                      >
                        {preset.previewPrice}
                      </div>
                      <div
                        style={{
                          fontFamily: preset.fontFamily,
                          fontWeight: preset.fontWeight,
                          letterSpacing: '0.01em',
                        }}
                        className="text-xs sm:text-sm font-black leading-tight mt-1 uppercase text-neutral-900 text-center truncate max-w-full"
                      >
                        {preset.previewName}
                      </div>
                      <div className="text-[9px] font-bold text-neutral-500 mt-0.5 tracking-wider uppercase">
                        (FINAL PRICE ON THE PRODUCT)
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400 text-black'
                          : 'border-neutral-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-neutral-400 text-center sm:text-left">
            Style updates font weights, sizes, and word geometry automatically.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                onApplyStyleToAllSlots(selectedStyle);
                onClose();
              }}
              className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-black transition cursor-pointer border border-neutral-600 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>APPLY TO ALL BOARDS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyStyleToSlot(selectedStyle);
                onClose();
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>APPLY TO THIS BOARD</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
