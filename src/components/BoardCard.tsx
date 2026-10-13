import React from 'react';
import { BoardSlot, BoardTemplateConfig } from '../types';
import { OneEighthBoard } from './templates/OneEighthBoard';
import { OneQuarterBoard } from './templates/OneQuarterBoard';
import { OneThirdBoard } from './templates/OneThirdBoard';
import { OneHalfBoard } from './templates/OneHalfBoard';
import { FullPageBoard } from './templates/FullPageBoard';
import { RoundBoard } from './templates/RoundBoard';
import { NotebookBoard } from './templates/NotebookBoard';

interface BoardCardProps {
  slot: BoardSlot;
  config: BoardTemplateConfig;
  showSlotBadge?: boolean;
  onSlotClick?: () => void;
  isInteractive?: boolean;
}

export const BoardCard: React.FC<BoardCardProps> = (props) => {
  switch (props.config.format) {
    case '1/8':
      return <OneEighthBoard {...props} />;
    case '1/4':
      return <OneQuarterBoard {...props} />;
    case '1/3':
      return <OneThirdBoard {...props} />;
    case '1/2':
      return <OneHalfBoard {...props} />;
    case '1/1':
      return <FullPageBoard {...props} />;
    case 'ROUND':
      return <RoundBoard {...props} />;
    case 'NOTEBOOK':
      return <NotebookBoard {...props} />;
    default:
      return <OneEighthBoard {...props} />;
  }
};
