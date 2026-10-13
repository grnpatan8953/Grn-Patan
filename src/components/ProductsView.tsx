import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Layers,
  Tag,
  Grid,
  Filter,
  Package,
  Plus,
  Check,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { Product } from '../types';
import { StorageService } from '../services/storage';
import { ProductSearchService } from '../services/searchService';

interface ProductsViewProps {
  onAddToBoardSlot?: (product: Product) => void;
  onNavigateToBoardMaker?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  onAddToBoardSlot,
  onNavigateToBoardMaker,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const all = await StorageService.getAllProducts();
      setProducts(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [products]);

  // Filtered list using unified ProductSearchService (handles 13000113 vs 013000113, barcodes, names, and categories)
  const filteredProducts = useMemo(() => {
    return ProductSearchService.search(
      products,
      searchQuery,
      5000,
      selectedCategory
    );
  }, [products, searchQuery, selectedCategory]);

  const handleAddProduct = (prod: Product) => {
    if (onAddToBoardSlot) {
      onAddToBoardSlot(prod);
      setAddedIds((prev) => new Set(prev).add(prod.id));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(prod.id);
          return next;
        });
      }, 1500);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-500" />
            <span>NON CORE Products Catalogue</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Showing {filteredProducts.length.toLocaleString()} of {products.length.toLocaleString()}{' '}
            verified NON CORE products. Selling Price (SP) sourced from Excel RETAIL column.
          </p>
        </div>

        {onNavigateToBoardMaker && (
          <button
            onClick={onNavigateToBoardMaker}
            className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-4 py-2 rounded-lg text-xs shadow transition cursor-pointer"
          >
            <Grid className="w-4 h-4" />
            <span>Open Board Maker</span>
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Product Name, Code, Barcode, Brand..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-black font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-lg text-xs py-2 px-3 font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full md:w-48"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
          <p className="font-semibold text-sm">Loading local NON CORE products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-500">
          <Package className="w-12 h-12 mx-auto text-neutral-300 mb-2" />
          <h3 className="font-bold text-neutral-700">No matching products found</h3>
          <p className="text-xs text-neutral-400 mt-1">
            {products.length === 0
              ? 'No products imported yet. Please upload a stock report first.'
              : 'Try adjusting your search query or category filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Code / Barcode</th>
                  <th className="py-3 px-4">Category & Brand</th>
                  <th className="py-3 px-4 text-right">MRP</th>
                  <th className="py-3 px-4 text-right bg-amber-600 text-black font-black">
                    SP (Retail)
                  </th>
                  <th className="py-3 px-4 text-right">Stock</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {filteredProducts.slice(0, 100).map((prod) => {
                  const isJustAdded = addedIds.has(prod.id);
                  return (
                    <tr key={prod.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* Name & Main Code */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-black text-neutral-900 text-sm">{prod.itemName}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="bg-neutral-100 text-neutral-600 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                            {prod.mainCode}
                          </span>
                          {prod.segment && (
                            <span className="text-[10px] text-neutral-400 font-medium">
                              • {prod.segment}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Code & Barcode */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-neutral-800">{prod.code}</div>
                        <div className="text-[11px] text-neutral-400">{prod.barcode || '—'}</div>
                      </td>

                      {/* Category & Brand */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-700">{prod.category || 'General'}</div>
                        <div className="text-[11px] text-neutral-400">
                          {prod.brand || prod.group || '—'}
                        </div>
                      </td>

                      {/* MRP */}
                      <td className="py-3 px-4 text-right font-bold text-neutral-500 font-mono text-sm">
                        ₹{prod.mrp}
                      </td>

                      {/* SP (Selling Price / Retail) */}
                      <td className="py-3 px-4 text-right font-mono bg-amber-50/50">
                        <span className="text-base font-black text-black bg-amber-400 px-2 py-0.5 rounded shadow-2xs inline-block">
                          ₹{prod.retail}
                        </span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            prod.closingQty > 10
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {prod.closingQty} nos
                        </span>
                      </td>

                      {/* Add Button */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleAddProduct(prod)}
                          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-900 hover:bg-amber-500 hover:text-black text-white'
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Slot</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length > 100 && (
            <div className="p-3 bg-neutral-50 text-center text-xs text-neutral-500 border-t border-neutral-200">
              Showing first 100 matches of {filteredProducts.length.toLocaleString()}. Refine search
              query to narrow down.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
