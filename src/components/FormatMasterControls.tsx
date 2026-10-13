import React, { useState, useRef, useEffect } from 'react';
import {
  FileCheck,
  Upload,
  Palette,
  BookmarkCheck,
  RotateCcw,
  Eye,
  Check,
  Sparkles,
  Layers,
  Image as ImageIcon,
  History,
  Sliders,
  ChevronDown,
  Camera,
} from 'lucide-react';
import { BoardFormat, BoardSlot, BoardTemplateConfig, MasterFormatTemplate, MasterTemplateVersion } from '../types';
import { StorageService } from '../services/storage';
import { DEFAULT_TEMPLATE_CONFIGS } from '../services/templateConfig';
import { inspectMasterDocument } from '../services/documentInspector';

interface FormatMasterControlsProps {
  currentFormat: BoardFormat;
  config: BoardTemplateConfig;
  activeSlot: BoardSlot;
  onUpdateFormatConfig: (format: BoardFormat, newConfig: BoardTemplateConfig) => void;
  onOpenCanvaEditor: () => void;
  onOpenRecreateFromImage: () => void;
  referenceOverlayUrl?: string | null;
  onToggleReferenceOverlay: (url: string | null) => void;
}

export const FormatMasterControls: React.FC<FormatMasterControlsProps> = ({
  currentFormat,
  config,
  activeSlot,
  onUpdateFormatConfig,
  onOpenCanvaEditor,
  onOpenRecreateFromImage,
  referenceOverlayUrl,
  onToggleReferenceOverlay,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateRecord, setTemplateRecord] = useState<MasterFormatTemplate | null>(null);
  const [versions, setVersions] = useState<MasterTemplateVersion[]>([]);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Load template info whenever format changes
  useEffect(() => {
    loadTemplateInfo();
  }, [currentFormat]);

  const loadTemplateInfo = async () => {
    const tpl = await StorageService.getMasterFormatTemplate(currentFormat);
    setTemplateRecord(tpl);
    const verList = await StorageService.getMasterTemplateVersions(currentFormat);
    setVersions(verList);
  };

  const showFeedback = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  // 1. USE SAVED MASTER
  const handleUseSavedMaster = async () => {
    const tpl = await StorageService.getMasterFormatTemplate(currentFormat);
    if (tpl && tpl.calibratedConfig) {
      onUpdateFormatConfig(currentFormat, tpl.calibratedConfig);
      showFeedback(`Loaded saved master for ${currentFormat}`);
    } else {
      showFeedback(`Using standard master for ${currentFormat}`);
    }
  };

  // 2. UPLOAD [FORMAT] REFERENCE (Supports DOCX, DOC, PPTX, PPT, PDF, PNG, JPG, JPEG)
  const handleUploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const inspection = await inspectMasterDocument(file);
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      let previewDataUrl = inspection.previewUrl || '';

      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        const reader = new FileReader();
        reader.onload = async () => {
          if (typeof reader.result === 'string') {
            await saveTemplateWithRef(reader.result, file.name, inspection.detectedFonts);
          }
        };
        reader.readAsDataURL(file);
      } else {
        await saveTemplateWithRef(previewDataUrl, file.name, inspection.detectedFonts);
      }

      showFeedback(`Uploaded ${file.name} (${inspection.fileType.toUpperCase()}) for ${currentFormat}`);
    } catch (err) {
      alert('Error reading reference file: ' + String(err));
    } finally {
      e.target.value = '';
    }
  };

  const saveTemplateWithRef = async (refUrl: string, fileName: string, detectedFonts?: string[]) => {
    const updatedTpl: MasterFormatTemplate = {
      format: currentFormat,
      name: config.name,
      pageRef: config.pageRef,
      referenceImageUrl: refUrl || undefined,
      referenceFileName: fileName,
      calibratedConfig: config,
      isUserCalibrated: true,
      updatedAt: new Date().toISOString(),
      detectedFonts,
      versions: versions,
    };
    await StorageService.saveMasterFormatTemplate(updatedTpl);
    setTemplateRecord(updatedTpl);
    if (refUrl) {
      onToggleReferenceOverlay(refUrl);
    }
  };

  // 3. EDIT [FORMAT] MASTER
  const handleEditMaster = () => {
    onOpenCanvaEditor();
    showFeedback(`Opened Canva editor for ${currentFormat} master calibration`);
  };

  // 4. SAVE CURRENT DESIGN AS DEFAULT [FORMAT] MASTER
  const handleSaveAsDefaultMaster = async () => {
    // Extract reusable typography & layout properties, NOT sample product's price or name!
    const newConfig: BoardTemplateConfig = {
      ...config,
      priceFontSizePt: activeSlot.customPriceFontSizePt || config.priceFontSizePt,
      productNameFontSizePt: activeSlot.customNameFontSizePt || config.productNameFontSizePt,
      packTextFontSizePt: activeSlot.customPackFontSizePt || config.packTextFontSizePt,
      footerFontSizePt: activeSlot.customFooterFontSizePt || config.footerFontSizePt,
      saveFontSizePt: activeSlot.customSaveFontSizePt || config.saveFontSizePt,
      borderWidthPt: activeSlot.customBorderThicknessPt !== undefined ? activeSlot.customBorderThicknessPt : config.borderWidthPt,
      fontFamily: activeSlot.customFontFamily || config.fontFamily,
      footerText: activeSlot.customFooter || config.footerText,
    };

    const versionName = `Calibrated Master ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    await StorageService.saveMasterTemplateVersion(currentFormat, versionName, newConfig, true);
    await StorageService.saveCalibratedMasterConfig(currentFormat, newConfig);

    onUpdateFormatConfig(currentFormat, newConfig);
    await loadTemplateInfo();
    showFeedback(`Saved as Default ${currentFormat} Master! New boards will inherit this layout.`);
  };

  // 5. RESTORE ORIGINAL [FORMAT] MASTER
  const handleRestoreOriginalMaster = async () => {
    if (confirm(`Reset ${currentFormat} back to original Word master dimensions and typography?`)) {
      const original = await StorageService.restoreOriginalMasterConfig(currentFormat);
      onUpdateFormatConfig(currentFormat, original);
      await loadTemplateInfo();
      showFeedback(`Restored pristine original ${currentFormat} Word master.`);
    }
  };

  // Switch to specific saved version
  const handleSelectVersion = async (ver: MasterTemplateVersion) => {
    await StorageService.saveCalibratedMasterConfig(currentFormat, ver.config);
    onUpdateFormatConfig(currentFormat, ver.config);
    setIsVersionMenuOpen(false);
    showFeedback(`Applied version "${ver.versionName}"`);
  };

  const hasReference = Boolean(templateRecord?.referenceImageUrl);
  const isOverlayActive = Boolean(referenceOverlayUrl);

  return (
    <div className="bg-white rounded-xl border-2 border-neutral-800 p-3.5 shadow-sm space-y-2.5">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.doc,.pptx,.ppt,.pdf,.png,.jpg,.jpeg,image/*,application/pdf"
        onChange={handleUploadReference}
        className="hidden"
      />

      {/* Header Label */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-black text-amber-400 rounded-md">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-neutral-900 tracking-wider">
              {currentFormat} MASTER TEMPLATE
            </h4>
            <p className="text-[10px] text-neutral-500 font-medium">
              {config.pageRef} • {templateRecord?.isUserCalibrated ? 'Custom Calibrated' : 'Original Word Master'}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          {hasReference ? (
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Reference Loaded</span>
            </span>
          ) : (
            <span className="bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">
              No Reference File
            </span>
          )}

          {/* Versions Dropdown Toggle */}
          {versions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsVersionMenuOpen((v) => !v)}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3 h-3" />
                <span>v{versions.length}</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>

              {isVersionMenuOpen && (
                <div className="absolute right-0 top-6 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl w-60 p-2 space-y-1 text-xs">
                  <div className="font-black text-[10px] text-neutral-500 uppercase px-2 py-1">
                    Saved Master Versions ({currentFormat})
                  </div>
                  {versions.map((ver) => (
                    <button
                      key={ver.id}
                      onClick={() => handleSelectVersion(ver)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-amber-50 text-neutral-800 flex justify-between items-center cursor-pointer"
                    >
                      <div className="truncate">
                        <div className="font-bold">{ver.versionName}</div>
                        <div className="text-[9px] text-neutral-400">
                          {new Date(ver.savedAt).toLocaleDateString()}
                        </div>
                      </div>
                      {ver.isDefault && (
                        <span className="text-[9px] bg-black text-amber-400 px-1.5 py-0.2 rounded font-black">
                          DEFAULT
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FEEDBACK NOTICE BAR */}
      {feedbackNotice && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-bold flex items-center space-x-1.5 animate-in fade-in duration-150">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* THE 5 REQUIRED ACTIONS:
          - USE SAVED MASTER
          - UPLOAD [FORMAT] REFERENCE
          - EDIT [FORMAT] MASTER
          - SAVE CURRENT DESIGN AS [FORMAT] MASTER
          - RESTORE ORIGINAL [FORMAT] MASTER
      */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <button
          onClick={handleUseSavedMaster}
          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1"
          title={`Load and apply saved ${currentFormat} master geometry`}
        >
          <BookmarkCheck className="w-3.5 h-3.5 text-neutral-700" />
          <span>USE SAVED MASTER</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1"
          title={`Upload a reference PNG, JPG, or PDF specifically for ${currentFormat} without leaving this page`}
        >
          <Upload className="w-3.5 h-3.5 text-neutral-700" />
          <span>UPLOAD {currentFormat} REFERENCE</span>
        </button>

        <button
          onClick={handleEditMaster}
          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1"
          title={`Open Canva editor to visually calibrate ${currentFormat} master`}
        >
          <Palette className="w-3.5 h-3.5 text-blue-600" />
          <span>EDIT {currentFormat} MASTER</span>
        </button>

        <button
          onClick={handleSaveAsDefaultMaster}
          className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-amber-400 rounded-lg text-xs font-black transition cursor-pointer shadow-xs flex items-center gap-1"
          title={`Save the typography and layout from this board as the permanent default for all new ${currentFormat} boards`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>SAVE AS DEFAULT {currentFormat} MASTER</span>
        </button>

        <button
          onClick={handleRestoreOriginalMaster}
          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
          title={`Restore original Word master specifications for ${currentFormat}`}
        >
          <RotateCcw className="w-3 h-3 text-neutral-500" />
          <span>RESTORE ORIGINAL</span>
        </button>

        {/* Reference Image Overlay Comparison Toggle */}
        {hasReference && (
          <button
            onClick={() => onToggleReferenceOverlay(isOverlayActive ? null : templateRecord?.referenceImageUrl || null)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
              isOverlayActive
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
            title="Toggle reference overlay to compare live board against uploaded master"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isOverlayActive ? 'HIDE OVERLAY' : 'COMPARE OVERLAY'}</span>
          </button>
        )}

        {/* RECREATE BOARD FROM IMAGE BUTTON */}
        <button
          onClick={onOpenRecreateFromImage}
          className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black rounded-lg text-xs font-black transition cursor-pointer shadow-xs flex items-center gap-1 ml-auto"
          title="Recreate editable price board from screenshot or photo"
        >
          <Camera className="w-3.5 h-3.5 text-black" />
          <span>RECREATE FROM IMAGE</span>
        </button>
      </div>
    </div>
  );
};
