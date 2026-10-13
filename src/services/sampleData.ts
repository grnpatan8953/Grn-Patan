import * as XLSX from 'xlsx';
import { Product } from '../types';

export const SAMPLE_PRODUCTS: Array<Omit<Product, 'id' | 'updatedAt'>> = [
  {
    code: '13000113',
    barcode: '8901030013000',
    mainCode: 'NON CORE',
    itemName: 'DOVE DAILY SHINE SHAMPOO 180ML',
    category: 'PERSONAL CARE',
    group: 'HAIR CARE',
    subGroup: 'SHAMPOO',
    brand: 'DOVE',
    manufacturer: 'HINDUSTAN UNILEVER',
    segment: 'POPULAR',
    closingQty: 120,
    mrp: 175,
    retail: 129, // SP = 129
  },
  {
    code: 'NC1001',
    barcode: '8901030789123',
    mainCode: 'NON CORE',
    itemName: 'WOMEN RAZOR (6 PCS SET)',
    category: 'PERSONAL CARE',
    group: 'SHAVING & GROOMING',
    subGroup: 'RAZORS',
    brand: 'SUPERMAX',
    manufacturer: 'SUPERMAX ENTERPRISES',
    segment: 'MASS',
    closingQty: 142,
    mrp: 99,
    retail: 49, // SP = 49
  },
  {
    code: 'NC1001B',
    barcode: '8901030789124',
    mainCode: 'NON CORE',
    itemName: 'SPANNER TOOLS (5 PCS SET)',
    category: 'HARDWARE & TOOLS',
    group: 'HAND TOOLS',
    subGroup: 'SPANNERS',
    brand: 'TAPARIA',
    manufacturer: 'TAPARIA TOOLS LTD',
    segment: 'POPULAR',
    closingQty: 75,
    mrp: 499,
    retail: 349, // SP = 349
  },
  {
    code: 'NC1001C',
    barcode: '8901030789125',
    mainCode: 'NON CORE',
    itemName: 'SOFA BRUSH',
    category: 'HOME CARE',
    group: 'CLEANING ACCESSORIES',
    subGroup: 'BRUSHES',
    brand: 'GALA',
    manufacturer: 'FREUDENBERG GALA',
    segment: 'ESSENTIALS',
    closingQty: 110,
    mrp: 199,
    retail: 129, // SP = 129 (No pack text)
  },
  {
    code: 'NC1001D',
    barcode: '8901030789126',
    mainCode: 'NON CORE',
    itemName: 'STONE PEDICURE',
    category: 'PERSONAL CARE',
    group: 'GROOMING',
    subGroup: 'PEDICURE',
    brand: 'VEGA',
    manufacturer: 'VEGA INDUSTRIES',
    segment: 'POPULAR',
    closingQty: 90,
    mrp: 149,
    retail: 89, // SP = 89
  },
  {
    code: 'NC1002',
    barcode: '8901030789130',
    mainCode: 'NON CORE',
    itemName: '3 FOLD UMBRELLA 24/8@349[JG]-1 nos',
    category: 'GENERAL MERCHANDISE',
    group: 'SEASONAL',
    subGroup: 'RAINWEAR',
    brand: 'SUNSHINE',
    manufacturer: 'SUNSHINE IMPEX',
    segment: 'POPULAR',
    closingQty: 85,
    mrp: 349,
    retail: 199, // SP = 199
  },
  {
    code: 'NC1003',
    barcode: '8901030789147',
    mainCode: 'NON CORE',
    itemName: 'STAINLESS STEEL WATER BOTTLE 1000ML',
    category: 'HOME & KITCHEN',
    group: 'DRINKWARE',
    subGroup: 'FLASKS & BOTTLES',
    brand: 'CELLO',
    manufacturer: 'CELLO PLAST WORLD',
    segment: 'PREMIUM',
    closingQty: 64,
    mrp: 399,
    retail: 199, // SP = 199
  },
  {
    code: 'NC1004',
    barcode: '8901030789154',
    mainCode: 'NON CORE',
    itemName: 'BATH TOWEL COTTON SUPER ABSORBENT',
    category: 'HOME TEXTILES',
    group: 'BATH LINEN',
    subGroup: 'TOWELS',
    brand: 'BOMBAY DYEING',
    manufacturer: 'BOMBAY TEXTILES LTD',
    segment: 'COMFORT',
    closingQty: 110,
    mrp: 499,
    retail: 249, // SP = 249
  },
  {
    code: 'NC1005',
    barcode: '8901030789161',
    mainCode: 'NON CORE',
    itemName: 'MICROFIBER CLEANING CLOTH (5 PCS SET)',
    category: 'HOME CARE',
    group: 'CLEANING ACCESSORIES',
    subGroup: 'WIPES & CLOTHS',
    brand: 'SCOTCH BRITE',
    manufacturer: '3M INDIA',
    segment: 'ESSENTIALS',
    closingQty: 220,
    mrp: 149,
    retail: 79, // SP = 79
  },
  {
    code: 'NC1006',
    barcode: '8901030789178',
    mainCode: 'NON CORE',
    itemName: 'PLASTIC STORAGE BASKET SET OF 3',
    category: 'PLASTICWARE',
    group: 'STORAGE & ORGANIZERS',
    subGroup: 'BASKETS',
    brand: 'MILTON',
    manufacturer: 'HAMILTON HOUSEWARES',
    segment: 'HOME CARE',
    closingQty: 48,
    mrp: 299,
    retail: 149, // SP = 149
  },
  {
    code: 'NC1007',
    barcode: '8901030789185',
    mainCode: 'NON CORE',
    itemName: 'CERAMIC COFFEE MUG DESIGNER 350ML',
    category: 'HOME & KITCHEN',
    group: 'TABLEWARE',
    subGroup: 'MUGS & CUPS',
    brand: 'CLAY CRAFT',
    manufacturer: 'CLAY CRAFT INDIA',
    segment: 'LIFESTYLE',
    closingQty: 96,
    mrp: 199,
    retail: 89, // SP = 89
  },
  {
    code: 'NC1008',
    barcode: '8901030789192',
    mainCode: 'NON CORE',
    itemName: 'KITCHEN SCISSORS HEAVY DUTY MULTI-PURPOSE',
    category: 'KITCHEN TOOLS',
    group: 'CUTLERY & TOOLS',
    subGroup: 'SCISSORS',
    brand: 'PIGEON',
    manufacturer: 'STOVEKRAFT LTD',
    segment: 'UTILITY',
    closingQty: 130,
    mrp: 179,
    retail: 69, // SP = 69
  },
  {
    code: 'NC1009',
    barcode: '8901030789208',
    mainCode: 'NON CORE',
    itemName: 'AIR TIGHT GLASS CONTAINER 650ML',
    category: 'HOME & KITCHEN',
    group: 'FOOD STORAGE',
    subGroup: 'GLASS CONTAINERS',
    brand: 'BOROSIL',
    manufacturer: 'BOROSIL LIMITED',
    segment: 'PREMIUM',
    closingQty: 75,
    mrp: 325,
    retail: 159,
  },
  {
    code: 'NC1010',
    barcode: '8901030789215',
    mainCode: 'NON CORE',
    itemName: 'COTTON FLOOR MAT ANTI-SKID 40X60CM',
    category: 'HOME FURNISHING',
    group: 'FLOOR COVERINGS',
    subGroup: 'MATS',
    brand: 'SARAL HOME',
    manufacturer: 'SARAL ENTERPRISES',
    segment: 'VALUE',
    closingQty: 180,
    mrp: 249,
    retail: 99,
  },
  {
    code: 'NC1011',
    barcode: '8901030789222',
    mainCode: 'NON CORE',
    itemName: 'CHOPPING BOARD BAMBOO WOOD LARGE',
    category: 'KITCHEN TOOLS',
    group: 'PREPARATION TOOLS',
    subGroup: 'CHOPPING BOARDS',
    brand: 'SIGNORAware',
    manufacturer: 'TECHNO PLASTIC INDUSTRIES',
    segment: 'ECO',
    closingQty: 52,
    mrp: 449,
    retail: 219,
  },
  {
    code: 'NC1012',
    barcode: '8901030789239',
    mainCode: 'NON CORE',
    itemName: 'STAINLESS STEEL PEELER DUAL BLADE',
    category: 'KITCHEN TOOLS',
    group: 'CUTLERY & TOOLS',
    subGroup: 'PEELERS',
    brand: 'CRYSTAL',
    manufacturer: 'CRYSTAL COOKWARE',
    segment: 'UTILITY',
    closingQty: 210,
    mrp: 99,
    retail: 39,
  },
];

// Generates an in-memory realistic .xlsx buffer
export function generateSampleStockWorkbook(): ArrayBuffer {
  // Title / Metadata rows in the first 4 rows to test search for header row within first 50 rows
  const rows: unknown[][] = [
    ['*** RETAIL STORE CLOSING STOCK VALUATION REPORT ***'],
    ['Branch: Central Hypermarket 01 | As on: ' + new Date().toLocaleDateString()],
    ['Filter: ALL DEPARTMENTS | Generated By: POS Server ERP'],
    [], // empty spacer row 4
    // Header Row (Row 5 - 1-indexed)
    [
      'MAIN CODE',
      'CATEGORY',
      'GROUP',
      'SUB GROUP',
      'BRAND',
      'MANUFACTURER',
      'SEGMENT',
      'ITEM NAME',
      'CODE',
      'BAR CODE',
      'CLOSING QTY',
      'MRP',
      'RETAIL',
    ],
  ];

  // 1. Add our standard NON CORE sample items
  for (const p of SAMPLE_PRODUCTS) {
    rows.push([
      p.mainCode,
      p.category,
      p.group,
      p.subGroup,
      p.brand,
      p.manufacturer,
      p.segment,
      p.itemName,
      p.code,
      p.barcode,
      p.closingQty,
      p.mrp,
      p.retail, // RETAIL = SP
    ]);
  }

  // 2. Generate additional 90+ realistic NON CORE products
  const productTemplates = [
    { name: 'COTTON BEDSHEET DOUBLE WITH 2 PILLOW COVERS', cat: 'HOME TEXTILES', mrp: 899, retail: 399, pack: '' },
    { name: 'STAINLESS STEEL TIFFIN BOX 3 TIER', cat: 'HOME & KITCHEN', mrp: 549, retail: 279, pack: '' },
    { name: 'MOSQUITO RACQUET RECHARGEABLE BATTERY', cat: 'APPLIANCES', mrp: 399, retail: 189, pack: '' },
    { name: 'BATHROOM SLIPPERS ANTI SLIP QUICK DRY', cat: 'FOOTWEAR', mrp: 299, retail: 129, pack: '' },
    { name: 'BALL POINT PENS BLUE INK (10 PCS PACK)', cat: 'STATIONERY', mrp: 100, retail: 49, pack: '(10 PCS PACK)' },
    { name: 'NOTEBOOK SPIRAL BOUND 300 PAGES A4', cat: 'STATIONERY', mrp: 180, retail: 89, pack: '' },
    { name: 'KITCHEN KNIFE SET WITH WOODEN BLOCK (5 PCS)', cat: 'KITCHEN TOOLS', mrp: 699, retail: 299, pack: '(5 PCS SET)' },
    { name: 'STEEL TEA STRAINER FINE MESH DOUBLE WIRE', cat: 'KITCHEN TOOLS', mrp: 99, retail: 39, pack: '' },
    { name: 'NON-STICK TADKA PAN INDUCTION BOTTOM', cat: 'COOKWARE', mrp: 299, retail: 149, pack: '' },
    { name: 'CLOTHES HANGER PLASTIC HEAVY DUTY (6 PCS SET)', cat: 'HOME CARE', mrp: 199, retail: 89, pack: '(6 PCS SET)' },
    { name: 'WASHING MACHINE COVER WATERPROOF TOP LOAD', cat: 'HOME APPLIANCES', mrp: 399, retail: 179, pack: '' },
    { name: 'LED RECHARGEABLE TORCH EMERGENCY LIGHT', cat: 'ELECTRICAL', mrp: 349, retail: 159, pack: '' },
    { name: 'PLASTIC BUCKET WITH LID 20 LITRES VIRGIN', cat: 'PLASTICWARE', mrp: 399, retail: 199, pack: '' },
    { name: 'MOPPING WIPER WITH TELESCOPIC HANDLE', cat: 'HOME CARE', mrp: 279, retail: 129, pack: '' },
    { name: 'AIR FRESHENER SPRAY POCKET 10G (3 PCS PACK)', cat: 'HOME CARE', mrp: 150, retail: 75, pack: '(3 PCS SET)' },
  ];

  for (let i = 0; i < 90; i++) {
    const tmpl = productTemplates[i % productTemplates.length];
    const itemNum = 1013 + i;
    const variant = Math.floor(i / productTemplates.length) + 1;
    const code = `NC${itemNum}`;
    const barcode = `8901030${String(789240 + i).padStart(6, '0')}`;
    const name = variant > 1 ? `${tmpl.name} VOL ${variant}` : tmpl.name;
    const mrp = tmpl.mrp + (variant - 1) * 20;
    const retail = tmpl.retail + (variant - 1) * 10;

    rows.push([
      'NON CORE',
      tmpl.cat,
      'GENERAL',
      'STANDARD',
      'RETAIL BRAND',
      'MFG ENTERPRISES',
      'PROMO',
      name,
      code,
      barcode,
      25 + (i * 3) % 150,
      mrp,
      retail,
    ]);
  }

  // 3. Add CORE products (to strictly verify NON CORE filtering skips them!)
  const coreTemplates = [
    { name: 'ATTA WHOLE WHEAT 10KG', mrp: 450, retail: 420 },
    { name: 'BASMATI RICE 5KG BAG', mrp: 620, retail: 580 },
    { name: 'REFINED SUNFLOWER OIL 1L POUCH', mrp: 145, retail: 135 },
    { name: 'PURE COW GHEE 1 LITRE TIN', mrp: 650, retail: 610 },
    { name: 'TOOR DAL UNPOLISHED 1KG', mrp: 170, retail: 160 },
  ];

  for (let i = 0; i < 40; i++) {
    const tmpl = coreTemplates[i % coreTemplates.length];
    const code = `CR${5000 + i}`;
    const barcode = `8902040${String(100000 + i)}`;
    rows.push([
      'CORE', // MUST BE FILTERED OUT
      'GROCERY',
      'STAPLES',
      'FOOD',
      'KITCHEN ESSENTIAL',
      'AGRO FOODS LTD',
      'CORE FMCG',
      `${tmpl.name} LOT ${i + 1}`,
      code,
      barcode,
      120,
      tmpl.mrp,
      tmpl.retail,
    ]);
  }

  // Build sheet
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock_Report');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return excelBuffer;
}

// Generates an in-memory realistic HO Focus Promotions .xlsx workbook
export function generateSampleFocusWorkbook(): ArrayBuffer {
  const rows: unknown[][] = [
    ['*** HEAD OFFICE MONTHLY FOCUS PROMOTIONS CAMPAIGN ***'],
    ['Campaign: OCT 2026 FOCUS FESTIVAL | Effective From: ' + new Date().toLocaleDateString()],
    [],
    ['PRODUCT CODE', 'BARCODE', 'ITEM NAME', 'BRAND', 'MRP', 'HO FOCUS SP', 'NOTES'],
    ['13000113', '8901030013000', 'DOVE DAILY SHINE SHAMPOO 180ML', 'DOVE', 175, 99, 'Super Saver HO Promo'],
    ['NC1001', '8901030789123', 'WOMEN RAZOR (6 PCS SET)', 'SUPERMAX', 99, 39, 'Deep Discount Retail'],
    ['NC1002', '8901030789130', '3 FOLD UMBRELLA 24/8@349[JG]-1 nos', 'SUNSHINE', 349, 149, 'Monsoon Special Promo'],
    ['NC1003', '8901030789147', 'STAINLESS STEEL WATER BOTTLE 1000ML', 'CELLO', 399, 149, 'Mega Hydration Focus'],
    ['NC1004', '8901030789154', 'BATH TOWEL COTTON SUPER ABSORBENT', 'BOMBAY DYEING', 499, 199, 'Home Festival Offer'],
    ['NC1005', '8901030789161', 'MICROFIBER CLEANING CLOTH (5 PCS SET)', 'SCOTCH BRITE', 149, 59, 'Clean Home Focus'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HO_Focus_Prices');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}
