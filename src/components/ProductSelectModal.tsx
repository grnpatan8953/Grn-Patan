import React, { useState, useEffect } from 'react';
import { Search, X, Package, Check, Tag, Star } from 'lucide-react';
import { FocusItem, Product } from '../types';
import { StorageService } from '../services/storage';
import { FocusDetectionService } from '../services/focusDetectionService';

interface ProductSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  slotIndex: number;
}

export const ProductSelectModal: React.FC<ProductSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  slotIndex,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadFocusItems();
      loadProducts(query);
    }
  }, [isOpen, query]);

  const loadFocusItems = async () => {
    try {
      const activeCampaign = await StorageService.getActiveFocusCampaign();
      if (activeCampaign) {
        const items = await StorageService.getFocusItems(activeCampaign.id);
        setFocusItems(items);
      } else {
        setFocusItems([]);
      }
    } catch {
      setFocusItems([]);
    }
  };

  const loadProducts = async (q: string) => {
    setLoading(true);
    try {
      const items = await StorageService.searchProducts(q, 30);
      setResults(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-neutral-900 text-white flex justify-between items-center">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Slot #{slotIndex + 1} Assignment
            </div>
            <h3 className="text-base font-black uppercase text-white mt-0.5">
              Select Product for Board
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-3 bg-neutral-100 border-b border-neutral-200">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product name, code, barcode..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-neutral-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-neutral-400 font-medium">
              Searching catalogue...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-neutral-400">
              <Package className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-neutral-600">No matching products found</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Upload a stock report or adjust your search keywords
              </p>
            </div>
          ) : (
            results.map((prod) => {
              const focusResult = FocusDetectionService.checkProductFocusSync(prod, focusItems);
              const isApprovedFocus = focusResult.isFocus && focusResult.status === 'APPROVED';

              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    onSelect(prod);
                    onClose();
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between group ${
                    isApprovedFocus ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-neutral-900 group-hover:text-amber-800 text-sm uppercase">
                        {prod.itemName}
                      </span>
                      {focusResult.isFocus && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 shadow-2xs ${
                            isApprovedFocus
                              ? 'bg-amber-400 text-black border border-black'
                              : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          <Star className="w-2.5 h-2.5 fill-black" />
                          <span>
                            {isApprovedFocus ? `FOCUS — ₹${focusResult.focusSp}` : 'FOCUS PENDING'}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                      <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-[11px] font-bold">
                        {prod.code}
                      </span>
                      {prod.barcode && <span className="font-mono text-[11px]">BC: {prod.barcode}</span>}
                      {prod.brand && <span>• {prod.brand}</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-right">
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase line-through font-mono">
                        MRP ₹{prod.mrp}
                      </div>
                      <div className="text-lg font-black text-black bg-amber-400 px-2 py-0.5 rounded shadow-2xs font-mono">
                        ₹{isApprovedFocus && focusResult.focusSp ? focusResult.focusSp : prod.retail}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-neutral-100 group-hover:bg-amber-500 flex items-center justify-center transition">
                      <Check className="w-4 h-4 text-neutral-400 group-hover:text-black" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500 flex justify-between items-center">
          <span>
            Click any product to populate Slot #{slotIndex + 1}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-neutral-200 hover:bg-neutral-300 rounded font-bold text-neutral-700 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
