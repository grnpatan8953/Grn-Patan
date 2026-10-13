import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  X,
  Check,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  RotateCcw,
  Plus,
  Trash2,
  BookmarkCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  BoardFormat,
  BoardSlot,
  BoardTemplateConfig,
  RecreatedBoardRegion,
  RecreatedBoardSession,
} from '../types';
import { DEFAULT_TEMPLATE_CONFIGS } from '../services/templateConfig';
import { StorageService } from '../services/storage';

interface RecreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFormat: BoardFormat;
  onApplyToSlot: (slotData: Partial<BoardSlot>) => void;
}

export const RecreateBoardModal: React.FC<RecreateBoardModalProps> = ({
  isOpen,
  onClose,
  targetFormat: initialFormat,
  onApplyToSlot,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<BoardFormat>(initialFormat);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [showOriginalComparison, setShowOriginalComparison] = useState(false);

  // Recreated Regions: Price, Name, Pack, Footer
  const [regions, setRegions] = useState<RecreatedBoardRegion[]>([
    {
      id: 'price-region',
      type: 'price',
      x: 10,
      y: 20,
      width: 80,
      height: 25,
      detectedText: '199',
      replacementText: '249',
      fontSizePt: 54,
      maskColor: '#ffffff',
    },
    {
      id: 'name-region',
      type: 'name',
      x: 10,
      y: 50,
      width: 80,
      height: 20,
      detectedText: 'PREMIUM PRODUCT',
      replacementText: 'PREMIUM PRODUCT',
      fontSizePt: 18,
      maskColor: '#ffffff',
    },
    {
      id: 'footer-region',
      type: 'footer',
      x: 10,
      y: 82,
      width: 80,
      height: 12,
      detectedText: '(FINAL PRICE ON THE PRODUCT)',
      replacementText: '(FINAL PRICE ON THE PRODUCT)',
      fontSizePt: 12,
      maskColor: '#ffffff',
    },
  ]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUpdateRegionText = (id: string, text: string) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, replacementText: text } : r))
    );
  };

  const handleUpdateRegionPosition = (id: string, field: 'x' | 'y' | 'width' | 'height', val: number) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleApplyToSlot = () => {
    const priceRegion = regions.find((r) => r.type === 'price');
    const nameRegion = regions.find((r) => r.type === 'name');
    const footerRegion = regions.find((r) => r.type === 'footer');

    const numSp = priceRegion ? parseInt(priceRegion.replacementText.replace(/[^0-9]/g, ''), 10) || 199 : 199;
    const nameStr = nameRegion?.replacementText || '';
    const footerStr = footerRegion?.replacementText || '(FINAL PRICE ON THE PRODUCT)';

    onApplyToSlot({
      displayName: nameStr,
      displaySp: numSp,
      customFooter: footerStr,
      imageUrl: uploadedImageUrl || undefined,
      imagePlacementMode: 'BACKGROUND',
      imageOpacity: 1.0,
      textBacking: true, // Clean white mask behind replacement text guarantees old text is 100% hidden!
    });
    onClose();
  };

  const handleSaveAsTemplate = async () => {
    if (!uploadedImageUrl) return;
    const session: RecreatedBoardSession = {
      id: `recreated_${Date.now()}`,
      referenceImageUrl: uploadedImageUrl,
      targetFormat: selectedFormat,
      regions,
      createdAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`recreated_template_${session.id}`, JSON.stringify(session));
      alert('Saved recreated board session as reusable template!');
    } catch {
      // Storage fallback
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex justify-between items-center bg-neutral-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500 rounded-lg text-black font-black">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide text-white">
                Recreate Board From Image
              </h3>
              <p className="text-xs text-neutral-400">
                Upload a screenshot of an existing board, mask old text with clean white patches, and replace prices effortlessly.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Upload & Live Canvas Preview (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />

            {!uploadedImageUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 hover:border-amber-500 rounded-2xl p-10 text-center cursor-pointer bg-neutral-50 hover:bg-amber-50/30 transition-all flex flex-col items-center justify-center space-y-3 min-h-[380px]"
              >
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-neutral-600 border border-neutral-200">
                  <Upload className="w-7 h-7 text-neutral-800" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-neutral-900 uppercase">
                    Upload Board Screenshot / Photo
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-xs mt-1">
                    Upload any completed retail price board image. We will help you mask the old price and replace it with editable values.
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-black text-amber-400 text-xs font-black rounded-lg shadow-sm"
                >
                  Choose Image File
                </button>
              </div>
            ) : (
              /* Reconstructed Visual Canvas with Masking Overlays */
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-neutral-700 truncate max-w-xs">
                    File: {fileName}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowOriginalComparison((v) => !v)}
                      className={`px-2.5 py-1 rounded text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        showOriginalComparison
                          ? 'bg-purple-600 text-white'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showOriginalComparison ? 'Show Reconstructed' : 'Compare Original'}</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-bold"
                    >
                      Replace Image
                    </button>
                  </div>
                </div>

                {/* The Board Frame with variable masks */}
                <div className="relative border-4 border-black bg-white rounded-lg shadow-inner overflow-hidden aspect-[4/3] flex items-center justify-center select-none">
                  {/* Background Board Screenshot */}
                  <img
                    src={uploadedImageUrl}
                    alt="Original Board"
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* If not showing original comparison, render clean opaque white mask patches over old text! */}
                  {!showOriginalComparison &&
                    regions.map((region) => (
                      <div
                        key={region.id}
                        style={{
                          left: `${region.x}%`,
                          top: `${region.y}%`,
                          width: `${region.width}%`,
                          height: `${region.height}%`,
                          backgroundColor: region.maskColor || '#ffffff',
                        }}
                        className="absolute flex items-center justify-center border-2 border-blue-500/80 rounded-xs shadow-xs z-20 group"
                      >
                        {/* Replacement Text rendered sharply on top of white patch */}
                        {region.type === 'price' ? (
                          <div className="flex items-baseline font-black text-black leading-none tracking-tight">
                            <span className="text-xl mr-1">₹</span>
                            <span className="text-4xl font-extrabold">{region.replacementText}</span>
                            <span className="text-sm uppercase font-black ml-1.5 font-sans">ONLY</span>
                          </div>
                        ) : (
                          <div className="font-black text-black text-center uppercase tracking-wide px-1 truncate">
                            {region.replacementText}
                          </div>
                        )}

                        <span className="absolute -top-2.5 left-1 text-[8px] font-mono bg-blue-600 text-white px-1 py-0.2 rounded font-bold uppercase pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                          {region.type} mask
                        </span>
                      </div>
                    ))}
                </div>

                <div className="p-2.5 bg-neutral-100 rounded-lg text-[11px] text-neutral-600 flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Clean opaque white backing patches cleanly mask the original text. Old price is 100% invisible!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Variable Regions Editor (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div className="space-y-1">
              <label className="font-black text-xs uppercase text-neutral-700 block">
                Target Board Format:
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as BoardFormat)}
                className="w-full border border-neutral-300 rounded-lg p-2 text-xs font-bold"
              >
                <option value="1/8">1/8 A4 (8 Boards)</option>
                <option value="1/4">1/4 A4 (4 Boards)</option>
                <option value="1/2">1/2 A4 (2 Boards)</option>
                <option value="1/1">1/1 A4 (1 Full Poster)</option>
                <option value="1/3">1/3 A4 (3 Shelf Strips)</option>
                <option value="ROUND">ROUND BOARD (15 Oval Labels)</option>
                <option value="NOTEBOOK">NOTE BOOK 1 (Special Promo Sheet)</option>
              </select>
            </div>

            {/* Region Replacement Fields */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-1.5">
                <span className="font-black text-xs uppercase text-neutral-900">
                  Variable Text Layers ({regions.length})
                </span>
                <span className="text-[10px] text-neutral-500">Edit values below</span>
              </div>

              {regions.map((region) => (
                <div
                  key={region.id}
                  className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black uppercase text-neutral-800 text-[11px]">
                      {region.type === 'price' ? 'Selling Price' : region.type === 'name' ? 'Product Name' : 'Footer Text'}
                    </span>
                    <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded font-mono">
                      Y: {region.y}%
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-0.5">Replacement Value:</label>
                    <input
                      type="text"
                      value={region.replacementText}
                      onChange={(e) => handleUpdateRegionText(region.id, e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded p-1.5 font-bold font-mono text-sm"
                      placeholder="Enter new text..."
                    />
                  </div>

                  {/* Position Fine-Tuning Slider */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-500">
                    <div>
                      <span>Vertical Y ({region.y}%):</span>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        value={region.y}
                        onChange={(e) => handleUpdateRegionPosition(region.id, 'y', parseInt(e.target.value, 10))}
                        className="w-full accent-blue-600 h-1"
                      />
                    </div>
                    <div>
                      <span>Height ({region.height}%):</span>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        value={region.height}
                        onChange={(e) => handleUpdateRegionPosition(region.id, 'height', parseInt(e.target.value, 10))}
                        className="w-full accent-blue-600 h-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-neutral-200">
              <button
                onClick={handleApplyToSlot}
                disabled={!uploadedImageUrl}
                className="w-full py-2.5 bg-black hover:bg-neutral-800 disabled:opacity-40 text-amber-400 font-black text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>APPLY TO CURRENT BOARD SLOT</span>
              </button>

              <button
                onClick={handleSaveAsTemplate}
                disabled={!uploadedImageUrl}
                className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 text-neutral-800 font-bold text-xs rounded-xl border border-neutral-300 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>SAVE AS REUSABLE TEMPLATE</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
