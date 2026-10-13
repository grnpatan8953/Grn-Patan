import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Move,
  Trash2,
  RotateCcw,
  Undo,
  Redo,
  Lock,
  Unlock,
  Type,
  Image as ImageIcon,
  Sliders,
  Check,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Upload,
  Sun,
  Contrast,
  X,
  RefreshCw,
  Crop,
  Maximize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlertTriangle,
  Wand2,
  Bookmark,
  Ruler,
} from 'lucide-react';
import {
  BoardFormat,
  BoardSlot,
  BoardTemplateConfig,
  ImageFilterMode,
  InsideImageArrangement,
  SelectedElementType,
  NamedBoardDesign,
} from '../types';
import { SmartLayoutEngine } from '../services/smartLayoutEngine';
import { measureVisibleTextInches } from '../services/letterMetrics';
import { SaveMasterModal } from './SaveMasterModal';
import { OneEighthBoard } from './templates/OneEighthBoard';
import { applyStylePreset } from '../services/stylePresets';
import { SavedDesignsModal } from './SavedDesignsModal';

interface VisualBoardEditorProps {
  slot: BoardSlot;
  config: BoardTemplateConfig;
  isActive: boolean;
  onUpdateSlot: (updated: Partial<BoardSlot>) => void;
  onOpenAddBoardModal?: () => void;
  onCloseEditor?: () => void;
  initialShowLetterSize?: boolean;
}

export const VisualBoardEditor: React.FC<VisualBoardEditorProps> = ({
  slot,
  config,
  isActive,
  onUpdateSlot,
  onOpenAddBoardModal,
  onCloseEditor,
  initialShowLetterSize = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected element
  const [selectedId, setSelectedId] = useState<SelectedElementType | null>('price');
  const [showLetterSizeInspector, setShowLetterSizeInspector] = useState<boolean>(initialShowLetterSize);

  // Inline text editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const elementStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Resizing state
  const [isResizing, setIsResizing] = useState(false);
  const resizeHandleRef = useRef<string>('');
  const startDimRef = useRef<{ widthPct: number; scale: number; fontSize: number }>({ widthPct: 0.42, scale: 1, fontSize: 20 });

  // Snapshot of state for Cancelling
  const initialSnapshotRef = useRef<Partial<BoardSlot>>({ ...slot });
  useEffect(() => {
    initialSnapshotRef.current = JSON.parse(JSON.stringify(slot));
  }, [slot.slotIndex]);

  const [savedNotice, setSavedNotice] = useState(false);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<Array<Partial<BoardSlot>>>([]);
  const [future, setFuture] = useState<Array<Partial<BoardSlot>>>([]);

  // Named Designs Modal State
  const [isSavedDesignsModalOpen, setIsSavedDesignsModalOpen] = useState(false);
  const [savedDesignsModalMode, setSavedDesignsModalMode] = useState<'SAVE' | 'MANAGE'>('SAVE');

  // Letter Size (Inches) Panel State (Parts 4 & 5)
  const [showLetterSizePanel, setShowLetterSizePanel] = useState(false);
  const [letterInteractionMode, setLetterInteractionMode] = useState<'MEASURE_ONLY' | 'ADJUST_BOARD'>('MEASURE_ONLY');

  const handleApplyNamedDesign = (design: NamedBoardDesign) => {
    const layout = design.layout;
    const updatedSlot: Partial<BoardSlot> = {
      templateMode: 'CUSTOM',
      isManualLayout: true,
      customFontFamily: layout.customFontFamily,
      customFontWeight: layout.customFontWeight,
      customTextAlign: layout.customTextAlign,
      customBorderThicknessPt: layout.customBorderThicknessPt,
      customBorderStyle: layout.customBorderStyle,
      customPriceFontSizePt: layout.customPriceFontSizePt,
      customNameFontSizePt: layout.customNameFontSizePt,
      customPackFontSizePt: layout.customPackFontSizePt,
      customFooterFontSizePt: layout.customFooterFontSizePt,
      customSaveFontSizePt: layout.customSaveFontSizePt,
      customLetterSpacing: layout.customLetterSpacing,
      elementTransforms: layout.elementTransforms ? JSON.parse(JSON.stringify(layout.elementTransforms)) : undefined,
      additionalTextBoxes: layout.additionalTextBoxes ? JSON.parse(JSON.stringify(layout.additionalTextBoxes)) : undefined,
      imagePlacementMode: layout.imagePlacementMode,
      insideImageArrangement: layout.insideImageArrangement,
      imageOpacity: layout.imageOpacity,
      imageFilter: layout.imageFilter,
      productImageWidthPct: layout.productImageWidthPct,
      productImageHeightPct: layout.productImageHeightPct,
      productImageXOffset: layout.productImageXOffset,
      productImageYOffset: layout.productImageYOffset,
      textBacking: layout.textBacking,
      textShadow: layout.textShadow,
      hideProductName: layout.hideProductName,
      hidePackText: layout.hidePackText,
      hideFooter: layout.hideFooter,
      // Strictly PRESERVE current slot's offer type, focus status, and pricing
    };
    pushHistory(updatedSlot);
  };

  // Boundary validation check
  const boundsCheck = SmartLayoutEngine.validateContentBounds(slot, config);

  const pushHistory = useCallback(
    (newState: Partial<BoardSlot>) => {
      setHistory((prev) => [...prev.slice(-25), JSON.parse(JSON.stringify(slot))]);
      setFuture([]);
      onUpdateSlot(newState);
    },
    [slot, onUpdateSlot]
  );

  const handleSave = () => {
    initialSnapshotRef.current = JSON.parse(JSON.stringify(slot));
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onCloseEditor?.();
    }, 700);
  };

  const handleCancel = () => {
    onUpdateSlot(initialSnapshotRef.current);
    onCloseEditor?.();
  };


  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [{ ...slot }, ...prev]);
    onUpdateSlot(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, { ...slot }]);
    onUpdateSlot(next);
  };

  const transforms = slot.elementTransforms || {};
  const currentTransform = selectedId
    ? transforms[selectedId] || { x: 0, y: 0, scale: 1, zIndex: 10 }
    : { x: 0, y: 0, scale: 1, zIndex: 10 };
  const isLocked = Boolean(currentTransform.locked);

  // Keyboard navigation: Arrow keys move 1px (or 10px with Shift), Delete key deletes
  useEffect(() => {
    if (!isActive || !selectedId || editingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo / Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        const cur = transforms[selectedId] || { x: 0, y: 0, scale: 1, zIndex: 10 };
        if (cur.locked) return;

        pushHistory({
          isManualLayout: true,
          elementTransforms: {
            ...transforms,
            [selectedId]: {
              ...cur,
              x: cur.x + dx,
              y: cur.y + dy,
            },
          },
        });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Prevent deleting during text entry
        if (
          (e.target as HTMLElement)?.tagName === 'INPUT' ||
          (e.target as HTMLElement)?.tagName === 'TEXTAREA'
        ) {
          return;
        }
        e.preventDefault();
        handleDeleteElement(selectedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, selectedId, editingId, transforms, slot, pushHistory]);

  const handleDeleteElement = (id: string) => {
    if (id.startsWith('text-')) {
      const remaining = (slot.additionalTextBoxes || []).filter((t) => t.id !== id);
      pushHistory({ additionalTextBoxes: remaining });
      setSelectedId(null);
    } else if (id === 'product-image' || id === 'background-image') {
      pushHistory({ imageUrl: undefined });
      setSelectedId(null);
    } else if (id === 'pack') {
      pushHistory({ packText: '' });
    } else if (id === 'name') {
      pushHistory({ displayName: '' });
    } else if (id === 'price') {
      pushHistory({ displaySp: 0 });
    } else if (id === 'footer') {
      pushHistory({ customFooter: ' ' });
    } else {
      const cur = transforms[id] || { x: 0, y: 0, scale: 1 };
      pushHistory({
        elementTransforms: {
          ...transforms,
          [id]: { ...cur, hidden: true },
        },
      });
    }
  };

  // Drag element start
  const handleElementMouseDown = (e: React.MouseEvent, id: SelectedElementType) => {
    e.stopPropagation();
    setSelectedId(id);

    const cur = transforms[id] || { x: 0, y: 0, scale: 1, zIndex: 10 };
    if (cur.locked) return;

    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    elementStartPos.current = { x: cur.x, y: cur.y };
  };

  // Resize corner start
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (!selectedId) return;
    setIsResizing(true);
    resizeHandleRef.current = handle;
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    let startingFont = config.priceFontSizePt;
    if (selectedId === 'price') startingFont = slot.customPriceFontSizePt || config.priceFontSizePt;
    else if (selectedId === 'name') startingFont = slot.customNameFontSizePt || config.productNameFontSizePt;
    else if (selectedId === 'pack') startingFont = slot.customPackFontSizePt || config.packTextFontSizePt;
    else if (selectedId === 'footer') startingFont = slot.customFooterFontSizePt || config.footerFontSizePt;
    else if (selectedId === 'mrp-save') startingFont = slot.customSaveFontSizePt || config.saveFontSizePt || 14;
    else if (selectedId.startsWith('text-')) {
      const box = (slot.additionalTextBoxes || []).find((b) => b.id === selectedId);
      startingFont = box?.fontSizePt || 12;
    }

    startDimRef.current = {
      widthPct: slot.productImageWidthPct || 0.42,
      scale: currentTransform.scale || 1,
      fontSize: startingFont,
    };
  };

  // Global mousemove and mouseup for drag and resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      let zoomScale = 1;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetW = containerRef.current.offsetWidth;
        if (offsetW > 0 && rect.width > 0) {
          zoomScale = rect.width / offsetW;
        }
      }

      if (isDragging && selectedId) {
        const dx = (e.clientX - dragStartPos.current.x) / zoomScale;
        const dy = (e.clientY - dragStartPos.current.y) / zoomScale;
        const cur = transforms[selectedId] || { x: 0, y: 0, scale: 1, zIndex: 10 };

        // Card physical bounds clamping
        const maxDeltaX = Math.round((config.cardWidthMm / 2) * 3.2);
        const maxDeltaY = Math.round((config.cardHeightMm / 2) * 3.2);

        const newX = Math.max(-maxDeltaX, Math.min(maxDeltaX, elementStartPos.current.x + dx));
        const newY = Math.max(-maxDeltaY, Math.min(maxDeltaY, elementStartPos.current.y + dy));

        onUpdateSlot({
          isManualLayout: true,
          elementTransforms: {
            ...transforms,
            [selectedId]: {
              ...cur,
              x: Math.round(newX),
              y: Math.round(newY),
            },
          },
        });
      } else if (isResizing && selectedId) {
        const dx = (e.clientX - dragStartPos.current.x) / zoomScale;
        const dy = (e.clientY - dragStartPos.current.y) / zoomScale;
        const dist = Math.sqrt(dx * dx + dy * dy) * (dx + dy > 0 ? 1 : -1);

        if (selectedId === 'product-image') {
          const newPct = Math.min(
            0.95,
            Math.max(0.15, startDimRef.current.widthPct + dist * 0.002)
          );
          onUpdateSlot({
            isManualLayout: true,
            productImageWidthPct: Number(newPct.toFixed(3)),
          });
        } else if (['price', 'name', 'pack', 'footer', 'mrp-save'].includes(selectedId)) {
          const delta = Math.round(dist * 0.12);
          const startFont = startDimRef.current.fontSize || 20;
          const newFont = Math.max(7, startFont + delta);
          if (selectedId === 'price') {
            onUpdateSlot({ templateMode: 'CUSTOM', customPriceFontSizePt: newFont });
          } else if (selectedId === 'name') {
            onUpdateSlot({ templateMode: 'CUSTOM', customNameFontSizePt: newFont });
          } else if (selectedId === 'pack') {
            onUpdateSlot({ templateMode: 'CUSTOM', customPackFontSizePt: newFont });
          } else if (selectedId === 'footer') {
            onUpdateSlot({ templateMode: 'CUSTOM', customFooterFontSizePt: newFont });
          } else if (selectedId === 'mrp-save') {
            onUpdateSlot({ templateMode: 'CUSTOM', customSaveFontSizePt: newFont });
          }
        } else if (selectedId.startsWith('text-')) {
          const delta = Math.round(dist * 0.12);
          const startFont = startDimRef.current.fontSize || 12;
          const newFont = Math.max(8, startFont + delta);
          const updatedBoxes = (slot.additionalTextBoxes || []).map((t) =>
            t.id === selectedId ? { ...t, fontSizePt: newFont } : t
          );
          onUpdateSlot({ additionalTextBoxes: updatedBoxes });
        } else {
          const newScale = Math.min(
            3.0,
            Math.max(0.35, startDimRef.current.scale + dist * 0.007)
          );
          const cur = transforms[selectedId] || { x: 0, y: 0, scale: 1, zIndex: 10 };
          onUpdateSlot({
            isManualLayout: true,
            elementTransforms: {
              ...transforms,
              [selectedId]: {
                ...cur,
                scale: Number(newScale.toFixed(3)),
              },
            },
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        setIsDragging(false);
        setIsResizing(false);
        setHistory((prev) => [...prev.slice(-25), { ...slot }]);
      }
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, selectedId, transforms, slot, config, onUpdateSlot]);

  // Double click text inline edit
  const startEditing = (id: string, initialText: string) => {
    setEditingId(id);
    setEditingText(initialText);
  };

  const commitEditing = () => {
    if (!editingId) return;
    if (editingId === 'name') {
      pushHistory({ displayName: editingText.toUpperCase() });
    } else if (editingId === 'pack') {
      pushHistory({ packText: editingText.toUpperCase() });
    } else if (editingId === 'price') {
      const num = parseInt(editingText.replace(/[^0-9]/g, ''), 10) || 0;
      pushHistory({ displaySp: num });
    } else if (editingId === 'footer') {
      pushHistory({ customFooter: editingText });
    } else if (editingId.startsWith('text-')) {
      const updated = (slot.additionalTextBoxes || []).map((t) =>
        t.id === editingId ? { ...t, text: editingText } : t
      );
      pushHistory({ additionalTextBoxes: updated });
    }
    setEditingId(null);
  };

  // Add new custom text box
  const handleAddTextBox = () => {
    const id = `text-${Date.now()}`;
    const newBox = {
      id,
      text: 'SPECIAL PROMO',
      x: 0,
      y: 0,
      fontSizePt: 13,
      fontWeight: '900',
      color: '#000000',
    };
    pushHistory({
      additionalTextBoxes: [...(slot.additionalTextBoxes || []), newBox],
    });
    setSelectedId(id);
  };

  // Lock / Unlock toggle
  const toggleLock = (id: string) => {
    const cur = transforms[id] || { x: 0, y: 0, scale: 1, zIndex: 10 };
    pushHistory({
      elementTransforms: {
        ...transforms,
        [id]: {
          ...cur,
          locked: !cur.locked,
        },
      },
    });
  };

  // Reset individual element position
  const resetPosition = (id: string) => {
    const cur = transforms[id] || { x: 0, y: 0, scale: 1, zIndex: 10 };
    pushHistory({
      elementTransforms: {
        ...transforms,
        [id]: {
          ...cur,
          x: 0,
          y: 0,
          scale: 1,
        },
      },
    });
  };

  // Layer ordering
  const changeZIndex = (id: string, delta: number) => {
    const cur = transforms[id] || { x: 0, y: 0, scale: 1, zIndex: 10 };
    pushHistory({
      elementTransforms: {
        ...transforms,
        [id]: {
          ...cur,
          zIndex: Math.max(1, (cur.zIndex || 10) + delta),
        },
      },
    });
  };

  // Font family change
  const handleFontFamilyChange = (font: string) => {
    pushHistory({
      templateMode: 'CUSTOM',
      customFontFamily: font,
    });
  };

  // Alignment change
  const handleAlignmentChange = (align: 'left' | 'center' | 'right') => {
    pushHistory({
      templateMode: 'CUSTOM',
      customTextAlign: align,
    });
  };

  // Font size adjustment for selected element
  const adjustSelectedFontSize = (delta: number) => {
    if (!selectedId) return;
    if (selectedId === 'price') {
      const cur = slot.customPriceFontSizePt || config.priceFontSizePt;
      pushHistory({ templateMode: 'CUSTOM', customPriceFontSizePt: Math.max(16, cur + delta) });
    } else if (selectedId === 'name') {
      const cur = slot.customNameFontSizePt || config.productNameFontSizePt;
      pushHistory({ templateMode: 'CUSTOM', customNameFontSizePt: Math.max(9, cur + delta) });
    } else if (selectedId === 'pack') {
      const cur = slot.customPackFontSizePt || config.packTextFontSizePt;
      pushHistory({ templateMode: 'CUSTOM', customPackFontSizePt: Math.max(7, cur + delta) });
    } else if (selectedId === 'footer') {
      const cur = slot.customFooterFontSizePt || config.footerFontSizePt;
      pushHistory({ templateMode: 'CUSTOM', customFooterFontSizePt: Math.max(6, cur + delta) });
    } else if (selectedId.startsWith('text-')) {
      const updated = (slot.additionalTextBoxes || []).map((t) =>
        t.id === selectedId ? { ...t, fontSizePt: Math.max(6, (t.fontSizePt || 12) + delta) } : t
      );
      pushHistory({ additionalTextBoxes: updated });
    } else {
      const cur = transforms[selectedId] || { x: 0, y: 0, scale: 1, zIndex: 10 };
      pushHistory({
        isManualLayout: true,
        elementTransforms: {
          ...transforms,
          [selectedId]: {
            ...cur,
            scale: Math.max(0.4, Number(((cur.scale || 1) + delta * 0.08).toFixed(2))),
          },
        },
      });
    }
  };

  // Color change for selected element
  const changeSelectedColor = (color: string) => {
    if (!selectedId) return;
    if (selectedId.startsWith('text-')) {
      const updated = (slot.additionalTextBoxes || []).map((t) =>
        t.id === selectedId ? { ...t, color } : t
      );
      pushHistory({ additionalTextBoxes: updated });
    } else {
      const cur = transforms[selectedId] || { x: 0, y: 0, scale: 1, zIndex: 10 };
      pushHistory({
        elementTransforms: {
          ...transforms,
          [selectedId]: { ...cur, color },
        },
      });
    }
  };

  const toggleTextBacking = () => {
    pushHistory({ textBacking: !slot.textBacking });
  };

  const toggleTextShadow = () => {
    pushHistory({ textShadow: !slot.textShadow });
  };

  // Smart Layout Engine action triggers
  const handleAutoArrange = () => {
    const arranged = SmartLayoutEngine.autoArrangeContent(slot, config);
    pushHistory(arranged);
  };

  const handleFitContent = () => {
    const fitted = SmartLayoutEngine.fitContent(slot, config);
    pushHistory(fitted);
  };

  const handleOptimizeLayout = () => {
    const optimized = SmartLayoutEngine.optimizeLayout(slot, config);
    pushHistory(optimized);
  };

  const handleRestoreMaster = () => {
    const restored = SmartLayoutEngine.restoreMasterLayout(slot, config);
    pushHistory(restored);
  };

  // Image replacement file handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const payload: Partial<BoardSlot> = {
          imageUrl: reader.result,
          imageOpacity: slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0,
          productImageWidthPct: slot.productImageWidthPct || 0.42,
          imagePlacementMode: slot.imagePlacementMode || 'INSIDE',
        };
        const arranged = SmartLayoutEngine.autoArrangeContent(
          { ...slot, ...payload } as BoardSlot,
          config
        );
        pushHistory(arranged);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Helper for rendering Canva bounding box & 4 corner resize handles
  const renderBoundingBox = (id: SelectedElementType) => {
    if (selectedId !== id) return null;
    return (
      <div className="absolute inset-0 pointer-events-none z-40 ring-2 ring-blue-500 ring-offset-1 rounded-xs">
        {!isLocked && (
          <div className="pointer-events-auto">
            <div
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize shadow-xs"
              title="Drag corner to resize"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize shadow-xs"
              title="Drag corner to resize"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'se')}
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize shadow-xs"
              title="Drag corner to resize"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize shadow-xs"
              title="Drag corner to resize"
            />
          </div>
        )}
      </div>
    );
  };

  // Image styles
  const isBackgroundImg = slot.imagePlacementMode === 'BACKGROUND' && Boolean(slot.imageUrl);
  const bgOpacity = slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0;
  const imgFilter =
    slot.imageFilter === 'grayscale'
      ? 'grayscale(100%)'
      : slot.imageFilter === 'lighten'
      ? 'brightness(135%) contrast(85%)'
      : 'none';
  const imgWidthPct = slot.productImageWidthPct || 0.42;

  const textBackingClass = slot.textBacking ? 'bg-white/85 px-1 py-0.5 rounded-xs' : '';
  const textShadowStyle: React.CSSProperties = slot.textShadow
    ? { textShadow: '0 1px 2px #fff, 0 0 1px #fff' }
    : {};

  const isTypeB = slot.boardType === 'MRP_SAVE';
  const mrp = slot.displayMrp || (slot.product ? slot.product.mrp : 0);
  const sp = slot.displaySp || (slot.product ? slot.product.retail : 0);
  const save = slot.displaySave !== undefined ? slot.displaySave : Math.max(0, mrp - sp);

  const priceSize = slot.customPriceFontSizePt || config.priceFontSizePt;
  const nameSize = slot.customNameFontSizePt || config.productNameFontSizePt;
  const footerText = slot.customFooter ?? config.footerText;
  const textAlign = slot.customTextAlign || 'center';
  const fontFamily = slot.customFontFamily || config.fontFamily;

  const getTransformStyle = (id: string): React.CSSProperties => {
    const t = transforms[id] || { x: 0, y: 0, scale: 1, zIndex: 10 };
    if (t.hidden) return { display: 'none' };
    return {
      transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale || 1})`,
      zIndex: t.zIndex || 10,
      cursor: t.locked ? 'default' : 'move',
      position: 'relative',
    };
  };

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          setSelectedId(null);
        }
      }}
      style={{
        width: `${config.cardWidthMm}mm`,
        height: `${config.cardHeightMm}mm`,
        border: `${slot.customBorderThicknessPt || config.borderWidthPt}pt solid #000000`,
        fontFamily,
        boxSizing: 'border-box',
        padding: config.format === '1/8' ? 0 : `${config.paddingMm}mm`,
      }}
      className="relative flex flex-col justify-between items-center text-black bg-white select-none overflow-visible shadow-lg ring-2 ring-blue-600/40"
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* CANVA FLOATING TOP TOOLBAR */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-neutral-900/95 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-2xl border border-neutral-700 text-xs font-bold no-print whitespace-nowrap animate-in fade-in duration-150"
      >
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0}
          className="p-1 hover:bg-neutral-800 disabled:opacity-30 rounded text-neutral-300 hover:text-white cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={future.length === 0}
          className="p-1 hover:bg-neutral-800 disabled:opacity-30 rounded text-neutral-300 hover:text-white cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-neutral-700 mx-0.5" />

        {/* Selected Element Controls */}
        {selectedId ? (
          <div className="flex items-center gap-1">
            <span className="uppercase text-amber-400 font-mono tracking-tight text-[11px] font-black bg-neutral-800 px-1.5 py-0.5 rounded">
              {selectedId === 'product-image'
                ? 'Product Img'
                : selectedId === 'background-image'
                ? 'Background'
                : selectedId === 'mrp-save'
                ? 'MRP/Save'
                : selectedId}
            </span>

            {/* Lock / Unlock */}
            <button
              type="button"
              onClick={() => toggleLock(selectedId)}
              className={`p-1 rounded cursor-pointer ${
                isLocked
                  ? 'bg-amber-500 text-black'
                  : 'hover:bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
              title={isLocked ? 'Unlock element' : 'Lock element in place'}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            {/* Reset Position */}
            <button
              type="button"
              onClick={() => resetPosition(selectedId)}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white cursor-pointer"
              title="Reset position to default center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Layer Bring Forward / Send Backward */}
            <button
              type="button"
              onClick={() => changeZIndex(selectedId, 1)}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white cursor-pointer"
              title="Bring forward (Layer +1)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => changeZIndex(selectedId, -1)}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white cursor-pointer"
              title="Send backward (Layer -1)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            {/* Delete Element */}
            <button
              type="button"
              onClick={() => handleDeleteElement(selectedId)}
              className="p-1 hover:bg-rose-900/60 rounded text-rose-400 hover:text-rose-300 cursor-pointer"
              title="Delete / Clear element"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* TEXT SIZE & WEIGHT CONTROL */}
            {(selectedId === 'price' || selectedId === 'name' || selectedId === 'pack' || selectedId === 'footer' || selectedId === 'mrp-save' || selectedId === 'rupee' || selectedId === 'only') && (
              <div className="flex items-center gap-1 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700 ml-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase">Size:</span>
                <button
                  type="button"
                  onClick={() => adjustSelectedFontSize(-1)}
                  className="px-1 bg-neutral-700 hover:bg-neutral-600 rounded text-white text-xs font-black cursor-pointer"
                  title="Decrease font size"
                >
                  A-
                </button>
                <span className="text-[11px] font-mono font-bold text-white px-1">
                  {selectedId === 'price' ? priceSize : selectedId === 'name' ? nameSize : selectedId === 'footer' ? (slot.customFooterFontSizePt || config.footerFontSizePt) : selectedId === 'mrp-save' ? (slot.customSaveFontSizePt || config.saveFontSizePt || 14) : 20}pt
                </span>
                <button
                  type="button"
                  onClick={() => adjustSelectedFontSize(1)}
                  className="px-1 bg-neutral-700 hover:bg-neutral-600 rounded text-white text-xs font-black cursor-pointer"
                  title="Increase font size"
                >
                  A+
                </button>
              </div>
            )}
          </div>
        ) : (
          <span className="text-neutral-400 text-[11px] font-normal">Click any element to edit</span>
        )}

        <div className="h-4 w-px bg-neutral-700 mx-0.5" />

        {/* SMART LAYOUT ENGINE BUTTONS */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleAutoArrange}
            className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-[11px] font-black cursor-pointer shadow-xs"
            title="Auto Arrange: automatically fit and position image/text inside borders"
          >
            <Wand2 className="w-3 h-3" />
            <span>AUTO ARRANGE</span>
          </button>

          <button
            type="button"
            onClick={handleFitContent}
            className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[11px] font-black cursor-pointer border border-neutral-700"
            title="Fit Content: clamp and scale elements to prevent crossing borders"
          >
            <span>FIT CONTENT</span>
          </button>

          <button
            type="button"
            onClick={handleRestoreMaster}
            className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded text-[11px] font-bold cursor-pointer border border-neutral-700"
            title="Restore Master Layout: reset all custom design overrides"
          >
            <span>RESTORE MASTER</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLetterSizePanel(true)}
            className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-black cursor-pointer shadow-xs"
            title="Open Letter Size (Inches) inspector and adjustment panel"
          >
            <Ruler className="w-3 h-3" />
            <span>LETTER SIZE (INCHES)</span>
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-700 mx-0.5" />

        {/* Style Preset Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-amber-400 font-black uppercase">STYLE:</span>
          <select
            value={slot.typographyStyle || (slot.templateMode === 'MASTER' ? 'ORIGINAL_WORD_MASTER' : 'CUSTOM')}
            onChange={(e) => {
              const updated = applyStylePreset(slot, config, e.target.value as any);
              pushHistory(updated);
            }}
            className="bg-neutral-800 text-amber-300 border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] font-black cursor-pointer"
            title="Apply Typography & Layout Style Preset"
          >
            <option value="ORIGINAL_WORD_MASTER">WORD MASTER</option>
            <option value="EXTRA_BOLD">EXTRA BOLD</option>
            <option value="CONDENSED">CONDENSED</option>
            <option value="CUSTOM">CUSTOM</option>
          </select>
        </div>

        {/* Typography Controls */}
        <div className="flex items-center gap-1">
          <select
            value={fontFamily}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            className="bg-neutral-800 text-white border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] font-bold"
            title="Select Font Family"
          >
            <option value="'Barlow Condensed', 'Anton', 'Impact', 'Arial Black', sans-serif">
              Barlow (Word Master)
            </option>
            <option value="'Anton', 'Impact', sans-serif">Anton Heavy</option>
            <option value="'Impact', sans-serif">Impact Classic</option>
            <option value="'Arial Black', sans-serif">Arial Black</option>
            <option value="'Inter', sans-serif">Inter Clean</option>
          </select>

          {/* Alignment */}
          <button
            type="button"
            onClick={() => handleAlignmentChange('left')}
            className={`p-1 rounded cursor-pointer ${
              textAlign === 'left' ? 'bg-amber-500 text-black' : 'hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleAlignmentChange('center')}
            className={`p-1 rounded cursor-pointer ${
              textAlign === 'center' ? 'bg-amber-500 text-black' : 'hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            <AlignCenter className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleAlignmentChange('right')}
            className={`p-1 rounded cursor-pointer ${
              textAlign === 'right' ? 'bg-amber-500 text-black' : 'hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            <AlignRight className="w-3 h-3" />
          </button>
        </div>

        {/* Quick Add Custom Text */}
        <button
          type="button"
          onClick={handleAddTextBox}
          className="flex items-center gap-1 px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[11px] font-bold cursor-pointer border border-neutral-700 ml-1"
          title="Add custom promotional text box"
        >
          <Plus className="w-3 h-3 text-amber-400" />
          <span>+ Text</span>
        </button>

        {/* Insert / Replace Image */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[11px] font-bold cursor-pointer border border-neutral-700"
          title={slot.imageUrl ? 'Replace current image' : 'Insert image into board'}
        >
          <ImageIcon className="w-3 h-3 text-amber-400" />
          <span>{slot.imageUrl ? 'Replace Img' : '+ Image'}</span>
        </button>

        {/* Image Controls if Slot has Image */}
        {slot.imageUrl && (
          <div className="flex items-center gap-1.5 pl-1 border-l border-neutral-700">
            {/* Opacity Slider */}
            <div className="flex items-center gap-1" title="Adjust Image Visibility (0% to 100%)">
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                {Math.round((slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0) * 100)}%
              </span>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0}
                onChange={(e) => pushHistory({ imageOpacity: parseFloat(e.target.value) })}
                className="w-12 accent-amber-500 h-1 cursor-pointer"
              />
            </div>

            {/* Filter Toggle */}
            <button
              type="button"
              onClick={() => {
                const next: ImageFilterMode =
                  slot.imageFilter === 'original' || !slot.imageFilter
                    ? 'grayscale'
                    : slot.imageFilter === 'grayscale'
                    ? 'lighten'
                    : 'original';
                pushHistory({ imageFilter: next });
              }}
              className="px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-bold text-neutral-300"
            >
              {slot.imageFilter === 'grayscale'
                ? 'B&W'
                : slot.imageFilter === 'lighten'
                ? 'Light'
                : 'Color'}
            </button>

            {/* Mode A / Mode B */}
            <button
              type="button"
              onClick={() => {
                const nextMode = slot.imagePlacementMode === 'BACKGROUND' ? 'INSIDE' : 'BACKGROUND';
                const nextArranged = SmartLayoutEngine.autoArrangeContent(
                  { ...slot, imagePlacementMode: nextMode } as BoardSlot,
                  config
                );
                pushHistory(nextArranged);
              }}
              className={`px-1 py-0.5 rounded text-[10px] font-bold ${
                slot.imagePlacementMode === 'BACKGROUND'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {slot.imagePlacementMode === 'BACKGROUND' ? 'BG' : 'OBJ'}
            </button>
            {/* Readability Backing & Shadow */}
            <button
              type="button"
              onClick={toggleTextBacking}
              className={`px-1 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                slot.textBacking
                  ? 'bg-amber-400 text-black'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
              title="Toggle translucent white backing behind text for maximum contrast on background images"
            >
              Backing
            </button>
            <button
              type="button"
              onClick={toggleTextShadow}
              className={`px-1 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                slot.textShadow
                  ? 'bg-amber-400 text-black'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
              title="Toggle text shadow for readability"
            >
              Shadow
            </button>
          </div>
        )}

        {/* Font Size A- / A+ */}
        {selectedId && (
          <div className="flex items-center gap-0.5 pl-1 border-l border-neutral-700">
            <button
              type="button"
              onClick={() => adjustSelectedFontSize(-2)}
              className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded text-[10px] font-black cursor-pointer"
              title="Decrease font size / scale"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => adjustSelectedFontSize(2)}
              className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded text-[10px] font-black cursor-pointer"
              title="Increase font size / scale"
            >
              A+
            </button>
          </div>
        )}

        {/* Color Palette */}
        {selectedId && (
          <div className="flex items-center gap-1 pl-1 border-l border-neutral-700" title="Select text color">
            <button
              type="button"
              onClick={() => changeSelectedColor('#000000')}
              className="w-3.5 h-3.5 rounded-full bg-black border border-white/50 cursor-pointer"
              title="Black"
            />
            <button
              type="button"
              onClick={() => changeSelectedColor('#dc2626')}
              className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white/50 cursor-pointer"
              title="Red"
            />
            <button
              type="button"
              onClick={() => changeSelectedColor('#d97706')}
              className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-white/50 cursor-pointer"
              title="Amber"
            />
            <button
              type="button"
              onClick={() => changeSelectedColor('#2563eb')}
              className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-white/50 cursor-pointer"
              title="Blue"
            />
          </div>
        )}

        <div className="h-4 w-px bg-neutral-700 mx-0.5" />

        {/* SAVE & CANCEL ACTIONS */}
        <div className="flex items-center gap-1 pl-0.5">
          {/* SAVE AS NAMED DESIGN */}
          <button
            type="button"
            onClick={() => {
              setSavedDesignsModalMode('SAVE');
              setIsSavedDesignsModalOpen(true);
            }}
            className="flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black rounded text-xs cursor-pointer shadow-xs"
            title="Save this exact board design with a custom name (e.g. Mahir, Full Bold)"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>SAVE DESIGN</span>
          </button>

          {/* MY SAVED DESIGNS */}
          <button
            type="button"
            onClick={() => {
              setSavedDesignsModalMode('MANAGE');
              setIsSavedDesignsModalOpen(true);
            }}
            className="flex items-center gap-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-black rounded text-xs cursor-pointer border border-neutral-700 shadow-xs"
            title="Open and apply your saved custom designs (Mahir, Full Bold, etc.)"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>MY DESIGNS</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-black cursor-pointer transition shadow-xs ${
              savedNotice
                ? 'bg-emerald-400 text-black'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="Save all changes for this slot"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{savedNotice ? 'SAVED!' : 'SAVE'}</span>
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-1 bg-neutral-800 hover:bg-rose-900/60 text-neutral-300 hover:text-rose-300 rounded text-xs font-bold cursor-pointer"
            title="Cancel: restore previous saved state"
          >
            <X className="w-3.5 h-3.5" />
            <span>CANCEL</span>
          </button>
        </div>
      </div>

      {/* OVERFLOW WARNING BADGE IF CONTENT CROSSES BORDER */}
      {!boundsCheck.valid && (
        <div
          onClick={handleFitContent}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-40 bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md cursor-pointer animate-pulse"
          title="Click to automatically fit all content inside border"
        >
          <AlertTriangle className="w-3 h-3 text-black" />
          <span>Overflow Warning: Click FIT CONTENT</span>
        </div>
      )}

      {/* Renderer: 1/8 Template or Generic */}
      {config.format === '1/8' ? (
        <OneEighthBoard
          slot={slot}
          config={config}
          isEditorMode={true}
          selectedId={selectedId}
          editingId={editingId}
          editingText={editingText}
          onSelectElement={setSelectedId}
          onElementMouseDown={handleElementMouseDown}
          onElementDoubleClick={startEditing}
          onEditingTextChange={setEditingText}
          onCommitEditing={commitEditing}
          renderBoundingBox={renderBoundingBox}
        />
      ) : (
        <>
          {/* MODE A: BACKGROUND IMAGE BEHIND TEXT */}
          {isBackgroundImg && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId('background-image');
              }}
              onMouseDown={(e) => handleElementMouseDown(e, 'background-image')}
              style={{
                opacity: bgOpacity,
                filter: imgFilter,
                transform: `translate(${transforms['background-image']?.x || 0}px, ${
                  transforms['background-image']?.y || 0
                }px) scale(${transforms['background-image']?.scale || 1})`,
                zIndex: transforms['background-image']?.zIndex || 0,
                cursor: transforms['background-image']?.locked ? 'default' : 'move',
              }}
              className="absolute inset-0 flex items-center justify-center overflow-hidden"
            >
              <img
                src={slot.imageUrl}
                alt=""
                className={`w-full h-full pointer-events-none ${
                  slot.imageFit === 'cover' ? 'object-cover' : 'object-contain'
                }`}
              />
              {renderBoundingBox('background-image')}
            </div>
          )}

          {/* MAIN CONTENT AREA */}
          <div
            className={`relative z-10 flex-1 flex flex-col justify-start items-${
              textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'center'
            } w-full my-auto px-1`}
          >
            {/* MODE B: PRODUCT IMAGE INSIDE BOARD */}
            {!isBackgroundImg && slot.imageUrl && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId('product-image');
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'product-image')}
                style={{
                  width: `${imgWidthPct * 100}%`,
                  maxHeight: '45%',
                  margin: '0 auto 2px auto',
                  filter: imgFilter,
                  opacity: slot.imageOpacity !== undefined ? slot.imageOpacity : 1.0,
                  ...getTransformStyle('product-image'),
                }}
                className="relative flex items-center justify-center overflow-visible group"
              >
                <img
                  src={slot.imageUrl}
                  alt={slot.displayName}
                  className={`max-h-full max-w-full pointer-events-none ${
                    slot.imageFit === 'cover' ? 'object-cover w-full h-full' : 'object-contain'
                  }`}
                />
                {renderBoundingBox('product-image')}
              </div>
            )}

            {/* PRICE BLOCK: RUPEE + PRICE + ONLY */}
            <div
              style={textShadowStyle}
              className={`flex items-baseline justify-center tracking-tight leading-none text-black ${textBackingClass} mt-0.5`}
            >
              {/* RUPEE SYMBOL */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId('rupee');
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'rupee')}
                style={{
                  fontSize: `${config.rupeeSymbolSizePt}pt`,
                  marginRight: '2pt',
                  fontWeight: 900,
                  ...getTransformStyle('rupee'),
                }}
                className="relative font-black select-none flex items-center justify-center p-0.5"
              >
                <span>₹</span>
                {renderBoundingBox('rupee')}
              </div>

              {/* SELLING PRICE */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId('price');
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'price')}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEditing('price', String(sp));
                }}
                style={{
                  fontSize: `${priceSize}pt`,
                  fontWeight: 900,
                  lineHeight: 0.88,
                  letterSpacing: '-0.02em',
                  ...getTransformStyle('price'),
                }}
                className="relative font-black select-none flex items-center justify-center p-0.5"
              >
                {editingId === 'price' ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={commitEditing}
                    onKeyDown={(e) => e.key === 'Enter' && commitEditing()}
                    className="w-24 bg-white border-2 border-blue-600 px-1 font-black text-black outline-none"
                  />
                ) : (
                  <span>{sp}</span>
                )}
                {renderBoundingBox('price')}
              </div>

              {/* ONLY TEXT */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId('only');
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'only')}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEditing('only', 'ONLY');
                }}
                style={{
                  fontSize: `${config.onlyFontSizePt}pt`,
                  marginLeft: '4pt',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  ...getTransformStyle('only'),
                }}
                className="relative font-black uppercase select-none flex items-center justify-center p-0.5"
              >
                <span>ONLY</span>
                {renderBoundingBox('only')}
              </div>
            </div>

            {/* PRODUCT NAME */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId('name');
              }}
              onMouseDown={(e) => handleElementMouseDown(e, 'name')}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startEditing('name', slot.displayName);
              }}
              style={{
                fontSize: `${nameSize}pt`,
                fontWeight: 900,
                lineHeight: 1.02,
                letterSpacing: '0.01em',
                marginTop: '1.2mm',
                textAlign,
                ...getTransformStyle('name'),
              }}
              className={`relative font-black uppercase max-w-full px-1 break-words text-neutral-900 select-none ${textBackingClass}`}
            >
              {editingId === 'name' ? (
                <textarea
                  autoFocus
                  rows={2}
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={commitEditing}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && commitEditing()}
                  className="w-full bg-white border-2 border-blue-600 px-1 font-black text-black text-xs uppercase outline-none resize-none"
                />
              ) : (
                <span className="whitespace-pre-line">{slot.displayName || 'PRODUCT NAME'}</span>
              )}
              {renderBoundingBox('name')}
            </div>

            {/* PACK / SET TEXT */}
            {slot.packText && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId('pack');
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'pack')}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEditing('pack', slot.packText);
                }}
                style={{
                  fontSize: `${slot.customPackFontSizePt || config.packTextFontSizePt}pt`,
                  fontWeight: 800,
                  marginTop: '1mm',
                  letterSpacing: '0.03em',
                  textAlign,
                  ...getTransformStyle('pack'),
                }}
                className={`relative font-black uppercase tracking-wide text-neutral-900 select-none ${textBackingClass}`}
              >
                {editingId === 'pack' ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={commitEditing}
                    onKeyDown={(e) => e.key === 'Enter' && commitEditing()}
                    className="w-36 bg-white border-2 border-blue-600 px-1 font-black text-black text-xs uppercase outline-none"
                  />
                ) : (
                  <span>{slot.packText}</span>
                )}
                {renderBoundingBox('pack')}
              </div>
            )}

            {/* TYPE B: MRP + SAVE LINE */}
            {isTypeB && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId('mrp-save');
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'mrp-save')}
                style={{
                  fontSize: `${slot.customSaveFontSizePt || config.saveFontSizePt || 12}pt`,
                  fontWeight: 800,
                  marginTop: '1mm',
                  letterSpacing: '0.02em',
                  textAlign,
                  ...getTransformStyle('mrp-save'),
                }}
                className={`relative font-black uppercase tracking-tight text-neutral-900 select-none ${textBackingClass}`}
              >
                <span>(MRP:- ₹{mrp}/- &nbsp;&nbsp;&nbsp; SAVE:- ₹{save}/-)</span>
                {renderBoundingBox('mrp-save')}
              </div>
            )}

            {/* ADDITIONAL CUSTOM TEXT BOXES */}
            {(slot.additionalTextBoxes || []).map((box) => (
              <div
                key={box.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(box.id);
                }}
                onMouseDown={(e) => handleElementMouseDown(e, box.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEditing(box.id, box.text);
                }}
                style={{
                  fontSize: `${box.fontSizePt}pt`,
                  fontWeight: (box.fontWeight as any) || '900',
                  color: box.color || '#000000',
                  marginTop: '1mm',
                  ...getTransformStyle(box.id),
                }}
                className={`relative px-1 py-0.5 rounded-xs select-none ${textBackingClass}`}
              >
                {editingId === box.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={commitEditing}
                    onKeyDown={(e) => e.key === 'Enter' && commitEditing()}
                    className="bg-white border-2 border-blue-600 px-1 text-black font-black outline-none"
                  />
                ) : (
                  <span>{box.text}</span>
                )}
                {renderBoundingBox(box.id)}
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId('footer');
            }}
            onMouseDown={(e) => handleElementMouseDown(e, 'footer')}
            onDoubleClick={(e) => {
              e.stopPropagation();
              startEditing('footer', footerText);
            }}
            style={{
              fontSize: `${slot.customFooterFontSizePt || config.footerFontSizePt}pt`,
              fontWeight: 900,
              letterSpacing: '0.02em',
              lineHeight: 1,
              textAlign,
              ...getTransformStyle('footer'),
            }}
            className={`relative z-10 w-full text-center uppercase font-black text-black select-none pt-0.5 ${textBackingClass}`}
          >
            {editingId === 'footer' ? (
              <input
                autoFocus
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={commitEditing}
                onKeyDown={(e) => e.key === 'Enter' && commitEditing()}
                className="w-full bg-white border-2 border-blue-600 px-1 font-black text-black text-xs uppercase outline-none text-center"
              />
            ) : (
              <span>{isTypeB ? '' : footerText}</span>
            )}
            {renderBoundingBox('footer')}
          </div>
        </>
      )}

      {/* LETTER SIZE (INCHES) INSPECTOR & ADJUSTER PANEL (PARTS 4 & 5) */}
      {showLetterSizePanel && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-black tracking-wide uppercase">
                  LETTER SIZE (INCHES) INSPECTOR
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLetterSizePanel(false)}
                className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex border-b border-neutral-800 bg-neutral-950/50 gap-2">
              <button
                type="button"
                onClick={() => setLetterInteractionMode('MEASURE_ONLY')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                  letterInteractionMode === 'MEASURE_ONLY'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Measure Only (Read-Only)
              </button>
              <button
                type="button"
                onClick={() => setLetterInteractionMode('ADJUST_BOARD')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                  letterInteractionMode === 'ADJUST_BOARD'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Adjust This Board
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700 text-neutral-300">
                <p className="font-bold text-white mb-1">Actual Visible Lettering Measurements (1 in = 25.4 mm)</p>
                <p className="text-[11px] text-neutral-400">
                  Measured using precise ink glyph metrics. Zoom level does not affect physical readings.
                </p>
              </div>

              {(() => {
                const nameText = slot.displayName || (slot.product ? slot.product.itemName : 'Product Name');
                const priceText = `₹${sp}`;
                const onlyText = 'ONLY';
                const packText = slot.packText || '';
                const footerDisplay = isTypeB ? `(MRP:- ₹${mrp}/- SAVE:- ₹${save}/-)` : footerText;

                const saveSize = slot.customSaveFontSizePt || config.saveFontSizePt || 14;
                const footerSize = slot.customFooterFontSizePt || config.footerFontSizePt;

                const nameMetrics = measureVisibleTextInches(nameText, nameSize, fontFamily, 1.0);
                const priceMetrics = measureVisibleTextInches(priceText, priceSize, fontFamily, 1.0);
                const onlyMetrics = measureVisibleTextInches(onlyText, priceSize * 0.5, fontFamily, 1.0);
                const packMetrics = measureVisibleTextInches(packText, config.packTextFontSizePt, fontFamily, 1.0);
                const footerMetrics = measureVisibleTextInches(footerDisplay, isTypeB ? saveSize : footerSize, fontFamily, 1.0);

                const items = [
                  { label: 'Price Digits', text: priceText, pt: priceSize, metrics: priceMetrics },
                  { label: 'Rupee Symbol (₹)', text: '₹', pt: priceSize, metrics: measureVisibleTextInches('₹', priceSize, fontFamily, 1.0) },
                  { label: 'ONLY', text: 'ONLY', pt: Math.round(priceSize * 0.5), metrics: onlyMetrics },
                  { label: 'Product Name', text: nameText, pt: nameSize, metrics: nameMetrics },
                  { label: 'Pack Text', text: packText || 'N/A', pt: config.packTextFontSizePt, metrics: packMetrics },
                  { label: isTypeB ? 'MRP/SAVE Footer' : 'FINAL PRICE Footer', text: footerDisplay, pt: isTypeB ? saveSize : footerSize, metrics: footerMetrics },
                ];

                return (
                  <div className="space-y-2.5">
                    {items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-black text-white text-sm">{item.label}</div>
                          <div className="text-[11px] text-neutral-400">
                            Font: {fontFamily.split(',')[0].replace(/['"]/g, '')} • {item.pt} pt • Text: "{item.text}"
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-amber-400 font-black">
                            Height: {item.metrics.letterHeightInches} in ({item.metrics.letterHeightMm} mm)
                          </div>
                          <div className="text-neutral-300 text-[11px]">
                            Width: {item.metrics.totalWidthInches} in ({item.metrics.totalWidthMm} mm)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {letterInteractionMode === 'ADJUST_BOARD' && (
                <div className="p-4 bg-amber-950/30 border border-amber-500/60 rounded-xl space-y-3">
                  <div className="font-black text-amber-400 uppercase">Adjust Typography (Affects ONLY this board)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 mb-1">Price Font Size (pt)</label>
                      <input
                        type="number"
                        min="12"
                        max="72"
                        value={priceSize}
                        onChange={(e) => pushHistory({ customPriceFontSizePt: Number(e.target.value) })}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 mb-1">Product Name Font Size (pt)</label>
                      <input
                        type="number"
                        min="8"
                        max="36"
                        value={nameSize}
                        onChange={(e) => pushHistory({ customNameFontSizePt: Number(e.target.value) })}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-white font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-200/80">
                    Note: Adjustments modify this active board layout only. Saved named designs remain safely untouched.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLetterSizePanel(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-lg uppercase cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Named Reusable Board Designs Modal */}
      <SavedDesignsModal
        isOpen={isSavedDesignsModalOpen}
        onClose={() => setIsSavedDesignsModalOpen(false)}
        mode={savedDesignsModalMode}
        currentSlot={slot}
        currentFormat={config.format}
        filledSlotsCount={1}
        onApplyToSelected={handleApplyNamedDesign}
        onApplyToAll={handleApplyNamedDesign}
        onSaveSuccess={(name) => {
          setSavedNotice(true);
          setTimeout(() => setSavedNotice(false), 2000);
        }}
      />
    </div>
  );
};
