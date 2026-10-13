import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Search,
  X,
  Plus,
  Check,
  Tag,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  BookmarkCheck,
  History,
  RotateCcw,
  Sliders,
  Crop,
  Layers,
  Star,
  AlertTriangle,
} from 'lucide-react';
import {
  BoardFormat,
  BoardSlot,
  BoardTemplateConfig,
  BoardType,
  FocusItem,
  ImagePlacementMode,
  InsideImageArrangement,
  Product,
  SavedProductDesign,
  NamedBoardDesign,
  CopiedBoardLayout,
} from '../types';
import { StorageService } from '../services/storage';
import { ProductSearchService, normalizeIdentifier, stripLeadingZeros } from '../services/searchService';
import { RuleEngine } from '../services/ruleEngine';
import { SmartLayoutEngine } from '../services/smartLayoutEngine';
import { FocusDetectionService } from '../services/focusDetectionService';

interface AddBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotIndex: number;
  totalSlots: number;
  currentSlot?: BoardSlot | null;
  targetFormat?: BoardFormat;
  config?: BoardTemplateConfig;
  defaultBoardType?: BoardType;
  allProducts?: Product[];
  onAddBoard: (slotData: Partial<BoardSlot>, shouldAdvanceToNextSlot?: boolean) => void;
}

export const AddBoardModal: React.FC<AddBoardModalProps> = ({
  isOpen,
  onClose,
  slotIndex,
  totalSlots,
  currentSlot,
  targetFormat = '1/8',
  config,
  defaultBoardType = 'FINAL_PRICE',
  allProducts,
  onAddBoard,
}) => {
  const [scanInput, setScanInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [notFoundMsg, setNotFoundMsg] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);

  // Focus Detection State
  const [isFocusProduct, setIsFocusProduct] = useState(false);
  const [focusStatus, setFocusStatus] = useState<'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_FOCUS'>('NOT_FOCUS');
  const [approvedFocusSp, setApprovedFocusSp] = useState<number | undefined>(undefined);
  const [baseCatalogueSp, setBaseCatalogueSp] = useState<number | undefined>(undefined);
  const [isStarEnabled, setIsStarEnabled] = useState(true);
  const [isYellowPaper, setIsYellowPaper] = useState(true);
  const [focusOverrideWarning, setFocusOverrideWarning] = useState<string | null>(null);

  // Saved design memory prompt
  const [savedDesignFound, setSavedDesignFound] = useState<SavedProductDesign | null>(null);
  const [isUsingSavedDesign, setIsUsingSavedDesign] = useState(false);
  const [rememberDesign, setRememberDesign] = useState(true);

  // Business Rule applied notification
  const [appliedRuleNotice, setAppliedRuleNotice] = useState<string | null>(null);

  // Reusable named designs & default design selection
  const [compatibleDesigns, setCompatibleDesigns] = useState<NamedBoardDesign[]>([]);
  const [defaultDesignId, setDefaultDesignId] = useState<string | null>(null);
  const [selectedDesignId, setSelectedDesignId] = useState<string>('MASTER');
  const [appliedLayoutOverride, setAppliedLayoutOverride] = useState<CopiedBoardLayout | null>(null);
  const [designFeedbackMsg, setDesignFeedbackMsg] = useState<string | null>(null);

  // Form customizations
  const [boardType, setBoardType] = useState<BoardType>(defaultBoardType);
  const [displayName, setDisplayName] = useState('');
  const [packText, setPackText] = useState('');
  const [spPrice, setSpPrice] = useState<number>(0);
  const [mrpPrice, setMrpPrice] = useState<number>(0);
  const [saveAmount, setSaveAmount] = useState<number>(0);
  const [saveOverride, setSaveOverride] = useState(false);

  // Image customizations
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>('contain');
  const [imagePlacementMode, setImagePlacementMode] = useState<ImagePlacementMode>('INSIDE');
  const [insideImageArrangement, setInsideImageArrangement] = useState<InsideImageArrangement>('AUTO');
  const [imageOpacity, setImageOpacity] = useState<number>(1.0);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = Boolean(
    currentSlot && (currentSlot.displayName || currentSlot.product || currentSlot.displaySp > 0)
  );

  // Load Focus items and compatible saved designs on modal open
  useEffect(() => {
    if (isOpen) {
      StorageService.getActiveFocusCampaign().then((camp) => {
        if (camp) {
          StorageService.getFocusItems(camp.id).then((items) => setFocusItems(items || []));
        } else {
          setFocusItems([]);
        }
      });

      // Load compatible named designs and default design
      StorageService.getAllNamedDesigns().then(async (all) => {
        const comp = all.filter((d) => d.format === targetFormat);
        setCompatibleDesigns(comp);
        const defId = await StorageService.getDefaultDesignId(targetFormat);
        setDefaultDesignId(defId);

        // When adding a brand NEW board (not editing existing board), automatically apply default design!
        if (!isEditMode && defId) {
          const defDesign = comp.find((d) => d.id === defId);
          if (defDesign) {
            setSelectedDesignId(defId);
            setAppliedLayoutOverride(defDesign.layout);
            setIsUsingSavedDesign(true);
          }
        } else if (isEditMode) {
          setSelectedDesignId(currentSlot?.templateMode === 'CUSTOM' ? 'CUSTOM_CURRENT' : 'MASTER');
        }
      });
    }
  }, [isOpen, targetFormat, isEditMode]);

  const handleApplyBoardDesign = (designId: string) => {
    if (designId === 'MASTER') {
      setSelectedDesignId('MASTER');
      setAppliedLayoutOverride(null);
      setIsUsingSavedDesign(false);
      setDesignFeedbackMsg('Standard template restored');
      setTimeout(() => setDesignFeedbackMsg(null), 2000);
      return;
    }
    const match = compatibleDesigns.find((d) => d.id === designId);
    if (match) {
      setSelectedDesignId(match.id);
      setAppliedLayoutOverride(match.layout);
      setIsUsingSavedDesign(true);
      setDesignFeedbackMsg(`Applied "${match.name}" design!`);
      setTimeout(() => setDesignFeedbackMsg(null), 2000);
    }
  };

  // Load existing slot state on open, or reset if blank slot
  useEffect(() => {
    if (isOpen) {
      if (currentSlot && (currentSlot.displayName || currentSlot.product || currentSlot.displaySp > 0)) {
        // PREFILL EXACT DATA FOR CURRENT SLOT
        setSelectedProduct(currentSlot.product || null);
        setDisplayName(currentSlot.displayName || '');
        setPackText(currentSlot.packText || '');
        setSpPrice(currentSlot.displaySp || 0);
        setMrpPrice(currentSlot.displayMrp || 0);
        setSaveAmount(
          currentSlot.displaySave !== undefined
            ? currentSlot.displaySave
            : Math.max(0, (currentSlot.displayMrp || 0) - (currentSlot.displaySp || 0))
        );
        setSaveOverride(Boolean(currentSlot.saveOverride));
        setBoardType(currentSlot.boardType || defaultBoardType);
        setUploadedImage(currentSlot.imageUrl || null);
        setImageFit(currentSlot.imageFit || 'contain');
        setImagePlacementMode(currentSlot.imagePlacementMode || 'INSIDE');
        setInsideImageArrangement(currentSlot.insideImageArrangement || 'AUTO');
        setImageOpacity(currentSlot.imageOpacity !== undefined ? currentSlot.imageOpacity : 1.0);
        setScanInput(currentSlot.product?.barcode || currentSlot.product?.code || '');
        setAppliedRuleNotice(currentSlot.appliedRuleName || null);
        setSavedDesignFound(null);
        setIsUsingSavedDesign(currentSlot.templateMode === 'CUSTOM');

        // Restore Focus properties if slot was already focus
        setIsFocusProduct(Boolean(currentSlot.isFocusBoard));
        setFocusStatus(currentSlot.isFocusBoard ? 'APPROVED' : 'NOT_FOCUS');
        setApprovedFocusSp(currentSlot.hoFocusSp);
        setBaseCatalogueSp(currentSlot.baseSp || (currentSlot.product ? currentSlot.product.retail : 0));
        setIsStarEnabled(Boolean(currentSlot.starConfig?.visible ?? currentSlot.isFocusBoard));
        setIsYellowPaper(currentSlot.focusPrintMode === 'YELLOW_PAPER');
      } else {
        resetForm();
        setTimeout(() => {
          scanInputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, slotIndex, currentSlot]);

  // Recalculate SAVE whenever mrp or sp changes, unless manually overridden
  useEffect(() => {
    if (!saveOverride) {
      setSaveAmount(Math.max(0, mrpPrice - spPrice));
    }
  }, [mrpPrice, spPrice, saveOverride]);

  const resetForm = () => {
    setScanInput('');
    setSelectedProduct(null);
    setSearchResults([]);
    setNotFoundMsg(false);
    setSavedDesignFound(null);
    setIsUsingSavedDesign(false);
    setAppliedRuleNotice(null);
    setBoardType(defaultBoardType);
    setDisplayName('');
    setPackText('');
    setSpPrice(0);
    setMrpPrice(0);
    setSaveAmount(0);
    setSaveOverride(false);
    setUploadedImage(null);
    setImageFit('contain');
    setImagePlacementMode('INSIDE');
    setInsideImageArrangement('AUTO');
    setImageOpacity(1.0);
    setIsFocusProduct(false);
    setFocusStatus('NOT_FOCUS');
    setApprovedFocusSp(undefined);
    setBaseCatalogueSp(undefined);
    setIsStarEnabled(true);
    setIsYellowPaper(true);
    setFocusOverrideWarning(null);
  };

  const handleProductSelect = async (prod: Product) => {
    setSelectedProduct(prod);
    setNotFoundMsg(false);

    // Auto-detect pack pattern in name e.g. "(6 PCS SET)" or "(5 PCS)"
    let suggestedPack = '';
    const packMatch = prod.itemName.match(/\((\d+\s*(?:PCS|SET|NOS)[^)]*)\)/i);
    if (packMatch) suggestedPack = packMatch[0].toUpperCase();

    // Default stock report values
    setDisplayName(prod.itemName.toUpperCase());
    setPackText(suggestedPack);
    setBaseCatalogueSp(prod.retail);
    setMrpPrice(prod.mrp);
    setSaveOverride(false);

    // AUTOMATIC FOCUS PRODUCT DETECTION (PRIORITY 2)
    const focusCheck = FocusDetectionService.checkProductFocusSync(prod, focusItems);
    if (focusCheck.isFocus) {
      setIsFocusProduct(true);
      setFocusStatus(focusCheck.status);
      setApprovedFocusSp(focusCheck.focusSp);

      if (focusCheck.status === 'APPROVED') {
        const approvedSp = focusCheck.focusSp || prod.retail;
        setSpPrice(approvedSp);
        setSaveAmount(Math.max(0, prod.mrp - approvedSp));
        setIsStarEnabled(true);
        setIsYellowPaper(true);
        setFocusOverrideWarning(null);
      } else {
        // PENDING: strictly do NOT substitute unapproved price
        setSpPrice(prod.retail);
        setSaveAmount(Math.max(0, prod.mrp - prod.retail));
        setIsStarEnabled(false);
        setIsYellowPaper(false);
        setFocusOverrideWarning(null);
      }
    } else {
      setIsFocusProduct(false);
      setFocusStatus('NOT_FOCUS');
      setApprovedFocusSp(undefined);
      setSpPrice(prod.retail);
      setSaveAmount(Math.max(0, prod.mrp - prod.retail));
      setIsStarEnabled(false);
      setIsYellowPaper(false);
      setFocusOverrideWarning(null);
    }

    // Evaluate Business Rules automatically
    try {
      const evaluation = await RuleEngine.evaluateRules(prod, targetFormat, currentSlot || undefined);
      if (evaluation.appliedRule && evaluation.appliedAction) {
        setAppliedRuleNotice(evaluation.appliedRule.name);
        if (evaluation.appliedAction.setBoardType) {
          setBoardType(evaluation.appliedAction.setBoardType);
        }
        if (evaluation.appliedAction.hideProductName) {
          setDisplayName('');
        }
        if (evaluation.appliedAction.hidePackText) {
          setPackText('');
        }
        if (evaluation.appliedAction.imagePlacementMode) {
          setImagePlacementMode(evaluation.appliedAction.imagePlacementMode);
        }
        if (evaluation.appliedAction.insideImageArrangement) {
          setInsideImageArrangement(evaluation.appliedAction.insideImageArrangement);
        }
      } else {
        setAppliedRuleNotice(null);
      }
    } catch (err) {
      console.error('Error evaluating business rules:', err);
    }

    // Check Smart Product Design Memory
    try {
      const saved = await StorageService.getSavedProductDesign(prod.code || prod.barcode);
      if (saved) {
        setSavedDesignFound(saved);
      } else {
        setSavedDesignFound(null);
      }
    } catch {
      setSavedDesignFound(null);
    }
  };

  const applySavedDesign = (saved: SavedProductDesign) => {
    setIsUsingSavedDesign(true);
    setBoardType(saved.boardType);
    setDisplayName(saved.displayName);
    setPackText(saved.packText || '');
    if (saved.displaySp) setSpPrice(saved.displaySp);
    if (saved.displayMrp) setMrpPrice(saved.displayMrp);
    if (saved.imageUrl) {
      setUploadedImage(saved.imageUrl);
      setImageFit(saved.imageFit || 'contain');
      setImagePlacementMode(saved.imagePlacementMode || 'INSIDE');
      setImageOpacity(saved.imageOpacity !== undefined ? saved.imageOpacity : 1.0);
    }
  };

  // Perform search / barcode scan
  const executeSearch = async (term: string) => {
    const q = term.trim();
    if (!q) {
      setSearchResults([]);
      setNotFoundMsg(false);
      return;
    }

    setIsSearching(true);
    setNotFoundMsg(false);

    try {
      let results: Product[] = [];
      if (allProducts && allProducts.length > 0) {
        results = ProductSearchService.search(allProducts, q, 30);
      } else {
        results = await StorageService.searchProducts(q, 30);
      }

      setSearchResults(results);

      // Single exact match auto-select
      if (results.length === 1) {
        handleProductSelect(results[0]);
      } else if (results.length === 0) {
        setNotFoundMsg(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch(scanInput);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          setUploadedImage(loadEvent.target.result as string);
          setImageOpacity(1.0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmAdd = async (advanceToNext: boolean) => {
    if (!displayName && !selectedProduct) {
      alert('Please scan/select a product or enter a display product name.');
      return;
    }

    const isApprovedFocus = isFocusProduct && focusStatus === 'APPROVED' && isStarEnabled;

    const slotPayload: Partial<BoardSlot> = {
      slotIndex,
      productId: selectedProduct ? selectedProduct.id : (currentSlot?.productId || null),
      product: selectedProduct || currentSlot?.product || null,
      displayName: displayName.trim().toUpperCase(),
      packText: packText.trim().toUpperCase(),
      displaySp: spPrice,
      displayMrp: mrpPrice,
      displaySave: saveAmount,
      saveOverride,
      boardType,
      imageUrl: uploadedImage || undefined,
      imageFit,
      imagePlacementMode,
      insideImageArrangement,
      imageOpacity,
      templateMode: isUsingSavedDesign ? 'CUSTOM' : (currentSlot?.templateMode || 'MASTER'),
      appliedRuleName: appliedRuleNotice || undefined,
      isFocusBoard: isApprovedFocus,
      focusPrintMode: isYellowPaper ? 'YELLOW_PAPER' : undefined,
      starConfig: isApprovedFocus
        ? {
            visible: true,
            style: 'CLASSIC_5',
            position: 'TOP_RIGHT',
            sizePt: 56,
            color: '#000000',
          }
        : undefined,
      baseSp: baseCatalogueSp,
      hoFocusSp: approvedFocusSp,
    };

    // Apply visual layout override from named design if selected
    if (appliedLayoutOverride) {
      slotPayload.templateMode = 'CUSTOM';
      slotPayload.isManualLayout = true;
      slotPayload.customFontFamily = appliedLayoutOverride.customFontFamily;
      slotPayload.customFontWeight = appliedLayoutOverride.customFontWeight;
      slotPayload.customTextAlign = appliedLayoutOverride.customTextAlign;
      slotPayload.customBorderThicknessPt = appliedLayoutOverride.customBorderThicknessPt;
      slotPayload.customBorderStyle = appliedLayoutOverride.customBorderStyle;
      slotPayload.customPriceFontSizePt = appliedLayoutOverride.customPriceFontSizePt;
      slotPayload.customNameFontSizePt = appliedLayoutOverride.customNameFontSizePt;
      slotPayload.customPackFontSizePt = appliedLayoutOverride.customPackFontSizePt;
      slotPayload.customFooterFontSizePt = appliedLayoutOverride.customFooterFontSizePt;
      slotPayload.customSaveFontSizePt = appliedLayoutOverride.customSaveFontSizePt;
      slotPayload.customLetterSpacing = appliedLayoutOverride.customLetterSpacing;
      slotPayload.elementTransforms = appliedLayoutOverride.elementTransforms
        ? JSON.parse(JSON.stringify(appliedLayoutOverride.elementTransforms))
        : undefined;
      slotPayload.additionalTextBoxes = appliedLayoutOverride.additionalTextBoxes
        ? JSON.parse(JSON.stringify(appliedLayoutOverride.additionalTextBoxes))
        : undefined;
      slotPayload.textBacking = appliedLayoutOverride.textBacking;
      slotPayload.textShadow = appliedLayoutOverride.textShadow;
      slotPayload.hideProductName = appliedLayoutOverride.hideProductName;
      slotPayload.hidePackText = appliedLayoutOverride.hidePackText;
      slotPayload.hideFooter = appliedLayoutOverride.hideFooter;
    }

    // Smart Auto-Arrangement: If inside image is present, automatically configure collision-free positions
    if (uploadedImage && imagePlacementMode === 'INSIDE' && config) {
      const arranged = SmartLayoutEngine.autoArrangeContent(
        slotPayload as BoardSlot,
        config,
        insideImageArrangement
      );
      slotPayload.elementTransforms = arranged.elementTransforms;
      slotPayload.productImageWidthPct = arranged.productImageWidthPct;
    }

    // Save to Smart Product Design Memory
    if (selectedProduct && rememberDesign) {
      try {
        const designToSave: SavedProductDesign = {
          id: selectedProduct.code || selectedProduct.barcode,
          productCode: selectedProduct.code,
          productBarcode: selectedProduct.barcode,
          productName: selectedProduct.itemName,
          boardFormat: targetFormat,
          boardType,
          displayName: displayName.trim().toUpperCase(),
          packText: packText.trim().toUpperCase(),
          displaySp: spPrice,
          displayMrp: mrpPrice,
          displaySave: saveAmount,
          imageUrl: uploadedImage || undefined,
          imageFit,
          imagePlacementMode,
          insideImageArrangement,
          imageOpacity,
          templateMode: 'CUSTOM',
          savedAt: new Date().toISOString(),
        };
        await StorageService.saveProductDesign(designToSave);
      } catch (err) {
        console.error('Error saving product design memory:', err);
      }
    }

    onAddBoard(slotPayload, advanceToNext);

    if (!advanceToNext) {
      onClose();
    } else {
      resetForm();
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-neutral-900 text-white flex justify-between items-center">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {targetFormat} Format • Slot #{slotIndex + 1} of {totalSlots}
            </div>
            <h3 className="text-base font-black uppercase text-white mt-0.5">
              {isEditMode ? `Edit Slot #${slotIndex + 1}` : `Add Board to Slot #${slotIndex + 1}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Business Rule Notice Banner */}
          {appliedRuleNotice && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900 animate-in fade-in">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Applied Business Rule:</strong> {appliedRuleNotice}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                Customizable
              </span>
            </div>
          )}

          {/* AUTOMATIC FOCUS DETECTION BANNER (PRIORITY 2) */}
          {isFocusProduct && focusStatus === 'APPROVED' && (
            <div className="p-4 bg-amber-400 border-2 border-black rounded-xl text-black shadow-sm space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-black" />
                  <span className="font-black text-sm uppercase tracking-wide">
                    FOCUS PRODUCT DETECTED
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-black text-amber-400 font-mono text-[10px] font-black rounded uppercase">
                  ACTIVE HO PROMOTION
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-bold bg-amber-300/80 p-2.5 rounded-lg border border-black/20">
                <div>
                  <span className="text-[10px] text-neutral-800 uppercase block font-semibold">Focus SP</span>
                  <span className="text-base font-black text-black">₹{approvedFocusSp}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-800 uppercase block font-semibold">Focus Star</span>
                  <span className="text-emerald-950 font-black">
                    {isStarEnabled ? '★ ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-800 uppercase block font-semibold">Paper Mode</span>
                  <span className="text-emerald-950 font-black">
                    {isYellowPaper ? 'YELLOW PAPER' : 'WHITE PAPER'}
                  </span>
                </div>
              </div>

              {/* Manual Override Controls */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] font-black uppercase text-neutral-900">Overrides:</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isStarEnabled;
                    setIsStarEnabled(next);
                    setIsYellowPaper(next);
                    setFocusOverrideWarning(
                      next ? null : 'Styling override: Focus Star & Yellow mode disabled for this board slot.'
                    );
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-black border transition cursor-pointer ${
                    isStarEnabled
                      ? 'bg-black text-amber-400 border-black'
                      : 'bg-white text-black border-neutral-400'
                  }`}
                >
                  {isStarEnabled ? 'FOCUS ON' : 'FOCUS OFF'}
                </button>

                {approvedFocusSp && baseCatalogueSp && (
                  <button
                    type="button"
                    onClick={() => {
                      const useBase = spPrice === approvedFocusSp;
                      const targetPrice = useBase ? baseCatalogueSp : approvedFocusSp;
                      setSpPrice(targetPrice);
                      setSaveAmount(Math.max(0, mrpPrice - targetPrice));
                      setFocusOverrideWarning(
                        useBase
                          ? `Price override: Using Base SP ₹${baseCatalogueSp} instead of Approved Focus SP ₹${approvedFocusSp}. Approved campaign price is unchanged.`
                          : null
                      );
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-black bg-white hover:bg-neutral-100 text-black border border-black transition cursor-pointer"
                  >
                    {spPrice === approvedFocusSp
                      ? `USE BASE SP (₹${baseCatalogueSp})`
                      : `USE APPROVED FOCUS SP (₹${approvedFocusSp})`}
                  </button>
                )}
              </div>

              {focusOverrideWarning && (
                <div className="text-[11px] text-amber-950 font-bold bg-amber-200/90 p-2 rounded flex items-center gap-1.5 border border-amber-500/50">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-900 shrink-0" />
                  <span>{focusOverrideWarning}</span>
                </div>
              )}
            </div>
          )}

          {/* FOCUS PENDING WARNING BANNER */}
          {isFocusProduct && focusStatus === 'PENDING' && (
            <div className="p-3.5 bg-neutral-900 border-2 border-amber-500 rounded-xl text-white shadow-sm space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="font-black text-xs uppercase text-amber-400 tracking-wide">
                    FOCUS PRODUCT — PRICE APPROVAL PENDING
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-amber-500 text-black font-mono text-[9px] font-black rounded uppercase">
                  UNAPPROVED
                </span>
              </div>
              <p className="text-[11px] text-neutral-300">
                HO requested ₹{approvedFocusSp}, but it has not been approved in Focus Board management. Using standard Base SP ₹{baseCatalogueSp}.
              </p>
            </div>
          )}

          {/* Barcode Scanner / Product Search */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-700">
              Scan Barcode or Search Product Catalogue
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleScanKeyDown}
                  placeholder="Scan barcode, enter code, or type name (e.g. 13000113 or GALA)..."
                  className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Barcode className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>
              <button
                type="button"
                onClick={() => executeSearch(scanInput)}
                disabled={isSearching}
                className="px-4 py-2.5 bg-black hover:bg-neutral-800 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>
            </div>

            {notFoundMsg && (
              <p className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>No matching product found in catalogue. You can enter details manually below.</span>
              </p>
            )}
          </div>

          {/* Search Results Dropdown List with FOCUS BADGES */}
          {searchResults.length > 1 && !selectedProduct && (
            <div className="border border-neutral-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-neutral-100 bg-white shadow-sm">
              <div className="p-2 bg-neutral-100 text-[11px] font-bold text-neutral-600 sticky top-0 uppercase">
                Matching Catalogue Products ({searchResults.length}):
              </div>
              {searchResults.map((prod) => {
                const focusCheck = FocusDetectionService.checkProductFocusSync(prod, focusItems);
                const isApprovedFocus = focusCheck.isFocus && focusCheck.status === 'APPROVED';

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleProductSelect(prod)}
                    className="p-2.5 hover:bg-amber-50 cursor-pointer flex justify-between items-center text-xs transition"
                  >
                    <div>
                      <div className="font-black text-neutral-900 flex items-center gap-2">
                        <span>{prod.itemName}</span>
                        {focusCheck.isFocus && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-0.5 ${
                              isApprovedFocus
                                ? 'bg-amber-400 text-black border border-black'
                                : 'bg-neutral-200 text-neutral-700'
                            }`}
                          >
                            <Star className="w-2.5 h-2.5 fill-black" />
                            <span>
                              {isApprovedFocus ? `FOCUS — ₹${focusCheck.focusSp}` : 'FOCUS PENDING'}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500">
                        Code: {prod.code} • Barcode: {prod.barcode}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-black bg-amber-300 px-2 py-0.5 rounded">
                        SP: ₹{isApprovedFocus && focusCheck.focusSp ? focusCheck.focusSp : prod.retail}
                      </span>
                      <span className="text-[10px] text-neutral-500 block">MRP: ₹{prod.mrp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Product Card */}
          {selectedProduct && (
            <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider block">
                  Catalogue Item Linked
                </span>
                <span className="font-black text-sm text-neutral-900">{selectedProduct.itemName}</span>
                <span className="text-[11px] font-mono text-neutral-600 block">
                  Code: {selectedProduct.code} • Barcode: {selectedProduct.barcode} • Stock SP: ₹
                  {selectedProduct.retail} • MRP: ₹{selectedProduct.mrp}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setScanInput('');
                  setIsFocusProduct(false);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-900 font-bold underline cursor-pointer"
              >
                Change
              </button>
            </div>
          )}

          {/* Board Content Style Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-800 mb-2">
              Select Board Content Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBoardType('FINAL_PRICE')}
                className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
                  boardType === 'FINAL_PRICE'
                    ? 'border-black bg-black text-white shadow-sm'
                    : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <div className="font-black text-xs uppercase tracking-wide flex items-center justify-between">
                  <span>TYPE A: FINAL PRICE</span>
                  {boardType === 'FINAL_PRICE' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div
                  className={`text-[11px] mt-1 ${
                    boardType === 'FINAL_PRICE' ? 'text-neutral-300' : 'text-neutral-500'
                  }`}
                >
                  Large Prominent SP + &quot;ONLY&quot; + (FINAL PRICE ON THE PRODUCT)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBoardType('MRP_SAVE')}
                className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
                  boardType === 'MRP_SAVE'
                    ? 'border-black bg-black text-white shadow-sm'
                    : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <div className="font-black text-xs uppercase tracking-wide flex items-center justify-between">
                  <span>TYPE B: MRP + SAVE</span>
                  {boardType === 'MRP_SAVE' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div
                  className={`text-[11px] mt-1 ${
                    boardType === 'MRP_SAVE' ? 'text-neutral-300' : 'text-neutral-500'
                  }`}
                >
                  Prominent SP + &quot;(MRP:- ₹.../-  SAVE:- ₹.../-)&quot;
                </div>
              </button>
            </div>
          </div>

          {/* BOARD DESIGN (NAMED REUSABLE DESIGNS PICKER) */}
          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>BOARD DESIGN</span>
              </label>
              {designFeedbackMsg ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 animate-in fade-in">
                  ✓ {designFeedbackMsg}
                </span>
              ) : appliedLayoutOverride || (selectedDesignId && selectedDesignId !== 'MASTER' && selectedDesignId !== 'CUSTOM_CURRENT') ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  Custom Design Active
                </span>
              ) : null}
            </div>

            <div className="flex gap-2 items-center">
              <select
                value={selectedDesignId}
                onChange={(e) => {
                  setSelectedDesignId(e.target.value);
                  handleApplyBoardDesign(e.target.value);
                }}
                className="flex-1 bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {defaultDesignId && compatibleDesigns.some((d) => d.id === defaultDesignId) && (
                  <option value={defaultDesignId}>
                    ★ Default Design ({compatibleDesigns.find((d) => d.id === defaultDesignId)?.name})
                  </option>
                )}
                <option value="MASTER">
                  Default Template (Standard Layout)
                </option>
                {isEditMode && currentSlot?.templateMode === 'CUSTOM' && (
                  <option value="CUSTOM_CURRENT">Current Custom Board Layout</option>
                )}
                {compatibleDesigns
                  .filter((d) => d.id !== defaultDesignId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>

              <button
                type="button"
                onClick={() => handleApplyBoardDesign(selectedDesignId)}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-black text-amber-400 font-black rounded-lg text-xs transition cursor-pointer shrink-0 shadow-xs"
                title="Apply selected visual layout to this board"
              >
                Apply
              </button>
            </div>
            <p className="text-[10px] text-neutral-500">
              Only visual typography and element positions apply. Destination product name, SP, MRP, barcode, and offer type are preserved.
            </p>
          </div>

          {/* Editable Display Information */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Display Product Name (Bold Uppercase)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.toUpperCase())}
                placeholder="e.g. WOMEN RAZOR or SPANNER TOOLS"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm font-black uppercase tracking-tight focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Optional Pack / Set Text
                </label>
                <input
                  type="text"
                  value={packText}
                  onChange={(e) => setPackText(e.target.value.toUpperCase())}
                  placeholder="e.g. (6 PCS SET)"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-black uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Selling Price (SP) ₹
                </label>
                <input
                  type="number"
                  value={spPrice || ''}
                  onChange={(e) => setSpPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-amber-50 border border-amber-400 rounded-lg text-sm font-black text-black font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* MRP & SAVE Inputs (Active for TYPE B) */}
            {boardType === 'MRP_SAVE' && (
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                      MRP Price ₹
                    </label>
                    <input
                      type="number"
                      value={mrpPrice || ''}
                      onChange={(e) => setMrpPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded font-bold font-mono text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase">
                        Save Amount ₹
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSaveOverride(false);
                          setSaveAmount(Math.max(0, mrpPrice - spPrice));
                        }}
                        className="text-[9px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Auto Calc
                      </button>
                    </div>
                    <input
                      type="number"
                      value={saveAmount || ''}
                      onChange={(e) => {
                        setSaveOverride(true);
                        setSaveAmount(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded font-bold font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TWO SMART IMAGE PLACEMENT MODES */}
            <div className="pt-2 border-t border-neutral-200 space-y-3">
              <label className="block text-xs font-black uppercase text-neutral-800">
                Product Image &amp; Intelligent Layout
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {uploadedImage ? (
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-300 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={uploadedImage}
                      alt="Product"
                      className="w-16 h-16 object-contain bg-white rounded-lg border border-neutral-300 shadow-xs"
                    />
                    <div className="flex-1 text-xs">
                      <div className="font-bold text-neutral-900">Image Attached</div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] text-neutral-700 hover:text-black font-bold underline cursor-pointer"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadedImage(null)}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 font-mono block">Opacity</span>
                      <span className="text-xs font-mono font-bold text-amber-700">
                        {Math.round(imageOpacity * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImagePlacementMode('BACKGROUND');
                        setImageOpacity(1.0);
                      }}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                        imagePlacementMode === 'BACKGROUND'
                          ? 'border-black bg-black text-white font-bold'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="font-bold text-[11px] uppercase">MODE A: BACKGROUND</div>
                      <div className="text-[10px] text-neutral-400">Covers board background behind text</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setImagePlacementMode('INSIDE');
                        setImageOpacity(1.0);
                      }}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                        imagePlacementMode === 'INSIDE'
                          ? 'border-black bg-black text-white font-bold'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="font-bold text-[11px] uppercase">MODE B: INSIDE BOARD</div>
                      <div className="text-[10px] text-neutral-400">Smart region (no text overlap)</div>
                    </button>
                  </div>

                  {/* Inside Image Arrangement Options */}
                  {imagePlacementMode === 'INSIDE' && (
                    <div className="p-2.5 bg-white rounded-lg border border-neutral-200 space-y-2">
                      <span className="text-[11px] font-black uppercase text-neutral-800 block">
                        Intelligent Inside Arrangement:
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center text-xs font-bold">
                        {(['AUTO', 'TOP', 'LEFT', 'RIGHT', 'BOTTOM'] as InsideImageArrangement[]).map((arr) => (
                          <button
                            key={arr}
                            type="button"
                            onClick={() => setInsideImageArrangement(arr)}
                            className={`py-1.5 px-2 rounded-lg border transition cursor-pointer text-[11px] ${
                              insideImageArrangement === arr
                                ? 'bg-amber-400 border-amber-500 text-black font-black'
                                : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}
                          >
                            {arr}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opacity Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-neutral-700">
                      <span>Image Visibility / Opacity:</span>
                      <span className="font-mono">{Math.round(imageOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={imageOpacity}
                      onChange={(e) => setImageOpacity(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-700 transition cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-neutral-500" />
                  <span>+ INSERT IMAGE (PNG, JPG, WEBP)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-neutral-100 border-t border-neutral-200 flex flex-wrap justify-between items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-xl text-xs font-bold text-neutral-700 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2">
            {!isEditMode && slotIndex < totalSlots - 1 && (
              <button
                type="button"
                onClick={() => handleConfirmAdd(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-black text-amber-400 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                <span>Add &amp; Scan Next Slot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleConfirmAdd(false)}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs shadow-md transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEditMode ? `Save Changes to Slot #${slotIndex + 1}` : `Add to Slot #${slotIndex + 1}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
