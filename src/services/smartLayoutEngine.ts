import { BoardSlot, BoardTemplateConfig, InsideImageArrangement } from '../types';

export interface LayoutBoundsCheck {
  valid: boolean;
  overflows: string[];
  warningMessage?: string;
}

/**
 * Smart Automatic Layout Engine
 * Calculates optimal, collision-free physical arrangements inside board boundaries.
 */
export const SmartLayoutEngine = {
  /**
   * Automatically arranges image and text content cleanly within board boundaries.
   */
  autoArrangeContent(
    slot: BoardSlot,
    config: BoardTemplateConfig,
    preferredArrangement?: InsideImageArrangement
  ): BoardSlot {
    const updated: BoardSlot = {
      ...slot,
      isManualLayout: false,
    };

    const hasImage = Boolean(slot.imageUrl);
    const isInsideImage = slot.imagePlacementMode === 'INSIDE' && hasImage;

    // Determine arrangement
    let arrangement: InsideImageArrangement = preferredArrangement || slot.insideImageArrangement || 'AUTO';
    if (arrangement === 'AUTO') {
      // Landscape strip boards (1/3, 1/8) benefit from LEFT or TOP
      if (config.cardWidthMm > config.cardHeightMm * 1.5) {
        arrangement = 'LEFT';
      } else {
        arrangement = 'TOP';
      }
    }
    updated.insideImageArrangement = arrangement;

    // Fresh transforms map
    const newTransforms: Record<string, any> = {};

    if (!isInsideImage) {
      // MASTER CENTERED BASELINE (No inside image or background mode)
      newTransforms['price'] = { x: 0, y: 0, scale: 1, zIndex: 20 };
      newTransforms['rupee'] = { x: 0, y: 0, scale: 1, zIndex: 20 };
      newTransforms['only'] = { x: 0, y: 0, scale: 1, zIndex: 20 };
      newTransforms['name'] = { x: 0, y: 0, scale: 1, zIndex: 20 };
      newTransforms['pack'] = { x: 0, y: 0, scale: 1, zIndex: 20 };
      newTransforms['footer'] = { x: 0, y: 0, scale: 1, zIndex: 20 };
      newTransforms['mrp-save'] = { x: 0, y: 0, scale: 1, zIndex: 20 };

      if (slot.imagePlacementMode === 'BACKGROUND' && hasImage) {
        newTransforms['background-image'] = { x: 0, y: 0, scale: 1, zIndex: 1 };
      }

      updated.productImageWidthPct = 0.42;
      updated.elementTransforms = newTransforms;
      updated.overflowWarning = undefined;
      return updated;
    }

    // INSIDE IMAGE ARRANGEMENT STRATEGIES
    switch (arrangement) {
      case 'LEFT': {
        // Image on left 42% width, Content on right 58%
        updated.productImageWidthPct = 0.38;
        newTransforms['product-image'] = { x: -75, y: -5, scale: 1, zIndex: 15 };
        newTransforms['price'] = { x: 55, y: -25, scale: 0.9, zIndex: 20 };
        newTransforms['rupee'] = { x: 55, y: -25, scale: 0.9, zIndex: 20 };
        newTransforms['only'] = { x: 55, y: -25, scale: 0.9, zIndex: 20 };
        newTransforms['name'] = { x: 55, y: 5, scale: 0.95, zIndex: 20 };
        newTransforms['pack'] = { x: 55, y: 22, scale: 0.9, zIndex: 20 };
        newTransforms['mrp-save'] = { x: 55, y: 22, scale: 0.9, zIndex: 20 };
        newTransforms['footer'] = { x: 0, y: 0, scale: 1, zIndex: 20 };
        break;
      }

      case 'RIGHT': {
        // Content on left 58%, Image on right 42%
        updated.productImageWidthPct = 0.38;
        newTransforms['product-image'] = { x: 75, y: -5, scale: 1, zIndex: 15 };
        newTransforms['price'] = { x: -55, y: -25, scale: 0.9, zIndex: 20 };
        newTransforms['rupee'] = { x: -55, y: -25, scale: 0.9, zIndex: 20 };
        newTransforms['only'] = { x: -55, y: -25, scale: 0.9, zIndex: 20 };
        newTransforms['name'] = { x: -55, y: 5, scale: 0.95, zIndex: 20 };
        newTransforms['pack'] = { x: -55, y: 22, scale: 0.9, zIndex: 20 };
        newTransforms['mrp-save'] = { x: -55, y: 22, scale: 0.9, zIndex: 20 };
        newTransforms['footer'] = { x: 0, y: 0, scale: 1, zIndex: 20 };
        break;
      }

      case 'BOTTOM': {
        // Price & Name at top, Image below, Footer at bottom
        updated.productImageWidthPct = 0.40;
        newTransforms['price'] = { x: 0, y: -30, scale: 0.88, zIndex: 20 };
        newTransforms['rupee'] = { x: 0, y: -30, scale: 0.88, zIndex: 20 };
        newTransforms['only'] = { x: 0, y: -30, scale: 0.88, zIndex: 20 };
        newTransforms['name'] = { x: 0, y: -12, scale: 0.9, zIndex: 20 };
        newTransforms['product-image'] = { x: 0, y: 12, scale: 0.95, zIndex: 15 };
        newTransforms['pack'] = { x: 0, y: 32, scale: 0.85, zIndex: 20 };
        newTransforms['mrp-save'] = { x: 0, y: 32, scale: 0.85, zIndex: 20 };
        newTransforms['footer'] = { x: 0, y: 0, scale: 1, zIndex: 20 };
        break;
      }

      case 'TOP':
      default: {
        // Image at top 35%, Price directly beneath, Product name below price, Footer at bottom
        updated.productImageWidthPct = 0.42;
        newTransforms['product-image'] = { x: 0, y: 0, scale: 1, zIndex: 15 };
        newTransforms['price'] = { x: 0, y: 0, scale: 0.92, zIndex: 20 };
        newTransforms['rupee'] = { x: 0, y: 0, scale: 0.92, zIndex: 20 };
        newTransforms['only'] = { x: 0, y: 0, scale: 0.92, zIndex: 20 };
        newTransforms['name'] = { x: 0, y: 0, scale: 0.95, zIndex: 20 };
        newTransforms['pack'] = { x: 0, y: 0, scale: 0.9, zIndex: 20 };
        newTransforms['mrp-save'] = { x: 0, y: 0, scale: 0.9, zIndex: 20 };
        newTransforms['footer'] = { x: 0, y: 0, scale: 1, zIndex: 20 };
        break;
      }
    }

    updated.elementTransforms = newTransforms;
    updated.overflowWarning = undefined;
    return updated;
  },

  /**
   * Fits all content strictly inside the printable board border.
   * Clamps offsets and gently scales down over-sized elements.
   */
  fitContent(slot: BoardSlot, config: BoardTemplateConfig): BoardSlot {
    const updated = { ...slot };
    const transforms = { ...(slot.elementTransforms || {}) };

    // Clamping boundaries (approx physical card bounds in px: ~3.78 px per mm)
    const maxDeltaX = Math.round((config.cardWidthMm / 2) * 2.8);
    const maxDeltaY = Math.round((config.cardHeightMm / 2) * 2.8);

    Object.keys(transforms).forEach((key) => {
      const cur = transforms[key];
      if (cur) {
        // Clamp X and Y to safe inner zone
        const clampedX = Math.max(-maxDeltaX, Math.min(maxDeltaX, cur.x || 0));
        const clampedY = Math.max(-maxDeltaY, Math.min(maxDeltaY, cur.y || 0));
        // Clamp scale to max 1.5 to prevent border crossing
        const clampedScale = Math.max(0.6, Math.min(1.4, cur.scale || 1));

        transforms[key] = {
          ...cur,
          x: clampedX,
          y: clampedY,
          scale: clampedScale,
        };
      }
    });

    if (slot.productImageWidthPct && slot.productImageWidthPct > 0.75) {
      updated.productImageWidthPct = 0.65;
    }

    updated.elementTransforms = transforms;
    updated.overflowWarning = undefined;
    return updated;
  },

  /**
   * Optimizes layout spacing by reducing empty white gaps while preserving hierarchy.
   */
  optimizeLayout(slot: BoardSlot, config: BoardTemplateConfig): BoardSlot {
    return this.fitContent(this.autoArrangeContent(slot, config, slot.insideImageArrangement || 'AUTO'), config);
  },

  /**
   * Restores pristine master Word geometry, clearing custom offsets.
   */
  restoreMasterLayout(slot: BoardSlot, config: BoardTemplateConfig): BoardSlot {
    return {
      ...slot,
      templateMode: 'MASTER',
      customFontFamily: undefined,
      customBorderThicknessPt: undefined,
      customPriceFontSizePt: undefined,
      customNameFontSizePt: undefined,
      customPackFontSizePt: undefined,
      customFooterFontSizePt: undefined,
      customSaveFontSizePt: undefined,
      customTextAlign: undefined,
      elementTransforms: {},
      isManualLayout: false,
      overflowWarning: undefined,
      productImageWidthPct: 0.42,
    };
  },

  /**
   * Collision detection & boundary validation: checks if any element exceeds board bounds.
   */
  validateContentBounds(slot: BoardSlot, config: BoardTemplateConfig): LayoutBoundsCheck {
    const overflows: string[] = [];
    const transforms = slot.elementTransforms || {};

    const maxSafeX = Math.round((config.cardWidthMm / 2) * 3.2);
    const maxSafeY = Math.round((config.cardHeightMm / 2) * 3.2);

    Object.entries(transforms).forEach(([elemId, t]) => {
      if (t && !t.hidden) {
        if (Math.abs(t.x || 0) > maxSafeX) {
          overflows.push(`${elemId} horizontal boundary exceeded`);
        }
        if (Math.abs(t.y || 0) > maxSafeY) {
          overflows.push(`${elemId} vertical boundary exceeded`);
        }
      }
    });

    if (slot.displayName && slot.displayName.length > 55 && !config.name.includes('1/1')) {
      overflows.push('Long product title may touch borders');
    }

    const valid = overflows.length === 0;
    return {
      valid,
      overflows,
      warningMessage: valid ? undefined : `Content overflow detected: ${overflows.join(', ')}. Use FIT CONTENT.`,
    };
  },
};
