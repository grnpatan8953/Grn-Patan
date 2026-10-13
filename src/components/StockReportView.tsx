import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Zap,
  RefreshCw,
  Search,
  Layers,
  ArrowRight,
  Database,
  Trash2,
} from 'lucide-react';
import { ImportSummary, Product } from '../types';
import { ExcelImporter } from '../services/excelImporter';
import { StorageService } from '../services/storage';
import { generateSampleStockWorkbook } from '../services/sampleData';

interface StockReportViewProps {
  latestImport: ImportSummary | null;
  productCount: number;
  onImportComplete: (summary: ImportSummary) => void;
  onCatalogueReset: () => void;
  onNavigateToProducts: () => void;
  onNavigateToBoardMaker: () => void;
}

export const StockReportView: React.FC<StockReportViewProps> = ({
  latestImport,
  productCount,
  onImportComplete,
  onCatalogueReset,
  onNavigateToProducts,
  onNavigateToBoardMaker,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMessage('Please upload a valid Excel spreadsheet (.xlsx or .xls).');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(5);
    setProgressStatus('Opening Excel file...');

    try {
      // Parse file
      const { products, summary } = await ExcelImporter.parseFile(
        file,
        file.name,
        file.size,
        (percent, message) => {
          setProgressPercent(percent);
          setProgressStatus(message);
        }
      );

      setProgressStatus('Saving products to local database...');
      // Upsert into IndexedDB
      const { added, updated, total } = await StorageService.upsertProducts(
        products,
        (processed, totalBatch) => {
          const p = 80 + Math.floor((processed / totalBatch) * 18);
          setProgressPercent(p);
          setProgressStatus(`Persisting items: ${processed.toLocaleString()} of ${totalBatch.toLocaleString()}...`);
        }
      );

      summary.productsAdded = added;
      summary.productsUpdated = updated;

      await StorageService.addImportSummary(summary);

      setIsProcessing(false);
      setProgressPercent(100);
      onImportComplete(summary);
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleLoadSampleReport = async () => {
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStatus('Generating sample retail stock workbook...');

    try {
      const buffer = generateSampleStockWorkbook();
      const fakeFile = new File([buffer], 'SAMPLE_RETAIL_STOCK_REPORT.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      await handleFileProcess(fakeFile);
    } catch (err: unknown) {
      setIsProcessing(false);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDownloadSampleTemplate = () => {
    const buffer = generateSampleStockWorkbook();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SAMPLE_RETAIL_STOCK_REPORT.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-amber-500" />
            <span>Stock Report Importer</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Imports .xlsx reports, detects headers in the first 50 rows, filters{' '}
            <strong className="text-neutral-900 font-bold">MAIN CODE = NON CORE</strong>, and maps{' '}
            <strong className="text-neutral-900 font-bold">RETAIL → SP</strong> and{' '}
            <strong className="text-neutral-900 font-bold">MRP → MRP</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadSampleTemplate}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg border border-neutral-300 transition cursor-pointer"
            title="Download reference .xlsx template"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample .xlsx</span>
          </button>
          <button
            onClick={handleLoadSampleReport}
            disabled={isProcessing}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg shadow-xs transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Instant Load Sample Stock</span>
          </button>
        </div>
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-3 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer select-none ${
          isDragging
            ? 'border-amber-500 bg-amber-50/60 scale-[1.005]'
            : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-neutral-50/50'
        } ${isProcessing ? 'pointer-events-none opacity-90' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {isProcessing ? (
          /* Processing State */
          <div className="max-w-md mx-auto py-6 space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 uppercase">
                Importing Stock Report...
              </h3>
              <p className="text-xs text-neutral-500 mt-1 font-mono">{progressStatus}</p>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-amber-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs font-bold text-neutral-600">{progressPercent}% Completed</div>
          </div>
        ) : (
          /* Standard Upload State */
          <div className="max-w-xl mx-auto space-y-4">
            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
              <Upload className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black text-lg font-black rounded-xl uppercase tracking-wider shadow-md transform hover:-translate-y-0.5 transition cursor-pointer">
                UPLOAD STOCK REPORT
              </span>
              <p className="text-sm text-neutral-600 font-semibold mt-3">
                Drag and drop your store closing stock report (.xlsx) here, or click to browse
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Supports Excel workbooks with title/metadata rows • Auto-detects header row within first 50 rows
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center items-center gap-2 text-xs text-neutral-500">
              <span className="bg-neutral-100 px-2.5 py-1 rounded border border-neutral-200 font-mono">
                MAIN CODE: NON CORE
              </span>
              <span className="bg-neutral-100 px-2.5 py-1 rounded border border-neutral-200 font-mono">
                RETAIL = SP
              </span>
              <span className="bg-neutral-100 px-2.5 py-1 rounded border border-neutral-200 font-mono">
                MRP = MRP
              </span>
              <span className="bg-neutral-100 px-2.5 py-1 rounded border border-neutral-200 font-mono">
                Barcode String-Safe
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-xl p-5 shadow-sm flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-black text-sm uppercase tracking-wide text-rose-900">
              Excel Import Failed
            </h4>
            <p className="text-sm mt-1 font-medium text-rose-800">{errorMessage}</p>
            <div className="mt-3 text-xs text-rose-700 bg-rose-100/60 p-2.5 rounded-lg">
              <strong>Checklist:</strong> Verify that your sheet has columns named{' '}
              <code>MAIN CODE</code>, <code>ITEM NAME</code>, <code>MRP</code>, and <code>RETAIL</code>{' '}
              within the first 50 rows, and that at least one row has <code>MAIN CODE = NON CORE</code>.
            </div>
          </div>
        </div>
      )}

      {/* Latest Import Summary Details */}
      {latestImport && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-200 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-black text-neutral-900 uppercase">
                  Import Summary: {latestImport.fileName}
                </h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Processed on {latestImport.importDate} • Header located at Row #{latestImport.headerRowIndex}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onNavigateToProducts}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-lg transition"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Search Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onNavigateToBoardMaker}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg shadow transition"
              >
                <span>Make Boards</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200">
              <span className="text-[10px] font-bold uppercase text-neutral-500">Rows Scanned</span>
              <div className="text-xl font-black text-neutral-900 mt-1">
                {latestImport.rowsScanned.toLocaleString()}
              </div>
            </div>
            <div className="bg-amber-50 p-3.5 rounded-lg border border-amber-300">
              <span className="text-[10px] font-bold uppercase text-amber-800">NON CORE Imported</span>
              <div className="text-xl font-black text-amber-900 mt-1">
                {latestImport.nonCoreImported.toLocaleString()}
              </div>
            </div>
            <div className="bg-emerald-50 p-3.5 rounded-lg border border-emerald-200">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Products Added</span>
              <div className="text-xl font-black text-emerald-800 mt-1">
                {latestImport.productsAdded.toLocaleString()}
              </div>
            </div>
            <div className="bg-blue-50 p-3.5 rounded-lg border border-blue-200">
              <span className="text-[10px] font-bold uppercase text-blue-700">Products Updated</span>
              <div className="text-xl font-black text-blue-800 mt-1">
                {latestImport.productsUpdated.toLocaleString()}
              </div>
            </div>
            <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200">
              <span className="text-[10px] font-bold uppercase text-neutral-500">Skipped (Core/Empty)</span>
              <div className="text-xl font-black text-neutral-600 mt-1">
                {latestImport.productsSkipped.toLocaleString()}
              </div>
            </div>
            <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200">
              <span className="text-[10px] font-bold uppercase text-neutral-500">Header Row</span>
              <div className="text-xl font-black text-neutral-900 mt-1 font-mono">
                Row #{latestImport.headerRowIndex}
              </div>
            </div>
          </div>

          {/* Detected Header Mapping */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Verified Column Names Mapped from Excel Header</span>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                Strict Rules Enforced
              </span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400 uppercase font-mono">SELLING PRICE (SP)</div>
                <div className="font-black text-neutral-900 mt-0.5 font-mono text-sm text-amber-600">
                  {latestImport.detectedColumns.retailCol}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">← from Excel RETAIL column</div>
              </div>
              <div className="bg-white p-2.5 rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400 uppercase font-mono">MAX RETAIL PRICE (MRP)</div>
                <div className="font-black text-neutral-900 mt-0.5 font-mono text-sm text-emerald-700">
                  {latestImport.detectedColumns.mrpCol}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">← from Excel MRP column</div>
              </div>
              <div className="bg-white p-2.5 rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400 uppercase font-mono">MAIN CODE FILTER</div>
                <div className="font-black text-neutral-900 mt-0.5 font-mono text-sm text-blue-700">
                  {latestImport.detectedColumns.mainCodeCol}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">← strictly "NON CORE"</div>
              </div>
              <div className="bg-white p-2.5 rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400 uppercase font-mono">ITEM NAME</div>
                <div className="font-black text-neutral-900 mt-0.5 font-mono text-sm text-purple-700">
                  {latestImport.detectedColumns.itemNameCol}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">← used for board display</div>
              </div>
            </div>
          </div>

          {/* Sample Rows Preview */}
          {latestImport.sampleRows && latestImport.sampleRows.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Sample Imported NON CORE Records (First 5 Rows)
              </h4>
              <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold uppercase text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">Barcode</th>
                      <th className="py-2 px-3">Item Name</th>
                      <th className="py-2 px-3">Main Code</th>
                      <th className="py-2 px-3 text-right">MRP</th>
                      <th className="py-2 px-3 text-right bg-amber-50 text-amber-900">SP (Retail)</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-mono text-[11px]">
                    {latestImport.sampleRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="py-2 px-3 font-bold text-neutral-800">{row.code}</td>
                        <td className="py-2 px-3 text-neutral-600">{row.barcode}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-neutral-900">{row.name}</td>
                        <td className="py-2 px-3">
                          <span className="bg-neutral-200 text-neutral-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {row.mainCode}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-neutral-500 font-bold">₹{row.mrp}</td>
                        <td className="py-2 px-3 text-right font-black text-amber-700 bg-amber-50">
                          ₹{row.retail}
                        </td>
                        <td className="py-2 px-3 text-right text-neutral-600">{row.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Database management options */}
          <div className="pt-2 flex justify-between items-center text-xs text-neutral-500 border-t border-neutral-200">
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Current Catalogue: {productCount.toLocaleString()} products in IndexedDB</span>
            </span>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all stored products from local database?')) {
                  onCatalogueReset();
                }
              }}
              className="text-neutral-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Catalogue</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
