import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Grid,
  Printer,
  History,
  Settings,
  Layers,
  LayoutDashboard,
  FileCheck,
  Wand2,
  Star,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'stock-report'
  | 'products'
  | 'board-maker'
  | 'focus-board'
  | 'rules'
  | 'master-importer'
  | 'history'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  productCount: number;
  lastImportFileName?: string;
  onQuickPrintPreview?: () => void;
  hasBoardsReady?: boolean;
  focusCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  productCount,
  onQuickPrintPreview,
  hasBoardsReady,
  focusCount = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'stock-report' as NavTab,
      label: 'Stock Report',
      icon: FileSpreadsheet,
      badge: productCount > 0 ? `${productCount.toLocaleString()}` : undefined,
    },
    {
      id: 'products' as NavTab,
      label: 'Products',
      icon: Layers,
    },
    {
      id: 'board-maker' as NavTab,
      label: 'Board Maker',
      icon: Grid,
      badge: hasBoardsReady ? 'Ready' : undefined,
      badgeColor: 'bg-emerald-500 text-black',
    },
    {
      id: 'focus-board' as NavTab,
      label: 'Focus Board',
      icon: Star,
      badge: focusCount > 0 ? `${focusCount}` : 'HO',
      badgeColor: 'bg-amber-400 text-black font-black',
    },
    {
      id: 'rules' as NavTab,
      label: 'Rules & Automation',
      icon: Wand2,
    },
    {
      id: 'history' as NavTab,
      label: 'Print History',
      icon: History,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`bg-neutral-900 text-white flex flex-col border-r border-neutral-800 transition-all duration-200 select-none no-print z-40 shrink-0 h-screen sticky top-0 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-neutral-800 shrink-0">
        <div
          className="flex items-center space-x-2.5 cursor-pointer overflow-hidden"
          onClick={() => onSelectTab('dashboard')}
          title="Non Core Board Printer"
        >
          <div className="h-9 w-9 bg-amber-500 rounded flex items-center justify-center font-black text-black text-lg tracking-tighter shrink-0 shadow">
            NC
          </div>
          {!isCollapsed && (
            <div className="min-w-0 leading-tight">
              <span className="font-extrabold text-xs tracking-wide text-white block uppercase truncate">
                NON CORE BOARD
              </span>
              <span className="text-[10px] text-amber-400 font-mono tracking-wider">
                V5 STUDIO
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-md px-2.5 py-2 text-xs font-semibold transition group cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-black shadow-sm font-bold'
                  : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-black' : item.id === 'focus-board' ? 'text-amber-400' : 'text-neutral-400 group-hover:text-neutral-200'
                }`}
              />
              {!isCollapsed && (
                <span className="ml-3 truncate flex-1 text-left">{item.label}</span>
              )}
              {!isCollapsed && item.badge && (
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    item.badgeColor || (isActive ? 'bg-black/20 text-black' : 'bg-neutral-800 text-neutral-300')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Action Footer */}
      <div className="p-2 border-t border-neutral-800 bg-neutral-950/40 shrink-0">
        {onQuickPrintPreview && (
          <button
            onClick={onQuickPrintPreview}
            disabled={!hasBoardsReady}
            title={hasBoardsReady ? 'Open A4 Print Preview' : 'Fill slots in Board Maker to preview'}
            className={`w-full flex items-center justify-center space-x-2 py-2 px-2 rounded text-xs font-bold transition cursor-pointer ${
              hasBoardsReady
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow'
                : 'bg-neutral-800/60 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <Printer className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Quick Print</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
