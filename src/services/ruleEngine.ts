import {
  BoardFormat,
  BoardSlot,
  BoardType,
  BusinessRule,
  Product,
  RuleAction,
  RuleCondition,
  RuleConditionGroup,
} from '../types';
import { StorageService } from './storage';

export const DEFAULT_BUSINESS_RULES: BusinessRule[] = [
  {
    id: 'rule-round-board-sp-only',
    name: 'RULE B: ROUND BOARD — SP + ONLY Minimalist Rule',
    description: 'For ROUND BOARD, show only ₹199 ONLY. Hide product name, pack text, MRP, SAVE, and footer.',
    enabled: true,
    priority: 10,
    matchMode: 'AND',
    conditions: [
      {
        field: 'format',
        operator: 'equals',
        value: 'ROUND',
      },
    ],
    action: {
      hideProductName: true,
      hideMrp: true,
      hideSave: true,
      hideFooter: true,
      hidePackText: true,
      setBoardType: 'FINAL_PRICE',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-branded-mrp-save',
    name: 'MRP SAVE ON BRANDED PRODUCTS',
    description: 'If Brand or Product Name contains GALA, JOYO, or NATIONAL, default to MRP + SAVE.',
    enabled: true,
    priority: 15,
    matchMode: 'OR',
    conditions: [
      { field: 'brand', operator: 'contains', value: 'GALA' },
      { field: 'brand', operator: 'contains', value: 'JOYO' },
      { field: 'brand', operator: 'contains', value: 'NATIONAL' },
      { field: 'productName', operator: 'contains', value: 'GALA' },
      { field: 'productName', operator: 'contains', value: 'JOYO' },
      { field: 'productName', operator: 'contains', value: 'NATIONAL' },
    ],
    action: {
      setBoardType: 'MRP_SAVE',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-apsara-pencil-mrp-save',
    name: 'RULE A: APSARA PENCIL — Default to MRP + SAVE',
    description: 'If product name contains "APSARA PENCIL", default to MRP + SAVE.',
    enabled: true,
    priority: 20,
    matchMode: 'AND',
    conditions: [
      {
        field: 'productName',
        operator: 'contains',
        value: 'APSARA PENCIL',
      },
    ],
    action: {
      setBoardType: 'MRP_SAVE',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-focus-campaign-suggest',
    name: 'HO FOCUS PROMOTION — Active Campaign Suggestion',
    description: 'If a product is in the active HO Focus campaign, suggest Focus Board with Star.',
    enabled: true,
    priority: 5,
    matchMode: 'AND',
    conditions: [
      {
        field: 'isFocus',
        operator: 'equals',
        value: 'true',
      },
    ],
    action: {
      isFocusBoard: true,
      showStar: true,
      focusPrintMode: 'YELLOW_PAPER',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-1-8-custom-master',
    name: 'RULE D: 1/8 A4 — Use Saved Custom Master Template',
    description: 'For 1/8 boards, automatically inherit my saved custom 1/8 master template typography and geometry.',
    enabled: true,
    priority: 40,
    matchMode: 'AND',
    conditions: [
      {
        field: 'format',
        operator: 'equals',
        value: '1/8',
      },
    ],
    action: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-cosmetics-image-placement',
    name: 'RULE E: CATEGORY COSMETICS — Preferred Image Placement',
    description: 'For category COSMETICS or BEAUTY, default to INSIDE image mode positioned at TOP.',
    enabled: true,
    priority: 50,
    matchMode: 'AND',
    conditions: [
      {
        field: 'category',
        operator: 'contains',
        value: 'COSMETIC',
      },
    ],
    action: {
      imagePlacementMode: 'INSIDE',
      insideImageArrangement: 'TOP',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-notebook-suggest-format',
    name: 'NOTEBOOK Keyword — Suggest NOTE BOOK 1 Format',
    description: 'When product name contains NOTEBOOK, suggest NOTE BOOK 1 format.',
    enabled: true,
    priority: 60,
    matchMode: 'AND',
    conditions: [
      {
        field: 'productName',
        operator: 'contains',
        value: 'NOTEBOOK',
      },
    ],
    action: {
      suggestFormat: 'NOTEBOOK',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const RULES_STORAGE_KEY = 'business_rules_list';

export const RuleEngine = {
  /**
   * Loads all stored rules, migrating legacy rules if necessary.
   */
  async getRules(): Promise<BusinessRule[]> {
    try {
      const stored = localStorage.getItem(RULES_STORAGE_KEY);
      if (stored) {
        let parsed = JSON.parse(stored) as BusinessRule[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migration check: check if MRP SAVE ON BRANDED PRODUCTS exists
          const brandedRule = parsed.find(
            (r) =>
              r.id === 'rule-branded-mrp-save' ||
              r.name.toUpperCase().includes('BRANDED') ||
              (r.description && r.description.toUpperCase().includes('GALA'))
          );

          if (!brandedRule) {
            // Insert the branded rule if missing
            const defaultBranded = DEFAULT_BUSINESS_RULES.find((r) => r.id === 'rule-branded-mrp-save')!;
            parsed.push(defaultBranded);
            this.saveRules(parsed);
          } else if (
            brandedRule.conditions.length <= 1 ||
            !brandedRule.conditions.some((c) => c.field === 'brand')
          ) {
            // Flag or upgrade the branded rule so conditions match Brand & Product Name
            brandedRule.needsConditionSetup = false;
            brandedRule.matchMode = 'OR';
            brandedRule.conditions = [
              { field: 'brand', operator: 'contains', value: 'GALA' },
              { field: 'brand', operator: 'contains', value: 'JOYO' },
              { field: 'brand', operator: 'contains', value: 'NATIONAL' },
              { field: 'productName', operator: 'contains', value: 'GALA' },
              { field: 'productName', operator: 'contains', value: 'JOYO' },
              { field: 'productName', operator: 'contains', value: 'NATIONAL' },
            ];
            this.saveRules(parsed);
          }

          // Sort by priority (ascending: 1 is top priority)
          return parsed.sort((a, b) => a.priority - b.priority);
        }
      }
    } catch {
      // Fallback
    }

    // Seed defaults
    this.saveRules(DEFAULT_BUSINESS_RULES);
    return DEFAULT_BUSINESS_RULES;
  },

  async saveRules(rules: BusinessRule[]): Promise<void> {
    try {
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    } catch (err) {
      console.error('Failed to save business rules:', err);
    }
  },

  async upsertRule(rule: BusinessRule): Promise<void> {
    const rules = await this.getRules();
    const idx = rules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      rules[idx] = { ...rule, updatedAt: new Date().toISOString() };
    } else {
      rules.push({ ...rule, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    rules.sort((a, b) => a.priority - b.priority);
    await this.saveRules(rules);
  },

  async deleteRule(id: string): Promise<void> {
    const rules = await this.getRules();
    const filtered = rules.filter((r) => r.id !== id);
    await this.saveRules(filtered);
  },

  async toggleRule(id: string, enabled: boolean): Promise<void> {
    const rules = await this.getRules();
    const target = rules.find((r) => r.id === id);
    if (target) {
      target.enabled = enabled;
      await this.saveRules(rules);
    }
  },

  /**
   * Evaluates rules against given product, format, and current slot state.
   */
  async evaluateRules(
    product: Product | null,
    format: BoardFormat,
    currentSlot?: Partial<BoardSlot>
  ): Promise<{
    appliedRule: BusinessRule | null;
    appliedAction: RuleAction | null;
    explanation?: string;
  }> {
    // If user explicitly overrode rules for this slot, respect user authority!
    if (currentSlot?.isRuleOverridden) {
      return { appliedRule: null, appliedAction: null, explanation: 'User manual override active' };
    }

    const rules = await this.getRules();
    const activeRules = rules.filter((r) => r.enabled);

    for (const rule of activeRules) {
      let isMatch = false;

      if (rule.conditionGroups && rule.conditionGroups.length > 0) {
        const groupResults = rule.conditionGroups.map((grp) => {
          if (grp.matchMode === 'OR') {
            return grp.conditions.some((c) => this.checkCondition(c, product, format));
          }
          return grp.conditions.every((c) => this.checkCondition(c, product, format));
        });
        isMatch =
          (rule.matchMode || 'AND') === 'OR'
            ? groupResults.some(Boolean)
            : groupResults.every(Boolean);
      } else if (rule.conditions.length > 0) {
        if ((rule.matchMode || 'AND') === 'OR') {
          isMatch = rule.conditions.some((c) => this.checkCondition(c, product, format));
        } else {
          isMatch = rule.conditions.every((c) => this.checkCondition(c, product, format));
        }
      }

      if (isMatch) {
        return {
          appliedRule: rule,
          appliedAction: rule.action,
          explanation: `Applied rule "${rule.name}" (Priority ${rule.priority})`,
        };
      }
    }

    return { appliedRule: null, appliedAction: null };
  },

  /**
   * Helper to evaluate a single condition.
   */
  checkCondition(cond: RuleCondition, product: Product | null, format: BoardFormat): boolean {
    let testVal: any = '';

    if (cond.field === 'format') {
      testVal = format;
    } else if (cond.field === 'isFocus') {
      testVal = 'false';
    } else if (product) {
      switch (cond.field) {
        case 'productCode':
          testVal = product.code;
          break;
        case 'barcode':
          testVal = product.barcode;
          break;
        case 'productName':
          testVal = product.itemName;
          break;
        case 'brand':
          testVal = product.brand;
          break;
        case 'category':
          testVal = product.category;
          break;
        case 'group':
          testVal = product.group;
          break;
        case 'mrp':
          testVal = product.mrp;
          break;
        case 'retail':
          testVal = product.retail;
          break;
      }
    }

    if (testVal === undefined || testVal === null) return false;

    const op = cond.operator;
    const condVal = cond.value;

    if (typeof testVal === 'number' || (!isNaN(Number(testVal)) && !isNaN(Number(condVal)))) {
      const numTest = Number(testVal);
      const numCond = Number(condVal);
      if (op === 'greaterThan') return numTest > numCond;
      if (op === 'lessThan') return numTest < numCond;
      if (op === 'equals') return numTest === numCond;
    }

    const sTest = String(testVal).trim().replace(/\s+/g, ' ').toUpperCase();
    const sCond = String(condVal).trim().replace(/\s+/g, ' ').toUpperCase();

    if (op === 'contains') return sTest.includes(sCond);
    if (op === 'equals') return sTest === sCond;
    if (op === 'startsWith') return sTest.startsWith(sCond);
    if (op === 'endsWith') return sTest.endsWith(sCond);
    if (op === 'greaterThan') return sTest > sCond;
    if (op === 'lessThan') return sTest < sCond;

    return false;
  },

  /**
   * Rule Debugger: Evaluates product across all rules, explaining matches and failures.
   */
  async debugProductRules(
    product: Product,
    format: BoardFormat
  ): Promise<{
    product: Product;
    format: BoardFormat;
    matchedRules: Array<{
      rule: BusinessRule;
      matchedConditions: Array<{ field: string; operator: string; expected: any; actual: any }>;
      failedConditions: Array<{ field: string; operator: string; expected: any; actual: any }>;
      isWinner: boolean;
    }>;
    failedRules: Array<{
      rule: BusinessRule;
      matchedConditions: Array<{ field: string; operator: string; expected: any; actual: any }>;
      failedConditions: Array<{ field: string; operator: string; expected: any; actual: any }>;
    }>;
    winningRule: BusinessRule | null;
    finalAction: RuleAction | null;
  }> {
    const rules = await this.getRules();
    const matchedRules: any[] = [];
    const failedRules: any[] = [];
    let winnerFound = false;
    let winningRule: BusinessRule | null = null;
    let finalAction: RuleAction | null = null;

    for (const rule of rules) {
      const matchedConds: any[] = [];
      const failedConds: any[] = [];

      for (const cond of rule.conditions) {
        let actualVal: any = '';
        if (cond.field === 'format') actualVal = format;
        else if (cond.field === 'isFocus') actualVal = 'false';
        else {
          switch (cond.field) {
            case 'productCode': actualVal = product.code; break;
            case 'barcode': actualVal = product.barcode; break;
            case 'productName': actualVal = product.itemName; break;
            case 'brand': actualVal = product.brand; break;
            case 'category': actualVal = product.category; break;
            case 'group': actualVal = product.group; break;
            case 'mrp': actualVal = product.mrp; break;
            case 'retail': actualVal = product.retail; break;
          }
        }

        const isMatch = this.checkCondition(cond, product, format);
        const item = {
          field: cond.field,
          operator: cond.operator,
          expected: cond.value,
          actual: actualVal ?? '',
        };

        if (isMatch) matchedConds.push(item);
        else failedConds.push(item);
      }

      let isRuleMatched = false;
      if (rule.enabled) {
        if ((rule.matchMode || 'AND') === 'OR') {
          isRuleMatched = matchedConds.length > 0;
        } else {
          isRuleMatched = failedConds.length === 0 && matchedConds.length > 0;
        }
      }

      if (isRuleMatched) {
        const isWinner = !winnerFound;
        if (!winnerFound) {
          winnerFound = true;
          winningRule = rule;
          finalAction = rule.action;
        }
        matchedRules.push({
          rule,
          matchedConditions: matchedConds,
          failedConditions: failedConds,
          isWinner,
        });
      } else {
        failedRules.push({
          rule,
          matchedConditions: matchedConds,
          failedConditions: failedConds,
        });
      }
    }

    return {
      product,
      format,
      matchedRules,
      failedRules,
      winningRule,
      finalAction,
    };
  },

  /**
   * Natural Language Rule Parser:
   * Deterministic local interpreter for common phrases (no paid API needed).
   */
  parseNaturalLanguageRule(text: string): {
    success: boolean;
    rule?: Partial<BusinessRule>;
    clarification?: string;
  } {
    const raw = text.trim();
    const lower = raw.toLowerCase();

    // 1. Round board rule: "Round boards should display only SP and ONLY"
    if (lower.includes('round') && (lower.includes('only price') || lower.includes('sp and only') || lower.includes('only sp') || lower.includes('only:'))) {
      return {
        success: true,
        rule: {
          name: 'RULE B: Round Board SP + ONLY Minimalist',
          description: raw,
          priority: 10,
          conditions: [{ field: 'format', operator: 'equals', value: 'ROUND' }],
          action: {
            hideProductName: true,
            hideMrp: true,
            hideSave: true,
            hideFooter: true,
            hidePackText: true,
            setBoardType: 'FINAL_PRICE',
          },
        },
      };
    }

    // 2. "Use my saved design for this barcode <code/barcode>"
    const savedDesignMatch = lower.match(/(?:use\s+(?:my\s+)?saved\s+design\s+for\s+(?:barcode\s+|code\s+)?)([\w-]+)/i);
    if (savedDesignMatch && savedDesignMatch[1]) {
      const codeOrBarcode = savedDesignMatch[1].trim();
      return {
        success: true,
        rule: {
          name: `Prioritize Saved Design for ${codeOrBarcode}`,
          description: raw,
          priority: 15,
          conditions: [{ field: 'barcode', operator: 'equals', value: codeOrBarcode }],
          action: {},
        },
      };
    }

    // 3. "For <category> use image <placement>" (e.g. "For cosmetics use image top")
    const categoryImgMatch = lower.match(/for\s+([a-z\s]+)\s+use\s+image\s+(top|bottom|left|right|background|inside)/i);
    if (categoryImgMatch && categoryImgMatch[1] && categoryImgMatch[2]) {
      const cat = categoryImgMatch[1].trim().toUpperCase();
      const place = categoryImgMatch[2].toLowerCase();
      return {
        success: true,
        rule: {
          name: `${cat} → Image ${place.toUpperCase()} Rule`,
          description: raw,
          priority: 35,
          conditions: [{ field: 'category', operator: 'contains', value: cat }],
          action: {
            imagePlacementMode: place === 'background' ? 'BACKGROUND' : 'INSIDE',
            insideImageArrangement: (['top', 'bottom', 'left', 'right'].includes(place)
              ? place.toUpperCase()
              : 'TOP') as any,
          },
        },
      };
    }

    // 4. "For 1/8 boards use saved custom 1/8 master"
    if (lower.includes('1/8') && (lower.includes('custom master') || lower.includes('saved master') || lower.includes('saved custom'))) {
      return {
        success: true,
        rule: {
          name: '1/8 Boards → Use Saved Master Template',
          description: raw,
          priority: 40,
          conditions: [{ field: 'format', operator: 'equals', value: '1/8' }],
          action: {},
        },
      };
    }

    // 2. "Always use MRP SAVE for <keyword>"
    const mrpSaveMatch = lower.match(/(?:always\s+use|use|default\s+to)?\s*mrp\s*(?:\+|\&|and)?\s*save\s+(?:for|when\s+name\s+contains)\s+['"]?([^'"]+)['"]?/i);
    if (mrpSaveMatch && mrpSaveMatch[1]) {
      const kw = mrpSaveMatch[1].trim().toUpperCase();
      return {
        success: true,
        rule: {
          name: `${kw} → MRP + SAVE Rule`,
          description: raw,
          priority: 20,
          conditions: [{ field: 'productName', operator: 'contains', value: kw }],
          action: { setBoardType: 'MRP_SAVE' },
        },
      };
    }

    // 3. "Use final price for <keyword>"
    const finalPriceMatch = lower.match(/(?:always\s+use|use|default\s+to)?\s*final\s*price\s+(?:for|when\s+name\s+contains)\s+['"]?([^'"]+)['"]?/i);
    if (finalPriceMatch && finalPriceMatch[1]) {
      const kw = finalPriceMatch[1].trim().toUpperCase();
      return {
        success: true,
        rule: {
          name: `${kw} → FINAL PRICE Rule`,
          description: raw,
          priority: 25,
          conditions: [{ field: 'productName', operator: 'contains', value: kw }],
          action: { setBoardType: 'FINAL_PRICE' },
        },
      };
    }

    // 4. "When product name contains <kw>, suggest <format>"
    const formatMatch = lower.match(/when\s+(?:product\s+name\s+)?contains\s+['"]?([^'"]+)['"]?\s*,?\s*suggest\s+['"]?([^'"]+)['"]?/i);
    if (formatMatch && formatMatch[1] && formatMatch[2]) {
      const kw = formatMatch[1].trim().toUpperCase();
      const rawFmt = formatMatch[2].trim().toUpperCase();
      let targetFmt: BoardFormat = '1/8';
      if (rawFmt.includes('NOTEBOOK') || rawFmt.includes('NOTE BOOK')) targetFmt = 'NOTEBOOK';
      else if (rawFmt.includes('ROUND')) targetFmt = 'ROUND';
      else if (rawFmt.includes('1/4')) targetFmt = '1/4';
      else if (rawFmt.includes('1/2')) targetFmt = '1/2';
      else if (rawFmt.includes('1/1')) targetFmt = '1/1';
      else if (rawFmt.includes('1/3')) targetFmt = '1/3';

      return {
        success: true,
        rule: {
          name: `Suggest ${targetFmt} for ${kw}`,
          description: raw,
          priority: 30,
          conditions: [{ field: 'productName', operator: 'contains', value: kw }],
          action: { suggestFormat: targetFmt },
        },
      };
    }

    // 5. "Hide product name for <format>"
    if (lower.includes('hide product name') || lower.includes('hide name')) {
      const targetFmt: BoardFormat = lower.includes('round') ? 'ROUND' : '1/8';
      return {
        success: true,
        rule: {
          name: `Hide Name for ${targetFmt}`,
          description: raw,
          priority: 25,
          conditions: [{ field: 'format', operator: 'equals', value: targetFmt }],
          action: { hideProductName: true },
        },
      };
    }

    // If ambiguous, return clarification prompt
    return {
      success: false,
      clarification: `Could not interpret instruction "${text}". Try phrasing like:\n• "Always use MRP SAVE for Apsara pencils"\n• "Round boards should show only price and ONLY"\n• "Use final price for all plastic containers"\n• "When product name contains NOTEBOOK, suggest NOTE BOOK 1 format"`,
    };
  },
};
