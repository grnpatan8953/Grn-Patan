export type BoardFormat = '1/8' | '1/4' | '1/3' | '1/2' | '1/1' | 'ROUND' | 'NOTEBOOK';

export type SelectedElementType =
  | 'rupee'
  | 'price'
  | 'only'
  | 'name'
  | 'pack'
  | 'mrp-save'
  | 'footer'
  | 'product-image'
  | 'background-image'
  | string;

export type BoardType = 'FINAL_PRICE' | 'MRP_SAVE'; // Type A (Final Price / Only) vs Type B (MRP + Save)

export type TemplateMode = 'MASTER' | 'CUSTOM';

export type ImagePlacementMode = 'BACKGROUND' | 'INSIDE';

export interface Product {
  id: string;
  code: string;
  barcode: string;
  mainCode: string;
  itemName: string;
  category: string;
  group: string;
  subGroup: string;
  brand: string;
  manufacturer: string;
  segment: string;
  closingQty: number;
  mrp: number;
  retail: number; // SP (Selling Price) - Business Rule: RETAIL = SP
  updatedAt: string;
}

export interface DetectedColumns {
  mainCodeCol: string;
  itemNameCol: string;
  codeCol: string;
  barcodeCol: string;
  closingQtyCol: string;
  mrpCol: string;
  retailCol: string;
  categoryCol?: string;
  groupCol?: string;
  subGroupCol?: string;
  brandCol?: string;
  manufacturerCol?: string;
  segmentCol?: string;
}

export interface ImportSummary {
  fileName: string;
  fileSize?: number;
  rowsScanned: number;
  nonCoreImported: number;
  productsUpdated: number;
  productsAdded: number;
  productsSkipped: number;
  headerRowIndex: number;
  detectedColumns: DetectedColumns;
  importDate: string;
  sampleRows?: Array<{
    code: string;
    barcode: string;
    name: string;
    mrp: number;
    retail: number;
    mainCode: string;
    qty: number;
  }>;
}

export interface NotebookDetails {
  brand: string;
  ruling: string; // e.g. "SINGLE LINE / FOUR LINE"
  size: string; // e.g. "24 × 18 CM"
  pages: string; // e.g. "172 PAGES"
  baseSp: number; // 1 PCS ONLY price
  mrp: number;
  price3Pcs: number;
  save3Pcs: number;
  price6Pcs: number;
  save6Pcs: number;
  price12Pcs: number;
  save12Pcs: number;
}

export type BoardTypographyStyle = 'ORIGINAL_WORD_MASTER' | 'EXTRA_BOLD' | 'CONDENSED' | 'CUSTOM';

export interface BoardSlot {
  slotIndex: number; // 0 to N-1
  productId: string | null;
  product?: Product | null;
  displayName: string;
  packText: string; // e.g. "(6 PCS SET)" or "(3 PCS SET)"
  displaySp: number; // Retail price to print prominently (SP)
  displayMrp: number; // MRP
  displaySave?: number; // Calculated (MRP - SP) or manually overridden
  mrpOverride?: boolean;
  saveOverride?: boolean;
  boardType: BoardType; // 'FINAL_PRICE' (Type A) | 'MRP_SAVE' (Type B)
  showMrp: boolean;
  customFooter?: string;
  // Image properties
  imageUrl?: string; // Optional uploaded image (Base64 data URL)
  imageFit?: 'contain' | 'cover';
  imagePlacementMode?: ImagePlacementMode; // 'BACKGROUND' (behind text) | 'INSIDE' (separate container)
  imageOpacity?: number; // 0.0 to 1.0 (default: 1.0 = 100% full opacity)
  imageFilter?: 'original' | 'grayscale' | 'lighten'; // Image color mode
  productImageWidthPct?: number; // 20% to 90% of board width (default ~40%)
  productImageHeightPct?: number;
  productImageXOffset?: number; // Drag offset in px or %
  productImageYOffset?: number;
  textBacking?: boolean; // Translucent white backing behind text for high legibility
  textShadow?: boolean; // High contrast text drop shadow
  // Visual Editor Canvas transforms and custom elements
  elementTransforms?: Record<string, {
    x: number; // px offset
    y: number; // px offset
    scale?: number;
    rotation?: number;
    zIndex?: number;
    locked?: boolean;
    hidden?: boolean;
    color?: string;
  }>;
  additionalTextBoxes?: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSizePt: number;
    fontWeight?: string;
    color?: string;
    locked?: boolean;
  }>;
  // Mode & Custom Design Overrides
  templateMode?: TemplateMode; // 'MASTER' (locked exact layout) | 'CUSTOM' (customizable copy)
  typographyStyle?: BoardTypographyStyle;
  customFontFamily?: string;
  customFontWeight?: string;
  customTextAlign?: 'center' | 'left' | 'right';
  customBorderThicknessPt?: number;
  customBorderStyle?: 'solid' | 'double' | 'dashed';
  customPriceFontSizePt?: number;
  customNameFontSizePt?: number;
  customPackFontSizePt?: number;
  customFooterFontSizePt?: number;
  customSaveFontSizePt?: number;
  customLetterSpacing?: string;
  notebookDetails?: NotebookDetails; // For dedicated NOTE BOOK 1 format

  // Visibility overrides (for minimalist rules like Round Board)
  hideProductName?: boolean;
  hidePackText?: boolean;
  hideFooter?: boolean;
  hideMrp?: boolean;
  hideSave?: boolean;
  masterTemplateId?: string;

  // Smart Layout Engine & Rule Tracking
  insideImageArrangement?: InsideImageArrangement; // 'TOP' | 'LEFT' | 'RIGHT' | 'BOTTOM' | 'AUTO'
  isManualLayout?: boolean; // When true, auto-arrange does not automatically overwrite manual drags
  appliedRuleName?: string; // Tracks which Business Rule applied this slot's defaults
  isRuleOverridden?: boolean; // User explicitly overrode the rule
  overflowWarning?: string; // Warning message if an element overflows board border

  // Focus Board Specific Properties
  isFocusBoard?: boolean;
  isFocusProduct?: boolean;
  focusStatus?: FocusApprovalStatus;
  focusCampaignId?: string;
  focusPrintMode?: FocusPrintMode;
  starConfig?: StarConfig;
  baseSp?: number; // Base Selling Price from Stock Report
  hoFocusSp?: number; // HO Requested Selling Price
}

export type InsideImageArrangement = 'TOP' | 'LEFT' | 'RIGHT' | 'BOTTOM' | 'AUTO';

export type ImageFilterMode = 'original' | 'grayscale' | 'lighten';

// -------------------------------------------------------------
// Focus Board Types (Monthly HO Focus Promotion)
// -------------------------------------------------------------
export type FocusPrintMode = 'YELLOW_PAPER' | 'PRINT_YELLOW_BACKGROUND';

export type StarStyle = 'CLASSIC_5' | 'BURST_8' | 'RETAIL_12' | 'STAR_BADGE';

export type StarPosition = 'TOP_RIGHT' | 'TOP_LEFT' | 'BOTTOM_RIGHT' | 'CUSTOM';

export interface StarConfig {
  visible: boolean;
  style: StarStyle;
  position: StarPosition;
  xOffsetPct?: number; // % offset for custom position
  yOffsetPct?: number;
  sizePt: number; // 36pt to 96pt (default 64pt)
  color: string; // default '#000000'
}

export type FocusMatchStatus =
  | 'MATCHED_EXACT_CODE'
  | 'MATCHED_BARCODE'
  | 'MATCHED_NORMALIZED'
  | 'MANUAL_MATCH'
  | 'UNMATCHED';

export type FocusApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type FocusBoardStatus = 'PENDING' | 'GENERATED' | 'PRINTED';

export interface FocusItem {
  id: string;
  campaignId: string;
  productCode: string;
  barcode: string;
  productName: string;
  brand: string;
  category: string;
  currentBaseSp: number; // Current stock report retail SP
  hoFocusSp: number; // Head Office requested SP
  difference: number; // hoFocusSp - currentBaseSp
  mrp: number;
  effectiveSp: number; // Approved selling price
  effectiveDate?: string;
  endDate?: string;
  matchStatus: FocusMatchStatus;
  approvalStatus: FocusApprovalStatus;
  boardStatus: FocusBoardStatus;
  matchedProductId?: string;
  notes?: string;
}

export interface FocusCampaign {
  id: string;
  name: string;
  monthYear: string; // e.g. "2026-10"
  uploadedAt: string;
  fileName: string;
  totalProducts: number;
  matchedCount: number;
  unmatchedCount: number;
  approvedCount: number;
  status: 'ACTIVE' | 'ARCHIVED';
  columnMapping?: Record<string, string>;
}

// -------------------------------------------------------------
// One-Click Board Layout Clipboard
// -------------------------------------------------------------
export interface CopiedBoardLayout {
  sourceFormat: BoardFormat;
  customFontFamily?: string;
  customFontWeight?: string;
  customTextAlign?: 'center' | 'left' | 'right';
  customBorderThicknessPt?: number;
  customBorderStyle?: 'solid' | 'double' | 'dashed';
  customPriceFontSizePt?: number;
  customNameFontSizePt?: number;
  customPackFontSizePt?: number;
  customFooterFontSizePt?: number;
  customSaveFontSizePt?: number;
  customLetterSpacing?: string;
  elementTransforms?: Record<string, any>;
  additionalTextBoxes?: Array<any>;
  imagePlacementMode?: ImagePlacementMode;
  insideImageArrangement?: InsideImageArrangement;
  imageOpacity?: number;
  imageFilter?: ImageFilterMode;
  productImageWidthPct?: number;
  productImageHeightPct?: number;
  productImageXOffset?: number;
  productImageYOffset?: number;
  textBacking?: boolean;
  textShadow?: boolean;
  hideProductName?: boolean;
  hidePackText?: boolean;
  hideFooter?: boolean;
  hideMrp?: boolean;
  hideSave?: boolean;
  boardType?: BoardType;
  showMrp?: boolean;
  starConfig?: StarConfig;
  focusPrintMode?: FocusPrintMode;
  isFocusBoard?: boolean;
}

export interface BoardClipboard {
  type: 'COMPLETE_BOARD' | 'LAYOUT_ONLY';
  copiedAt: string;
  fullSlot?: BoardSlot;
  layoutOnly?: CopiedBoardLayout;
}

export interface NamedBoardDesign {
  id: string;
  name: string;
  format: BoardFormat;
  layout: CopiedBoardLayout;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// Business Rules & Automation Types
// -------------------------------------------------------------
export type RuleMatchMode = 'AND' | 'OR';

export type RuleField =
  | 'productCode'
  | 'barcode'
  | 'productName'
  | 'brand'
  | 'category'
  | 'group'
  | 'format'
  | 'mrp'
  | 'retail'
  | 'isFocus';

export type RuleOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';

export interface RuleCondition {
  field: RuleField;
  operator: RuleOperator;
  value: string | number;
}

export interface RuleConditionGroup {
  id: string;
  matchMode: RuleMatchMode;
  conditions: RuleCondition[];
}

export interface RuleAction {
  setBoardType?: BoardType;
  suggestFormat?: BoardFormat;
  isFocusBoard?: boolean;
  focusPrintMode?: FocusPrintMode;
  showStar?: boolean;
  hideProductName?: boolean;
  hideMrp?: boolean;
  hideSave?: boolean;
  hideFooter?: boolean;
  hidePackText?: boolean;
  imagePlacementMode?: ImagePlacementMode;
  insideImageArrangement?: InsideImageArrangement;
  defaultCustomFooter?: string;
  defaultPackText?: string;
  masterTemplateId?: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number; // 1 (highest) to 100
  matchMode?: RuleMatchMode; // 'AND' (all match) | 'OR' (any match)
  conditions: RuleCondition[];
  conditionGroups?: RuleConditionGroup[];
  action: RuleAction;
  createdAt: string;
  updatedAt: string;
  needsConditionSetup?: boolean;
}

export interface AppliedRuleHistoryItem {
  id: string;
  timestamp: string;
  ruleId: string;
  ruleName: string;
  format: BoardFormat;
  productName: string;
  actionSummary: string;
}

// -------------------------------------------------------------
// Format Master Library & Calibration Types
// -------------------------------------------------------------
export interface MasterTemplateVersion {
  id: string;
  versionName: string;
  format: BoardFormat;
  config: BoardTemplateConfig;
  savedAt: string;
  isDefault: boolean;
  notes?: string;
}

export interface MasterFormatTemplate {
  format: BoardFormat;
  name: string;
  pageRef: string;
  referenceImageUrl?: string;
  referenceFileName?: string;
  calibratedConfig: BoardTemplateConfig;
  isUserCalibrated: boolean;
  updatedAt: string;
  detectedFonts?: string[];
  notes?: string;
  versions?: MasterTemplateVersion[];
}

// -------------------------------------------------------------
// Recreate Board From Image Types
// -------------------------------------------------------------
export interface RecreatedBoardRegion {
  id: string;
  type: 'price' | 'name' | 'pack' | 'footer' | 'mrp' | 'save' | 'custom';
  x: number; // % from left (0 to 100)
  y: number; // % from top (0 to 100)
  width: number; // % width (0 to 100)
  height: number; // % height (0 to 100)
  detectedText?: string;
  replacementText: string;
  fontSizePt?: number;
  maskColor?: string; // background fill to hide old text
}

export interface RecreatedBoardSession {
  id: string;
  referenceImageUrl: string;
  targetFormat: BoardFormat;
  regions: RecreatedBoardRegion[];
  createdAt: string;
}

export type SupportedMasterDocFormat =
  | 'docx'
  | 'doc'
  | 'pptx'
  | 'ppt'
  | 'pdf'
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'image'
  | 'template';

export interface MasterInspectionResult {
  fileName: string;
  fileSize: number;
  fileType: SupportedMasterDocFormat;
  loadedAt: string;
  detectedFonts: string[];
  pageCount?: number;
  detectedLayouts?: Array<{
    pageIndex: number;
    suggestedFormat: BoardFormat;
    label: string;
    description: string;
    grid: string;
    cardSizeMm: string;
  }>;
  slidesOrPages?: Array<{
    index: number;
    label: string;
    textPreview?: string;
    suggestedFormat?: BoardFormat;
    previewUrl?: string;
  }>;
  conversionStatus?: 'NATIVE_PARSED' | 'EXTRACTED_WITH_NOTICE' | 'MANUAL_CALIBRATION_READY';
  noticeMessage?: string;
  previewUrl?: string;
}

export interface BoardTemplateConfig {
  format: BoardFormat;
  name: string;
  description: string;
  pageRef: string; // Page in master docx (e.g. "PAGE 1 = 1 IN 8")
  slotsCount: number;
  cols: number;
  rows: number;
  shape?: 'rectangle' | 'oval';
  // Dimensions in mm
  cardWidthMm: number;
  cardHeightMm: number;
  borderWidthPt: number; // Heavy black border
  paddingMm: number;
  // Typography sizes in pt
  priceFontSizePt: number;
  rupeeSymbolSizePt: number;
  onlyFontSizePt: number;
  productNameFontSizePt: number;
  packTextFontSizePt: number;
  footerFontSizePt: number;
  mrpFontSizePt: number;
  saveFontSizePt?: number;
  fontFamily: string;
  footerText: string;
  showMrpDefault: boolean;
}

export type PrintActionStatus = 'PREVIEWED' | 'PDF_EXPORTED' | 'PRINT_REQUESTED' | 'PRINT_CONFIRMED';

export interface PrintHistoryItem {
  id: string;
  timestamp: string;
  format: BoardFormat;
  boardType?: BoardType;
  title: string;
  slots: BoardSlot[];
  pageCount: number;
  status?: PrintActionStatus;
  productCount?: number;
  productIdentifiers?: string[];
  campaignName?: string;
  templateVersion?: string;
  outputFileName?: string;
}

export interface MasterDocxInfo {
  fileName: string;
  fileSize: number;
  loadedAt: string;
  detectedFonts: string[];
  pageCountEstimate?: number;
}

export interface SavedProductDesign {
  id: string; // product code or barcode
  productCode: string;
  productBarcode: string;
  productName: string;
  boardFormat: BoardFormat;
  boardType: BoardType;
  displayName: string;
  packText: string;
  displaySp: number;
  displayMrp: number;
  displaySave?: number;
  imageUrl?: string;
  imageFit?: 'contain' | 'cover';
  imagePlacementMode?: ImagePlacementMode;
  insideImageArrangement?: InsideImageArrangement;
  imageOpacity?: number;
  templateMode?: TemplateMode;
  customFontFamily?: string;
  customFontWeight?: string;
  customBorderThicknessPt?: number;
  priceOverrideSaved?: boolean; // Flags if user manually overrode stock report price
  savedAt: string;
}

export interface AutosaveDraft {
  id: string;
  format: BoardFormat;
  slots: BoardSlot[];
  savedAt: string;
  occupiedCount: number;
}

export interface AiAssistantPlan {
  command: string;
  targetFormat: BoardFormat;
  explanation: string;
  boardType: BoardType;
  appliedRules?: string[];
  itemsToCreate: Array<{
    price: number;
    quantity: number;
    productName?: string;
    product?: Product | null;
    packText?: string;
  }>;
  actions: Array<{
    type: 'SET_FORMAT' | 'FILL_SLOTS' | 'CHANGE_TYPE' | 'DUPLICATE' | 'CLEAR';
    details: string;
  }>;
  totalBoardsCount: number;
}

export interface AppSettings {
  defaultFormat: BoardFormat;
  defaultBoardType: BoardType;
  defaultFooterText: string;
  showMrpGlobal: boolean;
  storeName: string;
  masterDocxLoaded?: MasterDocxInfo;
  templateConfigs: Record<BoardFormat, BoardTemplateConfig>;
  calibratedConfigs?: Record<BoardFormat, BoardTemplateConfig>;
  businessRules?: BusinessRule[];
}
