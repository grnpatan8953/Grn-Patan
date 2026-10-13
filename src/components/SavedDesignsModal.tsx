import React, { useState, useEffect } from 'react';
import { Bookmark, Check, Trash2, Edit2, Sparkles, X, AlertCircle, Layers, CheckCheck, RefreshCw, Star } from 'lucide-react';
import { BoardSlot, BoardFormat, NamedBoardDesign, CopiedBoardLayout } from '../types';
import { StorageService } from '../services/storage';

interface SavedDesignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'SAVE' | 'MANAGE';
  currentSlot: BoardSlot | null;
  currentFormat: BoardFormat;
  filledSlotsCount: number;
  onApplyToSelected: (design: NamedBoardDesign) => void;
  onApplyToAll: (design: NamedBoardDesign) => void;
  onSaveSuccess?: (designName: string) => void;
}

export const SavedDesignsModal: React.FC<SavedDesignsModalProps> = ({
  isOpen,
  onClose,
  mode: initialMode,
  currentSlot,
  currentFormat,
  filledSlotsCount,
  onApplyToSelected,
  onApplyToAll,
  onSaveSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'SAVE' | 'MANAGE'>(initialMode);
  const [designs, setDesigns] = useState<NamedBoardDesign[]>([]);
  const [defaultDesignsMap, setDefaultDesignsMap] = useState<Partial<Record<BoardFormat, string>>>({});
  const [designName, setDesignName] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [existingMatch, setExistingMatch] = useState<NamedBoardDesign | null>(null);
  const [editingDesignId, setEditingDesignId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [filterFormat, setFilterFormat] = useState<string>('ALL');

  // Confirmation preview state before applying design
  const [pendingApply, setPendingApply] = useState<{
    design: NamedBoardDesign;
    mode: 'SELECTED' | 'ALL';
  } | null>(null);

  // Deletion confirmation state
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setActiveTab(initialMode);
    if (initialMode === 'SAVE') {
      setDesignName('');
      setSaveSuccessMsg(null);
      setExistingMatch(null);
      setPendingApply(null);
    }
  }, [initialMode, isOpen]);

  const loadDesigns = async () => {
    const list = await StorageService.getAllNamedDesigns();
    setDesigns(list);
    const defaults = await StorageService.getAllDefaultDesigns();
    setDefaultDesignsMap(defaults);
  };

  const handleToggleDefault = async (design: NamedBoardDesign) => {
    const isCurrentDefault = defaultDesignsMap[design.format] === design.id;
    const newId = isCurrentDefault ? null : design.id;
    await StorageService.setDefaultDesignId(design.format, newId);
    const updatedDefaults = await StorageService.getAllDefaultDesigns();
    setDefaultDesignsMap(updatedDefaults);
    setSaveSuccessMsg(
      newId
        ? `"${design.name}" set as DEFAULT for ${design.format} format!`
        : `Removed default design for ${design.format} format.`
    );
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  useEffect(() => {
    if (isOpen) {
      loadDesigns();
    }
  }, [isOpen]);

  // Check if name already exists for current format
  useEffect(() => {
    if (!designName.trim()) {
      setExistingMatch(null);
      return;
    }
    const match = designs.find(
      (d) =>
        d.name.trim().toLowerCase() === designName.trim().toLowerCase() &&
        d.format === currentFormat
    );
    setExistingMatch(match || null);
  }, [designName, designs, currentFormat]);

  if (!isOpen) return null;

  // Extracts visual geometry, typography, and styling only.
  // CRITICAL: NEVER captures product-specific business data (boardType, showMrp, Focus status).
  const extractLayout = (source: BoardSlot): CopiedBoardLayout => {
    return {
      sourceFormat: currentFormat,
      customFontFamily: source.customFontFamily,
      customFontWeight: source.customFontWeight,
      customTextAlign: source.customTextAlign,
      customBorderThicknessPt: source.customBorderThicknessPt,
      customBorderStyle: source.customBorderStyle,
      customPriceFontSizePt: source.customPriceFontSizePt,
      customNameFontSizePt: source.customNameFontSizePt,
      customPackFontSizePt: source.customPackFontSizePt,
      customFooterFontSizePt: source.customFooterFontSizePt,
      customSaveFontSizePt: source.customSaveFontSizePt,
      customLetterSpacing: source.customLetterSpacing,
      elementTransforms: source.elementTransforms ? JSON.parse(JSON.stringify(source.elementTransforms)) : undefined,
      additionalTextBoxes: source.additionalTextBoxes ? JSON.parse(JSON.stringify(source.additionalTextBoxes)) : undefined,
      imagePlacementMode: source.imagePlacementMode,
      insideImageArrangement: source.insideImageArrangement,
      imageOpacity: source.imageOpacity,
      imageFilter: source.imageFilter,
      productImageWidthPct: source.productImageWidthPct,
      productImageHeightPct: source.productImageHeightPct,
      productImageXOffset: source.productImageXOffset,
      productImageYOffset: source.productImageYOffset,
      textBacking: source.textBacking,
      textShadow: source.textShadow,
      hideProductName: source.hideProductName,
      hidePackText: source.hidePackText,
      hideFooter: source.hideFooter,
    };
  };

  const handleSaveOrUpdate = async (overwriteExistingId?: string) => {
    if (!currentSlot) return;
    const trimmedName = designName.trim();
    if (!trimmedName) return;

    // Check before overwriting if user didn't explicitly click the update button
    if (!overwriteExistingId && existingMatch) {
      if (!window.confirm(`Update existing "${existingMatch.name}" design for ${currentFormat}?`)) {
        return;
      }
    }

    const layout = extractLayout(currentSlot);
    const idToUse = overwriteExistingId || existingMatch?.id || `design_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newDesign: NamedBoardDesign = {
      id: idToUse,
      name: trimmedName,
      format: currentFormat,
      layout,
      createdAt: existingMatch?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await StorageService.saveNamedDesign(newDesign);
    await loadDesigns();

    setSaveSuccessMsg(`Design "${trimmedName}" saved successfully!`);
    if (onSaveSuccess) onSaveSuccess(trimmedName);

    setTimeout(() => {
      setSaveSuccessMsg(null);
      setActiveTab('MANAGE');
    }, 1200);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await StorageService.deleteNamedDesign(pendingDelete.id);
      await loadDesigns();
      setSaveSuccessMsg(`Deleted design "${pendingDelete.name}" successfully.`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to delete design:', err);
      setSaveSuccessMsg(`Error: Failed to delete design "${pendingDelete.name}".`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } finally {
      setPendingDelete(null);
    }
  };

  const handleStartRename = (design: NamedBoardDesign) => {
    setEditingDesignId(design.id);
    setRenameValue(design.name);
  };

  const handleSaveRename = async (design: NamedBoardDesign) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== design.name) {
      const updated: NamedBoardDesign = {
        ...design,
        name: trimmed,
        updatedAt: new Date().toISOString(),
      };
      await StorageService.saveNamedDesign(updated);
      await loadDesigns();
    }
    setEditingDesignId(null);
  };

  const handleUpdateDesignWithCurrent = async (design: NamedBoardDesign) => {
    if (!currentSlot) return;
    if (window.confirm(`Update design "${design.name}" with the currently selected board's layout?`)) {
      const layout = extractLayout(currentSlot);
      const updated: NamedBoardDesign = {
        ...design,
        layout,
        updatedAt: new Date().toISOString(),
      };
      await StorageService.saveNamedDesign(updated);
      await loadDesigns();
      setSaveSuccessMsg(`Updated "${design.name}" with current layout!`);
      setTimeout(() => setSaveSuccessMsg(null), 2000);
    }
  };

  // Group designs by format
  const formatsPresent = Array.from(new Set(designs.map((d) => d.format)));
  const filteredDesigns = filterFormat === 'ALL' ? designs : designs.filter((d) => d.format === filterFormat);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white tracking-wide uppercase">
              NAMED BOARD DESIGNS
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold">
              Current Format: {currentFormat}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-neutral-800 bg-neutral-900 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('SAVE')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-t-lg transition border-b-2 cursor-pointer ${
              activeTab === 'SAVE'
                ? 'border-amber-400 text-amber-400 bg-neutral-800'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>SAVE CURRENT DESIGN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MANAGE')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-t-lg transition border-b-2 cursor-pointer ${
              activeTab === 'MANAGE'
                ? 'border-amber-400 text-amber-400 bg-neutral-800'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>MY SAVED DESIGNS ({designs.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto">
          {saveSuccessMsg && (
            <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500 rounded-lg text-emerald-300 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {pendingDelete ? (
            <div className="p-5 bg-neutral-950 border border-rose-500/70 rounded-xl space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>Delete design "{pendingDelete.name}"?</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Are you sure you want to delete this design? Existing product boards already using copies of this design remain safely untouched.
              </p>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-lg uppercase tracking-wider transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>DELETE DESIGN</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : pendingApply ? (
            /* SAFE APPLICATION CONFIRMATION PREVIEW (CRITICAL BUG 4) */
            <div className="p-5 bg-neutral-950 border border-amber-500/70 rounded-xl space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>CONFIRM SAFE DESIGN APPLICATION</span>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-neutral-300">
                  <span className="text-neutral-400 font-bold">Design Name:</span>
                  <span className="font-black text-white text-sm bg-neutral-800 px-2.5 py-1 rounded border border-neutral-700">
                    {pendingApply.design.name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span className="text-neutral-400 font-bold">Destination Format:</span>
                  <span className="font-black text-amber-400 px-2.5 py-0.5 bg-amber-950/60 rounded border border-amber-500/40 uppercase">
                    {currentFormat}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span className="text-neutral-400 font-bold">Target Destination:</span>
                  <span className="font-bold text-white bg-neutral-800 px-2.5 py-1 rounded">
                    {pendingApply.mode === 'SELECTED'
                      ? `Selected Board (Slot #${(currentSlot?.slotIndex ?? 0) + 1})`
                      : `All ${filledSlotsCount} Filled Boards on Current Page`}
                  </span>
                </div>
              </div>

              {/* Business Data & Offer Type Preservation Guarantee */}
              <div className="bg-emerald-950/40 border border-emerald-500/60 rounded-lg p-3.5 space-y-2 text-xs text-emerald-200">
                <div className="font-black flex items-center gap-1.5 text-emerald-300 uppercase tracking-wide">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Product Data & Offer Types Strictly Preserved</span>
                </div>
                <ul className="space-y-1 text-emerald-200/90 text-[11px] list-disc list-inside">
                  <li>
                    <strong>Product Information:</strong> Product name, barcode, selling price (SP), MRP, and pack text remain untouched.
                  </li>
                  <li>
                    <strong>Offer Logic:</strong> Destination board's offer type (FINAL PRICE vs MRP/SAVE) and Focus star status remain unchanged.
                  </li>
                  <li>
                    <strong>Visual Appearance Only:</strong> Typography font family, border weight, element positions, and styling from &quot;{pendingApply.design.name}&quot; will be applied safely.
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (pendingApply.mode === 'SELECTED') {
                      onApplyToSelected(pendingApply.design);
                    } else {
                      onApplyToAll(pendingApply.design);
                    }
                    setPendingApply(null);
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-lg uppercase tracking-wider transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>CONFIRM & APPLY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingApply(null)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : activeTab === 'SAVE' ? (
            <div className="space-y-4">
              <div className="bg-neutral-800/60 p-3.5 rounded-lg border border-neutral-700/80 text-xs text-neutral-300 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Save Board Layout Geometry & Typography</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Saves element positions, font sizes, condensed styles, border weight, and ₹ / ONLY alignment from the selected board without copying product details or prices.
                </p>
              </div>

              {!currentSlot && (
                <div className="p-3 bg-amber-950/50 border border-amber-600 rounded-lg text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Please select a board slot on the canvas first to save its design.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Custom Design Name
                </label>
                <input
                  type="text"
                  placeholder='e.g. "Mahir", "My 1/8 Format", "Full Bold"'
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && designName.trim()) {
                      handleSaveOrUpdate();
                    }
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-400"
                  autoFocus
                />
              </div>

              {existingMatch && (
                <div className="p-3 bg-neutral-800 border border-amber-500/80 rounded-lg space-y-2">
                  <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Existing design found: "{existingMatch.name}" for {currentFormat}</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    A design with this name already exists. You can update it or choose a different name.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveOrUpdate(existingMatch.id)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded cursor-pointer transition"
                    >
                      UPDATE EXISTING "{existingMatch.name}"
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesignName(designName + ' (New)')}
                      className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold rounded cursor-pointer transition"
                    >
                      SAVE AS NEW
                    </button>
                  </div>
                </div>
              )}

              {!existingMatch && (
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!designName.trim() || !currentSlot}
                    onClick={() => handleSaveOrUpdate()}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs rounded-lg uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>SAVE DESIGN PERMANENTLY</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filter bar */}
              {formatsPresent.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                  <span className="text-neutral-400 font-bold text-[11px] mr-1">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setFilterFormat('ALL')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                      filterFormat === 'ALL'
                        ? 'bg-amber-400 text-black'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    ALL ({designs.length})
                  </button>
                  {formatsPresent.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFilterFormat(fmt)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        filterFormat === fmt
                          ? 'bg-amber-400 text-black'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      {fmt} ({designs.filter((d) => d.format === fmt).length})
                    </button>
                  ))}
                </div>
              )}

              {filteredDesigns.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 space-y-2">
                  <Bookmark className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
                  <p className="text-xs">No saved designs yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('SAVE')}
                    className="text-amber-400 hover:underline text-xs font-bold cursor-pointer"
                  >
                    Save the currently edited board layout
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDesigns.map((design) => {
                    const isSameFormat = design.format === currentFormat;
                    const isRenaming = editingDesignId === design.id;
                    const isDefault = defaultDesignsMap[design.format] === design.id;

                    return (
                      <div
                        key={design.id}
                        className={`border rounded-lg p-3.5 flex flex-col gap-3 transition ${
                          isDefault
                            ? 'bg-neutral-800/90 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                            : 'bg-neutral-800/80 border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {isRenaming ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(design);
                                    if (e.key === 'Escape') setEditingDesignId(null);
                                  }}
                                  className="bg-neutral-900 border border-amber-400 rounded px-2 py-1 text-xs text-white"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRename(design)}
                                  className="px-2 py-1 bg-amber-400 text-black rounded text-[11px] font-bold cursor-pointer"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingDesignId(null)}
                                  className="px-2 py-1 bg-neutral-700 text-neutral-300 rounded text-[11px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-sm text-white tracking-wide">
                                  {design.name}
                                </span>
                                {isDefault && (
                                  <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500 text-black shadow-xs">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>DEFAULT</span>
                                  </span>
                                )}
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-300 uppercase">
                                  {design.format}
                                </span>
                                {!isSameFormat && (
                                  <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded">
                                    different format ({design.format} vs {currentFormat})
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-3">
                              <span>Font: {design.layout.customFontFamily || 'Word Master Condensed'}</span>
                              <span>•</span>
                              <span>Updated: {new Date(design.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Action buttons & Default Toggle */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* MAKE DEFAULT / ✓ DEFAULT FOR FORMAT */}
                            <button
                              type="button"
                              onClick={() => handleToggleDefault(design)}
                              className={`px-2 py-1 rounded text-[11px] font-black flex items-center gap-1 transition cursor-pointer shadow-xs ${
                                isDefault
                                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 hover:bg-emerald-900'
                                  : 'bg-neutral-900 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 border border-neutral-700'
                              }`}
                              title={
                                isDefault
                                  ? `Remove ${design.name} as default for ${design.format} format`
                                  : `Set ${design.name} as default layout for newly added ${design.format} boards`
                              }
                            >
                              {isDefault ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                  <span>✓ DEFAULT FOR {design.format}</span>
                                </>
                              ) : (
                                <>
                                  <Star className="w-3.5 h-3.5 text-amber-400" />
                                  <span>MAKE DEFAULT</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartRename(design)}
                              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition cursor-pointer"
                              title="Rename design"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {currentSlot && isSameFormat && (
                              <button
                                type="button"
                                onClick={() => handleUpdateDesignWithCurrent(design)}
                                className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-700 rounded transition cursor-pointer"
                                title="Update with current board layout"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setPendingDelete({ id: design.id, name: design.name })}
                              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-700 rounded transition cursor-pointer"
                              title="Delete design"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Apply Action Buttons (Strictly validated by board format) */}
                        <div className="flex items-center gap-2 pt-1 border-t border-neutral-700/60">
                          <button
                            type="button"
                            disabled={!currentSlot || !isSameFormat}
                            onClick={() => setPendingApply({ design, mode: 'SELECTED' })}
                            className={`flex-1 py-1.5 px-3 rounded text-xs font-black flex items-center justify-center gap-1.5 transition ${
                              !currentSlot || !isSameFormat
                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-40 border border-neutral-700/40'
                                : 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer shadow-xs'
                            }`}
                            title={
                              !isSameFormat
                                ? `Cannot apply ${design.format} design to ${currentFormat} board`
                                : !currentSlot
                                ? 'Please select a board on the canvas'
                                : 'Preview & apply to selected board'
                            }
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>APPLY TO SELECTED BOARD</span>
                          </button>

                          <button
                            type="button"
                            disabled={filledSlotsCount === 0 || !isSameFormat}
                            onClick={() => setPendingApply({ design, mode: 'ALL' })}
                            className={`flex-1 py-1.5 px-3 rounded text-xs font-black flex items-center justify-center gap-1.5 transition ${
                              filledSlotsCount === 0 || !isSameFormat
                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-40 border border-neutral-700/40'
                                : 'bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600 cursor-pointer shadow-xs'
                            }`}
                            title={
                              !isSameFormat
                                ? `Cannot apply ${design.format} design to ${currentFormat} board`
                                : filledSlotsCount === 0
                                ? 'No filled boards on current page'
                                : `Preview & apply to all ${filledSlotsCount} filled boards`
                            }
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>APPLY TO ALL ({filledSlotsCount} FILLED)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs text-neutral-500">
          <span>Designs persist in your browser data across sessions.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
