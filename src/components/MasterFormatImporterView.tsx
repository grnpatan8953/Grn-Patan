import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  Sliders,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  FileCheck,
  Layers,
  Check,
  RotateCcw,
  Camera,
  X,
  BookmarkCheck,
  History,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BoardFormat,
  BoardTemplateConfig,
  MasterFormatTemplate,
  MasterInspectionResult,
} from '../types';
import { DEFAULT_TEMPLATE_CONFIGS } from '../services/templateConfig';
import { StorageService } from '../services/storage';
import { inspectMasterDocument } from '../services/documentInspector';
import { RecreateBoardModal } from './RecreateBoardModal';

interface MasterFormatImporterViewProps {
  onApplyFormatToBoardMaker: (format: BoardFormat) => void;
  onNavigateToBoardMaker: () => void;
}

export const MasterFormatImporterView: React.FC<MasterFormatImporterViewProps> = ({
  onApplyFormatToBoardMaker,
  onNavigateToBoardMaker,
}) => {
  const [templateRecords, setTemplateRecords] = useState<Record<BoardFormat, MasterFormatTemplate | null>>({
    '1/8': null,
    '1/4': null,
    '1/2': null,
    '1/1': null,
    '1/3': null,
    'ROUND': null,
    'NOTEBOOK': null,
  });

  const [calibratedConfigs, setCalibratedConfigs] = useState<Record<BoardFormat, BoardTemplateConfig>>(
    DEFAULT_TEMPLATE_CONFIGS
  );

  const [activeCalibratingFormat, setActiveCalibratingFormat] = useState<BoardFormat | null>(null);
  const [activePreviewFormat, setActivePreviewFormat] = useState<BoardFormat | null>(null);
  const [isRecreateModalOpen, setIsRecreateModalOpen] = useState(false);
  const [recreateTargetFormat, setRecreateTargetFormat] = useState<BoardFormat>('1/8');

  // File upload state for single-format reference
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetFormat, setUploadTargetFormat] = useState<BoardFormat>('1/8');

  // Multi-page master document upload state
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingMulti, setIsProcessingMulti] = useState(false);
  const [multiInspectionResult, setMultiInspectionResult] = useState<MasterInspectionResult | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // The 7 locked format specifications
  const formatList: Array<{
    format: BoardFormat;
    pageLabel: string;
    title: string;
    grid: string;
    dimensions: string;
    description: string;
  }> = [
    {
      format: '1/8',
      pageLabel: 'PAGE 1',
      title: '1/8 Format — 8 Boards',
      grid: '2 Columns × 4 Rows (8 Boards)',
      dimensions: '105.0 × 74.25 mm',
      description: 'Master Page 1: Dominant large price, rupee symbol on left, tall condensed ONLY on right, bold uppercase product name filling width, pack text, and bold condensed footer.',
    },
    {
      format: '1/4',
      pageLabel: 'PAGE 2',
      title: '1/4 Format — 4 Boards',
      grid: '2 Columns × 2 Rows (4 Boards)',
      dimensions: '105.0 × 148.5 mm',
      description: 'Master Page 2: Medium gondola display boards (supports Type A Final Price & Type B MRP+Save).',
    },
    {
      format: '1/2',
      pageLabel: 'PAGE 3',
      title: '1/2 Format — 2 Boards',
      grid: '1 Column × 2 Rows (2 Boards)',
      dimensions: '210.0 × 148.5 mm',
      description: 'Master Page 3: Half-A4 horizontal promotional display boards for entrance and end-caps.',
    },
    {
      format: '1/1',
      pageLabel: 'PAGE 4',
      title: '1/1 Format — 1 Poster',
      grid: '1 Column × 1 Row (1 Poster)',
      dimensions: '210.0 × 297.0 mm',
      description: 'Master Page 4: Full-page high impact promotional poster board for store windows and pillar wraps.',
    },
    {
      format: '1/3',
      pageLabel: 'PAGE 5',
      title: '1/3 Format — 3 Boards',
      grid: '1 Column × 3 Rows (3 Strips)',
      dimensions: '210.0 × 99.0 mm',
      description: 'Master Page 5: Horizontal shelf header strip boards for category rails and cashier counters.',
    },
    {
      format: 'ROUND',
      pageLabel: 'PAGE 6',
      title: 'ROUND BOARD — 15 Oval Labels',
      grid: '3 Columns × 5 Rows (15 Oval Labels)',
      dimensions: '70.0 × 59.4 mm per oval',
      description: 'Master Page 6: 15 curved oval promotional labels with thick border and compact centered price.',
    },
    {
      format: 'NOTEBOOK',
      pageLabel: 'PAGE 7',
      title: 'NOTE BOOK 1 — 2 Specialized Panels',
      grid: '1 Column × 2 Rows (2 Panels)',
      dimensions: '210.0 × 148.5 mm per panel',
      description: 'Master Page 7: Two specialized notebook panels with tiered bulk wholesale table (1 PCS, 3 PCS, 6 PCS, 12 PCS).',
    },
  ];

  useEffect(() => {
    loadAllTemplateData();
  }, []);

  const loadAllTemplateData = async () => {
    const configs = await StorageService.getCalibratedMasterConfigs();
    setCalibratedConfigs(configs);

    const records: Record<BoardFormat, MasterFormatTemplate | null> = { ...templateRecords };
    for (const item of formatList) {
      records[item.format] = await StorageService.getMasterFormatTemplate(item.format);
    }
    setTemplateRecords(records);
  };

  const showFeedback = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // Upload independent reference for selected format
  const handleTriggerUpload = (fmt: BoardFormat) => {
    setUploadTargetFormat(fmt);
    singleFileInputRef.current?.click();
  };

  const handleSingleReferenceSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fmt = uploadTargetFormat;
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    try {
      const curCfg = calibratedConfigs[fmt] || DEFAULT_TEMPLATE_CONFIGS[fmt];
      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        const reader = new FileReader();
        reader.onload = async () => {
          if (typeof reader.result === 'string') {
            const newTpl: MasterFormatTemplate = {
              format: fmt,
              name: curCfg.name,
              pageRef: curCfg.pageRef,
              referenceImageUrl: reader.result,
              referenceFileName: file.name,
              calibratedConfig: curCfg,
              isUserCalibrated: true,
              updatedAt: new Date().toISOString(),
            };
            await StorageService.saveMasterFormatTemplate(newTpl);
            await loadAllTemplateData();
            showFeedback(`Uploaded reference "${file.name}" for ${fmt} format!`);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Document formats: DOCX, DOC, PPTX, PPT, PDF
        const result = await inspectMasterDocument(file);
        const newTpl: MasterFormatTemplate = {
          format: fmt,
          name: curCfg.name,
          pageRef: curCfg.pageRef,
          referenceImageUrl: result.previewUrl || undefined,
          referenceFileName: file.name,
          calibratedConfig: {
            ...curCfg,
            fontFamily:
              result.detectedFonts.length > 0
                ? `'${result.detectedFonts[0]}', sans-serif`
                : curCfg.fontFamily,
          },
          isUserCalibrated: true,
          updatedAt: new Date().toISOString(),
        };
        await StorageService.saveMasterFormatTemplate(newTpl);
        await loadAllTemplateData();
        showFeedback(
          `Uploaded and calibrated ${result.fileType.toUpperCase()} document "${file.name}" for ${fmt} (${result.detectedFonts.join(', ')})!`
        );
      }
    } catch (err) {
      console.error(err);
      alert('Error parsing reference file: ' + String(err));
    }
    e.target.value = '';
  };

  // Restore original Word master for specific format
  const handleRestoreFormat = async (fmt: BoardFormat) => {
    if (confirm(`Reset ${fmt} back to the original Word master dimensions and typography?`)) {
      const original = await StorageService.restoreOriginalMasterConfig(fmt);
      await loadAllTemplateData();
      showFeedback(`Restored pristine original Word master for ${fmt}!`);
    }
  };

  // Save calibrated config for specific format
  const handleSaveCalibratedConfig = async (fmt: BoardFormat, newConfig: BoardTemplateConfig) => {
    const versionName = `Calibrated Master (${new Date().toLocaleDateString()})`;
    await StorageService.saveMasterTemplateVersion(fmt, versionName, newConfig, true);
    await StorageService.saveCalibratedMasterConfig(fmt, newConfig);
    await loadAllTemplateData();
    setActiveCalibratingFormat(null);
    showFeedback(`Saved updated calibration for ${fmt}! Available immediately in Board Maker.`);
  };

  // Multi-page Master document upload (DOCX, DOC, PPTX, PPT, PDF, PNG, JPG, JPEG)
  const handleMultiFileUpload = async (file: File) => {
    setIsProcessingMulti(true);
    try {
      const result = await inspectMasterDocument(file);
      setMultiInspectionResult(result);
      showFeedback(
        `Parsed document "${file.name}" (${result.fileType.toUpperCase()}) — ${result.detectedFonts.length} fonts detected, ${result.pageCount || 7} format pages ready for inspection.`
      );
    } catch (err) {
      console.error(err);
      alert('Error parsing document: ' + String(err));
    } finally {
      setIsProcessingMulti(false);
    }
  };

  const handleApplyAllDetectedPages = async () => {
    if (!multiInspectionResult) return;
    const formatMapping: Record<number, BoardFormat> = {
      1: '1/8',
      2: '1/4',
      3: '1/2',
      4: '1/1',
      5: '1/3',
      6: 'ROUND',
      7: 'NOTEBOOK',
    };

    for (let pageNum = 1; pageNum <= 7; pageNum++) {
      const fmt = formatMapping[pageNum];
      if (!fmt) continue;
      const curCfg = calibratedConfigs[fmt] || DEFAULT_TEMPLATE_CONFIGS[fmt];
      const newTpl: MasterFormatTemplate = {
        format: fmt,
        name: curCfg.name,
        pageRef: curCfg.pageRef,
        referenceImageUrl: multiInspectionResult.previewUrl || undefined,
        referenceFileName: `${multiInspectionResult.fileName} (Page ${pageNum})`,
        calibratedConfig: {
          ...curCfg,
          fontFamily:
            multiInspectionResult.detectedFonts.length > 0
              ? `'${multiInspectionResult.detectedFonts[0]}', sans-serif`
              : curCfg.fontFamily,
        },
        isUserCalibrated: true,
        updatedAt: new Date().toISOString(),
      };
      await StorageService.saveMasterFormatTemplate(newTpl);
    }
    await loadAllTemplateData();
    showFeedback(`Applied all 7 format pages from "${multiInspectionResult.fileName}" across all master formats!`);
  };

  const handleApplyDetectedPageToFormat = async (fmt: BoardFormat, pageLabel: string) => {
    if (!multiInspectionResult) return;
    const curCfg = calibratedConfigs[fmt] || DEFAULT_TEMPLATE_CONFIGS[fmt];
    const newTpl: MasterFormatTemplate = {
      format: fmt,
      name: curCfg.name,
      pageRef: curCfg.pageRef,
      referenceImageUrl: multiInspectionResult.previewUrl || undefined,
      referenceFileName: `${multiInspectionResult.fileName} (${pageLabel})`,
      calibratedConfig: {
        ...curCfg,
        fontFamily:
          multiInspectionResult.detectedFonts.length > 0
            ? `'${multiInspectionResult.detectedFonts[0]}', sans-serif`
            : curCfg.fontFamily,
      },
      isUserCalibrated: true,
      updatedAt: new Date().toISOString(),
    };
    await StorageService.saveMasterFormatTemplate(newTpl);
    await loadAllTemplateData();
    showFeedback(`Assigned ${pageLabel} from "${multiInspectionResult.fileName}" as reference for ${fmt}!`);
  };

  const handleApplyToBoardMaker = (fmt: BoardFormat) => {
    onApplyFormatToBoardMaker(fmt);
    onNavigateToBoardMaker();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Hidden file inputs with full support for DOCX, DOC, PPTX, PPT, PDF, PNG, JPG, JPEG */}
      <input
        ref={singleFileInputRef}
        type="file"
        accept=".docx,.doc,.pptx,.ppt,.pdf,.png,.jpg,.jpeg,image/png,image/jpeg,image/webp,application/pdf"
        onChange={handleSingleReferenceSelected}
        className="hidden"
      />
      <input
        ref={multiFileInputRef}
        type="file"
        accept=".docx,.doc,.pptx,.ppt,.pdf,.png,.jpg,.jpeg,image/png,image/jpeg,image/webp,application/pdf"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleMultiFileUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* TOP HEADER & WORKSPACE BANNER */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-black rounded-xl text-amber-400 shadow-xs">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-neutral-900 tracking-tight uppercase">
                  Master Importer Workspace
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  7-Format Source of Truth
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Independent reference files, physical calibrations, and master template management for all 7 formats.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => multiFileInputRef.current?.click()}
            disabled={isProcessingMulti}
            className="flex items-center space-x-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-black rounded-lg border border-neutral-300 transition cursor-pointer"
            title="Upload multi-page Word (.docx) or PDF containing all 7 master pages"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-600" />
            <span>{isProcessingMulti ? 'ANALYZING...' : 'UPLOAD 7-PAGE MASTER'}</span>
          </button>

          <button
            onClick={() => {
              setRecreateTargetFormat('1/8');
              setIsRecreateModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-black text-xs font-black rounded-lg shadow-sm transition cursor-pointer"
            title="Upload screenshot of existing board, mask text with white patches, replace price"
          >
            <Camera className="w-3.5 h-3.5 text-black" />
            <span>RECREATE FROM IMAGE</span>
          </button>

          <button
            onClick={onNavigateToBoardMaker}
            className="flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-amber-400 text-xs font-black rounded-lg transition cursor-pointer shadow-sm"
          >
            <span>Open Board Maker</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FEEDBACK NOTICE */}
      {feedbackNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* MULTI-PAGE DOCUMENT INSPECTION WORKSPACE (DOCX, PPTX, PDF, DOC, PPT) */}
      {multiInspectionResult && (
        <div className="bg-white border-2 border-amber-400 rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-amber-400 text-black px-2.5 py-0.5 rounded text-xs font-black uppercase font-mono tracking-wider">
                  {multiInspectionResult.fileType.toUpperCase()} DOCUMENT INSPECTED
                </span>
                <span className="text-xs font-mono font-bold text-neutral-500">
                  {(multiInspectionResult.fileSize / 1024).toFixed(1)} KB
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    multiInspectionResult.conversionStatus === 'NATIVE_PARSED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {multiInspectionResult.conversionStatus || 'PARSED'}
                </span>
              </div>
              <h3 className="text-base font-black text-neutral-900 mt-1 uppercase">
                {multiInspectionResult.fileName}
              </h3>
              <p className="text-xs text-neutral-500">
                {multiInspectionResult.noticeMessage ||
                  'Extracted page geometry, fonts, and template layouts for master reconstruction.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyAllDetectedPages}
                className="px-4 py-2 bg-black hover:bg-neutral-800 text-amber-400 font-black rounded-lg text-xs uppercase shadow transition cursor-pointer flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>APPLY ALL 7 PAGES TO MASTER SYSTEM</span>
              </button>
              <button
                onClick={() => setMultiInspectionResult(null)}
                className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition cursor-pointer"
                title="Close document inspection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Detected Fonts Row */}
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-neutral-700">Detected Document Fonts:</span>
            {multiInspectionResult.detectedFonts.map((f) => (
              <span key={f} className="px-2 py-0.5 bg-white border border-neutral-300 rounded font-mono text-neutral-800 font-bold">
                {f}
              </span>
            ))}
          </div>

          {/* Detected Format Pages / Slides Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
            {(multiInspectionResult.slidesOrPages || [
              { index: 1, label: 'Page 1 — 1/8 Format (8 boards, 2×4)', suggestedFormat: '1/8' as BoardFormat },
              { index: 2, label: 'Page 2 — 1/4 Format (4 boards, 2×2)', suggestedFormat: '1/4' as BoardFormat },
              { index: 3, label: 'Page 3 — 1/2 Format (2 boards, 1×2)', suggestedFormat: '1/2' as BoardFormat },
              { index: 4, label: 'Page 4 — 1/1 Format (1 full A4 board)', suggestedFormat: '1/1' as BoardFormat },
              { index: 5, label: 'Page 5 — 1/3 Format (3 boards, 1×3)', suggestedFormat: '1/3' as BoardFormat },
              { index: 6, label: 'Page 6 — ROUND BOARD (15 oval labels)', suggestedFormat: 'ROUND' as BoardFormat },
              { index: 7, label: 'Page 7 — NOTE BOOK 1 (2 panels)', suggestedFormat: 'NOTEBOOK' as BoardFormat },
            ]).map((slide) => {
              const fmt = slide.suggestedFormat || ('1/8' as BoardFormat);
              return (
                <div
                  key={slide.index}
                  className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 flex flex-col justify-between text-xs"
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="px-2 py-0.5 bg-black text-amber-400 font-mono font-bold text-[10px] rounded">
                        PAGE {slide.index}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-600 font-bold uppercase">{fmt}</span>
                    </div>
                    <div className="font-bold text-neutral-900">{slide.label}</div>
                    {slide.textPreview && (
                      <p className="text-[10px] text-neutral-500 font-mono line-clamp-2 mt-1">
                        "{slide.textPreview}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 pt-2">
                    <button
                      onClick={() => handleApplyDetectedPageToFormat(fmt, slide.label)}
                      className="flex-1 py-1 px-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] rounded uppercase transition cursor-pointer"
                    >
                      Assign to {fmt}
                    </button>
                    <button
                      onClick={() => setActiveCalibratingFormat(fmt)}
                      className="py-1 px-2 bg-white border border-neutral-300 text-neutral-700 font-bold text-[10px] rounded hover:bg-neutral-100 transition cursor-pointer"
                    >
                      Calibrate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEVEN INDEPENDENT MASTER CARDS GRID */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-sm font-black text-neutral-900 uppercase tracking-wider">
              Seven Independent Format Masters
            </h2>
            <p className="text-xs text-neutral-500">
              Each format maintains its own reference file, calibration parameters, and version history.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
            7 Formats Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {formatList.map((item) => {
            const tpl = templateRecords[item.format];
            const cfg = calibratedConfigs[item.format] || DEFAULT_TEMPLATE_CONFIGS[item.format];
            const hasRef = Boolean(tpl?.referenceImageUrl);
            const isCalibrated = Boolean(tpl?.isUserCalibrated);
            const versionCount = tpl?.versions?.length || 0;

            return (
              <div
                key={item.format}
                className="bg-white rounded-2xl border-2 border-neutral-200 hover:border-black transition-all shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-neutral-100 space-y-2 bg-neutral-50/50">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 bg-black text-amber-400 font-mono font-black text-xs rounded">
                      {item.pageLabel}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 font-bold">
                      {item.dimensions}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-sm text-neutral-900 uppercase">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-medium">{item.grid}</p>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-1 pt-1 text-[10px] font-mono">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        hasRef
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {hasRef ? `Ref: ${tpl?.referenceFileName || 'Uploaded'}` : 'No Reference File'}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        isCalibrated
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isCalibrated ? 'Custom Calibrated' : 'Default Word Master'}
                    </span>

                    {versionCount > 0 && (
                      <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                        {versionCount} Versions
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Thumbnail / Preview */}
                <div className="p-4 bg-white flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden border-b border-neutral-100">
                  {hasRef ? (
                    <div className="relative w-full h-32 flex items-center justify-center">
                      <img
                        src={tpl?.referenceImageUrl}
                        alt={`${item.format} Reference`}
                        className="max-h-full max-w-full object-contain rounded shadow-xs"
                      />
                      <span className="absolute bottom-1 right-1 text-[8px] font-mono font-bold bg-black/80 text-white px-1 rounded">
                        REFERENCE IMAGE
                      </span>
                    </div>
                  ) : (
                    /* Minimalist Schematic Preview */
                    <div
                      style={{
                        width: '120px',
                        height: item.format === 'ROUND' ? '100px' : '90px',
                        border: `${cfg.borderWidthPt}pt solid #000000`,
                        borderRadius: item.format === 'ROUND' ? '50% / 50%' : '0px',
                        fontFamily: cfg.fontFamily,
                      }}
                      className="bg-white p-1 flex flex-col justify-between items-center text-center shadow-xs"
                    >
                      <div className="font-black text-base text-black mt-1 leading-none">
                        ₹199 <span className="text-[10px] uppercase font-sans">ONLY</span>
                      </div>
                      <div className="font-bold text-[9px] text-neutral-800 uppercase truncate max-w-full">
                        {item.format === 'ROUND' ? '' : 'PRODUCT NAME'}
                      </div>
                      <div className="font-black text-[8px] text-neutral-700">
                        {item.format === 'ROUND' ? '' : '(FINAL PRICE)'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions (The 6 Required Card Actions):
                    - Upload
                    - Preview
                    - Calibrate
                    - Save
                    - Replace
                    - Restore
                */}
                <div className="p-3 bg-neutral-50 space-y-1.5 text-xs">
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Upload / Replace */}
                    <button
                      onClick={() => handleTriggerUpload(item.format)}
                      className="py-1.5 px-2 bg-white hover:bg-neutral-100 text-neutral-800 font-bold rounded-lg border border-neutral-200 transition text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      title={hasRef ? 'Replace current reference file' : 'Upload reference file for this format'}
                    >
                      <Upload className="w-3 h-3 text-neutral-600" />
                      <span>{hasRef ? 'REPLACE REF' : 'UPLOAD REF'}</span>
                    </button>

                    {/* Preview */}
                    <button
                      onClick={() => setActivePreviewFormat(item.format)}
                      className="py-1.5 px-2 bg-white hover:bg-neutral-100 text-neutral-800 font-bold rounded-lg border border-neutral-200 transition text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      title="Preview physical geometry and reference overlay"
                    >
                      <Eye className="w-3 h-3 text-neutral-600" />
                      <span>PREVIEW</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Calibrate */}
                    <button
                      onClick={() => setActiveCalibratingFormat(item.format)}
                      className="py-1.5 px-2 bg-white hover:bg-neutral-100 text-neutral-800 font-bold rounded-lg border border-neutral-200 transition text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      title="Adjust font sizes, borders, and padding"
                    >
                      <Sliders className="w-3 h-3 text-neutral-600" />
                      <span>CALIBRATE</span>
                    </button>

                    {/* Restore */}
                    <button
                      onClick={() => handleRestoreFormat(item.format)}
                      className="py-1.5 px-2 bg-white hover:bg-rose-50 text-neutral-700 hover:text-rose-700 font-bold rounded-lg border border-neutral-200 transition text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      title="Restore original Word master specifications"
                    >
                      <RotateCcw className="w-3 h-3 text-neutral-500" />
                      <span>RESTORE</span>
                    </button>
                  </div>

                  {/* Primary: Load Into Board Maker */}
                  <button
                    onClick={() => handleApplyToBoardMaker(item.format)}
                    className="w-full py-2 bg-black hover:bg-neutral-800 text-amber-400 font-black rounded-lg text-xs uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>LOAD IN BOARD MAKER</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CALIBRATION MODAL / DRAWER */}
      {activeCalibratingFormat && (
        <CalibrationModal
          format={activeCalibratingFormat}
          config={calibratedConfigs[activeCalibratingFormat] || DEFAULT_TEMPLATE_CONFIGS[activeCalibratingFormat]}
          onClose={() => setActiveCalibratingFormat(null)}
          onSave={(newCfg) => handleSaveCalibratedConfig(activeCalibratingFormat, newCfg)}
        />
      )}

      {/* PREVIEW MODAL */}
      {activePreviewFormat && (
        <PreviewModal
          format={activePreviewFormat}
          config={calibratedConfigs[activePreviewFormat] || DEFAULT_TEMPLATE_CONFIGS[activePreviewFormat]}
          templateRecord={templateRecords[activePreviewFormat]}
          onClose={() => setActivePreviewFormat(null)}
          onApplyToBoardMaker={() => handleApplyToBoardMaker(activePreviewFormat)}
        />
      )}

      {/* RECREATE BOARD FROM IMAGE MODAL */}
      <RecreateBoardModal
        isOpen={isRecreateModalOpen}
        onClose={() => setIsRecreateModalOpen(false)}
        targetFormat={recreateTargetFormat}
        onApplyToSlot={() => {
          handleApplyToBoardMaker(recreateTargetFormat);
        }}
      />
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponent: Calibration Modal
// -------------------------------------------------------------
interface CalibrationModalProps {
  format: BoardFormat;
  config: BoardTemplateConfig;
  onClose: () => void;
  onSave: (config: BoardTemplateConfig) => void;
}

const CalibrationModal: React.FC<CalibrationModalProps> = ({ format, config, onClose, onSave }) => {
  const [cfg, setCfg] = useState<BoardTemplateConfig>({ ...config });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
          <div>
            <h3 className="font-black text-sm uppercase text-neutral-900">
              Calibrate {format} Master Parameters
            </h3>
            <p className="text-xs text-neutral-500">Fine-tune physical typography and borders.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-neutral-700 block mb-0.5">Price Font Size ({cfg.priceFontSizePt} pt):</label>
            <input
              type="range"
              min="20"
              max="200"
              value={cfg.priceFontSizePt}
              onChange={(e) => setCfg({ ...cfg, priceFontSizePt: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-0.5">Product Name Font Size ({cfg.productNameFontSizePt} pt):</label>
            <input
              type="range"
              min="8"
              max="80"
              value={cfg.productNameFontSizePt}
              onChange={(e) => setCfg({ ...cfg, productNameFontSizePt: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-0.5">Border Width ({cfg.borderWidthPt} pt):</label>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={cfg.borderWidthPt}
              onChange={(e) => setCfg({ ...cfg, borderWidthPt: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-0.5">Footer Font Size ({cfg.footerFontSizePt} pt):</label>
            <input
              type="range"
              min="6"
              max="40"
              value={cfg.footerFontSizePt}
              onChange={(e) => setCfg({ ...cfg, footerFontSizePt: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-0.5">Font Family:</label>
            <select
              value={cfg.fontFamily}
              onChange={(e) => setCfg({ ...cfg, fontFamily: e.target.value })}
              className="w-full border border-neutral-300 rounded p-1.5"
            >
              <option value="'Barlow Condensed', 'Anton', 'Impact', 'Arial Black', sans-serif">
                Barlow Condensed (Authentic Word Master)
              </option>
              <option value="'Anton', 'Impact', sans-serif">Anton Heavy</option>
              <option value="'Impact', sans-serif">Impact Classic</option>
              <option value="'Arial Black', sans-serif">Arial Black</option>
            </select>
          </div>

          <div className="pt-3 border-t border-neutral-100 flex justify-end space-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-neutral-100 text-neutral-700 font-bold rounded-lg">
              Cancel
            </button>
            <button
              onClick={() => onSave(cfg)}
              className="px-4 py-2 bg-black text-amber-400 font-black rounded-lg"
            >
              Save Calibrated Master
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponent: Preview Modal
// -------------------------------------------------------------
interface PreviewModalProps {
  format: BoardFormat;
  config: BoardTemplateConfig;
  templateRecord: MasterFormatTemplate | null;
  onClose: () => void;
  onApplyToBoardMaker: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  format,
  config,
  templateRecord,
  onClose,
  onApplyToBoardMaker,
}) => {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 overflow-hidden">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
          <div>
            <h3 className="font-black text-sm uppercase text-neutral-900">
              {config.name} — Visual Master Preview
            </h3>
            <p className="text-xs text-neutral-500 font-mono">
              Dimensions: {config.cardWidthMm}mm × {config.cardHeightMm}mm • Border: {config.borderWidthPt}pt
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-center items-center p-6 bg-neutral-100 rounded-xl relative min-h-[300px]">
          {/* Authentic Live Card */}
          <div
            style={{
              width: '280px',
              height: `${Math.round((280 * config.cardHeightMm) / config.cardWidthMm)}px`,
              border: `${config.borderWidthPt}pt solid #000000`,
              fontFamily: config.fontFamily,
              borderRadius: format === 'ROUND' ? '50% / 50%' : '0px',
              maxHeight: '380px',
            }}
            className="bg-white p-3 flex flex-col justify-between items-center text-black shadow-xl relative select-none"
          >
            <div className="flex items-baseline justify-center tracking-tight leading-none text-black mt-2">
              <span style={{ fontSize: `${Math.round(config.rupeeSymbolSizePt * 0.75)}pt` }} className="font-black mr-1">
                ₹
              </span>
              <span style={{ fontSize: `${Math.round(config.priceFontSizePt * 0.75)}pt` }} className="font-black">
                199
              </span>
              <span style={{ fontSize: `${Math.round(config.onlyFontSizePt * 0.75)}pt` }} className="font-black ml-1.5 uppercase">
                ONLY
              </span>
            </div>

            {format !== 'ROUND' && (
              <>
                <div
                  style={{ fontSize: `${Math.round(config.productNameFontSizePt * 0.75)}pt` }}
                  className="font-black uppercase text-center max-w-full px-1 break-words leading-tight"
                >
                  PREMIUM RETAIL PRODUCT
                </div>

                <div
                  style={{ fontSize: `${Math.round(config.packTextFontSizePt * 0.75)}pt` }}
                  className="font-black uppercase tracking-wide text-neutral-800"
                >
                  (6 PCS SET)
                </div>

                <div
                  style={{ fontSize: `${Math.round(config.footerFontSizePt * 0.75)}pt` }}
                  className="w-full text-center uppercase font-black text-black pt-1"
                >
                  {config.footerText}
                </div>
              </>
            )}

            {/* Optional Overlay Image */}
            {showOverlay && templateRecord?.referenceImageUrl && (
              <div className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none flex items-center justify-center border-2 border-dashed border-purple-600">
                <img src={templateRecord.referenceImageUrl} alt="" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
          {templateRecord?.referenceImageUrl ? (
            <button
              onClick={() => setShowOverlay((v) => !v)}
              className="px-3 py-1.5 bg-purple-50 text-purple-800 font-bold rounded-lg text-xs border border-purple-200"
            >
              {showOverlay ? 'Hide Reference Overlay' : 'Compare Reference Overlay'}
            </button>
          ) : (
            <span className="text-[11px] text-neutral-400">No reference image uploaded for comparison</span>
          )}

          <div className="flex space-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-neutral-100 text-neutral-700 font-bold rounded-lg text-xs">
              Close
            </button>
            <button
              onClick={onApplyToBoardMaker}
              className="px-4 py-2 bg-black text-amber-400 font-black rounded-lg text-xs flex items-center gap-1"
            >
              <span>Open In Board Maker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
