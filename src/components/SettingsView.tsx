import React, { useState, useRef } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Type,
  Maximize,
  Shield,
  Layers,
  Sparkles,
  FileText,
  Upload,
  Check,
  Tag,
} from 'lucide-react';
import { AppSettings, BoardFormat, BoardTemplateConfig, BoardType } from '../types';
import { DEFAULT_TEMPLATE_CONFIGS } from '../services/templateConfig';
import { StorageService } from '../services/storage';
import { inspectMasterDocx } from '../services/docxInspector';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
  const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings);
  const [selectedFormat, setSelectedFormat] = useState<BoardFormat>('1/8');
  const [isSaved, setIsSaved] = useState(false);
  const [isDocxProcessing, setIsDocxProcessing] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);

  const docxInputRef = useRef<HTMLInputElement>(null);

  const activeTemplate = currentSettings.templateConfigs[selectedFormat] || DEFAULT_TEMPLATE_CONFIGS[selectedFormat];

  const handleGeneralChange = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    setCurrentSettings((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleTemplateFieldChange = <K extends keyof BoardTemplateConfig>(
    field: K,
    val: BoardTemplateConfig[K]
  ) => {
    setCurrentSettings((prev) => ({
      ...prev,
      templateConfigs: {
        ...prev.templateConfigs,
        [selectedFormat]: {
          ...prev.templateConfigs[selectedFormat],
          [field]: val,
        },
      },
    }));
  };

  const handleDocxUpload = async (file: File) => {
    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      setDocxError('Please upload a Microsoft Word document (.docx).');
      return;
    }
    setDocxError(null);
    setIsDocxProcessing(true);

    try {
      const docxInfo = await inspectMasterDocx(file);
      const updated = {
        ...currentSettings,
        masterDocxLoaded: docxInfo,
      };
      setCurrentSettings(updated);
      await StorageService.saveSettings(updated);
      onSaveSettings(updated);
    } catch (err) {
      console.error(err);
      setDocxError('Failed to inspect DOCX file: ' + String(err));
    } finally {
      setIsDocxProcessing(false);
    }
  };

  const handleSave = async () => {
    await StorageService.saveSettings(currentSettings);
    onSaveSettings(currentSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetFormat = (format: BoardFormat) => {
    setCurrentSettings((prev) => ({
      ...prev,
      templateConfigs: {
        ...prev.templateConfigs,
        [format]: { ...DEFAULT_TEMPLATE_CONFIGS[format] },
      },
    }));
  };

  const handleResetAllToFactory = () => {
    if (window.confirm('Reset all template measurements and settings to factory defaults?')) {
      const def: AppSettings = {
        defaultFormat: '1/8',
        defaultBoardType: 'FINAL_PRICE',
        defaultFooterText: '(FINAL PRICE ON THE PRODUCT)',
        showMrpGlobal: false,
        storeName: 'RETAIL PROMOTIONS',
        masterDocxLoaded: currentSettings.masterDocxLoaded,
        templateConfigs: DEFAULT_TEMPLATE_CONFIGS,
      };
      setCurrentSettings(def);
      StorageService.saveSettings(def);
      onSaveSettings(def);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-500" />
            <span>Settings &amp; Template Master</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Manage store defaults, upload your Word master document, and independently calibrate the 7 board templates.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isSaved && (
            <span className="flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved!</span>
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg shadow transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* TEMPLATE MASTER (DOCX) UPLOAD & STATUS BANNER */}
      <div className="bg-neutral-900 text-white rounded-xl p-5 border border-neutral-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500 text-black rounded font-black text-xs">
              DOCX
            </span>
            <h3 className="text-base font-black uppercase text-white tracking-wide">
              TEMPLATE MASTER REFERENCE
            </h3>
            {currentSettings.masterDocxLoaded ? (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-xs font-bold">
                MASTER TEMPLATE LOADED
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 border border-neutral-700 rounded text-xs font-mono">
                No Master Uploaded Yet
              </span>
            )}
          </div>

          <p className="text-xs text-neutral-300 max-w-xl">
            Upload <code>NON_CORE_BOARD_MASTER.docx</code> to store locally in IndexedDB as the master reference.
            The app inspects embedded font definitions and page styles.
          </p>

          {currentSettings.masterDocxLoaded && (
            <div className="pt-2 text-xs text-neutral-400 flex flex-wrap gap-x-4 gap-y-1 font-mono">
              <div>
                File: <strong className="text-white">{currentSettings.masterDocxLoaded.fileName}</strong>
              </div>
              <div>
                Loaded: <span className="text-neutral-300">{currentSettings.masterDocxLoaded.loadedAt}</span>
              </div>
              <div>
                Detected Fonts:{' '}
                <strong className="text-amber-400">
                  {currentSettings.masterDocxLoaded.detectedFonts.join(', ')}
                </strong>
              </div>
            </div>
          )}
        </div>

        <div>
          <input
            ref={docxInputRef}
            type="file"
            accept=".docx, .doc"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleDocxUpload(e.target.files[0]);
              }
            }}
            className="hidden"
          />
          <button
            onClick={() => docxInputRef.current?.click()}
            disabled={isDocxProcessing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs shadow transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{currentSettings.masterDocxLoaded ? 'Replace Master DOCX' : 'Upload NON_CORE_BOARD_MASTER.docx'}</span>
          </button>
          {docxError && (
            <p className="text-[11px] text-rose-400 mt-1">{docxError}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: General Store Rules */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="border-b border-neutral-200 pb-3">
            <h2 className="text-base font-black text-neutral-900 uppercase">General Board Defaults</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Applied to all new boards created</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Default Board Format
            </label>
            <select
              value={currentSettings.defaultFormat}
              onChange={(e) => handleGeneralChange('defaultFormat', e.target.value as BoardFormat)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="1/8">1/8 (Page 1 — 8 Boards per A4)</option>
              <option value="1/4">1/4 (Page 2 — 4 Boards per A4)</option>
              <option value="1/3">1/3 (Page 5 — 3 Strips per A4)</option>
              <option value="1/2">1/2 (Page 3 — 2 Halves per A4)</option>
              <option value="1/1">1/1 (Page 4 — 1 Full Poster)</option>
              <option value="ROUND">ROUND BOARD (Page 6 — 6 Oval Labels)</option>
              <option value="NOTEBOOK">NOTE BOOK 1 (Page 7 — Special Promo Sheet)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Default Board Content Style
            </label>
            <select
              value={currentSettings.defaultBoardType || 'FINAL_PRICE'}
              onChange={(e) => handleGeneralChange('defaultBoardType', e.target.value as BoardType)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="FINAL_PRICE">Type A: Final Price / Only Board</option>
              <option value="MRP_SAVE">Type B: MRP + Save Board</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Default Footer Line Text
            </label>
            <input
              type="text"
              value={currentSettings.defaultFooterText}
              onChange={(e) => handleGeneralChange('defaultFooterText', e.target.value.toUpperCase())}
              placeholder="(FINAL PRICE ON THE PRODUCT)"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-4 border-t border-neutral-200">
            <button
              onClick={handleResetAllToFactory}
              className="w-full text-center text-xs text-rose-600 hover:text-rose-800 font-bold py-2 rounded bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
            >
              Reset All to Factory Defaults
            </button>
          </div>
        </div>

        {/* Right 2 Columns: Independent Template Calibration */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-200 pb-3">
            <div>
              <h2 className="text-base font-black text-neutral-900 uppercase flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                <span>Template Calibration Engine</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                All 7 templates independently configurable with custom measurements
              </p>
            </div>

            {/* Format Tabs */}
            <div className="flex flex-wrap bg-neutral-100 p-1 rounded-lg gap-1">
              {(['1/8', '1/4', '1/3', '1/2', '1/1', 'ROUND', 'NOTEBOOK'] as BoardFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`px-2.5 py-1 text-xs font-black rounded-md transition cursor-pointer ${
                    selectedFormat === fmt
                      ? 'bg-black text-amber-400 shadow-xs'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Active Template Calibration Controls */}
          {activeTemplate && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 text-xs flex justify-between items-center">
                <div>
                  <span className="font-black text-amber-950 uppercase">{activeTemplate.name}</span>
                  <span className="text-neutral-600 ml-2">
                    ({activeTemplate.cardWidthMm}mm × {activeTemplate.cardHeightMm}mm per board) • {activeTemplate.pageRef}
                  </span>
                </div>
                <button
                  onClick={() => handleResetFormat(selectedFormat)}
                  className="flex items-center space-x-1 text-[11px] font-bold text-neutral-600 hover:text-black cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset this format</span>
                </button>
              </div>

              {/* Grid of Sliders & Number inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Border Thickness */}
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase">
                      Border Thickness (pt)
                    </label>
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      {activeTemplate.borderWidthPt} pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.5"
                    value={activeTemplate.borderWidthPt}
                    onChange={(e) =>
                      handleTemplateFieldChange('borderWidthPt', parseFloat(e.target.value))
                    }
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Card Inner Padding */}
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase">
                      Inner Padding (mm)
                    </label>
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      {activeTemplate.paddingMm} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={activeTemplate.paddingMm}
                    onChange={(e) =>
                      handleTemplateFieldChange('paddingMm', parseFloat(e.target.value))
                    }
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Price Font Size */}
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase">
                      Selling Price (SP) Font (pt)
                    </label>
                    <span className="font-mono text-xs font-bold text-amber-700">
                      {activeTemplate.priceFontSizePt} pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="1"
                    value={activeTemplate.priceFontSizePt}
                    onChange={(e) =>
                      handleTemplateFieldChange('priceFontSizePt', parseInt(e.target.value, 10))
                    }
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Product Name Size */}
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase">
                      Product Name Font Size (pt)
                    </label>
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      {activeTemplate.productNameFontSizePt} pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="60"
                    step="0.5"
                    value={activeTemplate.productNameFontSizePt}
                    onChange={(e) =>
                      handleTemplateFieldChange('productNameFontSizePt', parseFloat(e.target.value))
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Font Family Selection */}
              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Card Typography Font Family
                </label>
                <select
                  value={activeTemplate.fontFamily}
                  onChange={(e) => handleTemplateFieldChange('fontFamily', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-semibold"
                >
                  <option value="'Arial Black', 'Impact', 'Barlow Condensed', 'Oswald', sans-serif">
                    Arial Black &amp; Impact (Classic Word Master Heavy Font)
                  </option>
                  <option value="'Barlow Condensed', 'Oswald', 'Arial Black', sans-serif">
                    Barlow Condensed &amp; Oswald (Clean Retail Condensed)
                  </option>
                  <option value="'Anton', 'Impact', sans-serif">
                    Anton / Impact (Ultra Bold Display)
                  </option>
                  <option value="'Inter', -apple-system, sans-serif">
                    Inter / Modern Clean Sans
                  </option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
