import { AiAssistantPlan, BoardFormat, BoardSlot, BoardType, Product } from '../types';
import { ProductSearchService } from './searchService';

export class AiAssistantService {
  /**
   * Deterministic Natural Language Command Parser.
   * Works 100% locally and offline without external API dependency.
   */
  static parseCommand(
    command: string,
    currentFormat: BoardFormat,
    currentSlots: BoardSlot[],
    allProducts: Product[]
  ): AiAssistantPlan {
    const raw = command.trim();
    const lower = raw.toLowerCase();

    // 1. Detect target format if mentioned
    let targetFormat: BoardFormat = currentFormat;
    if (lower.includes('round') || lower.includes('oval')) {
      targetFormat = 'ROUND';
    } else if (lower.includes('notebook') || lower.includes('note book')) {
      targetFormat = 'NOTEBOOK';
    } else if (lower.includes('1/8') || lower.includes('1 in 8') || lower.includes('one eighth')) {
      targetFormat = '1/8';
    } else if (lower.includes('1/4') || lower.includes('1 in 4') || lower.includes('quarter')) {
      targetFormat = '1/4';
    } else if (lower.includes('1/3') || lower.includes('1 in 3') || lower.includes('strip')) {
      targetFormat = '1/3';
    } else if (lower.includes('1/2') || lower.includes('1 in 2') || lower.includes('half')) {
      targetFormat = '1/2';
    } else if (lower.includes('1/1') || lower.includes('1 in 1') || lower.includes('full page') || lower.includes('poster')) {
      targetFormat = '1/1';
    }

    // 2. Detect board type if explicitly requested
    let boardType: BoardType = 'FINAL_PRICE';
    if (lower.includes('mrp save') || lower.includes('mrp + save') || lower.includes('mrp-save')) {
      boardType = 'MRP_SAVE';
    }

    // 3. Check for specific single-slot modification commands
    // Example: "Change slot 3 to final price"
    const slotChangeMatch = lower.match(/(?:change|set|switch)\s+slot\s+(\d+)\s+to\s+(final price|mrp save|mrp\s*\+\s*save)/i);
    if (slotChangeMatch) {
      const slotNum = parseInt(slotChangeMatch[1], 10);
      const newType: BoardType = slotChangeMatch[2].includes('mrp') ? 'MRP_SAVE' : 'FINAL_PRICE';
      return {
        command: raw,
        targetFormat,
        boardType: newType,
        explanation: `Change Slot #${slotNum} to ${newType === 'FINAL_PRICE' ? 'Type A: Final Price' : 'Type B: MRP + Save'}.`,
        itemsToCreate: [],
        actions: [{ type: 'CHANGE_TYPE', details: `Set slot #${slotNum} boardType to ${newType}` }],
        totalBoardsCount: 1,
      };
    }

    // Example: "Duplicate slot 1 into slot 5"
    const duplicateMatch = lower.match(/duplicate\s+slot\s+(\d+)\s+(?:into|to)\s+slot\s+(\d+)/i);
    if (duplicateMatch) {
      const fromSlot = parseInt(duplicateMatch[1], 10);
      const toSlot = parseInt(duplicateMatch[2], 10);
      return {
        command: raw,
        targetFormat,
        boardType,
        explanation: `Duplicate contents of Slot #${fromSlot} into Slot #${toSlot}.`,
        itemsToCreate: [],
        actions: [{ type: 'DUPLICATE', details: `Copy slot ${fromSlot} -> slot ${toSlot}` }],
        totalBoardsCount: 1,
      };
    }

    // Example: "Put the uploaded product image behind the text"
    if (lower.includes('behind') && lower.includes('text')) {
      return {
        command: raw,
        targetFormat,
        boardType,
        explanation: `Set Image Placement Mode to Background (behind text with subtle opacity) across active boards.`,
        itemsToCreate: [],
        actions: [{ type: 'CHANGE_TYPE', details: `Set imagePlacementMode = 'BACKGROUND'` }],
        totalBoardsCount: 0,
      };
    }

    // Example: "Clear all empty slots" or "Clear all slots"
    if (lower.includes('clear all') || lower.includes('empty all')) {
      return {
        command: raw,
        targetFormat,
        boardType,
        explanation: `Clear all board slots on the current page to empty state.`,
        itemsToCreate: [],
        actions: [{ type: 'CLEAR', details: `Clear all slots on format ${targetFormat}` }],
        totalBoardsCount: 0,
      };
    }

    // 4. Pattern: Multi-price and count parsing
    // Case A: "599 3 699 4 799 2" or "Make 599 3, 699 4, 799 2 round boards"
    const itemsToCreate: Array<{ price: number; quantity: number; productName?: string; product?: Product | null; packText?: string }> = [];

    // Check pair pattern: `<price> <qty>` sequence like `599 3, 699 4, 799 2`
    const pairRegex = /(?:₹|\b)(\d{2,5})\s+(?:x\s*)?(\d{1,2})\b/gi;
    let match: RegExpExecArray | null;
    const foundPairs: Array<{ price: number; quantity: number }> = [];

    // Let's filter out format tokens like "1/8" or "1" from becoming prices
    const cleanCmd = lower.replace(/\b1\/[12348]\b/g, '').replace(/round boards?/g, '');

    while ((match = pairRegex.exec(cleanCmd)) !== null) {
      const p = parseInt(match[1], 10);
      const q = parseInt(match[2], 10);
      // Valid price range (e.g. ₹15 to ₹9999) and sensible qty (1 to 15)
      if (p >= 10 && q >= 1 && q <= 15) {
        foundPairs.push({ price: p, quantity: q });
      }
    }

    // Case B: Reversed pattern: "3 boards of ₹299 and 2 boards of ₹399" or "2 ₹199 boards"
    if (foundPairs.length === 0) {
      const reverseRegex = /(\d{1,2})\s+(?:boards?\s+of\s+|boards?\s+at\s+|boards?\s+)?(?:₹)?(\d{2,5})/gi;
      while ((match = reverseRegex.exec(cleanCmd)) !== null) {
        const q = parseInt(match[1], 10);
        const p = parseInt(match[2], 10);
        if (p >= 10 && q >= 1 && q <= 15) {
          foundPairs.push({ price: p, quantity: q });
        }
      }
    }

    // Case C: Single count and single price: "Create 8 boards of ₹49" or "8 boards of 49"
    if (foundPairs.length === 0) {
      const singleMatch = cleanCmd.match(/(?:make|create)?\s*(\d{1,2})\s+boards?\s+(?:of|at)?\s*(?:₹)?(\d{2,5})/i);
      if (singleMatch) {
        const q = parseInt(singleMatch[1], 10);
        const p = parseInt(singleMatch[2], 10);
        foundPairs.push({ price: p, quantity: q });
      }
    }

    // Case D: Single price only: "create 4 boards of 99"
    if (foundPairs.length === 0) {
      const priceOnlyMatch = cleanCmd.match(/(?:₹|\b)(\d{2,5})\b/);
      const countMatch = cleanCmd.match(/(\d{1,2})\s+boards?/);
      if (priceOnlyMatch && countMatch) {
        foundPairs.push({
          price: parseInt(priceOnlyMatch[1], 10),
          quantity: parseInt(countMatch[1], 10),
        });
      }
    }

    // Case E: Named product search command: "Make Apsara Pencil MRP SAVE board"
    let searchedProduct: Product | null = null;
    if (foundPairs.length === 0) {
      // Extract search phrase by removing keywords
      const searchTerms = lower
        .replace(/\b(make|create|add|generate|board|boards|mrp|save|final|price)\b/gi, '')
        .trim();

      if (searchTerms.length >= 3) {
        const results = ProductSearchService.search(allProducts, searchTerms, 5);
        if (results.length > 0) {
          searchedProduct = results[0];
          foundPairs.push({
            price: searchedProduct.retail,
            quantity: 1,
          });
        }
      }
    }

    let totalBoardsCount = 0;
    for (const pair of foundPairs) {
      totalBoardsCount += pair.quantity;
      itemsToCreate.push({
        price: pair.price,
        quantity: pair.quantity,
        productName: searchedProduct ? searchedProduct.itemName : undefined,
        product: searchedProduct,
      });
    }

    if (itemsToCreate.length === 0) {
      // Fallback explanation if parser could not detect standard structure
      return {
        command: raw,
        targetFormat,
        boardType,
        explanation: `Could not determine exact price or board quantities from: "${raw}". Try commands like "599 3 699 4 round boards" or "Make 8 boards of ₹49 in 1/8 format".`,
        itemsToCreate: [],
        actions: [],
        totalBoardsCount: 0,
      };
    }

    // Build human-readable plan description
    const breakdown = itemsToCreate.map((item) => `₹${item.price} × ${item.quantity}`).join(' + ');
    const explanation = `Set layout to ${targetFormat}. Create ${totalBoardsCount} boards (${breakdown})${
      boardType === 'MRP_SAVE' ? ' as Type B: MRP + SAVE' : ' as Type A: Final Price'
    }${searchedProduct ? ` linked to "${searchedProduct.itemName}"` : ''}.`;

    return {
      command: raw,
      targetFormat,
      boardType,
      explanation,
      itemsToCreate,
      actions: [
        { type: 'SET_FORMAT', details: `Set format to ${targetFormat}` },
        { type: 'FILL_SLOTS', details: `Populate ${totalBoardsCount} slots with prices` },
      ],
      totalBoardsCount,
    };
  }
}
