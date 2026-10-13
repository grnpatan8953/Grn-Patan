import { FocusApprovalStatus, FocusItem, Product } from '../types';
import { normalizeIdentifier, stripLeadingZeros } from './searchService';

export interface FocusDetectionResult {
  isFocus: boolean;
  status: FocusApprovalStatus;
  focusSp: number;
  matchedItem?: FocusItem;
}

export class FocusDetectionService {
  /**
   * Synchronously checks whether a product matches any item in the provided Focus items list.
   */
  static checkProductFocusSync(
    product: Product | null | undefined,
    focusItems: FocusItem[] = []
  ): FocusDetectionResult {
    if (!product || !focusItems || focusItems.length === 0) {
      return {
        isFocus: false,
        status: 'PENDING',
        focusSp: 0,
      };
    }

    const prodId = product.id;
    const prodCode = product.code ? product.code.toUpperCase().trim() : '';
    const prodBarcode = product.barcode ? product.barcode.toUpperCase().trim() : '';
    const prodStrippedCode = prodCode
      ? stripLeadingZeros(normalizeIdentifier(prodCode)).toLowerCase()
      : '';
    const prodStrippedBarcode = prodBarcode
      ? stripLeadingZeros(normalizeIdentifier(prodBarcode)).toLowerCase()
      : '';
    const prodName = product.itemName ? product.itemName.toUpperCase().trim() : '';

    for (const item of focusItems) {
      // Direct ID match
      if (item.matchedProductId && item.matchedProductId === prodId) {
        return {
          isFocus: true,
          status: item.approvalStatus,
          focusSp: item.effectiveSp || item.hoFocusSp,
          matchedItem: item,
        };
      }

      const itemCode = item.productCode ? item.productCode.toUpperCase().trim() : '';
      const itemBarcode = item.barcode ? item.barcode.toUpperCase().trim() : '';
      const itemStrippedCode = itemCode
        ? stripLeadingZeros(normalizeIdentifier(itemCode)).toLowerCase()
        : '';
      const itemStrippedBarcode = itemBarcode
        ? stripLeadingZeros(normalizeIdentifier(itemBarcode)).toLowerCase()
        : '';
      const itemName = item.productName ? item.productName.toUpperCase().trim() : '';

      const isCodeMatch = prodCode && itemCode && prodCode === itemCode;
      const isBarcodeMatch = prodBarcode && itemBarcode && prodBarcode === itemBarcode;
      const isStrippedCodeMatch =
        (prodStrippedCode && itemStrippedCode && prodStrippedCode === itemStrippedCode) ||
        (prodStrippedCode && itemStrippedBarcode && prodStrippedCode === itemStrippedBarcode) ||
        (prodStrippedBarcode && itemStrippedCode && prodStrippedBarcode === itemStrippedCode);
      const isNameMatch = prodName && itemName && prodName === itemName;

      if (isCodeMatch || isBarcodeMatch || isStrippedCodeMatch || isNameMatch) {
        return {
          isFocus: true,
          status: item.approvalStatus,
          focusSp: item.effectiveSp || item.hoFocusSp,
          matchedItem: item,
        };
      }
    }

    return {
      isFocus: false,
      status: 'PENDING',
      focusSp: 0,
    };
  }
}
