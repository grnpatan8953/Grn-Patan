import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Printer,
  Trash2,
  Edit3,
  Copy,
  ChevronDown,
  ChevronUp,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Barcode,
  Image as ImageIcon,
  Tag,
  Check,
  RefreshCw,
  Sparkles,
  Sliders,
  Palette,
  FileText,
  Clipboard,
  MoreVertical,
  RotateCcw,
  BookmarkCheck,
  Star,
  Type,
  Bookmark,
  Layers,
} from 'lucide-react';
import {
  BoardClipboard,
  BoardFormat,
  BoardSlot,
  BoardTemplateConfig,
  BoardType,
  BoardTypographyStyle,
  CopiedBoardLayout,
  Product,
  AiAssistantPlan,
  SavedProductDesign,
  NamedBoardDesign,
} from '../types';
import { A4PrintSheet } from './A4PrintSheet';
import { AddBoardModal } from './AddBoardModal';
import { AiAssistantModal } from './AiAssistantModal';
import { CustomDesignDrawer } from './CustomDesignDrawer';
import { FormatMasterControls } from './FormatMasterControls';
import { RecreateBoardModal } from './RecreateBoardModal';
import { SaveMasterModal } from './SaveMasterModal';
import { StyleSelectorModal } from './StyleSelectorModal';
import { SavedDesignsModal } from './SavedDesignsModal';
import { StorageService } from '../services/storage';
import { SmartLayoutEngine } from '../services/smartLayoutEngine';
import { applyStylePreset } from '../services/stylePresets';

interface BoardMakerViewProps {
  currentFormat: BoardFormat;
  onChangeFormat: (format: BoardFormat) => void;
  templateConfigs: Record<BoardFormat, BoardTemplateConfig>;
  slots: BoardSlot[];
  onUpdateSlots: (slots: BoardSlot[]) => void;
  onOpenPrintPreview: () => void;
  onQuickPrint: () => void;
  allProducts: Product[];
  onNavigateToImporter?: () => void;
  onUpdateFormatConfig?: (format: BoardFormat, config: BoardTemplateConfig) => void;
}

export const BoardMakerView: React.FC<BoardMakerViewProps> = ({
  currentFormat,
  onChangeFormat,
  templateConfigs,
  slots,
  onUpdateSlots,
  onOpenPrintPreview,
  onQuickPrint,
  allProducts,
  onNavigateToImporter,
  onUpdateFormatConfig,
}) => {
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTargetIndex, setModalTargetIndex] = useState(0);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isCustomDrawerOpen, setIsCustomDrawerOpen] = useState(false);
  const [customDrawerSlotIndex, setCustomDrawerSlotIndex] = useState(0);
  const [isVisualEditorMode, setIsVisualEditorMode] = useState(true);
  const [referenceOverlayUrl, setReferenceOverlayUrl] = useState<string | null>(null);
  const [isRecreateModalOpen, setIsRecreateModalOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [activeMenuSlotIndex, setActiveMenuSlotIndex] = useState<number | null>(null);
  const [isSaveMasterOpen, setIsSaveMasterOpen] = useState(false);
  const [saveMasterTargetSlot, setSaveMasterTargetSlot] = useState<BoardSlot | null>(null);
  const [currentClipboard, setCurrentClipboard] = useState<BoardClipboard | null>(() =>
    StorageService.getBoardClipboard()
  );

  // Style Preset Selection Modal State
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [styleTargetIndex, setStyleTargetIndex] = useState(0);

  const handleApplyStyleToSlot = (styleId: BoardTypographyStyle) => {
    const updated = [...normalizedSlots];
    const target = updated[styleTargetIndex] || updated[activeSlotIndex];
    if (target) {
      updated[target.slotIndex] = applyStylePreset(target, activeConfig, styleId);
      onUpdateSlots(updated);
      showFeedback(`Applied "${styleId.replace(/_/g, ' ')}" style to Slot #${target.slotIndex + 1}.`);
    }
  };

  const handleApplyStyleToAllSlots = (styleId: BoardTypographyStyle) => {
    const updated = normalizedSlots.map((slot) => {
      if (slot.product || slot.displayName || slot.displaySp > 0) {
        return applyStylePreset(slot, activeConfig, styleId);
      }
      return slot;
    });
    onUpdateSlots(updated);
    showFeedback(`Applied "${styleId.replace(/_/g, ' ')}" style to all boards on page.`);
  };

  // Named Design Save & Apply Modal State
  const [isSavedDesignsModalOpen, setIsSavedDesignsModalOpen] = useState(false);
  const [savedDesignsModalMode, setSavedDesignsModalMode] = useState<'SAVE' | 'MANAGE'>('SAVE');
  const [savedDesignTargetSlotIndex, setSavedDesignTargetSlotIndex] = useState<number | null>(null);

  // Compact Designs Dropdown State (Part 1 requirement)
  const [showCompactDesignsDropdown, setShowCompactDesignsDropdown] = useState(false);
  const [compactDesignsList, setCompactDesignsList] = useState<NamedBoardDesign[]>([]);
  const [compactDefaultsMap, setCompactDefaultsMap] = useState<Partial<Record<BoardFormat, string>>>({});

  const loadCompactDesigns = async () => {
    const list = await StorageService.getAllNamedDesigns();
    setCompactDesignsList(list);
    const defs = await StorageService.getAllDefaultDesigns();
    setCompactDefaultsMap(defs);
  };

  const applyLayoutToSlot = (current: BoardSlot, layout: CopiedBoardLayout): BoardSlot => {
    return {
      ...current,
      // Enable custom layout rendering
      templateMode: 'CUSTOM',
      isManualLayout: true,
      customFontFamily: layout.customFontFamily,
      customFontWeight: layout.customFontWeight,
      customTextAlign: layout.customTextAlign,
      customBorderThicknessPt: layout.customBorderThicknessPt,
      customBorderStyle: layout.customBorderStyle,
      customPriceFontSizePt: layout.customPriceFontSizePt,
      customNameFontSizePt: layout.customNameFontSizePt,
      customPackFontSizePt: layout.customPackFontSizePt,
      customFooterFontSizePt: layout.customFooterFontSizePt,
      customSaveFontSizePt: layout.customSaveFontSizePt,
      customLetterSpacing: layout.customLetterSpacing,
      elementTransforms: layout.elementTransforms ? JSON.parse(JSON.stringify(layout.elementTransforms)) : undefined,
      additionalTextBoxes: layout.additionalTextBoxes ? JSON.parse(JSON.stringify(layout.additionalTextBoxes)) : undefined,
      imagePlacementMode: layout.imagePlacementMode,
      insideImageArrangement: layout.insideImageArrangement,
      imageOpacity: layout.imageOpacity,
      imageFilter: layout.imageFilter,
      productImageWidthPct: layout.productImageWidthPct,
      productImageHeightPct: layout.productImageHeightPct,
      productImageXOffset: layout.productImageXOffset,
      productImageYOffset: layout.productImageYOffset,
      textBacking: layout.textBacking,
      textShadow: layout.textShadow,
      hideProductName: layout.hideProductName,
      hidePackText: layout.hidePackText,
      hideFooter: layout.hideFooter,

      // CRITICAL: Preserve destination board's own offer type, focus status, and product values!
      boardType: current.boardType,
      showMrp: current.showMrp,
      hideMrp: current.hideMrp,
      hideSave: current.hideSave,
      isFocusBoard: current.isFocusBoard,
      focusPrintMode: current.focusPrintMode,
      productId: current.productId,
      product: current.product,
      displayName: current.displayName,
      displaySp: current.displaySp,
      displayMrp: current.displayMrp,
      displaySave: current.displaySave,
      packText: current.packText,
      customFooter: current.customFooter,
      imageUrl: current.imageUrl,
    };
  };

  const handleApplyNamedDesignToSelected = (design: NamedBoardDesign) => {
    const targetIdx = savedDesignTargetSlotIndex !== null ? savedDesignTargetSlotIndex : activeSlotIndex;
    if (targetIdx === null || targetIdx < 0 || targetIdx >= normalizedSlots.length) return;
    const current = normalizedSlots[targetIdx];
    const updated = [...normalizedSlots];
    updated[targetIdx] = {
      ...applyLayoutToSlot(current, design.layout),
      slotIndex: targetIdx,
    };
    onUpdateSlots(updated);
    showFeedback(`Applied design "${design.name}" to Slot #${targetIdx + 1}.`);
  };

  const handleApplyNamedDesignToAll = (design: NamedBoardDesign) => {
    let appliedCount = 0;
    const updated = normalizedSlots.map((s, idx) => {
      if (!s.displayName && !s.product) return s;
      appliedCount++;
      return {
        ...applyLayoutToSlot(s, design.layout),
        slotIndex: idx,
      };
    });
    onUpdateSlots(updated);
    showFeedback(`Applied design "${design.name}" to all ${appliedCount} filled boards on current page.`);
  };

  // Dynamic preview zoom
  const [previewZoom, setPreviewZoom] = useState<number>(0.6);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const activeConfig = templateConfigs[currentFormat];

  // Helper to calculate exact fit scale for current viewport
  const calculateFitScale = () => {
    if (!previewContainerRef.current) return 0.58;
    const container = previewContainerRef.current;
    const containerWidth = container.clientWidth || 600;
    const containerHeight = container.clientHeight || 750;

    // A4 dimensions in approx screen pixels at 96 DPI: 210mm ≈ 794px, 297mm ≈ 1123px
    const a4WidthPx = 794;
    const a4HeightPx = 1123;

    const scaleW = (containerWidth - 48) / a4WidthPx;
    const scaleH = (containerHeight - 48) / a4HeightPx;

    const fit = Math.min(scaleW, scaleH);
    return Math.max(0.35, Math.min(1.0, Number(fit.toFixed(2))));
  };

  // RESET FIT implementation: dynamically fits entire A4 in container
  const handleResetFit = () => {
    const calculated = calculateFitScale();
    setPreviewZoom(calculated);
  };

  // Run fit calculation on mount & window resize
  useEffect(() => {
    handleResetFit();
    window.addEventListener('resize', handleResetFit);
    return () => window.removeEventListener('resize', handleResetFit);
  }, [currentFormat]);

  // Ensure normalized slots: empty by default, NEVER auto-filled with random products!
  const normalizedSlots: BoardSlot[] = useMemo(() => {
    const list: BoardSlot[] = [];
    for (let i = 0; i < activeConfig.slotsCount; i++) {
      if (slots[i]) {
        list.push({ ...slots[i], slotIndex: i });
      } else {
        list.push({
          slotIndex: i,
          productId: null,
          product: null,
          displayName: '',
          packText: '',
          displaySp: 0,
          displayMrp: 0,
          displaySave: 0,
          boardType: 'FINAL_PRICE',
          showMrp: false,
        });
      }
    }
    return list;
  }, [slots, activeConfig]);

  // CLEAR ALL: Immediately removes every product and returns all slots to EMPTY
  const handleClearAll = () => {
    const emptySlots: BoardSlot[] = Array.from({ length: activeConfig.slotsCount }, (_, i) => ({
      slotIndex: i,
      productId: null,
      product: null,
      displayName: '',
      packText: '',
      displaySp: 0,
      displayMrp: 0,
      displaySave: 0,
      boardType: 'FINAL_PRICE',
      showMrp: false,
      imageUrl: undefined,
      imageFit: undefined,
    }));
    onUpdateSlots(emptySlots);
    setActiveSlotIndex(0);
  };

  // Open Add Board Modal for specific slot
  const handleOpenAddBoard = (slotIdx: number) => {
    setModalTargetIndex(slotIdx);
    setActiveSlotIndex(slotIdx);
    setIsAddModalOpen(true);
  };

  // Commit added board from modal
  const handleCommitAddBoard = (slotData: Partial<BoardSlot>, shouldAdvance?: boolean) => {
    const updated = [...normalizedSlots];
    const target = modalTargetIndex;

    updated[target] = {
      ...updated[target],
      ...slotData,
      slotIndex: target,
    };

    onUpdateSlots(updated);

    if (shouldAdvance && target < activeConfig.slotsCount - 1) {
      setModalTargetIndex(target + 1);
      setActiveSlotIndex(target + 1);
      // Modal stays open and advances
    }
  };

  // Apply natural-language plan from AI Board Assistant
  const handleApplyAiPlan = (plan: AiAssistantPlan) => {
    if (plan.targetFormat !== currentFormat) {
      onChangeFormat(plan.targetFormat);
    }
    const targetConfig = templateConfigs[plan.targetFormat] || activeConfig;
    const newSlotsCount = targetConfig.slotsCount;

    if (plan.itemsToCreate.length > 0) {
      const newSlots: BoardSlot[] = Array.from({ length: newSlotsCount }, (_, i) => ({
        slotIndex: i,
        productId: null,
        product: null,
        displayName: '',
        packText: '',
        displaySp: 0,
        displayMrp: 0,
        displaySave: 0,
        boardType: plan.boardType,
        showMrp: false,
      }));

      let currentSlotIdx = 0;
      for (const item of plan.itemsToCreate) {
        for (let q = 0; q < item.quantity && currentSlotIdx < newSlotsCount; q++) {
          newSlots[currentSlotIdx] = {
            slotIndex: currentSlotIdx,
            productId: item.product ? item.product.id : null,
            product: item.product || null,
            displayName: (item.productName || item.product?.itemName || `SPECIAL PROMO ₹${item.price}`).toUpperCase(),
            packText: (item.packText || '').toUpperCase(),
            displaySp: item.price,
            displayMrp: item.product?.mrp || Math.round(item.price * 1.25),
            displaySave: item.product ? Math.max(0, item.product.mrp - item.price) : Math.round(item.price * 0.25),
            boardType: plan.boardType,
            showMrp: false,
          };
          currentSlotIdx++;
        }
      }
      onUpdateSlots(newSlots);
      setActiveSlotIndex(0);
    } else if (plan.actions.some((a) => a.type === 'CLEAR')) {
      handleClearAll();
    }
  };

  const handleUpdateCustomSlot = (updated: Partial<BoardSlot>) => {
    const updatedSlots = [...normalizedSlots];
    updatedSlots[customDrawerSlotIndex] = {
      ...updatedSlots[customDrawerSlotIndex],
      ...updated,
    };
    onUpdateSlots(updatedSlots);
  };

  const handleRestoreOriginalMaster = () => {
    const updatedSlots = [...normalizedSlots];
    updatedSlots[customDrawerSlotIndex] = {
      ...updatedSlots[customDrawerSlotIndex],
      templateMode: 'MASTER',
      customFontFamily: undefined,
      customBorderThicknessPt: undefined,
      customPriceFontSizePt: undefined,
      customNameFontSizePt: undefined,
      customTextAlign: undefined,
    };
    onUpdateSlots(updatedSlots);
  };

  const showFeedback = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // ONE-CLICK COPY BOARD (Complete slot data)
  const handleCopyBoard = (slotIdx: number) => {
    const source = normalizedSlots[slotIdx];
    if (!source) return;
    const clip: BoardClipboard = {
      type: 'COMPLETE_BOARD',
      copiedAt: new Date().toISOString(),
      fullSlot: JSON.parse(JSON.stringify(source)),
    };
    StorageService.setBoardClipboard(clip);
    setCurrentClipboard(clip);
    setActiveMenuSlotIndex(null);
    showFeedback(`Board #${slotIdx + 1} copied (Full Board: ${source.displayName || 'Empty'}).`);
  };

  // ONE-CLICK COPY LAYOUT ONLY (Styling, geometry, fonts, borders — NO product/price values!)
  const handleCopyLayoutOnly = (slotIdx: number) => {
    const source = normalizedSlots[slotIdx];
    if (!source) return;
    const layoutOnly: CopiedBoardLayout = {
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
      hideMrp: source.hideMrp,
      hideSave: source.hideSave,
      boardType: source.boardType,
      showMrp: source.showMrp,
      starConfig: source.starConfig ? { ...source.starConfig } : undefined,
      focusPrintMode: source.focusPrintMode,
      isFocusBoard: source.isFocusBoard,
    };
    const clip: BoardClipboard = {
      type: 'LAYOUT_ONLY',
      copiedAt: new Date().toISOString(),
      layoutOnly,
    };
    StorageService.setBoardClipboard(clip);
    setCurrentClipboard(clip);
    setActiveMenuSlotIndex(null);
    showFeedback(`Board #${slotIdx + 1} layout copied (Typography, Spacing & Styling only).`);
  };

  // PASTE BOARD: Duplicates complete board into slot
  const handlePasteBoard = (targetIdx: number) => {
    const clip = StorageService.getBoardClipboard();
    if (!clip) {
      alert('Clipboard is empty. Please copy a board first.');
      return;
    }
    if (clip.type === 'COMPLETE_BOARD' && clip.fullSlot) {
      const updated = [...normalizedSlots];
      updated[targetIdx] = {
        ...clip.fullSlot,
        slotIndex: targetIdx,
      };
      onUpdateSlots(updated);
      setActiveSlotIndex(targetIdx);
      setActiveMenuSlotIndex(null);
      showFeedback(`Pasted full board into Slot #${targetIdx + 1}.`);
    } else if (clip.type === 'LAYOUT_ONLY' && clip.layoutOnly) {
      handlePasteLayout(targetIdx);
    }
  };

  // PASTE LAYOUT: Preserves target board's own product and current prices!
  const handlePasteLayout = (targetIdx: number) => {
    const clip = StorageService.getBoardClipboard();
    if (!clip || !clip.layoutOnly) {
      alert('No layout copied. Please click "COPY LAYOUT ONLY" on a board first.');
      return;
    }
    const layout = clip.layoutOnly;
    const current = normalizedSlots[targetIdx];
    const updated = [...normalizedSlots];

    // Preserves product, code, barcode, displayName, displaySp, displayMrp, displaySave, and offer type!
    updated[targetIdx] = {
      ...applyLayoutToSlot(current, layout),
      slotIndex: targetIdx,
    };

    onUpdateSlots(updated);
    setActiveSlotIndex(targetIdx);
    setActiveMenuSlotIndex(null);

    const warn =
      layout.sourceFormat !== currentFormat
        ? ` (Applied from ${layout.sourceFormat} proportionally to ${currentFormat})`
        : '';
    showFeedback(
      `Pasted layout onto Slot #${targetIdx + 1}${warn} (Kept "${current.displayName || 'current product'}" and price ₹${current.displaySp}).`
    );
  };

  const handleOpenSaveMaster = (slotIdx: number) => {
    setSaveMasterTargetSlot(normalizedSlots[slotIdx]);
    setIsSaveMasterOpen(true);
    setActiveMenuSlotIndex(null);
  };

  const handleResetToMaster = (slotIdx: number) => {
    const restored = SmartLayoutEngine.restoreMasterLayout(normalizedSlots[slotIdx], activeConfig);
    const updated = [...normalizedSlots];
    updated[slotIdx] = {
      ...updated[slotIdx],
      ...restored,
    };
    onUpdateSlots(updated);
    setActiveMenuSlotIndex(null);
    showFeedback(`Reset Slot #${slotIdx + 1} back to standard ${currentFormat} master.`);
  };

  const handleSaveAsProductDesign = async (slotIdx: number) => {
    const target = normalizedSlots[slotIdx];
    if (!target.product) {
      alert('Slot does not contain a product to save.');
      return;
    }
    const design: SavedProductDesign = {
      id: target.product.code || target.product.barcode || `prod_${Date.now()}`,
      productCode: target.product.code,
      productBarcode: target.product.barcode,
      productName: target.product.itemName,
      boardFormat: currentFormat,
      boardType: target.boardType,
      displayName: target.displayName,
      packText: target.packText,
      displaySp: target.displaySp,
      displayMrp: target.displayMrp,
      displaySave: target.displaySave,
      imageUrl: target.imageUrl,
      imageFit: target.imageFit,
      imagePlacementMode: target.imagePlacementMode,
      insideImageArrangement: target.insideImageArrangement,
      imageOpacity: target.imageOpacity,
      templateMode: 'CUSTOM',
      customFontFamily: target.customFontFamily,
      customBorderThicknessPt: target.customBorderThicknessPt,
      savedAt: new Date().toISOString(),
    };
    await StorageService.saveProductDesign(design);
    setActiveMenuSlotIndex(null);
    showFeedback(`Saved custom product design for "${target.product.itemName}".`);
  };

  // DUPLICATE BOARD: Copies product, price, pack, image into next empty slot
  const handleDuplicateSlot = (slotIdx: number) => {
    const source = normalizedSlots[slotIdx];
    if (!source.displayName && !source.product) return;

    const updated = [...normalizedSlots];
    // Find next empty slot
    let targetIdx = updated.findIndex((s, idx) => idx > slotIdx && !s.displayName && !s.product);
    if (targetIdx === -1) {
      // Find any empty slot
      targetIdx = updated.findIndex((s) => !s.displayName && !s.product);
    }
    if (targetIdx === -1) {
      // Fallback: next slot wrapping around
      targetIdx = (slotIdx + 1) % activeConfig.slotsCount;
    }

    updated[targetIdx] = {
      ...source,
      slotIndex: targetIdx,
    };

    onUpdateSlots(updated);
    setActiveSlotIndex(targetIdx);
  };

  // REMOVE single slot
  const handleRemoveSlot = (slotIdx: number) => {
    const updated = [...normalizedSlots];
    updated[slotIdx] = {
      slotIndex: slotIdx,
      productId: null,
      product: null,
      displayName: '',
      packText: '',
      displaySp: 0,
      displayMrp: 0,
      displaySave: 0,
      boardType: 'FINAL_PRICE',
      showMrp: false,
      imageUrl: undefined,
    };
    onUpdateSlots(updated);
  };

  // MOVE slot up/down
  const handleMoveSlot = (slotIdx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? slotIdx - 1 : slotIdx + 1;
    if (targetIdx < 0 || targetIdx >= activeConfig.slotsCount) return;

    const updated = [...normalizedSlots];
    const temp = updated[slotIdx];
    updated[slotIdx] = { ...updated[targetIdx], slotIndex: slotIdx };
    updated[targetIdx] = { ...temp, slotIndex: targetIdx };

    onUpdateSlots(updated);
    setActiveSlotIndex(targetIdx);
  };

  // Format selection options (LOCKED PAGE MAPPING)
  const formatList: Array<{ format: BoardFormat; label: string; pageTag: string; desc: string }> = [
    { format: '1/8', label: '1/8 A4', pageTag: 'PAGE 1', desc: '8 Boards (2×4 Grid)' },
    { format: '1/4', label: '1/4 A4', pageTag: 'PAGE 2', desc: '4 Boards (2×2 Grid)' },
    { format: '1/3', label: '1/3 A4', pageTag: 'PAGE 5', desc: '3 Strips (1×3 Grid)' },
    { format: '1/2', label: '1/2 A4', pageTag: 'PAGE 3', desc: '2 Boards (1×2 Grid)' },
    { format: '1/1', label: '1/1 A4', pageTag: 'PAGE 4', desc: '1 Full Poster' },
    { format: 'ROUND', label: 'ROUND', pageTag: 'PAGE 6', desc: '6 Oval Labels' },
    { format: 'NOTEBOOK', label: 'NOTE BOOK 1', pageTag: 'PAGE 7', desc: 'Special Promo Sheet' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Feedback Notification Banner */}
      {feedbackNotice && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-md flex items-center justify-between font-semibold text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4" />
            <span>{feedbackNotice}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="cursor-pointer text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Format Selector & Quick Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        {/* Format Selector Pills */}
        <div>
          <div className="text-xs font-black text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>Choose Board Format</span>
            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-mono">
              Word Master Reference Locked
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {formatList.map((item) => {
              const isSelected = currentFormat === item.format;
              return (
                <button
                  key={item.format}
                  onClick={() => onChangeFormat(item.format)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex flex-col items-start ${
                    isSelected
                      ? 'bg-black text-amber-400 ring-2 ring-black shadow-sm'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <span>{item.label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        isSelected ? 'bg-amber-500 text-black' : 'bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      {item.pageTag}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-normal mt-0.5 ${
                      isSelected ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    {item.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons: AI BOARD ASSISTANT, CLEAR ALL, PRINT PREVIEW, PRINT */}
        <div className="flex flex-wrap items-center gap-2 self-end xl:self-center">
          {/* MASTER FORMAT IMPORTER BUTTON */}
          {onNavigateToImporter && (
            <button
              onClick={onNavigateToImporter}
              className="flex items-center space-x-1.5 px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-black rounded-lg border border-neutral-300 transition cursor-pointer"
              title="Open Master Format Importer to inspect Word DOCX or PDF layout specifications"
            >
              <FileText className="w-4 h-4 text-neutral-700" />
              <span>MASTER IMPORTER</span>
            </button>
          )}

          {/* STYLE OPTIONS BUTTON */}
          <button
            onClick={() => {
              setStyleTargetIndex(activeSlotIndex);
              setIsStyleModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-neutral-900 hover:bg-black text-amber-400 border border-amber-500/60 text-xs font-black rounded-lg shadow-sm transition cursor-pointer"
            title="Open Board Typography Style Presets (Word Master, Extra Bold, Condensed, Custom)"
          >
            <Type className="w-4 h-4 text-amber-400" />
            <span>STYLES</span>
          </button>

          {/* SAVE DESIGN BUTTON */}
          <button
            onClick={() => {
              const targetIdx = activeSlotIndex !== null ? activeSlotIndex : Math.max(0, normalizedSlots.findIndex((s) => s.displayName || s.product));
              const validIdx = targetIdx >= 0 ? targetIdx : 0;
              setActiveSlotIndex(validIdx);
              setSavedDesignTargetSlotIndex(validIdx);
              setSavedDesignsModalMode('SAVE');
              setIsSavedDesignsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black rounded-lg shadow-sm transition cursor-pointer"
            title="Save the currently selected board's exact visual layout as a named design"
          >
            <Bookmark className="w-4 h-4 text-emerald-300" />
            <span>SAVE DESIGN</span>
          </button>

          {/* MY SAVED DESIGNS BUTTON */}
          <button
            onClick={() => {
              setSavedDesignTargetSlotIndex(activeSlotIndex);
              setSavedDesignsModalMode('MANAGE');
              setIsSavedDesignsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-neutral-900 hover:bg-black text-amber-300 border border-amber-500/60 text-xs font-black rounded-lg shadow-sm transition cursor-pointer"
            title="View and apply your saved custom designs (Mahir, Full Bold, etc.)"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>MY DESIGNS</span>
          </button>

          {/* AI BOARD ASSISTANT BUTTON */}
          <button
            onClick={() => setIsAiAssistantOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-gradient-to-r from-neutral-900 to-black hover:from-black hover:to-neutral-900 text-amber-400 border border-amber-500/50 text-xs font-black rounded-lg shadow-sm transition cursor-pointer"
            title="Open AI Board Assistant natural language prompt builder"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>AI BOARD ASSISTANT</span>
          </button>

          {/* CLEAR ALL BUTTON (FIXED: Immediately empties all slots) */}
          <button
            onClick={handleClearAll}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 text-xs font-black rounded-lg border border-neutral-300 transition cursor-pointer"
            title="Empty all slots on current board"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>CLEAR ALL</span>
          </button>

          <button
            onClick={onOpenPrintPreview}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg shadow transition cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Print Preview</span>
          </button>

          <button
            onClick={onQuickPrint}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-black hover:bg-neutral-800 text-white text-xs font-black rounded-lg shadow transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>


      {/* Main Workspace: Left Slots Manager (5 cols), Right Live A4 Canvas (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Deliberate Board Slot Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                  {activeConfig.name}
                </h3>
                <p className="text-[11px] text-neutral-500">{activeConfig.pageRef}</p>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                {normalizedSlots.filter((s) => s.displayName || s.product).length} of {activeConfig.slotsCount} Added
              </span>
            </div>

            {/* List of Deliberate Slot Cards */}
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {normalizedSlots.map((slot, idx) => {
                const isFilled = Boolean(slot.product || slot.displayName);
                const isSelected = activeSlotIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                        : isFilled
                        ? 'border-neutral-200 bg-white hover:border-neutral-300'
                        : 'border-dashed border-neutral-300 bg-neutral-50/70 hover:bg-white'
                    }`}
                  >
                    {isFilled ? (
                      /* Compact Filled Slot Card */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 bg-black text-amber-400 text-xs font-mono font-black rounded">
                              SLOT #{idx + 1}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                slot.boardType === 'MRP_SAVE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {slot.boardType === 'MRP_SAVE' ? 'Type B: MRP+Save' : 'Type A: Final Price'}
                            </span>
                            {slot.imageUrl && (
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1 py-0.2 rounded flex items-center gap-0.5 font-bold">
                                <ImageIcon className="w-3 h-3" />
                                <span>IMG</span>
                              </span>
                            )}
                          </div>

                          <div className="font-mono text-base font-black text-black bg-amber-300 px-2 py-0.5 rounded shadow-2xs">
                            ₹{slot.displaySp}
                          </div>
                        </div>

                        {/* Title & Product Info */}
                        <div>
                          <div className="font-black text-neutral-900 text-sm uppercase truncate">
                            {slot.displayName}
                          </div>
                          {slot.packText && (
                            <div className="text-xs font-bold text-neutral-600 uppercase">
                              {slot.packText}
                            </div>
                          )}
                          {slot.boardType === 'MRP_SAVE' && (
                            <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                              MRP: ₹{slot.displayMrp} • Save: ₹{slot.displaySave}
                            </div>
                          )}
                        </div>

                        {/* Slot Actions Bar */}
                        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-xs">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleMoveSlot(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-neutral-100 rounded text-neutral-500 disabled:opacity-20"
                              title="Move up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveSlot(idx, 'down')}
                              disabled={idx === activeConfig.slotsCount - 1}
                              className="p-1 hover:bg-neutral-100 rounded text-neutral-500 disabled:opacity-20"
                              title="Move down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <button
                              onClick={() => {
                                setActiveSlotIndex(idx);
                                setIsVisualEditorMode(true);
                              }}
                              className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold cursor-pointer transition ${
                                isSelected && isVisualEditorMode
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                              }`}
                              title="Focus and edit this board visually directly on the A4 canvas"
                            >
                              <Palette className="w-3 h-3" />
                              <span>CANVA EDIT</span>
                            </button>

                            <button
                              onClick={() => handleOpenAddBoard(idx)}
                              className="px-2 py-1 bg-neutral-900 hover:bg-black text-white font-bold rounded flex items-center gap-1 text-[11px] cursor-pointer"
                              title="Edit product details, price, MRP, or scan barcode"
                            >
                              <Edit3 className="w-3 h-3 text-amber-400" />
                              <span>EDIT</span>
                            </button>

                            <button
                              onClick={() => {
                                setStyleTargetIndex(idx);
                                setActiveSlotIndex(idx);
                                setIsStyleModalOpen(true);
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black rounded flex items-center gap-1 text-[11px] cursor-pointer"
                              title="Select typography style (Word Master, Extra Bold, Condensed)"
                            >
                              <Type className="w-3 h-3 text-amber-600" />
                              <span>STYLE</span>
                            </button>

                            <button
                              onClick={() => handleCopyBoard(idx)}
                              className="p-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded cursor-pointer"
                              title="COPY BOARD (Complete: product, price & layout)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleCopyLayoutOnly(idx)}
                              className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-black rounded text-[10px] cursor-pointer"
                              title="COPY LAYOUT ONLY (Fonts, sizes, positions - keeps other product's prices!)"
                            >
                              LAYOUT
                            </button>

                            <button
                              onClick={() => {
                                setActiveSlotIndex(idx);
                                setSavedDesignTargetSlotIndex(idx);
                                setSavedDesignsModalMode('SAVE');
                                setIsSavedDesignsModalOpen(true);
                              }}
                              className="px-1.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black rounded flex items-center gap-0.5 text-[10px] cursor-pointer"
                              title="Save this board layout with a custom name (e.g. Mahir, Full Bold)"
                            >
                              <Bookmark className="w-2.5 h-2.5 text-emerald-600" />
                              <span>SAVE</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveSlotIndex(idx);
                                setSavedDesignTargetSlotIndex(idx);
                                setSavedDesignsModalMode('MANAGE');
                                setIsSavedDesignsModalOpen(true);
                              }}
                              className="px-1.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 font-black rounded flex items-center gap-0.5 text-[10px] cursor-pointer"
                              title="Open and apply your saved custom designs (Mahir, Full Bold, etc.)"
                            >
                              <Layers className="w-2.5 h-2.5 text-neutral-600" />
                              <span>DESIGNS</span>
                            </button>

                            {currentClipboard && (
                              <button
                                onClick={() => handlePasteBoard(idx)}
                                className="px-1.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black rounded text-[10px] cursor-pointer"
                                title={
                                  currentClipboard.type === 'LAYOUT_ONLY'
                                    ? 'PASTE LAYOUT (Preserves this product & price)'
                                    : 'PASTE BOARD (Duplicates complete board)'
                                }
                              >
                                PASTE
                              </button>
                            )}

                            {/* Dropdown Menu for All Direct Board Actions */}
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveMenuSlotIndex(activeMenuSlotIndex === idx ? null : idx)
                                }
                                className="p-1 hover:bg-neutral-100 text-neutral-500 hover:text-black rounded cursor-pointer"
                                title="All Board Actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuSlotIndex === idx && (
                                <div className="absolute right-0 top-7 z-50 bg-white border border-neutral-200 rounded-lg shadow-xl py-1 w-52 text-xs font-semibold text-neutral-800 animate-in fade-in-50">
                                  <button
                                    onClick={() => {
                                      setActiveSlotIndex(idx);
                                      setIsVisualEditorMode(true);
                                      setActiveMenuSlotIndex(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Palette className="w-3.5 h-3.5 text-blue-600" />
                                    <span>EDIT BOARD</span>
                                  </button>

                                  <button
                                    onClick={() => handleCopyBoard(idx)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-neutral-600" />
                                    <span>COPY BOARD</span>
                                  </button>

                                  <button
                                    onClick={() => handleCopyLayoutOnly(idx)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-amber-50 flex items-center gap-2 text-amber-800 font-bold cursor-pointer"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    <span>COPY LAYOUT ONLY</span>
                                  </button>

                                  {currentClipboard && (
                                    <>
                                      <button
                                        onClick={() => handlePasteBoard(idx)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 flex items-center gap-2 text-emerald-800 cursor-pointer"
                                      >
                                        <Clipboard className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>PASTE BOARD</span>
                                      </button>
                                      <button
                                        onClick={() => handlePasteLayout(idx)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 flex items-center gap-2 text-emerald-800 font-bold cursor-pointer"
                                      >
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>PASTE LAYOUT</span>
                                      </button>
                                    </>
                                  )}

                                  <button
                                    onClick={() => {
                                      handleDuplicateSlot(idx);
                                      setActiveMenuSlotIndex(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-neutral-500" />
                                    <span>DUPLICATE BOARD</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenSaveMaster(idx)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 font-bold text-neutral-900 cursor-pointer"
                                  >
                                    <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
                                    <span>SAVE AS MASTER</span>
                                  </button>

                                  {slot.product && (
                                    <button
                                      onClick={() => handleSaveAsProductDesign(idx)}
                                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Tag className="w-3.5 h-3.5 text-neutral-500" />
                                      <span>SAVE AS PRODUCT DESIGN</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleResetToMaster(idx)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 text-neutral-600 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                                    <span>RESET TO MASTER</span>
                                  </button>

                                  <div className="border-t border-neutral-100 my-1" />

                                  <button
                                    onClick={() => {
                                      handleRemoveSlot(idx);
                                      setActiveMenuSlotIndex(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>DELETE BOARD</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Empty Slot Button */
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-neutral-200 text-neutral-700 text-xs font-mono font-bold rounded">
                            SLOT #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-neutral-400 uppercase">
                            Empty
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {currentClipboard && (
                            <button
                              onClick={() => handlePasteBoard(idx)}
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-neutral-900 hover:bg-black text-amber-400 text-xs font-black rounded-lg transition shadow-xs cursor-pointer"
                              title="Paste copied board into this slot"
                            >
                              <Clipboard className="w-3.5 h-3.5" />
                              <span>PASTE</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenAddBoard(idx)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ ADD BOARD</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Physical A4 Preview Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col items-center">
            {/* Preview Toolbar */}
            <div className="w-full flex flex-wrap justify-between items-center border-b border-neutral-200 pb-3 mb-4 gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm text-neutral-900 uppercase">
                  A4 Physical Page Preview
                </span>
                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs font-mono rounded">
                  210mm × 297mm
                </span>

                {/* CANVA VISUAL EDITOR TOGGLE BUTTON */}
                <button
                  onClick={() => setIsVisualEditorMode((v) => !v)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    isVisualEditorMode
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                  }`}
                  title="Toggle Canva-style visual board editor (drag elements, resize with mouse handles, inline text edit)"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>{isVisualEditorMode ? 'CANVA EDITOR ACTIVE' : 'CANVA EDITOR'}</span>
                </button>
              </div>

              {/* Zoom Controls + RESET FIT */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPreviewZoom((z) => Math.max(0.35, z - 0.05))}
                  className="p-1.5 hover:bg-neutral-100 rounded text-neutral-600"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-neutral-700 w-12 text-center">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  onClick={() => setPreviewZoom((z) => Math.min(1.2, z + 0.05))}
                  className="p-1.5 hover:bg-neutral-100 rounded text-neutral-600"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {/* FIXED RESET FIT BUTTON */}
                <button
                  onClick={handleResetFit}
                  className="text-xs font-black text-black px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 shadow-2xs transition cursor-pointer ml-1"
                  title="Fit whole A4 sheet in view"
                >
                  RESET FIT
                </button>

                {/* DESIGNS BUTTON & POPUP (Part 1 requirement) */}
                <div className="relative">
                  <button
                    onClick={() => {
                      loadCompactDesigns();
                      setShowCompactDesignsDropdown((v) => !v);
                    }}
                    className="flex items-center space-x-1 text-xs font-black px-2.5 py-1 rounded bg-neutral-900 hover:bg-black text-amber-400 border border-amber-500/60 shadow-2xs transition cursor-pointer ml-1"
                    title="Open compact design selector for current board format"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                    <span>DESIGNS</span>
                  </button>

                  {showCompactDesignsDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 p-4 text-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <div className="flex items-center gap-1.5 font-black text-white uppercase">
                          <Bookmark className="w-4 h-4 text-amber-400" />
                          <span>Designs ({currentFormat})</span>
                        </div>
                        <button
                          onClick={() => setShowCompactDesignsDropdown(false)}
                          className="text-neutral-400 hover:text-white cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {compactDesignsList.filter((d) => d.format === currentFormat).length === 0 ? (
                          <div className="text-center py-6 text-neutral-400">
                            No saved designs for {currentFormat}.
                          </div>
                        ) : (
                          compactDesignsList
                            .filter((d) => d.format === currentFormat)
                            .map((design) => {
                              const isDefault = compactDefaultsMap[design.format] === design.id;
                              return (
                                <div
                                  key={design.id}
                                  className={`p-2.5 rounded-lg border flex flex-col gap-2 ${
                                    isDefault
                                      ? 'bg-neutral-800/90 border-emerald-500/60'
                                      : 'bg-neutral-800/50 border-neutral-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-black text-white">{design.name}</span>
                                    {isDefault ? (
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-black">
                                        ✓ DEFAULT
                                      </span>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          await StorageService.setDefaultDesignId(design.format, design.id);
                                          loadCompactDesigns();
                                          showFeedback(`Set "${design.name}" as default for ${design.format}!`);
                                        }}
                                        className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                                      >
                                        Make Default
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => {
                                        setActiveSlotIndex(activeSlotIndex ?? 0);
                                        handleApplyNamedDesignToSelected(design);
                                        setShowCompactDesignsDropdown(false);
                                      }}
                                      className="flex-1 py-1 px-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] rounded cursor-pointer"
                                    >
                                      Apply to Selected
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleApplyNamedDesignToAll(design);
                                        setShowCompactDesignsDropdown(false);
                                      }}
                                      className="flex-1 py-1 px-2 bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-[11px] rounded cursor-pointer"
                                    >
                                      Apply to All Filled
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>

                      <div className="border-t border-neutral-800 pt-2 flex justify-between">
                        <button
                          onClick={() => {
                            setShowCompactDesignsDropdown(false);
                            setSavedDesignTargetSlotIndex(activeSlotIndex);
                            setSavedDesignsModalMode('MANAGE');
                            setIsSavedDesignsModalOpen(true);
                          }}
                          className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold rounded text-center cursor-pointer"
                        >
                          Manage All Designs...
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Viewport Container */}
            <div
              ref={previewContainerRef}
              className="w-full overflow-auto flex justify-center bg-neutral-100/90 p-4 sm:p-6 rounded-xl border border-neutral-200 shadow-inner"
              style={{ minHeight: '640px' }}
            >
              <div
                className="a4-preview-scale-wrapper"
                style={{
                  transform: `scale(${previewZoom})`,
                  transformOrigin: 'top center',
                  marginBottom: `calc((297mm * ${previewZoom}) - 297mm + 20px)`,
                }}
              >
                <div className="relative">
                  <A4PrintSheet
                    slots={normalizedSlots}
                    config={activeConfig}
                    activeSlotIndex={activeSlotIndex}
                    onSelectSlot={(idx) => {
                      setActiveSlotIndex(idx);
                      const target = normalizedSlots[idx];
                      if (!target || (!target.displayName && !target.product)) {
                        handleOpenAddBoard(idx);
                      }
                    }}
                    interactive={true}
                    isVisualEditorMode={isVisualEditorMode}
                    onUpdateSlotData={(slotIdx, updated) => {
                      const list = [...normalizedSlots];
                      list[slotIdx] = { ...list[slotIdx], ...updated };
                      onUpdateSlots(list);
                    }}
                  />

                  {/* Optional Reference Image Comparison Overlay */}
                  {referenceOverlayUrl && (
                    <div
                      className="absolute inset-0 pointer-events-none z-30 opacity-40 mix-blend-multiply flex items-center justify-center border-4 border-dashed border-purple-600 rounded-sm"
                      title="Master Reference Image Comparison Overlay"
                    >
                      <img
                        src={referenceOverlayUrl}
                        alt="Reference Overlay"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full text-center text-xs text-neutral-500 mt-3 flex justify-between items-center px-2">
              <span>
                Format: <strong>{activeConfig.name}</strong> • Reference:{' '}
                <strong>{activeConfig.pageRef}</strong>
              </span>
              <span>Click on any board slot to Add or Edit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Board / Scan Product Modal */}
      <AddBoardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        slotIndex={modalTargetIndex}
        totalSlots={activeConfig.slotsCount}
        currentSlot={normalizedSlots[modalTargetIndex]}
        targetFormat={currentFormat}
        config={activeConfig}
        allProducts={allProducts}
        onAddBoard={handleCommitAddBoard}
      />

      {/* AI Board Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        currentFormat={currentFormat}
        slots={normalizedSlots}
        allProducts={allProducts}
        onApplyPlan={handleApplyAiPlan}
      />

      {/* Custom Design Drawer */}
      <CustomDesignDrawer
        isOpen={isCustomDrawerOpen}
        onClose={() => setIsCustomDrawerOpen(false)}
        slot={normalizedSlots[customDrawerSlotIndex] || normalizedSlots[0]}
        config={activeConfig}
        onUpdateSlot={handleUpdateCustomSlot}
        onRestoreOriginalMaster={handleRestoreOriginalMaster}
      />

      {/* Recreate Board From Image Modal */}
      <RecreateBoardModal
        isOpen={isRecreateModalOpen}
        onClose={() => setIsRecreateModalOpen(false)}
        targetFormat={currentFormat}
        onApplyToSlot={(slotData) => {
          const list = [...normalizedSlots];
          list[activeSlotIndex] = {
            ...list[activeSlotIndex],
            ...slotData,
            slotIndex: activeSlotIndex,
          };
          onUpdateSlots(list);
        }}
      />

      {/* Save Layout As Master Modal */}
      {isSaveMasterOpen && saveMasterTargetSlot && (
        <SaveMasterModal
          isOpen={isSaveMasterOpen}
          onClose={() => setIsSaveMasterOpen(false)}
          slot={saveMasterTargetSlot}
          currentFormat={currentFormat}
          currentConfig={activeConfig}
          onSavedMaster={(fmt, cfg) => {
            onUpdateFormatConfig?.(fmt, cfg);
            showFeedback(`Saved and updated default master for ${fmt}!`);
          }}
        />
      )}

      {/* Board Typography Style Selector Modal */}
      <StyleSelectorModal
        isOpen={isStyleModalOpen}
        onClose={() => setIsStyleModalOpen(false)}
        currentSlot={normalizedSlots[styleTargetIndex] || normalizedSlots[activeSlotIndex]}
        config={activeConfig}
        onApplyStyleToSlot={handleApplyStyleToSlot}
        onApplyStyleToAllSlots={handleApplyStyleToAllSlots}
      />

      {/* Named Reusable Board Designs Modal ("Mahir", "Full Bold", etc.) */}
      <SavedDesignsModal
        isOpen={isSavedDesignsModalOpen}
        onClose={() => setIsSavedDesignsModalOpen(false)}
        mode={savedDesignsModalMode}
        currentSlot={
          savedDesignTargetSlotIndex !== null
            ? normalizedSlots[savedDesignTargetSlotIndex]
            : normalizedSlots[activeSlotIndex] || null
        }
        currentFormat={currentFormat}
        filledSlotsCount={normalizedSlots.filter((s) => s.displayName || s.product).length}
        onApplyToSelected={handleApplyNamedDesignToSelected}
        onApplyToAll={handleApplyNamedDesignToAll}
        onSaveSuccess={(name) => showFeedback(`Saved design "${name}" permanently!`)}
      />
    </div>
  );
};
