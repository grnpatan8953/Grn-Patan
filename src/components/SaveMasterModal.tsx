import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Layers,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  BoardFormat,
  BoardSlot,
  BoardTemplateConfig,
  SavedProductDesign,
} from '../types';
import { StorageService } from '../services/storage';

interface SaveMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: BoardSlot;
  currentFormat: BoardFormat;
  currentConfig: BoardTemplateConfig;
  onSavedMaster?: (format: BoardFormat, config: BoardTemplateConfig) => void;
}

export const SaveMasterModal: React.FC<SaveMasterModalProps> = ({
  isOpen,
  onClose,
  slot,
  currentFormat,
  currentConfig,
  onSavedMaster,
}) => {
  const [saveTarget, setSaveTarget] = useState<string>(`format-${currentFormat}`);
  const [masterName, setMasterName] = useState<string>(
    `My Custom ${currentFormat} Master — ${new Date().toLocaleDateString()}`
  );
  const [saveAsNewVersion, setSaveAsNewVersion] = useState(true);
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      if (saveTarget === 'board-only') {
        // Keeps it local to slot
        setSuccessMessage('Layout preserved for this board.');
      } else if (saveTarget === 'product' && slot.product) {
        // Save as product design
        const design: SavedProductDesign = {
          id: slot.product.code || slot.product.barcode || `prod_${Date.now()}`,
          productCode: slot.product.code,
          productBarcode: slot.product.barcode,
          productName: slot.product.itemName,
          boardFormat: currentFormat,
          boardType: slot.boardType,
          displayName: slot.displayName,
          packText: slot.packText,
          displaySp: slot.displaySp,
          displayMrp: slot.displayMrp,
          displaySave: slot.displaySave,
          imageUrl: slot.imageUrl,
          imageFit: slot.imageFit,
          imagePlacementMode: slot.imagePlacementMode,
          insideImageArrangement: slot.insideImageArrangement,
          imageOpacity: slot.imageOpacity,
          templateMode: 'CUSTOM',
          customFontFamily: slot.customFontFamily,
          customBorderThicknessPt: slot.customBorderThicknessPt,
          savedAt: new Date().toISOString(),
        };
        await StorageService.saveProductDesign(design);
        setSuccessMessage(`Saved design preference for product "${slot.product.itemName}".`);
      } else {
        // Save for specified format
        const targetFormat = saveTarget.replace('format-', '') as BoardFormat;
        const newConfig: BoardTemplateConfig = {
          ...currentConfig,
          format: targetFormat,
          priceFontSizePt: slot.customPriceFontSizePt || currentConfig.priceFontSizePt,
          productNameFontSizePt: slot.customNameFontSizePt || currentConfig.productNameFontSizePt,
          packTextFontSizePt: slot.customPackFontSizePt || currentConfig.packTextFontSizePt,
          footerFontSizePt: slot.customFooterFontSizePt || currentConfig.footerFontSizePt,
          saveFontSizePt: slot.customSaveFontSizePt || currentConfig.saveFontSizePt,
          borderWidthPt:
            slot.customBorderThicknessPt !== undefined
              ? slot.customBorderThicknessPt
              : currentConfig.borderWidthPt,
          fontFamily: slot.customFontFamily || currentConfig.fontFamily,
          footerText: slot.customFooter || currentConfig.footerText,
        };

        if (saveAsNewVersion) {
          await StorageService.saveMasterTemplateVersion(
            targetFormat,
            masterName.trim() || `Master v${Date.now()}`,
            newConfig,
            setAsDefault
          );
        }

        if (setAsDefault) {
          await StorageService.saveCalibratedMasterConfig(targetFormat, newConfig);
        }

        onSavedMaster?.(targetFormat, newConfig);
        setSuccessMessage(`Default ${targetFormat} master saved successfully.`);
      }

      setTimeout(() => {
        setIsSaving(false);
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err) {
      alert('Failed to save master: ' + String(err));
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="font-extrabold text-sm uppercase">SAVE THIS LAYOUT AS MASTER</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {successMessage ? (
            <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg p-4 text-center font-bold flex items-center justify-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          ) : (
            <>
              {/* SAVE FOR: */}
              <div>
                <label className="block font-black text-neutral-800 uppercase tracking-wide mb-2">
                  SAVE FOR:
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <label className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 cursor-pointer">
                    <input
                      type="radio"
                      name="saveTarget"
                      checked={saveTarget === 'board-only'}
                      onChange={() => setSaveTarget('board-only')}
                      className="accent-amber-500"
                    />
                    <span className="font-semibold text-neutral-800">This board only</span>
                  </label>

                  {slot.product && (
                    <label className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 cursor-pointer">
                      <input
                        type="radio"
                        name="saveTarget"
                        checked={saveTarget === 'product'}
                        onChange={() => setSaveTarget('product')}
                        className="accent-amber-500"
                      />
                      <span className="font-semibold text-neutral-800">
                        This product ({slot.product.itemName.slice(0, 24)}...)
                      </span>
                    </label>
                  )}

                  <label className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 cursor-pointer">
                    <input
                      type="radio"
                      name="saveTarget"
                      checked={saveTarget === 'format-1/8'}
                      onChange={() => setSaveTarget('format-1/8')}
                      className="accent-amber-500"
                    />
                    <span className="font-bold text-neutral-900">All 1/8 boards (8 per A4)</span>
                  </label>

                  <label className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 cursor-pointer">
                    <input
                      type="radio"
                      name="saveTarget"
                      checked={saveTarget === 'format-1/4'}
                      onChange={() => setSaveTarget('format-1/4')}
                      className="accent-amber-500"
                    />
                    <span className="font-bold text-neutral-900">All 1/4 boards (4 per A4)</span>
                  </label>

                  <label className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 cursor-pointer">
                    <input
                      type="radio"
                      name="saveTarget"
                      checked={saveTarget === 'format-1/2'}
                      onChange={() => setSaveTarget('format-1/2')}
                      className="accent-amber-500"
                    />
                    <span className="font-bold text-neutral-900">All 1/2 boards (2 per A4)</span>
                  </label>

                  <label className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 cursor-pointer">
                    <input
                      type="radio"
                      name="saveTarget"
                      checked={saveTarget === 'format-1/1'}
                      onChange={() => setSaveTarget('format-1/1')}
                      className="accent-amber-500"
                    />
                    <span className="font-bold text-neutral-900">All 1/1 boards (Full A4)</span>
                  </label>

                  <label className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 cursor-pointer">
                    <input
                      type="radio"
                      name="saveTarget"
                      checked={saveTarget === 'format-1/3'}
                      onChange={() => setSaveTarget('format-1/3')}
                      className="accent-amber-500"
                    />
                    <span className="font-bold text-neutral-900">All 1/3 boards (3 per A4)</span>
                  </label>

                  <label className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 cursor-pointer">
                    <input
                      type="radio"
                      name="saveTarget"
                      checked={saveTarget === 'format-ROUND'}
                      onChange={() => setSaveTarget('format-ROUND')}
                      className="accent-amber-500"
                    />
                    <span className="font-bold text-neutral-900">All Round Boards (15 Ovals)</span>
                  </label>

                  <label className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 cursor-pointer">
                    <input
                      type="radio"
                      name="saveTarget"
                      checked={saveTarget === 'format-NOTEBOOK'}
                      onChange={() => setSaveTarget('format-NOTEBOOK')}
                      className="accent-amber-500"
                    />
                    <span className="font-bold text-neutral-900">All Note Book 1 boards</span>
                  </label>
                </div>
              </div>

              {/* Master Name */}
              {saveTarget.startsWith('format-') && (
                <div className="space-y-3 pt-2 border-t border-neutral-200">
                  <div>
                    <label className="block font-bold text-neutral-800 mb-1">
                      MASTER NAME
                    </label>
                    <input
                      type="text"
                      value={masterName}
                      onChange={(e) => setMasterName(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-1.5 font-semibold text-neutral-900 focus:outline-none focus:border-amber-500"
                      placeholder="e.g. High-Contrast Word Master 1/8"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-1.5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveAsNewVersion}
                        onChange={(e) => setSaveAsNewVersion(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span className="font-bold text-neutral-800">SAVE AS NEW VERSION</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setAsDefault}
                        onChange={(e) => setSetAsDefault(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span className="font-bold text-neutral-800">
                        SET AS DEFAULT FOR ALL FUTURE BOARDS
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!successMessage && (
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded shadow flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>CONFIRM SAVE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
