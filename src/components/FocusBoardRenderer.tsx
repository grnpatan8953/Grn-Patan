import React from 'react';
import { BoardFormat, BoardSlot, FocusPrintMode, StarConfig } from '../types';
import { DEFAULT_TEMPLATE_CONFIGS } from '../services/templateConfig';
import { OneEighthBoard } from './templates/OneEighthBoard';

interface FocusBoardRendererProps {
  slot: BoardSlot;
  printMode?: FocusPrintMode;
  starConfig?: StarConfig;
  className?: string;
  style?: React.CSSProperties;
}

export const FocusBoardRenderer: React.FC<FocusBoardRendererProps> = ({
  slot,
  printMode = slot.focusPrintMode || 'YELLOW_PAPER',
  starConfig = slot.starConfig,
  className = '',
  style = {},
}) => {
  const format = (slot as any).format || '1/8';
  const config = DEFAULT_TEMPLATE_CONFIGS[format as BoardFormat] || DEFAULT_TEMPLATE_CONFIGS['1/8'];

  const unifiedSlot: BoardSlot = {
    ...slot,
    isFocusBoard: true,
    focusPrintMode: printMode,
    starConfig: starConfig || {
      visible: true,
      style: 'CLASSIC_5',
      position: 'TOP_RIGHT',
      sizePt: 56,
      color: '#000000',
    },
  };

  return (
    <OneEighthBoard
      slot={unifiedSlot}
      config={config}
      isInteractive={false}
    />
  );
};

