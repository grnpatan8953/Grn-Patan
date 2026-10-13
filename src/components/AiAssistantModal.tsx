import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { AiAssistantPlan, BoardFormat, BoardSlot, BoardType, Product } from '../types';
import { AiAssistantService } from '../services/aiAssistantService';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFormat: BoardFormat;
  slots: BoardSlot[];
  allProducts: Product[];
  onApplyPlan: (plan: AiAssistantPlan) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentFormat,
  slots,
  allProducts,
  onApplyPlan,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [currentPlan, setCurrentPlan] = useState<AiAssistantPlan | null>(null);

  if (!isOpen) return null;

  const examplePrompts = [
    'Make 599 3, 699 4, 799 2 round boards',
    'Create 8 boards of ₹49 in 1/8 format',
    'Make 3 boards of ₹299 and 2 boards of ₹399',
    'Create 4 final price boards of ₹99',
    'Make Apsara Pencil MRP SAVE board',
    'Change slot 3 to final price',
    'Duplicate slot 1 into slot 5',
    'Put the uploaded product image behind the text',
    'Change all selected boards to MRP SAVE',
    'Make 2 ₹199 boards and 3 ₹249 boards in 1/8 format',
  ];

  const handleGeneratePlan = (text: string) => {
    if (!text.trim()) return;
    const plan = AiAssistantService.parseCommand(text, currentFormat, slots, allProducts);
    setCurrentPlan(plan);
  };

  const occupiedCount = slots.filter((s) => s.displayName || s.product).length;
  const willOverwrite = occupiedCount > 0 && currentPlan && currentPlan.totalBoardsCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-300 overflow-hidden text-neutral-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-white flex justify-between items-center border-b border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500 rounded-lg text-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wide text-white">
                  AI BOARD ASSISTANT
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  OFFLINE PARSER
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Natural-language command engine for automated price board creation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Command Input Area */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-800 mb-1.5 flex items-center justify-between">
              <span>Enter Prompt / Natural-Language Command</span>
              <span className="text-[10px] text-neutral-500 font-normal">
                E.g. &quot;599 3 699 4 799 2 round boards&quot;
              </span>
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGeneratePlan(commandInput);
                  }
                }}
                placeholder="Type your command here, e.g.: Make 599 3, 699 4, 799 2 round boards..."
                className="w-full p-3 bg-neutral-50 border-2 border-neutral-300 rounded-xl text-sm font-semibold focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
              />
              <button
                onClick={() => handleGeneratePlan(commandInput)}
                disabled={!commandInput.trim()}
                className="absolute right-3 bottom-3 px-4 py-1.5 bg-black hover:bg-neutral-800 text-amber-400 font-black rounded-lg text-xs uppercase tracking-wider transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Interpret</span>
              </button>
            </div>
          </div>

          {/* Quick Examples Carousel/Chips */}
          <div>
            <div className="text-[11px] font-bold uppercase text-neutral-500 mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              <span>Quick Example Prompts (Click to try):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {examplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCommandInput(prompt);
                    handleGeneratePlan(prompt);
                  }}
                  className="px-2.5 py-1 bg-neutral-100 hover:bg-amber-100 text-neutral-800 text-[11px] font-semibold rounded-lg border border-neutral-200 transition text-left cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* PREVIEW BEFORE APPLYING PANEL */}
          {currentPlan && (
            <div className="mt-4 bg-amber-50/70 border-2 border-amber-400 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-300 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-amber-500 text-black rounded font-black text-xs">
                    PLAN
                  </div>
                  <h3 className="font-black text-sm uppercase text-neutral-900 tracking-wide">
                    Plan Interpretation &amp; Preview
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold bg-black text-amber-400 px-2 py-0.5 rounded">
                  Format: {currentPlan.targetFormat}
                </span>
              </div>

              <div className="text-sm font-semibold text-neutral-800">
                {currentPlan.explanation}
              </div>

              {/* Items Breakdown */}
              {currentPlan.itemsToCreate.length > 0 && (
                <div className="bg-white p-3 rounded-lg border border-amber-200">
                  <div className="text-[11px] font-bold uppercase text-neutral-600 mb-1.5">
                    Items to create on A4 Page:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {currentPlan.itemsToCreate.map((item, i) => (
                      <div key={i} className="bg-neutral-50 p-2 rounded border border-neutral-200 text-xs font-mono">
                        <div className="font-black text-sm text-neutral-900">
                          ₹{item.price}
                        </div>
                        <div className="text-neutral-600 font-semibold mt-0.5">
                          Quantity: <strong>{item.quantity} slots</strong>
                        </div>
                        {item.productName && (
                          <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                            {item.productName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-neutral-500 mt-2 font-mono">
                    Total: <strong>{currentPlan.totalBoardsCount} occupied slots</strong>
                    {currentPlan.targetFormat === 'ROUND' && (
                      <span> (out of 15 oval slots, {15 - currentPlan.totalBoardsCount} remaining empty)</span>
                    )}
                  </div>
                </div>
              )}

              {/* Overwrite Confirmation Warning */}
              {willOverwrite && (
                <div className="bg-rose-50 border border-rose-300 p-2.5 rounded-lg flex items-start gap-2 text-xs text-rose-800 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Current page already has {occupiedCount} occupied slot(s). Applying this plan will overwrite the existing boards.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-neutral-100 border-t border-neutral-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-lg text-xs font-bold text-neutral-700"
          >
            Cancel
          </button>

          {currentPlan && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  onApplyPlan(currentPlan);
                  onClose();
                }}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs shadow transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply Plan to Board Maker</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
