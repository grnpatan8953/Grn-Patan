import React, { useState } from 'react';
import {
  Printer,
  X,
  FileDown,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
} from 'lucide-react';
import { BoardSlot, BoardTemplateConfig } from '../types';
import { A4PrintSheet } from './A4PrintSheet';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: BoardSlot[];
  config: BoardTemplateConfig;
  onPrintConfirmed: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  slots,
  config,
  onPrintConfirmed,
}) => {
  const [scale, setScale] = useState(0.72);

  if (!isOpen) return null;

  const handlePrint = () => {
    onPrintConfirmed();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs no-print">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl border border-neutral-700 overflow-hidden text-white">
        {/* Top Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 rounded-lg text-black">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-white tracking-wide">
                A4 Print Preview & Export
              </h2>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <span>Format: {config.name}</span>
                <span>•</span>
                <span className="font-mono">210mm × 297mm</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">{config.slotsCount} Boards</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center space-x-1 bg-neutral-800 px-2 py-1 rounded-lg">
              <button
                onClick={() => setScale((s) => Math.max(0.4, s - 0.05))}
                className="p-1 hover:bg-neutral-700 rounded text-neutral-300"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-neutral-300">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(1.0, s + 0.05))}
                className="p-1 hover:bg-neutral-700 rounded text-neutral-300"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-4 py-2 rounded-lg text-xs shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-neutral-850 px-4 py-2 border-b border-neutral-800 text-xs text-neutral-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Print Setting Recommendation:</strong> Set <em>Margins: None</em> (or Minimum) and ensure{' '}
              <em>Paper size: A4</em> in your browser print window for exact edge-to-edge alignment.
            </span>
          </div>
        </div>

        {/* Scrollable A4 Viewer */}
        <div className="flex-1 overflow-auto bg-neutral-950/70 p-6 flex justify-center items-start">
          <div
            className="a4-preview-scale-wrapper transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              marginBottom: `calc((297mm * ${scale}) - 297mm + 40px)`,
            }}
          >
            <A4PrintSheet
              slots={slots}
              config={config}
              interactive={false}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-xs text-neutral-400 flex justify-between items-center">
          <span className="font-mono">
            Sheet Layout: {config.cols} columns × {config.rows} rows = {config.slotsCount} boards
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-bold transition"
            >
              Back to Editor
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-xs font-black transition cursor-pointer"
            >
              Send to Printer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
