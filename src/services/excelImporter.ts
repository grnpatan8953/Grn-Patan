import * as XLSX from 'xlsx';
import { DetectedColumns, ImportSummary, Product } from '../types';

export interface ParseResult {
  products: Product[];
  summary: ImportSummary;
}

// Clean text helper: trim and normalize spaces
function cleanStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// Safe numeric barcode / code string converter to prevent scientific notation (e.g., 8.90123e+12)
export function safeBarcodeString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return '';
    // Check if it's in scientific notation like "8.90123e+12"
    if (/[0-9](\.[0-9]+)?e\+[0-9]+/i.test(s)) {
      try {
        const num = Number(s);
        if (!isNaN(num)) return BigInt(Math.round(num)).toString();
      } catch {
        return s;
      }
    }
    return s;
  }
  if (typeof val === 'number') {
    if (isNaN(val)) return '';
    // If it's a huge integer barcode like 8901030789123
    if (Number.isInteger(val)) {
      return BigInt(val).toString();
    }
    // Float representation of large int
    return BigInt(Math.round(val)).toString();
  }
  return String(val).trim();
}

// Clean number parser
function parseNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  const clean = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

// Normalize column header for flexible fuzzy matching
function normalizeHeader(h: unknown): string {
  if (!h) return '';
  return String(h)
    .toUpperCase()
    .replace(/[_\-.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class ExcelImporter {
  static async parseFile(
    file: File | ArrayBuffer,
    fileName: string,
    fileSize?: number,
    onProgress?: (percent: number, message: string) => void
  ): Promise<ParseResult> {
    onProgress?.(5, 'Reading Excel file buffer...');

    let buffer: ArrayBuffer;
    if (file instanceof File) {
      buffer = await file.arrayBuffer();
    } else {
      buffer = file;
    }

    onProgress?.(20, 'Loading workbook sheets...');
    // Yield to keep UI responsive
    await new Promise((r) => setTimeout(r, 10));

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: false,
        raw: false, // get formatted text representations where possible to preserve barcodes
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Unsupported or corrupted Excel file: ${msg}`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Unsupported Excel file: The workbook contains no sheets.');
    }

    // Usually stock report is on the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" is empty or invalid.`);
    }

    onProgress?.(35, 'Scanning sheet rows for table header...');
    await new Promise((r) => setTimeout(r, 10));

    // Convert sheet to 2D array of rows (preserving blank rows to keep 1:1 Excel row number alignment)
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: true,
    });

    if (!rawData || rawData.length === 0) {
      throw new Error('The Excel sheet contains no data rows.');
    }

    // 1. Locate header row in the first ~50 rows
    const maxSearchRows = Math.min(60, rawData.length);
    let headerRowIndex = -1;
    let colIndices: Record<string, number> = {};
    let detectedCols: Partial<DetectedColumns> = {};

    for (let r = 0; r < maxSearchRows; r++) {
      const row = rawData[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const normRow = row.map(normalizeHeader);

      // Helper to find column index with strict priority (exact matches first)
      const findCol = (
        candidates: string[],
        excluded: string[] = []
      ): { idx: number; name: string } | null => {
        // Pass 1: Exact match
        for (let c = 0; c < normRow.length; c++) {
          const cell = normRow[c];
          if (!cell) continue;
          if (excluded.some((exc) => cell === exc || cell.includes(exc))) continue;
          for (const cand of candidates) {
            if (cell === cand) {
              return { idx: c, name: String(row[c]) };
            }
          }
        }
        // Pass 2: Prefix / phrase match
        for (let c = 0; c < normRow.length; c++) {
          const cell = normRow[c];
          if (!cell) continue;
          if (excluded.some((exc) => cell === exc || cell.includes(exc))) continue;
          for (const cand of candidates) {
            if (cell.startsWith(cand + ' ') || cell.endsWith(' ' + cand)) {
              return { idx: c, name: String(row[c]) };
            }
          }
        }
        return null;
      };

      const mainCodeMatch = findCol(['MAIN CODE', 'MAINCODE', 'MAIN CAT', 'MAIN GROUP']);
      const itemNameMatch = findCol(['ITEM NAME', 'ITEM DESCRIPTION', 'DESCRIPTION', 'PRODUCT NAME', 'PARTICULARS']);
      // For CODE: exclude MAIN CODE and BAR CODE!
      const codeMatch = findCol(
        ['CODE', 'ITEM CODE', 'ITEMCODE', 'PROD CODE', 'PRODUCT CODE', 'PLU'],
        ['MAIN CODE', 'BAR CODE', 'BARCODE']
      );
      const barcodeMatch = findCol(['BAR CODE', 'BARCODE', 'BAR_CODE', 'EAN', 'EAN CODE', 'UPC']);
      const mrpMatch = findCol(['MRP', 'M R P', 'M.R.P.', 'MAX RETAIL PRICE']);
      const retailMatch = findCol(['RETAIL', 'RETAIL RATE', 'RETAIL PRICE', 'RETAIL SP', 'SP', 'SELLING PRICE']);
      const qtyMatch = findCol(['CLOSING QTY', 'CLOSE QTY', 'CLOSING STOCK', 'BAL QTY', 'QTY', 'BALANCE QTY']);

      // A valid stock report header row MUST have at least MRP, RETAIL, and either ITEM NAME or CODE or MAIN CODE
      const keyCount = [
        mainCodeMatch,
        itemNameMatch,
        codeMatch,
        barcodeMatch,
        mrpMatch,
        retailMatch,
      ].filter(Boolean).length;

      if (keyCount >= 4 || (mrpMatch && retailMatch && (itemNameMatch || codeMatch))) {
        headerRowIndex = r;
        colIndices = {
          mainCode: mainCodeMatch ? mainCodeMatch.idx : -1,
          itemName: itemNameMatch ? itemNameMatch.idx : -1,
          code: codeMatch ? codeMatch.idx : -1,
          barcode: barcodeMatch ? barcodeMatch.idx : -1,
          closingQty: qtyMatch ? qtyMatch.idx : -1,
          mrp: mrpMatch ? mrpMatch.idx : -1,
          retail: retailMatch ? retailMatch.idx : -1,
        };

        // Also search for optional metadata columns in the same header row
        const catMatch = findCol(['CATEGORY', 'CAT NAME', 'CAT']);
        const groupMatch = findCol(['GROUP', 'GRP', 'GROUP NAME']);
        const subGroupMatch = findCol(['SUB GROUP', 'SUBGROUP', 'SUB GRP']);
        const brandMatch = findCol(['BRAND', 'BRAND NAME']);
        const mfgMatch = findCol(['MANUFACTURER', 'MFG', 'COMPANY']);
        const segmentMatch = findCol(['SEGMENT', 'CLASS']);

        if (catMatch) colIndices.category = catMatch.idx;
        if (groupMatch) colIndices.group = groupMatch.idx;
        if (subGroupMatch) colIndices.subGroup = subGroupMatch.idx;
        if (brandMatch) colIndices.brand = brandMatch.idx;
        if (mfgMatch) colIndices.manufacturer = mfgMatch.idx;
        if (segmentMatch) colIndices.segment = segmentMatch.idx;

        detectedCols = {
          mainCodeCol: mainCodeMatch ? mainCodeMatch.name : '',
          itemNameCol: itemNameMatch ? itemNameMatch.name : '',
          codeCol: codeMatch ? codeMatch.name : '',
          barcodeCol: barcodeMatch ? barcodeMatch.name : '',
          closingQtyCol: qtyMatch ? qtyMatch.name : '',
          mrpCol: mrpMatch ? mrpMatch.name : '',
          retailCol: retailMatch ? retailMatch.name : '',
          categoryCol: catMatch?.name,
          groupCol: groupMatch?.name,
          subGroupCol: subGroupMatch?.name,
          brandCol: brandMatch?.name,
          manufacturerCol: mfgMatch?.name,
          segmentCol: segmentMatch?.name,
        };

        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error(
        'Could not locate the stock report header row in the first 50 rows. Please verify this is a valid stock report containing columns like MAIN CODE, ITEM NAME, MRP, and RETAIL.'
      );
    }

    // Explicit business rule checks with clear errors
    if (colIndices.mainCode === -1) {
      throw new Error('MAIN CODE column not found in header row (searched up to row ' + (headerRowIndex + 1) + ').');
    }
    if (colIndices.mrp === -1) {
      throw new Error('MRP column not found in header row (searched up to row ' + (headerRowIndex + 1) + ').');
    }
    if (colIndices.retail === -1) {
      throw new Error('RETAIL column not found in header row (searched up to row ' + (headerRowIndex + 1) + '). Note: The application requires the RETAIL column for the Selling Price (SP).');
    }
    if (colIndices.itemName === -1 && colIndices.code === -1) {
      throw new Error('Neither ITEM NAME nor CODE column was found in the header row.');
    }

    onProgress?.(50, `Found header row at row ${headerRowIndex + 1}. Filtering NON CORE items...`);
    await new Promise((r) => setTimeout(r, 10));

    // 2. Parse data rows starting after headerRowIndex
    const totalDataRows = rawData.length - (headerRowIndex + 1);
    const products: Product[] = [];
    let rowsScanned = 0;
    let productsSkipped = 0;

    const sampleRows: ImportSummary['sampleRows'] = [];

    const getVal = (row: unknown[], idx: number | undefined): unknown => {
      if (idx === undefined || idx < 0 || idx >= row.length) return '';
      return row[idx];
    };

    const chunkSize = 2000;
    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
      rowsScanned++;
      const row = rawData[r];
      if (!Array.isArray(row) || row.length === 0) {
        productsSkipped++;
        continue;
      }

      // Check MAIN CODE
      const rawMainCode = cleanStr(getVal(row, colIndices.mainCode));
      if (!rawMainCode) {
        productsSkipped++;
        continue;
      }

      // CRITICAL BUSINESS RULE: Only products where MAIN CODE = NON CORE
      // Case-insensitive & whitespace-safe
      const isNonCore = rawMainCode.toUpperCase().replace(/\s+/g, ' ') === 'NON CORE';
      if (!isNonCore) {
        productsSkipped++;
        continue;
      }

      // Extract CODE & BARCODE (preserve strictly as string, no scientific notation)
      const code = safeBarcodeString(getVal(row, colIndices.code));
      const barcode = safeBarcodeString(getVal(row, colIndices.barcode));
      const itemName = cleanStr(getVal(row, colIndices.itemName));

      // Skip row if no identifier or name
      if (!code && !barcode && !itemName) {
        productsSkipped++;
        continue;
      }

      // Business Rule: MRP = MRP, RETAIL = SP
      const mrp = parseNumber(getVal(row, colIndices.mrp));
      const retail = parseNumber(getVal(row, colIndices.retail));
      const closingQty = parseNumber(getVal(row, colIndices.closingQty));

      // Primary ID: CODE if present, otherwise BARCODE, otherwise auto ID
      const id = code || barcode || `PROD-${r}`;

      const product: Product = {
        id,
        code: code || barcode || `P${r}`,
        barcode: barcode || code || '',
        mainCode: 'NON CORE',
        itemName: itemName || code || 'NON CORE ITEM',
        category: cleanStr(getVal(row, colIndices.category)),
        group: cleanStr(getVal(row, colIndices.group)),
        subGroup: cleanStr(getVal(row, colIndices.subGroup)),
        brand: cleanStr(getVal(row, colIndices.brand)),
        manufacturer: cleanStr(getVal(row, colIndices.manufacturer)),
        segment: cleanStr(getVal(row, colIndices.segment)),
        closingQty,
        mrp,
        retail, // SP
        updatedAt: new Date().toISOString(),
      };

      products.push(product);

      if (sampleRows.length < 5) {
        sampleRows.push({
          code: product.code,
          barcode: product.barcode,
          name: product.itemName,
          mrp: product.mrp,
          retail: product.retail,
          mainCode: product.mainCode,
          qty: product.closingQty,
        });
      }

      if (rowsScanned % chunkSize === 0) {
        const percent = 50 + Math.floor((rowsScanned / totalDataRows) * 45);
        onProgress?.(percent, `Processed ${rowsScanned.toLocaleString()} of ${totalDataRows.toLocaleString()} rows...`);
        await new Promise((res) => setTimeout(res, 0));
      }
    }

    if (products.length === 0) {
      throw new Error(
        `Scanned ${rowsScanned} rows from header row ${headerRowIndex + 1}, but found 0 products with MAIN CODE = "NON CORE". Please verify the MAIN CODE column values in this report.`
      );
    }

    onProgress?.(100, `Done! Extracted ${products.length} NON CORE products.`);

    const summary: ImportSummary = {
      fileName,
      fileSize,
      rowsScanned,
      nonCoreImported: products.length,
      productsUpdated: 0,
      productsAdded: products.length,
      productsSkipped,
      headerRowIndex: headerRowIndex + 1, // 1-indexed for display
      detectedColumns: detectedCols as DetectedColumns,
      importDate: new Date().toLocaleString(),
      sampleRows,
    };

    return { products, summary };
  }
}
