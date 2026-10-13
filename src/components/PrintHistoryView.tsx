import React, { useState, useEffect } from 'react';
import {
  History,
  Printer,
  Copy,
  Trash2,
  Calendar,
  Grid,
  Tag,
  ArrowRight,
  Package,
} from 'lucide-react';
import { PrintHistoryItem } from '../types';
import { StorageService } from '../services/storage';

interface PrintHistoryViewProps {
  onLoadBoard: (item: PrintHistoryItem) => void;
  onQuickReprint: (item: PrintHistoryItem) => void;
}

export const PrintHistoryView: React.FC<PrintHistoryViewProps> = ({
  onLoadBoard,
  onQuickReprint,
}) => {
  const [historyList, setHistoryList] = useState<PrintHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const items = await StorageService.getPrintHistory();
      setHistoryList(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this print history entry?')) {
      await StorageService.deletePrintHistory(id);
      loadHistory();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-amber-500" />
            <span>Print & Board History</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Previous promotional boards created and printed. You can view, re-load into Board Maker, or reprint anytime.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-500">
          Loading history...
        </div>
      ) : historyList.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-500">
          <History className="w-12 h-12 mx-auto text-neutral-300 mb-2" />
          <h3 className="font-bold text-neutral-700">No print records yet</h3>
          <p className="text-xs text-neutral-400 mt-1">
            When you print or preview boards from the Board Maker, they will automatically be preserved here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {historyList.map((item) => {
            const filledSlots = item.slots.filter((s) => s.displayName || s.product);
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:border-amber-400 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                    <span className="bg-black text-amber-400 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                      {item.format}
                    </span>
                  </div>

                  <h3 className="font-black text-neutral-900 uppercase text-base truncate">
                    {item.title || `${item.format} Board Print`}
                  </h3>
                  <div className="text-xs text-neutral-500 mt-0.5 font-medium">
                    {filledSlots.length} products on {item.format} A4 page
                  </div>

                  {/* Products snippet */}
                  <div className="mt-3 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 space-y-1.5 max-h-36 overflow-y-auto">
                    {filledSlots.slice(0, 4).map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="truncate font-semibold text-neutral-800 pr-2 uppercase">
                          {s.displayName}
                        </span>
                        <span className="font-mono font-black text-black bg-amber-300 px-1.5 py-0.2 rounded text-[11px] flex-shrink-0">
                          ₹{s.displaySp}
                        </span>
                      </div>
                    ))}
                    {filledSlots.length > 4 && (
                      <div className="text-[10px] text-neutral-400 text-center pt-1 font-semibold">
                        + {filledSlots.length - 4} more slots
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 transition"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onLoadBoard(item)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-lg transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Edit in Maker</span>
                    </button>
                    <button
                      onClick={() => onQuickReprint(item)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Reprint</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
