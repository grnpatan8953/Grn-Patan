import React from 'react';
import {
  Sliders,
  X,
  RotateCcw,
  Undo,
  Redo,
  Save,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Layers,
  Shield,
  Sparkles,
} from 'lucide-react';
import { BoardSlot, BoardTemplateConfig, ImagePlacementMode, TemplateMode } from '../types';

interface CustomDesignDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slot: BoardSlot;
  config: BoardTemplateConfig;
  onUpdateSlot: (updated: Partial<BoardSlot>) => void;
  onRestoreOriginalMaster: () => void;
}

export const CustomDesignDrawer: React.FC<CustomDesignDrawerProps> = ({
  isOpen,
  onClose,
  slot,
  config,
  onUpdateSlot,
  onRestoreOriginalMaster,
}) => {
  if (!isOpen) return null;

  const isCustom = slot.templateMode === 'CUSTOM';
  const currentFont = slot.customFontFamily || config.fontFamily;
  const currentAlign = slot.customTextAlign || 'center';
  const currentBorderPt = slot.customBorderThicknessPt !== undefined ? slot.customBorderThicknessPt : config.borderWidthPt;
  const currentPricePt = slot.customPriceFontSizePt !== undefined ? slot.customPriceFontSizePt : config.priceFontSizePt;
  const currentNamePt = slot.customNameFontSizePt !== undefined ? slot.customNameFontSizePt : config.productNameFontSizePt;
  const currentImageMode: ImagePlacementMode = slot.imagePlacementMode || 'INSIDE';
  const currentOpacity = slot.imageOpacity !== undefined ? slot.imageOpacity : 0.25;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-neutral-300 flex flex-col no-print animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 bg-neutral-900 text-white flex justify-between items-center border-b border-neutral-800">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="font-black text-sm uppercase text-white tracking-wide">
              BOARD DESIGN &amp; CUSTOMIZATION
            </h3>
            <p className="text-[11px] text-neutral-400">
              Slot #{slot.slotIndex + 1} • {isCustom ? 'Custom Design Mode' : 'Original Master Mode'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-neutral-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Switch: ORIGINAL MASTER vs CUSTOM DESIGN */}
      <div className="p-3 bg-neutral-100 border-b border-neutral-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRestoreOriginalMaster}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              !isCustom
                ? 'bg-black text-amber-400 shadow-sm'
                : 'bg-white hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>ORIGINAL MASTER (LOCKED)</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSlot({ templateMode: 'CUSTOM' })}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isCustom
                ? 'bg-amber-500 text-black shadow-sm'
                : 'bg-white hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>CUSTOM DESIGN MODE</span>
          </button>
        </div>
      </div>

      {/* Custom Controls (Active when in Custom Mode) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {!isCustom ? (
          <div className="bg-neutral-50 border border-neutral-300 rounded-xl p-4 text-center space-y-2">
            <Shield className="w-8 h-8 mx-auto text-neutral-600" />
            <h4 className="font-black uppercase text-neutral-900">Original Master Protected</h4>
            <p className="text-neutral-500 text-[11px] leading-relaxed">
              This board is currently locked to the exact measurements, font weights, and border thicknesses of Master Page reference.
            </p>
            <button
              onClick={() => onUpdateSlot({ templateMode: 'CUSTOM' })}
              className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg uppercase tracking-wider text-xs"
            >
              Switch to Custom Design Mode
            </button>
          </div>
        ) : (
          <>
            {/* 1. IMAGE PLACEMENT MODE (MODE A vs MODE B) */}
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-2">
              <label className="font-black uppercase text-neutral-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>Image Placement Mode</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSlot({ imagePlacementMode: 'BACKGROUND', imageOpacity: slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0 })}
                  className={`p-2 rounded-lg border text-left cursor-pointer ${
                    currentImageMode === 'BACKGROUND'
                      ? 'border-black bg-black text-white font-bold'
                      : 'border-neutral-300 bg-white text-neutral-700'
                  }`}
                >
                  <div className="font-black text-[11px] uppercase">MODE A: BACKGROUND</div>
                  <div className="text-[10px] text-neutral-400">Covers board (0-100% opacity)</div>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSlot({ imagePlacementMode: 'INSIDE', imageOpacity: 1.0 })}
                  className={`p-2 rounded-lg border text-left cursor-pointer ${
                    currentImageMode === 'INSIDE'
                      ? 'border-black bg-black text-white font-bold'
                      : 'border-neutral-300 bg-white text-neutral-700'
                  }`}
                >
                  <div className="font-black text-[11px] uppercase">MODE B: PRODUCT IMAGE</div>
                  <div className="text-[10px] text-neutral-400">Resizable product object (30-50%)</div>
                </button>
              </div>

              {/* Opacity slider for all images - default 100% */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-neutral-600">Image Opacity</span>
                  <span className="font-mono font-bold text-neutral-900">
                    {Math.round((slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0}
                  onChange={(e) => onUpdateSlot({ imageOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Image Color Style: Original, Grayscale, Lightened */}
              <div className="pt-2">
                <label className="font-bold text-neutral-600 block mb-1">Image Color Style</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['original', 'grayscale', 'lighten'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onUpdateSlot({ imageFilter: mode })}
                      className={`py-1.5 px-2 text-[10px] font-bold uppercase rounded border cursor-pointer ${
                        (slot.imageFilter || 'original') === mode
                          ? 'bg-neutral-900 text-amber-400 border-black'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Readability Enhancements for Background Images */}
              {currentImageMode === 'BACKGROUND' && (
                <div className="pt-2 border-t border-neutral-200 mt-2 space-y-1.5">
                  <span className="text-[11px] font-bold text-neutral-700 block">Text Readability Over Image:</span>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(slot.textBacking)}
                      onChange={(e) => onUpdateSlot({ textBacking: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-[11px] font-semibold text-neutral-800">
                      Translucent Text Backing (soft white backing behind text)
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(slot.textShadow)}
                      onChange={(e) => onUpdateSlot({ textShadow: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-[11px] font-semibold text-neutral-800">
                      High-Contrast Text Drop Shadow
                    </span>
                  </label>
                </div>
              )}

              {/* Product Image Size slider when in MODE B */}
              {currentImageMode === 'INSIDE' && (
                <div className="pt-2 border-t border-neutral-200 mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-neutral-600">Product Image Width</span>
                    <span className="font-mono font-bold text-neutral-900">
                      {Math.round((slot.productImageWidthPct || 0.40) * 100)}% of board
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="0.85"
                    step="0.05"
                    value={slot.productImageWidthPct || 0.40}
                    onChange={(e) => onUpdateSlot({ productImageWidthPct: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>
              )}

              {/* Image Fit and Remove/Replace options */}
              {slot.imageUrl && (
                <div className="pt-2 flex items-center justify-between border-t border-neutral-200 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-neutral-600">FIT:</span>
                    {(['contain', 'cover'] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => onUpdateSlot({ imageFit: fit })}
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                          (slot.imageFit || 'contain') === fit
                            ? 'bg-black text-white'
                            : 'bg-white text-neutral-700'
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateSlot({ imageUrl: undefined })}
                    className="text-rose-600 hover:text-rose-700 font-bold text-[10px] uppercase"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>

            {/* 2. TYPOGRAPHY */}
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-3">
              <label className="font-black uppercase text-neutral-800 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-amber-600" />
                <span>Typography &amp; Font Family</span>
              </label>

              <div>
                <select
                  value={currentFont}
                  onChange={(e) => onUpdateSlot({ customFontFamily: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold"
                >
                  <option value="'Arial Black', 'Impact', 'Barlow Condensed', 'Oswald', sans-serif">
                    Arial Black &amp; Impact (Classic Word Master)
                  </option>
                  <option value="'Barlow Condensed', 'Oswald', 'Arial Black', sans-serif">
                    Barlow Condensed (Retail Condensed)
                  </option>
                  <option value="'Anton', 'Impact', sans-serif">
                    Anton (Ultra Bold Display)
                  </option>
                  <option value="'Inter', -apple-system, sans-serif">
                    Inter (Clean Modern Sans)
                  </option>
                </select>
              </div>

              {/* Text Alignment */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-neutral-600">Alignment:</span>
                <div className="flex gap-1">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => onUpdateSlot({ customTextAlign: align })}
                      className={`p-1.5 rounded border ${
                        currentAlign === align ? 'bg-black text-white' : 'bg-white text-neutral-600'
                      }`}
                    >
                      {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                      {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                      {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Font Size */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-neutral-600">Price Font Size</span>
                  <span className="font-mono font-bold text-amber-700">{currentPricePt} pt</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="180"
                  step="1"
                  value={currentPricePt}
                  onChange={(e) => onUpdateSlot({ customPriceFontSizePt: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Product Name Font Size */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-neutral-600">Product Name Size</span>
                  <span className="font-mono font-bold text-neutral-800">{currentNamePt} pt</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="50"
                  step="0.5"
                  value={currentNamePt}
                  onChange={(e) => onUpdateSlot({ customNameFontSizePt: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* 3. BORDER THICKNESS */}
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-black uppercase text-neutral-800">Border Thickness</span>
                <span className="font-mono font-bold text-neutral-900">{currentBorderPt} pt</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={currentBorderPt}
                onChange={(e) => onUpdateSlot({ customBorderThicknessPt: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>
          </>
        )}
      </div>

      {/* Drawer Footer Actions */}
      <div className="p-3 bg-neutral-100 border-t border-neutral-200 flex justify-between items-center text-xs">
        <button
          onClick={onRestoreOriginalMaster}
          className="text-neutral-600 hover:text-black font-bold flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Default</span>
        </button>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-black hover:bg-neutral-800 text-amber-400 font-black rounded-lg"
        >
          Done
        </button>
      </div>
    </div>
  );
};
