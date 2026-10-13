import { Product } from '../types';

/**
 * Normalizes an identifier string (barcode or product code) for retail searching.
 * Preserves the original string representation, but computes a normalized key
 * that strips leading zeros for numeric sequences and trims whitespace.
 */
export function normalizeIdentifier(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim().replace(/[\r\n\t]/g, '');
  return s;
}

/**
 * Strips leading zeros if the string is numeric or contains leading zeros followed by digits.
 * Example: "013000113" -> "13000113"
 * Example: "13000113" -> "13000113"
 * Example: "00052" -> "52"
 * Example: "0" -> "0"
 * Example: "NC-1001" -> "NC-1001" (non-numeric unchanged)
 */
export function stripLeadingZeros(val: string): string {
  const trimmed = val.trim();
  if (/^0+[0-9]+$/.test(trimmed)) {
    const stripped = trimmed.replace(/^0+/, '');
    return stripped === '' ? '0' : stripped;
  }
  return trimmed;
}

export interface SearchMatch {
  product: Product;
  matchType: 'EXACT_BARCODE' | 'EXACT_CODE' | 'NORMALIZED_BARCODE' | 'NORMALIZED_CODE' | 'PARTIAL_CODE' | 'NAME_MATCH';
  score: number;
}

export class ProductSearchService {
  /**
   * Unified search method used across the entire application:
   * - Products catalogue
   * - Board Maker
   * - Add Board dialog
   * - Barcode scanner
   * - AI Board Assistant
   */
  static search(
    products: Product[],
    query: string,
    limit = 50,
    categoryFilter?: string
  ): Product[] {
    const rawQuery = normalizeIdentifier(query);
    const hasCategory = Boolean(categoryFilter && categoryFilter !== 'ALL');

    // Filter candidate pool by category first if selected
    const pool = hasCategory
      ? products.filter((p) => p.category === categoryFilter)
      : products;

    if (!rawQuery) {
      return pool.slice(0, limit);
    }

    const lowerQuery = rawQuery.toLowerCase();
    const queryStripped = stripLeadingZeros(rawQuery).toLowerCase();
    const queryTokens = lowerQuery.split(/\s+/).filter(Boolean);

    const exactBarcodeMatches: Product[] = [];
    const exactCodeMatches: Product[] = [];
    const normalizedBarcodeMatches: Product[] = [];
    const normalizedCodeMatches: Product[] = [];
    const partialCodeMatches: Product[] = [];
    const exactNameMatches: Product[] = [];
    const partialNameMatches: Product[] = [];

    const seenIds = new Set<string>();

    for (const prod of pool) {
      const origCode = normalizeIdentifier(prod.code);
      const origBarcode = normalizeIdentifier(prod.barcode);
      const lowerCode = origCode.toLowerCase();
      const lowerBarcode = origBarcode.toLowerCase();
      const lowerName = prod.itemName.toLowerCase();
      const lowerBrand = (prod.brand || '').toLowerCase();
      const lowerCategory = (prod.category || '').toLowerCase();
      const lowerGroup = (prod.group || '').toLowerCase();

      const codeStripped = stripLeadingZeros(origCode).toLowerCase();
      const barcodeStripped = stripLeadingZeros(origBarcode).toLowerCase();

      // 1. Exact original barcode match (highest priority, scanner standard)
      if (lowerBarcode && lowerBarcode === lowerQuery) {
        if (!seenIds.has(prod.id)) {
          seenIds.add(prod.id);
          exactBarcodeMatches.push(prod);
        }
        continue;
      }

      // 2. Exact original code match
      if (lowerCode && lowerCode === lowerQuery) {
        if (!seenIds.has(prod.id)) {
          seenIds.add(prod.id);
          exactCodeMatches.push(prod);
        }
        continue;
      }

      // 3. Leading-zero normalized barcode match (e.g., query "013000113" matching "13000113" or vice-versa)
      if (barcodeStripped && queryStripped && barcodeStripped === queryStripped) {
        if (!seenIds.has(prod.id)) {
          seenIds.add(prod.id);
          normalizedBarcodeMatches.push(prod);
        }
        continue;
      }

      // 4. Leading-zero normalized code match (e.g., code "13000113" vs query "013000113")
      if (codeStripped && queryStripped && codeStripped === queryStripped) {
        if (!seenIds.has(prod.id)) {
          seenIds.add(prod.id);
          normalizedCodeMatches.push(prod);
        }
        continue;
      }

      // 5. Exact product name match
      if (lowerName === lowerQuery) {
        if (!seenIds.has(prod.id)) {
          seenIds.add(prod.id);
          exactNameMatches.push(prod);
        }
        continue;
      }

      // 6. Partial code/barcode match (starts with or includes)
      if (
        (lowerCode && lowerCode.includes(lowerQuery)) ||
        (codeStripped && queryStripped && codeStripped.includes(queryStripped)) ||
        (lowerBarcode && lowerBarcode.includes(lowerQuery)) ||
        (barcodeStripped && queryStripped && barcodeStripped.includes(queryStripped))
      ) {
        if (!seenIds.has(prod.id)) {
          seenIds.add(prod.id);
          partialCodeMatches.push(prod);
        }
        continue;
      }

      // 7. General text search: item name, brand, category, group
      const combinedText = `${lowerName} ${lowerBrand} ${lowerCategory} ${lowerGroup}`;
      if (
        lowerName.includes(lowerQuery) ||
        lowerBrand.includes(lowerQuery) ||
        lowerCategory.includes(lowerQuery) ||
        (queryTokens.length > 1 && queryTokens.every((token) => combinedText.includes(token)))
      ) {
        if (!seenIds.has(prod.id)) {
          seenIds.add(prod.id);
          partialNameMatches.push(prod);
        }
        continue;
      }
    }

    const merged = [
      ...exactBarcodeMatches,
      ...exactCodeMatches,
      ...normalizedBarcodeMatches,
      ...normalizedCodeMatches,
      ...exactNameMatches,
      ...partialCodeMatches,
      ...partialNameMatches,
    ];

    return merged.slice(0, limit);
  }

  /**
   * Find a single best matching product (e.g. for direct scanner input or AI assistant).
   * Returns null if ambiguous or not found.
   */
  static findExactOrBestMatch(products: Product[], query: string): { product: Product | null; isAmbiguous: boolean; candidates: Product[] } {
    const results = this.search(products, query, 15);
    if (results.length === 0) {
      return { product: null, isAmbiguous: false, candidates: [] };
    }

    const rawQuery = normalizeIdentifier(query).toLowerCase();
    const queryStripped = stripLeadingZeros(rawQuery);

    // Check if first result is an exact or normalized code/barcode match
    const first = results[0];
    const code = normalizeIdentifier(first.code).toLowerCase();
    const barcode = normalizeIdentifier(first.barcode).toLowerCase();
    const codeStripped = stripLeadingZeros(code);
    const barcodeStripped = stripLeadingZeros(barcode);

    const isDirectMatch =
      code === rawQuery ||
      barcode === rawQuery ||
      codeStripped === queryStripped ||
      barcodeStripped === queryStripped;

    if (isDirectMatch) {
      // Check if there are other exact matches with the same normalized code
      const duplicateNormalized = results.filter((p) => {
        const c = stripLeadingZeros(normalizeIdentifier(p.code).toLowerCase());
        const b = stripLeadingZeros(normalizeIdentifier(p.barcode).toLowerCase());
        return c === queryStripped || b === queryStripped;
      });

      if (duplicateNormalized.length > 1) {
        return { product: null, isAmbiguous: true, candidates: duplicateNormalized };
      }

      return { product: first, isAmbiguous: false, candidates: results };
    }

    if (results.length === 1) {
      return { product: first, isAmbiguous: false, candidates: results };
    }

    return { product: null, isAmbiguous: true, candidates: results };
  }
}
