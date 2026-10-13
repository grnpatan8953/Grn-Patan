import React from 'react';
import {
  FileSpreadsheet,
  Grid,
  Layers,
  History,
  CheckCircle2,
  HardDrive,
  Upload,
  ArrowRight,
  ShieldCheck,
  Tag,
  Zap,
} from 'lucide-react';
import { BoardFormat, ImportSummary } from '../types';

interface DashboardViewProps {
  productCount: number;
  latestImport: ImportSummary | null;
  historyCount: number;
  onNavigate: (tab: 'stock-report' | 'products' | 'board-maker' | 'history' | 'settings') => void;
  onQuickStartFormat: (format: BoardFormat) => void;
  onLoadSampleData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  productCount,
  latestImport,
  historyCount,
  onNavigate,
  onQuickStartFormat,
  onLoadSampleData,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Welcome & Top Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-sm text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Retail Store Operations Mode • Local-First IndexedDB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            Promotional Price Board Studio
          </h1>
          <p className="text-neutral-300 text-sm mt-1 max-w-2xl">
            Create exact, pixel-accurate A4 retail promotional price boards for{' '}
            <span className="text-amber-400 font-bold">NON CORE</span> stock items. Direct Excel
            import with strict <span className="underline decoration-amber-400 font-bold">RETAIL = SP</span> and{' '}
            <span className="underline decoration-amber-400 font-bold">MRP = MRP</span> rules.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => onNavigate('stock-report')}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-5 py-2.5 rounded-lg text-sm shadow transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Stock Report</span>
          </button>
          {productCount === 0 && (
            <button
              onClick={onLoadSampleData}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/40 font-bold px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Load Sample Stock (100+ Items)</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: NON CORE Products */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">NON CORE Products</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-neutral-900 tracking-tight">
            {productCount.toLocaleString()}
          </div>
          <div className="text-xs text-neutral-500 mt-2 flex items-center justify-between">
            <span>Catalogue ready</span>
            <span className="text-amber-600 font-bold flex items-center">
              View <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Metric 2: Last Imported File */}
        <div
          onClick={() => onNavigate('stock-report')}
          className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Stock Report</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-bold text-neutral-900 truncate" title={latestImport?.fileName || 'None yet'}>
            {latestImport ? latestImport.fileName : 'No file imported'}
          </div>
          <div className="text-xs text-neutral-500 mt-2 truncate">
            {latestImport ? `Imported: ${latestImport.importDate}` : 'Ready for .xlsx upload'}
          </div>
        </div>

        {/* Metric 3: Print History */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Printed Boards</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <History className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-neutral-900 tracking-tight">
            {historyCount}
          </div>
          <div className="text-xs text-neutral-500 mt-2 flex items-center justify-between">
            <span>Saved in local history</span>
            <span className="text-emerald-600 font-bold flex items-center">
              History <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Metric 4: Offline / System Status */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Engine Status</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="text-base font-black text-neutral-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Browser IndexedDB</span>
          </div>
          <div className="text-xs text-neutral-500 mt-2">
            100% Local • Zero API calls needed
          </div>
        </div>
      </div>

      {/* Quick Board Maker Section */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 uppercase tracking-tight flex items-center gap-2">
              <Grid className="w-5 h-5 text-amber-500" />
              <span>Quick Create A4 Board</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select an A4 layout format to populate products and generate printable boards
            </p>
          </div>
          <button
            onClick={() => onNavigate('board-maker')}
            className="text-xs font-bold text-neutral-700 hover:text-black flex items-center gap-1 px-3 py-1.5 rounded bg-neutral-100 hover:bg-neutral-200 transition"
          >
            <span>Open Board Maker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {[
            { format: '1/8' as BoardFormat, title: '1/8 A4', desc: '8 Boards (2×4 Grid)', tag: 'PAGE 1', count: 8 },
            { format: '1/4' as BoardFormat, title: '1/4 A4', desc: '4 Boards (2×2 Grid)', tag: 'PAGE 2', count: 4 },
            { format: '1/3' as BoardFormat, title: '1/3 A4', desc: '3 Boards (1×3 Strips)', tag: 'PAGE 5', count: 3 },
            { format: '1/2' as BoardFormat, title: '1/2 A4', desc: '2 Boards (1×2 Stack)', tag: 'PAGE 3', count: 2 },
            { format: '1/1' as BoardFormat, title: '1/1 A4', desc: '1 Board (Full Page)', tag: 'PAGE 4', count: 1 },
            { format: 'ROUND' as BoardFormat, title: 'ROUND', desc: '6 Oval Labels', tag: 'PAGE 6', count: 6 },
            { format: 'NOTEBOOK' as BoardFormat, title: 'NOTE BOOK 1', desc: 'Special Promo Sheet', tag: 'PAGE 7', count: 1 },
          ].map((item) => (
            <button
              key={item.format}
              onClick={() => onQuickStartFormat(item.format)}
              className="group flex flex-col items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-black bg-neutral-50 hover:bg-white transition text-center shadow-xs cursor-pointer relative"
            >
              {item.format === '1/8' && (
                <span className="absolute -top-2 px-2 py-0.5 bg-amber-500 text-black font-black text-[9px] rounded-full uppercase tracking-wider shadow">
                  ★ Standard
                </span>
              )}
              <div className="w-full flex justify-between items-center text-[10px] text-neutral-400 font-bold uppercase mb-1">
                <span>{item.tag}</span>
                <span className="font-mono text-neutral-600">{item.count} SLOTS</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-neutral-900 group-hover:text-amber-600 transition">
                  {item.title}
                </div>
                <div className="text-xs text-neutral-500 font-medium mt-0.5">
                  {item.desc}
                </div>
              </div>
              <div className="mt-2 w-full py-1.5 px-3 bg-neutral-200 group-hover:bg-black group-hover:text-white rounded text-xs font-bold text-neutral-800 transition">
                Create {item.format}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Latest Import Summary (if exists) */}
      {latestImport && (
        <div className="bg-neutral-900 text-white border border-neutral-800 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-800 pb-4 mb-4">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Active Stock Report Import Summary</span>
              </div>
              <h3 className="text-lg font-black text-white mt-0.5">{latestImport.fileName}</h3>
            </div>
            <div className="text-xs text-neutral-400">
              Imported on: <span className="text-neutral-200 font-semibold">{latestImport.importDate}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700/50">
              <div className="text-[11px] font-bold uppercase text-neutral-400">Rows Scanned</div>
              <div className="text-xl font-black text-white mt-1">
                {latestImport.rowsScanned.toLocaleString()}
              </div>
            </div>
            <div className="bg-neutral-800/60 p-3 rounded-lg border border-amber-500/30">
              <div className="text-[11px] font-bold uppercase text-amber-400">NON CORE Imported</div>
              <div className="text-xl font-black text-amber-400 mt-1">
                {latestImport.nonCoreImported.toLocaleString()}
              </div>
            </div>
            <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700/50">
              <div className="text-[11px] font-bold uppercase text-neutral-400">Header Row</div>
              <div className="text-xl font-black text-white mt-1">
                Row #{latestImport.headerRowIndex}
              </div>
            </div>
            <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700/50">
              <div className="text-[11px] font-bold uppercase text-neutral-400">Skipped (Non-Target)</div>
              <div className="text-xl font-black text-neutral-300 mt-1">
                {latestImport.productsSkipped.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Column Mapping Verification Box */}
          <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 text-xs">
            <div className="font-bold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>Verified Column Mapping (Exact Rules)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-neutral-500">SELLING PRICE (SP):</span>{' '}
                <span className="text-amber-400 font-bold">{latestImport.detectedColumns.retailCol}</span>
              </div>
              <div>
                <span className="text-neutral-500">MAX RETAIL PRICE:</span>{' '}
                <span className="text-emerald-400 font-bold">{latestImport.detectedColumns.mrpCol}</span>
              </div>
              <div>
                <span className="text-neutral-500">MAIN CODE:</span>{' '}
                <span className="text-blue-400 font-bold">{latestImport.detectedColumns.mainCodeCol}</span>
              </div>
              <div>
                <span className="text-neutral-500">ITEM NAME:</span>{' '}
                <span className="text-purple-400 font-bold">{latestImport.detectedColumns.itemNameCol}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
