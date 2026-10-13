import React from 'react';
import {
  FileSpreadsheet,
  Grid,
  Printer,
  History,
  Settings,
  Layers,
  LayoutDashboard,
  Sparkles,
  FileCheck,
  Wand2,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'stock-report'
  | 'products'
  | 'board-maker'
  | 'rules'
  | 'master-importer'
  | 'history'
  | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  productCount: number;
  lastImportFileName?: string;
  onQuickPrintPreview?: () => void;
  hasBoardsReady?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  productCount,
  onQuickPrintPreview,
  hasBoardsReady,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'stock-report' as NavTab,
      label: 'Stock Report',
      icon: FileSpreadsheet,
      badge: productCount > 0 ? `${productCount.toLocaleString()}` : undefined,
    },
    { id: 'products' as NavTab, label: 'Products', icon: Layers },
    {
      id: 'board-maker' as NavTab,
      label: 'Board Maker',
      icon: Grid,
      badge: hasBoardsReady ? 'Ready' : undefined,
    },
    {
      id: 'rules' as NavTab,
      label: 'Rules & Automation',
      icon: Wand2,
    },
    { id: 'history' as NavTab, label: 'Print History', icon: History },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-neutral-900 text-white border-b border-neutral-800 sticky top-0 z-40 select-none no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="h-10 w-10 bg-amber-500 rounded flex items-center justify-center font-black text-black text-xl tracking-tighter shadow-md">
              NC
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-wide text-white uppercase">
                  NON CORE BOARD PRINTER
                </span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/30">
                  A4 STUDIO
                </span>
              </div>
              <p className="text-xs text-neutral-400 -mt-0.5">
                Local-First Retail Price Board Engine
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-black text-amber-400'
                          : 'bg-neutral-800 text-amber-400 border border-neutral-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Top Quick Actions */}
          <div className="flex items-center space-x-2">
            {productCount === 0 ? (
              <button
                onClick={() => onSelectTab('stock-report')}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded text-xs shadow transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upload Report</span>
              </button>
            ) : (
              <button
                onClick={onQuickPrintPreview}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold px-3.5 py-1.5 rounded text-xs shadow transition-colors cursor-pointer"
                title="Preview & Print A4"
              >
                <Printer className="w-3.5 h-3.5 text-black" />
                <span>Print Preview</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex overflow-x-auto bg-neutral-950 border-t border-neutral-800 px-2 py-1 space-x-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap ${
                isActive ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
