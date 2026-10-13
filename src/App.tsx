import React, { useState, useEffect } from 'react';
import {
  AppSettings,
  BoardFormat,
  BoardSlot,
  ImportSummary,
  PrintHistoryItem,
  Product,
} from './types';
import { DEFAULT_TEMPLATE_CONFIGS } from './services/templateConfig';
import { StorageService } from './services/storage';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { StockReportView } from './components/StockReportView';
import { ProductsView } from './components/ProductsView';
import { BoardMakerView } from './components/BoardMakerView';
import { FocusBoardView } from './components/FocusBoardView';
import { PrintHistoryView } from './components/PrintHistoryView';
import { SettingsView } from './components/SettingsView';
import { RulesAutomationView } from './components/RulesAutomationView';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { A4PrintSheet } from './components/A4PrintSheet';
import { generateSampleStockWorkbook } from './services/sampleData';
import { ExcelImporter } from './services/excelImporter';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [settings, setSettings] = useState<AppSettings>({
    defaultFormat: '1/8',
    defaultBoardType: 'FINAL_PRICE',
    defaultFooterText: '(FINAL PRICE ON THE PRODUCT)',
    showMrpGlobal: false,
    storeName: 'RETAIL PROMOTIONS',
    templateConfigs: DEFAULT_TEMPLATE_CONFIGS,
  });

  const [currentFormat, setCurrentFormat] = useState<BoardFormat>('1/8');
  const [slots, setSlots] = useState<BoardSlot[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productCount, setProductCount] = useState<number>(0);
  const [latestImport, setLatestImport] = useState<ImportSummary | null>(null);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [focusCount, setFocusCount] = useState<number>(0);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const savedSettings = await StorageService.getSettings();
      setSettings(savedSettings);
      setCurrentFormat(savedSettings.defaultFormat || '1/8');
      const count = await StorageService.getProductCount();
      setProductCount(count);
      const prods = await StorageService.getAllProducts();
      setAllProducts(prods);
      const latest = await StorageService.getLatestImportSummary();
      setLatestImport(latest);
      const history = await StorageService.getPrintHistory();
      setHistoryCount(history.length);
      const focusItems = await StorageService.getFocusItems();
      setFocusCount(focusItems.length);
      initializeEmptySlots(savedSettings.defaultFormat || '1/8', savedSettings);
    } catch (err) {
      console.error('Initialization error:', err);
    }
  };

  const initializeEmptySlots = (format: BoardFormat, currentSet: AppSettings) => {
    const config = currentSet.templateConfigs[format] || DEFAULT_TEMPLATE_CONFIGS[format];
    const initialSlots: BoardSlot[] = Array.from({ length: config.slotsCount }, (_, i) => ({
      slotIndex: i,
      productId: null,
      product: null,
      displayName: '',
      packText: '',
      displaySp: 0,
      displayMrp: 0,
      displaySave: 0,
      boardType: currentSet.defaultBoardType || 'FINAL_PRICE',
      showMrp: false,
    }));
    setSlots(initialSlots);
  };

  const handleFormatChange = (newFormat: BoardFormat) => {
    setCurrentFormat(newFormat);
    const newConfig = settings.templateConfigs[newFormat] || DEFAULT_TEMPLATE_CONFIGS[newFormat];
    const updated: BoardSlot[] = [];
    for (let i = 0; i < newConfig.slotsCount; i++) {
      if (slots[i] && (slots[i].displayName || slots[i].product)) {
        updated.push({ ...slots[i], slotIndex: i });
      } else {
        updated.push({
          slotIndex: i,
          productId: null,
          product: null,
          displayName: '',
          packText: '',
          displaySp: 0,
          displayMrp: 0,
          displaySave: 0,
          boardType: settings.defaultBoardType || 'FINAL_PRICE',
          showMrp: false,
        });
      }
    }
    setSlots(updated);
  };

  const handleImportComplete = async (summary: ImportSummary) => {
    setLatestImport(summary);
    const prods = await StorageService.getAllProducts();
    setAllProducts(prods);
    setProductCount(prods.length);
    setActiveTab('products');
  };

  const handleCatalogueReset = async () => {
    await StorageService.clearAllProducts();
    setAllProducts([]);
    setProductCount(0);
    setLatestImport(null);
    initializeEmptySlots(currentFormat, settings);
  };

  const handleQuickLoadSample = async () => {
    try {
      const buffer = generateSampleStockWorkbook();
      const fakeFile = new File([buffer], 'SAMPLE_RETAIL_STOCK_REPORT.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const { products, summary } = await ExcelImporter.parseFile(
        fakeFile,
        fakeFile.name,
        fakeFile.size
      );
      const { added, updated } = await StorageService.upsertProducts(products);
      summary.productsAdded = added;
      summary.productsUpdated = updated;
      await StorageService.addImportSummary(summary);
      await handleImportComplete(summary);
    } catch (err) {
      console.error(err);
      alert('Error loading sample: ' + String(err));
    }
  };

  const handleAddProductToSlotFromCatalogue = async (prod: Product) => {
    const config = settings.templateConfigs[currentFormat] || DEFAULT_TEMPLATE_CONFIGS[currentFormat];
    const updated = [...slots];
    let targetIdx = updated.findIndex((s) => !s.product && !s.displayName);
    if (targetIdx === -1) targetIdx = 0;
    let suggestedPack = '';
    const packMatch = prod.itemName.match(/\((\d+\s*(?:PCS|SET|NOS)[^)]*)\)/i);
    if (packMatch) suggestedPack = packMatch[0].toUpperCase();
    
    // Logic for FocusDetection removed
    const isApprovedFocus = false;
    const effectiveSp = prod.retail;

    updated[targetIdx] = {
      slotIndex: targetIdx,
      productId: prod.id,
      product: prod,
      displayName: prod.itemName.toUpperCase(),
      packText: suggestedPack,
      displaySp: effectiveSp,
      displayMrp: prod.mrp,
      displaySave: Math.max(0, prod.mrp - effectiveSp),
      boardType: settings.defaultBoardType || 'FINAL_PRICE',
      showMrp: settings.showMrpGlobal,
      isFocusBoard: isApprovedFocus,
      baseSp: prod.retail,
    };
    setSlots(updated);
  };

  const handleSavePrintRecord = async () => {
    const filledNames = slots.filter((s) => s.displayName).map((s) => s.displayName).slice(0, 2).join(', ');
    const title = filledNames ? `${currentFormat} (${filledNames}${slots.length > 2 ? '...' : ''})` : `${currentFormat} Board Print`;
    const record: PrintHistoryItem = {
      id: 'print_' + Date.now(),
      timestamp: new Date().toISOString(),
      format: currentFormat,
      title,
      slots: [...slots],
      pageCount: 1,
    };
    await StorageService.savePrintHistory(record);
    const history = await StorageService.getPrintHistory();
    setHistoryCount(history.length);
  };

  const handleTriggerPrint = async () => {
    await handleSavePrintRecord();
    setTimeout(() => { window.print(); }, 150);
  };

  const handleLoadBoardFromHistory = (item: PrintHistoryItem) => {
    setCurrentFormat(item.format);
    setSlots(item.slots);
    setActiveTab('board-maker');
  };

  const handleQuickReprintFromHistory = async (item: PrintHistoryItem) => {
    setCurrentFormat(item.format);
    setSlots(item.slots);
    await handleSavePrintRecord();
    setTimeout(() => { window.print(); }, 150);
  };

  const activeConfig = settings.templateConfigs[currentFormat] || DEFAULT_TEMPLATE_CONFIGS[currentFormat];
  const hasBoardsReady = slots.some((s) => s.displayName || s.product);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-row font-sans text-neutral-900 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        productCount={productCount}
        lastImportFileName={latestImport?.fileName}
        onQuickPrintPreview={() => setIsPrintPreviewOpen(true)}
        hasBoardsReady={hasBoardsReady}
        focusCount={focusCount}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="flex-1 pb-16 no-print">
          {activeTab === 'dashboard' && (
            <DashboardView
              productCount={productCount}
              latestImport={latestImport}
              historyCount={historyCount}
              onNavigate={(tab) => setActiveTab(tab)}
              onQuickStartFormat={(fmt) => { handleFormatChange(fmt); setActiveTab('board-maker'); }}
              onLoadSampleData={handleQuickLoadSample}
            />
          )}
          {activeTab === 'stock-report' && (
            <StockReportView
              latestImport={latestImport}
              productCount={productCount}
              onImportComplete={handleImportComplete}
              onCatalogueReset={handleCatalogueReset}
              onNavigateToProducts={() => setActiveTab('products')}
              onNavigateToBoardMaker={() => setActiveTab('board-maker')}
            />
          )}
          {activeTab === 'products' && (
            <ProductsView
              onAddToBoardSlot={handleAddProductToSlotFromCatalogue}
              onNavigateToBoardMaker={() => setActiveTab('board-maker')}
            />
          )}
          {activeTab === 'board-maker' && (
            <BoardMakerView
              currentFormat={currentFormat}
              onChangeFormat={handleFormatChange}
              templateConfigs={settings.templateConfigs}
              slots={slots}
              onUpdateSlots={setSlots}
              onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
              onQuickPrint={handleTriggerPrint}
              allProducts={allProducts}
              onUpdateFormatConfig={(fmt, cfg) => {
                setSettings((prev) => ({
                  ...prev,
                  templateConfigs: { ...prev.templateConfigs, [fmt]: cfg },
                }));
              }}
            />
          )}
          {activeTab === 'focus-board' && (
            <FocusBoardView
              allProducts={allProducts}
              onSendBoardsToBoardMaker={(focusSlots, fmt) => { setCurrentFormat(fmt); setSlots(focusSlots); setActiveTab('board-maker'); }}
              onNavigateToBoardMaker={() => setActiveTab('board-maker')}
            />
          )}
          {activeTab === 'rules' && (
            <RulesAutomationView
              allProducts={allProducts}
              onNavigateToBoardMaker={() => setActiveTab('board-maker')}
            />
          )}
          {activeTab === 'history' && (
            <PrintHistoryView
              onLoadBoard={handleLoadBoardFromHistory}
              onQuickReprint={handleQuickReprintFromHistory}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={(newSettings) => { setSettings(newSettings); }}
            />
          )}
        </main>
      </div>
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        slots={slots}
        config={activeConfig}
        onPrintConfirmed={handleSavePrintRecord}
      />
      <div className="hidden print:block print-wrapper">
        <A4PrintSheet slots={slots} config={activeConfig} interactive={false} />
      </div>
    </div>
  );
}
