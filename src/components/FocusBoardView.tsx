import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Star,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Download,
  Printer,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  History,
  Sliders,
  Eye,
  Info,
  Calendar,
  Grid,
} from 'lucide-react';
import {
  AiAssistantPlan,
  BoardFormat,
  BoardSlot,
  BoardType,
  FocusApprovalStatus,
  FocusCampaign,
  FocusItem,
  FocusPrintMode,
  Product,
  StarConfig,
  StarPosition,
  StarStyle,
} from '../types';
import { StorageService } from '../services/storage';
import { stripLeadingZeros, normalizeIdentifier } from '../services/searchService';
import { FocusBoardRenderer } from './FocusBoardRenderer';
import { AiAssistantModal } from './AiAssistantModal';

import { DEFAULT_TEMPLATE_CONFIGS } from '../services/templateConfig';
import { generateSampleFocusWorkbook } from '../services/sampleData';

interface FocusBoardViewProps {
  allProducts: Product[];
  onSendBoardsToBoardMaker: (slots: BoardSlot[], format: BoardFormat) => void;
  onNavigateToBoardMaker: () => void;
}

export const FocusBoardView: React.FC<FocusBoardViewProps> = ({
  allProducts,
  onSendBoardsToBoardMaker,
  onNavigateToBoardMaker,
}) => {
  // Campaign & Items State
  const [campaigns, setCampaigns] = useState<FocusCampaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<FocusCampaign | null>(null);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [matchFilter, setMatchFilter] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL');

  // File Upload & Mapping Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [detectedSheets, setDetectedSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    codeCol: string;
    barcodeCol: string;
    nameCol: string;
    brandCol: string;
    hoPriceCol: string;
    mrpCol: string;
    effectiveDateCol: string;
  }>({
    codeCol: '',
    barcodeCol: '',
    nameCol: '',
    brandCol: '',
    hoPriceCol: '',
    mrpCol: '',
    effectiveDateCol: '',
  });
  const [campaignNameInput, setCampaignNameInput] = useState('');
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Focus Board Generation & Print Preview
  const [targetFormat, setTargetFormat] = useState<BoardFormat>('1/8');
  const [printMode, setPrintMode] = useState<FocusPrintMode>('YELLOW_PAPER');
  const [starConfig, setStarConfig] = useState<StarConfig>({
    visible: true,
    style: 'CLASSIC_5',
    position: 'TOP_RIGHT',
    sizePt: 56,
    color: '#000000',
  });
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewSlots, setPreviewSlots] = useState<BoardSlot[]>([]);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApplyAiPlan = (plan: AiAssistantPlan) => {
    if (plan.itemsToCreate.length > 0) {
      const generatedSlots: BoardSlot[] = plan.itemsToCreate.map((item, idx) => ({
        slotIndex: idx,
        productId: item.product?.id || null,
        product: item.product || null,
        displayName: (item.productName || item.product?.itemName || `FOCUS PROMO ₹${item.price}`).toUpperCase(),
        packText: (item.packText || '').toUpperCase(),
        displaySp: item.price,
        displayMrp: item.product?.mrp || Math.round(item.price * 1.25),
        displaySave: item.product ? Math.max(0, item.product.mrp - item.price) : Math.round(item.price * 0.25),
        boardType: plan.boardType,
        showMrp: false,
        isFocusBoard: true,
        starConfig: { ...starConfig },
        focusPrintMode: printMode,
      }));
      onSendBoardsToBoardMaker(generatedSlots, plan.targetFormat);
      showFeedback(`AI Plan applied! Generated ${generatedSlots.length} boards in ${plan.targetFormat}.`);
    }
  };

  // Load existing campaigns on mount
  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    const list = await StorageService.getFocusCampaigns();
    setCampaigns(list);
    if (list.length > 0) {
      const active = list.find((c) => c.status === 'ACTIVE') || list[0];
      setActiveCampaign(active);
      loadCampaignItems(active.id);
    } else {
      setActiveCampaign(null);
      setFocusItems([]);
    }
  };

  const loadCampaignItems = async (campaignId: string) => {
    const items = await StorageService.getFocusItems(campaignId);
    setFocusItems(items);
    setSelectedItemIds(new Set());
  };

  const showFeedback = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // -------------------------------------------------------------
  // File Upload & Column Auto-Detection
  // -------------------------------------------------------------
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    const dateStr = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
    setCampaignNameInput(`HO FOCUS PROMO — ${dateStr.toUpperCase()}`);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      setDetectedSheets(sheetNames);
      const firstSheet = sheetNames[0];
      setSelectedSheet(firstSheet);

      parseSheetHeadersAndPreview(workbook, firstSheet);
      setIsUploadModalOpen(true);
    } catch (err) {
      alert('Error parsing Focus file: ' + String(err));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseSheetHeadersAndPreview = (workbook: XLSX.WorkBook, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (json.length === 0) return;

    // Find the header row (first row with >= 3 non-empty strings)
    let headerIdx = 0;
    for (let r = 0; r < Math.min(json.length, 10); r++) {
      const nonEmpties = (json[r] || []).filter((c) => typeof c === 'string' && c.trim().length > 0);
      if (nonEmpties.length >= 3) {
        headerIdx = r;
        break;
      }
    }

    const headers = (json[headerIdx] || []).map((h, i) => (h ? String(h).trim() : `Column_${i + 1}`));
    setSheetHeaders(headers);

    // Get sample rows
    const dataRows = json.slice(headerIdx + 1, headerIdx + 101).map((row) => {
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] !== undefined ? row[idx] : '';
      });
      return obj;
    });
    setRawRows(dataRows);

    // Auto-detect columns
    const findCol = (keywords: string[]) => {
      return (
        headers.find((h) => {
          const upper = h.toUpperCase();
          return keywords.some((kw) => upper.includes(kw));
        }) || ''
      );
    };

    setColumnMapping({
      codeCol: findCol(['CODE', 'ITEM CODE', 'SKU', 'ARTICLE', 'PRODUCT CODE']),
      barcodeCol: findCol(['BARCODE', 'EAN', 'UPC']),
      nameCol: findCol(['NAME', 'ITEM NAME', 'PRODUCT', 'DESCRIPTION', 'ITEM']),
      brandCol: findCol(['BRAND', 'MANUFACTURER', 'MFR', 'MAKE']),
      hoPriceCol: findCol(['FOCUS', 'HO PRICE', 'OFFER', 'PROMO', 'NEW SP', 'SELLING PRICE', 'SP', 'RATE', 'PRICE']),
      mrpCol: findCol(['MRP', 'MAX RETAIL']),
      effectiveDateCol: findCol(['DATE', 'EFFECTIVE', 'START']),
    });
  };

  // -------------------------------------------------------------
  // Process and Match Focus File against Catalogue
  // -------------------------------------------------------------
  const handleConfirmImport = async () => {
    if (!uploadFile || !columnMapping.nameCol || !columnMapping.hoPriceCol) {
      alert('Please map at least Product Name and HO Selling Price columns.');
      return;
    }

    setIsProcessingUpload(true);
    try {
      const buffer = await uploadFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[selectedSheet];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Index catalogue by code, barcode, and stripped code
      const productByCode = new Map<string, Product>();
      const productByBarcode = new Map<string, Product>();
      const productByStripped = new Map<string, Product>();

      allProducts.forEach((p) => {
        if (p.code) {
          productByCode.set(p.code.toUpperCase().trim(), p);
          productByStripped.set(stripLeadingZeros(normalizeIdentifier(p.code)).toLowerCase(), p);
        }
        if (p.barcode) {
          productByBarcode.set(p.barcode.toUpperCase().trim(), p);
          productByStripped.set(stripLeadingZeros(normalizeIdentifier(p.barcode)).toLowerCase(), p);
        }
      });

      const campaignId = `focus_${Date.now()}`;
      const nowIso = new Date().toISOString();
      const items: FocusItem[] = [];

      let matchedCount = 0;
      let unmatchedCount = 0;

      json.forEach((row, idx) => {
        const rawCode = String(row[columnMapping.codeCol] || '').trim();
        const rawBarcode = String(row[columnMapping.barcodeCol] || '').trim();
        const rawName = String(row[columnMapping.nameCol] || '').trim();
        const rawBrand = String(row[columnMapping.brandCol] || '').trim();
        const rawHoPrice = parseFloat(String(row[columnMapping.hoPriceCol] || '0').replace(/[^\d.]/g, ''));
        const rawMrp = parseFloat(String(row[columnMapping.mrpCol] || '0').replace(/[^\d.]/g, ''));
        const rawDate = String(row[columnMapping.effectiveDateCol] || '').trim();

        if (!rawName && !rawCode && isNaN(rawHoPrice)) return;

        // Perform matching hierarchy:
        let matchedProduct: Product | undefined;
        let matchStatus: FocusItem['matchStatus'] = 'UNMATCHED';

        if (rawCode && productByCode.has(rawCode.toUpperCase())) {
          matchedProduct = productByCode.get(rawCode.toUpperCase());
          matchStatus = 'MATCHED_EXACT_CODE';
        } else if (rawBarcode && productByBarcode.has(rawBarcode.toUpperCase())) {
          matchedProduct = productByBarcode.get(rawBarcode.toUpperCase());
          matchStatus = 'MATCHED_BARCODE';
        } else if (rawCode) {
          const stripped = stripLeadingZeros(normalizeIdentifier(rawCode)).toLowerCase();
          if (productByStripped.has(stripped)) {
            matchedProduct = productByStripped.get(stripped);
            matchStatus = 'MATCHED_NORMALIZED';
          }
        }

        // Fallback candidate search
        if (!matchedProduct && rawName) {
          const nameUpper = rawName.toUpperCase();
          const candidate = allProducts.find((p) => p.itemName.toUpperCase() === nameUpper);
          if (candidate) {
            matchedProduct = candidate;
            matchStatus = 'MANUAL_MATCH'; // Flagged for manual confirmation!
          }
        }

        if (matchedProduct) {
          matchedCount++;
        } else {
          unmatchedCount++;
        }

        const currentBaseSp = matchedProduct ? matchedProduct.retail : 0;
        const currentMrp = rawMrp > 0 ? rawMrp : matchedProduct ? matchedProduct.mrp : 0;
        const difference = rawHoPrice - currentBaseSp;

        items.push({
          id: `${campaignId}_item_${idx + 1}`,
          campaignId,
          productCode: rawCode || matchedProduct?.code || `HO-${idx + 1}`,
          barcode: rawBarcode || matchedProduct?.barcode || '',
          productName: rawName || matchedProduct?.itemName || '',
          brand: rawBrand || matchedProduct?.brand || '',
          category: matchedProduct?.category || '',
          currentBaseSp,
          hoFocusSp: isNaN(rawHoPrice) ? 0 : rawHoPrice,
          difference,
          mrp: currentMrp,
          effectiveSp: rawHoPrice,
          effectiveDate: rawDate || undefined,
          matchStatus,
          approvalStatus: 'PENDING',
          boardStatus: 'PENDING',
          matchedProductId: matchedProduct?.id,
        });
      });

      const campaign: FocusCampaign = {
        id: campaignId,
        name: campaignNameInput.trim() || `HO FOCUS BATCH ${new Date().toLocaleDateString()}`,
        monthYear: new Date().toISOString().slice(0, 7),
        uploadedAt: nowIso,
        fileName: uploadFile.name,
        totalProducts: items.length,
        matchedCount,
        unmatchedCount,
        approvedCount: 0,
        status: 'ACTIVE',
        columnMapping: columnMapping as any,
      };

      await StorageService.saveFocusCampaign(campaign);
      await StorageService.saveFocusItems(items);

      setIsUploadModalOpen(false);
      setUploadFile(null);
      await loadCampaigns();
      showFeedback(`Successfully imported "${campaign.name}" with ${items.length} products (${matchedCount} matched)`);
    } catch (err) {
      alert('Failed to process Focus import: ' + String(err));
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // -------------------------------------------------------------
  // Price Approval Actions
  // -------------------------------------------------------------
  const handleApproveSelected = async () => {
    if (!activeCampaign || selectedItemIds.size === 0) return;
    await StorageService.batchUpdateFocusApproval(activeCampaign.id, Array.from(selectedItemIds), 'APPROVED');
    await loadCampaignItems(activeCampaign.id);
    await loadCampaigns();
    showFeedback(`Approved ${selectedItemIds.size} Focus prices`);
  };

  const handleApproveAllValidMatches = async () => {
    if (!activeCampaign) return;
    const validMatches = focusItems
      .filter((it) => it.matchStatus !== 'UNMATCHED' && it.hoFocusSp > 0)
      .map((it) => it.id);

    if (validMatches.length === 0) {
      alert('No matched products available to approve.');
      return;
    }

    await StorageService.batchUpdateFocusApproval(activeCampaign.id, validMatches, 'APPROVED');
    await loadCampaignItems(activeCampaign.id);
    await loadCampaigns();
    showFeedback(`Approved all ${validMatches.length} valid matched Focus prices!`);
  };

  const handleRejectSelected = async () => {
    if (!activeCampaign || selectedItemIds.size === 0) return;
    await StorageService.batchUpdateFocusApproval(activeCampaign.id, Array.from(selectedItemIds), 'REJECTED');
    await loadCampaignItems(activeCampaign.id);
    await loadCampaigns();
    showFeedback(`Rejected ${selectedItemIds.size} Focus prices`);
  };

  const handleExportPriceChangeList = () => {
    if (!activeCampaign || focusItems.length === 0) return;

    const exportRows = focusItems.map((it) => ({
      'Product Code': it.productCode,
      'Barcode': it.barcode,
      'Product Name': it.productName,
      'Brand': it.brand,
      'Current SP (Base)': it.currentBaseSp,
      'HO Focus SP': it.hoFocusSp,
      'Difference (INR)': it.difference,
      'MRP': it.mrp,
      'Approval Status': it.approvalStatus,
      'Match Status': it.matchStatus,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HO_Price_Changes');
    XLSX.writeFile(wb, `${activeCampaign.name.replace(/\s+/g, '_')}_Price_Changes.xlsx`);
    showFeedback('Exported price change list to Excel');
  };

  // -------------------------------------------------------------
  // Focus Board Generation
  // -------------------------------------------------------------
  const handleGenerateFocusBoards = (filterMode: 'APPROVED' | 'ALL_MATCHED' | 'SELECTED') => {
    let targetItems = focusItems;

    if (filterMode === 'SELECTED') {
      targetItems = focusItems.filter((i) => selectedItemIds.has(i.id));
      if (targetItems.length === 0) {
        alert('Please select at least one product using checkboxes.');
        return;
      }
    } else if (filterMode === 'APPROVED') {
      targetItems = focusItems.filter((i) => i.approvalStatus === 'APPROVED');
      if (targetItems.length === 0) {
        alert('No approved products found. Please approve prices first or choose "All Matched".');
        return;
      }
    } else {
      targetItems = focusItems.filter((i) => i.matchStatus !== 'UNMATCHED');
    }

    if (targetItems.length === 0) {
      alert('No eligible products found for Focus Board generation.');
      return;
    }

    const slots: BoardSlot[] = targetItems.map((item, idx) => {
      const sp = item.effectiveSp || item.hoFocusSp;
      const bType: BoardType = item.mrp > sp ? 'MRP_SAVE' : 'FINAL_PRICE';
      return {
        slotIndex: idx,
        productId: item.matchedProductId || null,
        displayName: item.productName.toUpperCase(),
        packText: '',
        displaySp: sp,
        displayMrp: item.mrp,
        displaySave: item.mrp > sp ? item.mrp - sp : 0,
        boardType: bType,
        showMrp: item.mrp > sp,
        isFocusBoard: true,
        focusCampaignId: activeCampaign?.id,
        focusPrintMode: printMode,
        starConfig: { ...starConfig },
        baseSp: item.currentBaseSp,
        hoFocusSp: item.hoFocusSp,
      };
    });

    setPreviewSlots(slots);
    setIsPreviewModalOpen(true);
  };

  const handleSendToBoardMaker = () => {
    if (previewSlots.length === 0) return;
    onSendBoardsToBoardMaker(previewSlots, targetFormat);
    setIsPreviewModalOpen(false);
    onNavigateToBoardMaker();
  };

  // Filtered display items
  const filteredItems = focusItems.filter((item) => {
    if (statusFilter !== 'ALL' && item.approvalStatus !== statusFilter) return false;
    if (matchFilter === 'MATCHED' && item.matchStatus === 'UNMATCHED') return false;
    if (matchFilter === 'UNMATCHED' && item.matchStatus !== 'UNMATCHED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.productName.toLowerCase().includes(q);
      const matchCode = item.productCode.toLowerCase().includes(q);
      const matchBrand = item.brand.toLowerCase().includes(q);
      const matchBarcode = item.barcode.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchBrand && !matchBarcode) return false;
    }

    return true;
  });

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((i) => selectedItemIds.has(i.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Feedback Banner */}
      {feedbackNotice && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-md flex items-center justify-between font-semibold text-sm animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{feedbackNotice}</span>
          </div>
          <button onClick={() => setFeedbackNotice(null)} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Campaign Selector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-black px-2 py-0.5 rounded text-xs font-black tracking-wider flex items-center space-x-1">
                <Star className="h-3.5 w-3.5 fill-black" />
                <span>HO MONTHLY FOCUS BOARD</span>
              </span>
              <span className="bg-neutral-800 text-neutral-300 text-xs px-2 py-0.5 rounded font-mono">
                YELLOW PAPER & STAR STUDIO
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Monthly Head Office Focus System
            </h1>
            <p className="text-sm text-neutral-400 max-w-2xl">
              Import HO monthly focus price files (XLSX, XLS, CSV), compare against stock catalogue Base SP, safely approve HO promotional prices, and generate yellow-paper star promotional boards.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0 flex-wrap gap-y-2">
            <button
              onClick={() => setIsAiAssistantOpen(true)}
              className="bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold px-3.5 py-2.5 rounded-lg border border-neutral-700 flex items-center space-x-1.5 text-sm transition cursor-pointer shadow-xs"
              title="Open AI Assistant for natural language board generation"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>AI ASSISTANT</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-4 py-2.5 rounded-lg shadow flex items-center space-x-2 text-sm transition cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>UPLOAD HO FOCUS FILE</span>
            </button>

            {campaigns.length > 0 && (
              <select
                value={activeCampaign?.id || ''}
                onChange={(e) => {
                  const camp = campaigns.find((c) => c.id === e.target.value);
                  if (camp) {
                    setActiveCampaign(camp);
                    loadCampaignItems(camp.id);
                  }
                }}
                className="bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({new Date(c.uploadedAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Campaign Metrics Cards */}
        {activeCampaign && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-neutral-800 text-xs">
            <div className="bg-neutral-800/60 rounded-lg p-3">
              <span className="text-neutral-400 block font-semibold">TOTAL PRODUCTS</span>
              <span className="text-xl font-black text-white">{activeCampaign.totalProducts}</span>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-3">
              <span className="text-emerald-400 block font-semibold">MATCHED IN STOCK</span>
              <span className="text-xl font-black text-emerald-300">{activeCampaign.matchedCount}</span>
            </div>
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-3">
              <span className="text-amber-400 block font-semibold">APPROVED PRICES</span>
              <span className="text-xl font-black text-amber-300">{activeCampaign.approvedCount}</span>
            </div>
            <div className="bg-neutral-800/60 rounded-lg p-3">
              <span className="text-neutral-400 block font-semibold">PENDING APPROVAL</span>
              <span className="text-xl font-black text-neutral-300">
                {focusItems.filter((i) => i.approvalStatus === 'PENDING').length}
              </span>
            </div>
            <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-3">
              <span className="text-red-400 block font-semibold">UNMATCHED SKUS</span>
              <span className="text-xl font-black text-red-300">{activeCampaign.unmatchedCount}</span>
            </div>
            <div className="bg-neutral-800/60 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-neutral-400 block font-semibold">FILE SOURCE</span>
              <span className="font-mono text-neutral-300 truncate" title={activeCampaign.fileName}>
                {activeCampaign.fileName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice Banner */}
      <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-3.5 text-xs text-blue-200 flex items-start space-x-3">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white">Price Safety Guarantee:</strong> HO Focus prices are evaluated separately from the Stock Report's BASE SP. Base retail prices are never silently overwritten. Approving an HO Focus price activates the promo price specifically for Focus Boards and exports a safe POS price-change list.
        </div>
      </div>

      {/* Main Focus Table & Workflow Controls */}
      {activeCampaign ? (
        <div className="bg-white rounded-xl shadow border border-neutral-200 overflow-hidden space-y-4 p-5">
          {/* Action Toolbars */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
            {/* Search and Filters */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <div className="relative min-w-[220px]">
                <Search className="h-4 w-4 text-neutral-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search code, name, brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-neutral-300 rounded-lg text-xs w-full focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Approval Status</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved Only</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={matchFilter}
                onChange={(e) => setMatchFilter(e.target.value as any)}
                className="border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Match Types</option>
                <option value="MATCHED">Matched In Catalogue</option>
                <option value="UNMATCHED">Unmatched</option>
              </select>
            </div>

            {/* Approval & Board Generation Actions */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <button
                onClick={handleApproveSelected}
                disabled={selectedItemIds.size === 0}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Approve Selected ({selectedItemIds.size})</span>
              </button>

              <button
                onClick={handleApproveAllValidMatches}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-400 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Approve All Matched</span>
              </button>

              <button
                onClick={handleRejectSelected}
                disabled={selectedItemIds.size === 0}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 disabled:opacity-50 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reject</span>
              </button>

              <button
                onClick={handleExportPriceChangeList}
                className="px-3 py-1.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-800 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export List</span>
              </button>

              <button
                onClick={() => handleGenerateFocusBoards('APPROVED')}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs shadow flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Star className="h-3.5 w-3.5 fill-black" />
                <span>GENERATE FOCUS BOARDS</span>
              </button>
            </div>
          </div>

          {/* Price Comparison Table */}
          <div className="overflow-x-auto border border-neutral-200 rounded-lg">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-100 text-neutral-800 uppercase font-black text-[11px] border-b border-neutral-200">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-neutral-300 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Product Code</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Brand</th>
                  <th className="p-3 text-right">Base SP</th>
                  <th className="p-3 text-right text-amber-700 bg-amber-50">HO Focus SP</th>
                  <th className="p-3 text-right">Diff</th>
                  <th className="p-3 text-right">MRP</th>
                  <th className="p-3 text-center">Match Status</th>
                  <th className="p-3 text-center">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-medium">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-neutral-400 font-semibold">
                      No Focus products match your search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = selectedItemIds.has(item.id);
                    const isHoAboveMrp = item.mrp > 0 && item.hoFocusSp > item.mrp;
                    const isNoChange = item.currentBaseSp > 0 && item.hoFocusSp === item.currentBaseSp;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-amber-50/40 transition ${
                          isSelected ? 'bg-amber-50/70' : ''
                        }`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(item.id)}
                            className="rounded border-neutral-300 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-neutral-900">{item.productCode}</td>
                        <td className="p-3 font-bold text-neutral-900 max-w-xs truncate" title={item.productName}>
                          {item.productName}
                          {isHoAboveMrp && (
                            <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-black">
                              EXCEEDS MRP!
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-neutral-600 uppercase font-semibold">{item.brand || '—'}</td>
                        <td className="p-3 text-right font-mono font-bold text-neutral-700">
                          ₹{item.currentBaseSp > 0 ? item.currentBaseSp : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-amber-900 bg-amber-50 text-sm">
                          ₹{item.hoFocusSp}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          {isNoChange ? (
                            <span className="text-neutral-400">₹0</span>
                          ) : item.difference < 0 ? (
                            <span className="text-emerald-600 font-black">-₹{Math.abs(item.difference)}</span>
                          ) : (
                            <span className="text-red-600">+₹{item.difference}</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-neutral-600">
                          {item.mrp > 0 ? `₹${item.mrp}` : '—'}
                        </td>
                        <td className="p-3 text-center">
                          {item.matchStatus === 'MATCHED_EXACT_CODE' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              EXACT CODE
                            </span>
                          ) : item.matchStatus === 'MATCHED_BARCODE' ? (
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              BARCODE
                            </span>
                          ) : item.matchStatus === 'MATCHED_NORMALIZED' ? (
                            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              NORMALIZED
                            </span>
                          ) : item.matchStatus === 'MANUAL_MATCH' ? (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              NAME CANDIDATE
                            </span>
                          ) : (
                            <span className="bg-neutral-200 text-neutral-700 text-[10px] font-bold px-2 py-0.5 rounded">
                              UNMATCHED
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.approvalStatus === 'APPROVED' ? (
                            <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                              APPROVED
                            </span>
                          ) : item.approvalStatus === 'REJECTED' ? (
                            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                              REJECTED
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded">
                              PENDING
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-neutral-300 space-y-4">
          <div className="h-16 w-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Star className="h-8 w-8 fill-amber-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black uppercase text-neutral-900">
              No Active Monthly Focus Campaign
            </h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Upload your Head Office monthly Focus file (Excel or CSV) to compare selling prices, approve updates, and batch-print yellow Focus promotional boards with prominent stars.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-6 py-2.5 rounded-lg shadow inline-flex items-center space-x-2 text-sm transition cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>Upload HO Focus File Now</span>
          </button>
        </div>
      )}

      {/* Upload & Column Mapping Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-amber-400" />
                <h3 className="font-extrabold text-sm uppercase">HO Focus File Column Mapping</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="block font-bold text-neutral-800 mb-1">Campaign Batch Name</label>
                <input
                  type="text"
                  value={campaignNameInput}
                  onChange={(e) => setCampaignNameInput(e.target.value)}
                  className="w-full border border-neutral-300 rounded px-3 py-1.5 font-bold text-sm"
                  placeholder="e.g. HO FOCUS PROMO — OCT 2026"
                />
              </div>

              {detectedSheets.length > 1 && (
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Select Sheet</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => {
                      setSelectedSheet(e.target.value);
                      if (uploadFile) {
                        uploadFile.arrayBuffer().then((buf) => {
                          const wb = XLSX.read(buf, { type: 'array' });
                          parseSheetHeadersAndPreview(wb, e.target.value);
                        });
                      }
                    }}
                    className="w-full border border-neutral-300 rounded px-3 py-1.5 font-semibold"
                  >
                    {detectedSheets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Product Code Column</label>
                  <select
                    value={columnMapping.codeCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, codeCol: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-2.5 py-1.5"
                  >
                    <option value="">-- None / Skip --</option>
                    {sheetHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Barcode Column</label>
                  <select
                    value={columnMapping.barcodeCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, barcodeCol: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-2.5 py-1.5"
                  >
                    <option value="">-- None / Skip --</option>
                    {sheetHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Product Name Column *</label>
                  <select
                    value={columnMapping.nameCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, nameCol: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-2.5 py-1.5 font-bold"
                  >
                    <option value="">-- Select Name Column --</option>
                    {sheetHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Brand Column</label>
                  <select
                    value={columnMapping.brandCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, brandCol: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-2.5 py-1.5"
                  >
                    <option value="">-- None / Skip --</option>
                    {sheetHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1">HO Focus Selling Price (SP) *</label>
                  <select
                    value={columnMapping.hoPriceCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, hoPriceCol: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-2.5 py-1.5 font-bold text-amber-900 bg-amber-50"
                  >
                    <option value="">-- Select HO Price Column --</option>
                    {sheetHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1">MRP Column</label>
                  <select
                    value={columnMapping.mrpCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, mrpCol: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-2.5 py-1.5"
                  >
                    <option value="">-- None / Skip --</option>
                    {sheetHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sample Data Preview */}
              {rawRows.length > 0 && (
                <div className="pt-3 border-t border-neutral-200">
                  <span className="font-bold text-neutral-700 block mb-1">
                    First 3 Sample Records in Uploaded File:
                  </span>
                  <div className="bg-neutral-50 rounded p-2 overflow-x-auto border border-neutral-200 font-mono text-[10px]">
                    <pre>{JSON.stringify(rawRows.slice(0, 3), null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 border border-neutral-300 rounded text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isProcessingUpload || !columnMapping.nameCol || !columnMapping.hoPriceCol}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded font-black text-xs shadow flex items-center space-x-2 cursor-pointer"
              >
                {isProcessingUpload ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Matching Products...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Import & Match Focus Batch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Focus Board Generation & Print Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                <div>
                  <h3 className="font-black text-sm uppercase">Focus Board Batch Generator</h3>
                  <span className="text-[10px] text-neutral-400">
                    {previewSlots.length} Focus promotional boards ready
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Controls Bar */}
            <div className="p-3 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                {/* Print Mode Selector */}
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-neutral-700">Print Mode:</span>
                  <button
                    onClick={() => setPrintMode('YELLOW_PAPER')}
                    className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                      printMode === 'YELLOW_PAPER'
                        ? 'bg-neutral-900 text-amber-400 shadow'
                        : 'bg-white text-neutral-700 border border-neutral-300'
                    }`}
                  >
                    Mode A: Yellow Paper
                  </button>
                  <button
                    onClick={() => setPrintMode('PRINT_YELLOW_BACKGROUND')}
                    className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                      printMode === 'PRINT_YELLOW_BACKGROUND'
                        ? 'bg-[#FFE600] text-black border border-black shadow'
                        : 'bg-white text-neutral-700 border border-neutral-300'
                    }`}
                  >
                    Mode B: Print Yellow Fill
                  </button>
                </div>

                {/* Star Style Selector */}
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-neutral-700">Star Style:</span>
                  <select
                    value={starConfig.style}
                    onChange={(e) => setStarConfig({ ...starConfig, style: e.target.value as StarStyle })}
                    className="border border-neutral-300 bg-white rounded px-2 py-1 font-semibold cursor-pointer"
                  >
                    <option value="CLASSIC_5">Classic 5-Point Star</option>
                    <option value="BURST_8">8-Point Star</option>
                    <option value="RETAIL_12">12-Point Retail Burst</option>
                    <option value="STAR_BADGE">HO Focus Badge</option>
                  </select>
                </div>

                {/* Star Position */}
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-neutral-700">Star Position:</span>
                  <select
                    value={starConfig.position}
                    onChange={(e) => setStarConfig({ ...starConfig, position: e.target.value as StarPosition })}
                    className="border border-neutral-300 bg-white rounded px-2 py-1 font-semibold cursor-pointer"
                  >
                    <option value="TOP_RIGHT">Top Right</option>
                    <option value="TOP_LEFT">Top Left</option>
                    <option value="BOTTOM_RIGHT">Bottom Right</option>
                  </select>
                </div>

                {/* Target Format */}
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-neutral-700">Format:</span>
                  <select
                    value={targetFormat}
                    onChange={(e) => setTargetFormat(e.target.value as BoardFormat)}
                    className="border border-neutral-300 bg-white rounded px-2 py-1 font-bold cursor-pointer"
                  >
                    <option value="1/8">1/8 (8 per A4)</option>
                    <option value="1/4">1/4 (4 per A4)</option>
                    <option value="1/2">1/2 (2 per A4)</option>
                    <option value="1/1">1/1 (Full A4)</option>
                    <option value="1/3">1/3 (3 per A4)</option>
                    <option value="ROUND">Round Oval</option>
                    <option value="NOTEBOOK">Notebook 1</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setStarConfig({ ...starConfig, visible: !starConfig.visible })}
                className={`px-2.5 py-1 rounded font-bold text-xs cursor-pointer ${
                  starConfig.visible ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {starConfig.visible ? 'Star: ON' : 'Star: OFF'}
              </button>
            </div>

            {/* Board Previews Grid */}
            <div className="p-6 overflow-y-auto flex-1 bg-neutral-200/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {previewSlots.slice(0, 12).map((slot, idx) => (
                  <div
                    key={idx}
                    className="h-64 rounded shadow-md overflow-hidden bg-white"
                  >
                    <FocusBoardRenderer
                      slot={{
                        ...slot,
                        focusPrintMode: printMode,
                        starConfig,
                      }}
                      printMode={printMode}
                      starConfig={starConfig}
                    />
                  </div>
                ))}
              </div>
              {previewSlots.length > 12 && (
                <div className="text-center py-4 text-xs font-semibold text-neutral-500">
                  + {previewSlots.length - 12} more boards in batch
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 bg-white flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-medium">
                {printMode === 'YELLOW_PAPER'
                  ? 'Mode A: White background (print directly onto yellow cardstock).'
                  : 'Mode B: Full yellow fill (print onto standard white paper).'}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleSendToBoardMaker}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded text-xs shadow flex items-center space-x-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Send to Board Maker & Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        currentFormat={targetFormat}
        slots={previewSlots}
        allProducts={allProducts}
        onApplyPlan={handleApplyAiPlan}
      />
    </div>
  );
};
