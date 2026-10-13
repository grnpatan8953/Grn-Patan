import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  RotateCcw,
  History,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  BoardFormat,
  BoardType,
  BusinessRule,
  Product,
  RuleAction,
  RuleCondition,
  RuleField,
  RuleOperator,
  AppliedRuleHistoryItem,
} from '../types';
import { RuleEngine, DEFAULT_BUSINESS_RULES } from '../services/ruleEngine';
import { StorageService } from '../services/storage';

interface RulesAutomationViewProps {
  allProducts: Product[];
  onNavigateToBoardMaker: () => void;
}

export const RulesAutomationView: React.FC<RulesAutomationViewProps> = ({
  allProducts,
  onNavigateToBoardMaker,
}) => {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [nlInput, setNlInput] = useState('');
  const [nlParsedRule, setNlParsedRule] = useState<Partial<BusinessRule> | null>(null);
  const [nlError, setNlError] = useState<string | null>(null);

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState(20);
  const [formMatchMode, setFormMatchMode] = useState<'AND' | 'OR'>('AND');
  const [formConditions, setFormConditions] = useState<RuleCondition[]>([
    { field: 'productName', operator: 'contains', value: '' },
  ]);
  const [formAction, setFormAction] = useState<RuleAction>({});

  // Rule Debugger state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testSearchProduct, setTestSearchProduct] = useState('');
  const [selectedTestProduct, setSelectedTestProduct] = useState<Product | null>(null);
  const [testFormat, setTestFormat] = useState<BoardFormat>('1/8');
  const [debugResult, setDebugResult] = useState<any | null>(null);

  // History Drawer state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<AppliedRuleHistoryItem[]>([]);

  // Load rules on mount
  useEffect(() => {
    loadRules();
    loadHistory();
  }, []);

  const loadRules = async () => {
    const list = await RuleEngine.getRules();
    setRules(list);
  };

  const loadHistory = async () => {
    const hist = await StorageService.getAppliedRuleHistory();
    setHistoryList(hist);
  };

  // Natural language live interpretation
  useEffect(() => {
    if (!nlInput.trim()) {
      setNlParsedRule(null);
      setNlError(null);
      return;
    }
    const res = RuleEngine.parseNaturalLanguageRule(nlInput);
    if (res.success && res.rule) {
      setNlParsedRule(res.rule);
      setNlError(null);
    } else {
      setNlParsedRule(null);
      setNlError(res.clarification || 'Could not parse rule instruction.');
    }
  }, [nlInput]);

  const handleSaveNlRule = async () => {
    if (!nlParsedRule) return;
    const newRule: BusinessRule = {
      id: `rule-${Date.now()}`,
      name: nlParsedRule.name || 'Custom Natural Rule',
      description: nlParsedRule.description || nlInput,
      enabled: true,
      priority: nlParsedRule.priority || 25,
      conditions: nlParsedRule.conditions || [{ field: 'productName', operator: 'contains', value: '' }],
      action: nlParsedRule.action || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await RuleEngine.upsertRule(newRule);
    setNlInput('');
    setNlParsedRule(null);
    await loadRules();
  };

  const handleToggleRule = async (id: string, enabled: boolean) => {
    await RuleEngine.toggleRule(id, enabled);
    await loadRules();
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      await RuleEngine.deleteRule(id);
      await loadRules();
    }
  };

  const handleOpenAddModal = () => {
    setEditingRuleId(null);
    setFormName('');
    setFormDesc('');
    setFormPriority(rules.length * 10 + 10);
    setFormMatchMode('AND');
    setFormConditions([{ field: 'productName', operator: 'contains', value: '' }]);
    setFormAction({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: BusinessRule) => {
    setEditingRuleId(rule.id);
    setFormName(rule.name);
    setFormDesc(rule.description || '');
    setFormPriority(rule.priority);
    setFormMatchMode(rule.matchMode || 'AND');
    setFormConditions(
      rule.conditions.length > 0
        ? [...rule.conditions]
        : [{ field: 'productName', operator: 'contains', value: '' }]
    );
    setFormAction({ ...rule.action });
    setIsModalOpen(true);
  };

  const handleAddCondition = () => {
    setFormConditions([...formConditions, { field: 'brand', operator: 'contains', value: '' }]);
  };

  const handleRemoveCondition = (idx: number) => {
    if (formConditions.length <= 1) return;
    setFormConditions(formConditions.filter((_, i) => i !== idx));
  };

  const handleSaveFormRule = async () => {
    if (!formName.trim()) {
      alert('Please provide a rule name');
      return;
    }
    const targetId = editingRuleId || `rule-${Date.now()}`;
    const targetRule: BusinessRule = {
      id: targetId,
      name: formName.trim(),
      description: formDesc.trim(),
      enabled: true,
      priority: Number(formPriority) || 20,
      matchMode: formMatchMode,
      conditions: formConditions,
      action: formAction,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      needsConditionSetup: false,
    };
    await RuleEngine.upsertRule(targetRule);
    setIsModalOpen(false);
    await loadRules();
  };

  const handleMovePriority = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= rules.length) return;
    const current = rules[idx];
    const neighbor = rules[targetIdx];

    // Swap priorities
    const tempP = current.priority;
    current.priority = neighbor.priority;
    neighbor.priority = tempP === neighbor.priority ? (direction === 'up' ? tempP - 5 : tempP + 5) : tempP;

    await RuleEngine.upsertRule(current);
    await RuleEngine.upsertRule(neighbor);
    await loadRules();
  };

  // Rule Debugger with Real Product Search & Simulation
  const handleRunDebugger = async (prod?: Product) => {
    const target = prod || selectedTestProduct;
    if (!target) {
      if (allProducts.length > 0) {
        const fallback = allProducts[0];
        setSelectedTestProduct(fallback);
        const res = await RuleEngine.debugProductRules(fallback, testFormat);
        setDebugResult(res);
      }
      return;
    }
    const res = await RuleEngine.debugProductRules(target, testFormat);
    setDebugResult(res);
  };

  // Upgrade legacy rule to executable multi-condition format
  const handleMigrateBrandedRule = async (rule: BusinessRule) => {
    if (
      confirm(
        `Upgrade rule "${rule.name}" to executable multi-brand conditions for GALA, JOYO, and NATIONAL?`
      )
    ) {
      const upgraded: BusinessRule = {
        ...rule,
        matchMode: 'OR',
        needsConditionSetup: false,
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
        updatedAt: new Date().toISOString(),
      };
      await RuleEngine.upsertRule(upgraded);
      await loadRules();
    }
  };

  const handleResetDefaults = async () => {
    if (confirm('Reset all rules back to system default rules? Any custom rules will be cleared.')) {
      await RuleEngine.saveRules(DEFAULT_BUSINESS_RULES);
      await loadRules();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-amber-500 rounded-xl text-black shadow-xs">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 tracking-tight uppercase">
                Rules & Automation Engine
              </h1>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Intelligent defaults, priority precedence, and automated board behaviors.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setDebugResult(null);
              setIsTestModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-black rounded-lg border border-neutral-300 transition cursor-pointer"
            title="Test rules against simulated products and formats"
          >
            <Play className="w-3.5 h-3.5 text-neutral-600" />
            <span>TEST RULE SIMULATOR</span>
          </button>

          <button
            onClick={() => {
              loadHistory();
              setIsHistoryOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-black rounded-lg border border-neutral-300 transition cursor-pointer"
            title="View recent history of rules applied to board slots"
          >
            <History className="w-3.5 h-3.5 text-neutral-600" />
            <span>RULES HISTORY</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="flex items-center space-x-1.5 px-3 py-2 bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 text-xs font-black rounded-lg border border-neutral-300 transition cursor-pointer"
            title="Reset to default system rules"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>RESET DEFAULTS</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-amber-400 text-xs font-black rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ ADD RULE</span>
          </button>
        </div>
      </div>

      {/* NATURAL LANGUAGE RULE CREATOR BOX */}
      <div className="bg-gradient-to-br from-neutral-900 to-black text-white p-6 rounded-2xl shadow-md border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
              Natural Language Rule Creator
            </h2>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">
            Deterministic Local Engine • No Paid API Required
          </span>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              placeholder='Describe your rule... e.g. "Always use MRP SAVE for Apsara pencils" or "Round boards should display only SP and ONLY"'
              className="w-full bg-neutral-800/90 text-white placeholder-neutral-500 px-4 py-3 rounded-xl border border-neutral-700 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
            {nlInput && (
              <button
                onClick={() => setNlInput('')}
                className="absolute right-3 top-3 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Click Prompts */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400 pt-1">
            <span className="font-bold text-neutral-500">Quick Try:</span>
            <button
              onClick={() => setNlInput('Always use MRP SAVE for Apsara pencils')}
              className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
            >
              "Always use MRP SAVE for Apsara pencils"
            </button>
            <button
              onClick={() => setNlInput('Round boards should display only SP and ONLY')}
              className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
            >
              "Round boards should display only SP and ONLY"
            </button>
            <button
              onClick={() => setNlInput('For cosmetics use image top')}
              className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
            >
              "For cosmetics use image top"
            </button>
            <button
              onClick={() => setNlInput('For 1/8 boards use saved custom 1/8 master')}
              className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
            >
              "For 1/8 boards use saved custom 1/8 master"
            </button>
          </div>
        </div>

        {/* Live Interpretation Preview */}
        {nlParsedRule && (
          <div className="bg-neutral-800/70 p-4 rounded-xl border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-black text-sm text-white">{nlParsedRule.name}</span>
                <span className="text-[10px] bg-neutral-700 text-amber-300 px-2 py-0.2 rounded font-mono">
                  Priority: {nlParsedRule.priority}
                </span>
              </div>
              <div className="text-xs text-neutral-300 font-mono">
                Condition:{' '}
                <span className="text-amber-300">
                  {nlParsedRule.conditions?.map((c) => `${c.field} ${c.operator} "${c.value}"`).join(' AND ')}
                </span>
                {'  '}• Action:{' '}
                <span className="text-emerald-300">
                  {nlParsedRule.action?.setBoardType ? `Type=${nlParsedRule.action.setBoardType}` : ''}
                  {nlParsedRule.action?.hideProductName ? ' Hide Name/Pack/Footer' : ''}
                  {nlParsedRule.action?.suggestFormat ? ` Suggest ${nlParsedRule.action.suggestFormat}` : ''}
                  {nlParsedRule.action?.insideImageArrangement ? ` Img=${nlParsedRule.action.insideImageArrangement}` : ''}
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveNlRule}
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg shadow-sm transition cursor-pointer shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>SAVE THIS RULE</span>
            </button>
          </div>
        )}

        {nlError && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{nlError}</span>
          </div>
        )}
      </div>

      {/* RULE PRECEDENCE NOTICE BAR */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 text-xs text-neutral-800 space-y-1.5">
        <div className="flex items-center space-x-1.5 text-amber-900 font-black uppercase text-[11px] tracking-wide">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Strict Rule Evaluation Precedence Order:</span>
        </div>
        <p className="text-neutral-600 text-[11px] leading-relaxed">
          1. <strong>Explicit User Instruction</strong> (AI command) &nbsp;→&nbsp;
          2. <strong>Manual Slot Override</strong> (user toggles in editor) &nbsp;→&nbsp;
          3. <strong>Exact Product Rule</strong> (barcode/code) &nbsp;→&nbsp;
          4. <strong>Saved Product Design</strong> (stored preference) &nbsp;→&nbsp;
          5. <strong>Brand / Category Rule</strong> &nbsp;→&nbsp;
          6. <strong>Format Rule</strong> (e.g. Round minimalist) &nbsp;→&nbsp;
          7. <strong>App Defaults</strong>.
        </p>
        <p className="text-[10px] text-neutral-500 italic">
          *Rules provide smart defaults rather than permanent restrictions. You can always override any value inside Board Maker.
        </p>
      </div>

      {/* RULES MANAGEMENT LIST */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div>
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">
              Configured Automation Rules ({rules.length})
            </h3>
            <p className="text-xs text-neutral-500">
              Evaluated sequentially by priority (Priority 1 executes first).
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-neutral-200/70 text-neutral-700 px-2.5 py-1 rounded-md">
            {rules.filter((r) => r.enabled).length} Active
          </span>
        </div>

        <div className="divide-y divide-neutral-100">
          {rules.map((rule, idx) => (
            <div
              key={rule.id}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                rule.enabled ? 'bg-white hover:bg-neutral-50/60' : 'bg-neutral-50/50 opacity-60'
              }`}
            >
              {/* Left Column: Priority + Info */}
              <div className="flex items-start space-x-3.5">
                {/* Priority Reordering Controls */}
                <div className="flex flex-col items-center space-y-0.5 pt-0.5">
                  <button
                    onClick={() => handleMovePriority(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 hover:bg-neutral-200 rounded text-neutral-500 disabled:opacity-20 cursor-pointer"
                    title="Move higher priority"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-black text-neutral-700 bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200" title="Numeric Priority">
                    #{rule.priority}
                  </span>
                  <button
                    onClick={() => handleMovePriority(idx, 'down')}
                    disabled={idx === rules.length - 1}
                    className="p-1 hover:bg-neutral-200 rounded text-neutral-500 disabled:opacity-20 cursor-pointer"
                    title="Move lower priority"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Details */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-black text-neutral-900">{rule.name}</h4>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        rule.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  {rule.description && (
                    <p className="text-xs text-neutral-500">{rule.description}</p>
                  )}

                  {/* Conditions & Actions Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs font-mono">
                    <span className="text-[10px] text-neutral-400 uppercase font-sans font-bold">When:</span>
                    {rule.conditions.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded text-[11px] font-medium border border-neutral-200"
                      >
                        <strong>{c.field}</strong> {c.operator} "{c.value}"
                      </span>
                    ))}

                    <span className="text-[10px] text-neutral-400 uppercase font-sans font-bold ml-1">Then:</span>
                    {rule.action.setBoardType && (
                      <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-200">
                        Type: {rule.action.setBoardType === 'MRP_SAVE' ? 'Type B (MRP+Save)' : 'Type A (Final Price)'}
                      </span>
                    )}
                    {rule.action.hideProductName && (
                      <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded text-[11px] font-bold border border-purple-200">
                        Hide Name/Pack/Footer (Minimalist)
                      </span>
                    )}
                    {rule.action.suggestFormat && (
                      <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-200">
                        Suggest: {rule.action.suggestFormat}
                      </span>
                    )}
                    {rule.action.insideImageArrangement && (
                      <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-200">
                        Image: {rule.action.insideImageArrangement}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center space-x-2 self-end sm:self-center">
                {/* Toggle Enable Switch */}
                <button
                  onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    rule.enabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700'
                  }`}
                  title={rule.enabled ? 'Click to disable' : 'Click to enable'}
                >
                  {rule.enabled ? 'ENABLED' : 'DISABLED'}
                </button>

                {/* Edit */}
                <button
                  onClick={() => handleOpenEditModal(rule)}
                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600 hover:text-black border border-neutral-200 cursor-pointer"
                  title="Edit Rule"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-2 hover:bg-rose-50 rounded-lg text-neutral-400 hover:text-rose-600 border border-neutral-200 cursor-pointer"
                  title="Delete Rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RULE DEBUGGER & SIMULATOR MODAL */}
      {isTestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <Play className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-black text-sm uppercase">Rule Debugger & Simulation</h3>
                  <span className="text-[10px] text-neutral-400">
                    Test product attributes against all active retail business rules
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto flex-1 pr-1">
              {/* Product Search & Selection */}
              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Search & Select Product from Stock Catalogue:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={testSearchProduct}
                    onChange={(e) => setTestSearchProduct(e.target.value)}
                    placeholder="Search name, brand (e.g. GALA, JOYO, APSARA), barcode..."
                    className="w-full border border-neutral-300 rounded-lg p-2 font-semibold text-xs"
                  />
                  {testSearchProduct.trim() && (
                    <div className="absolute top-10 left-0 right-0 z-20 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-40 overflow-y-auto divide-y divide-neutral-100">
                      {allProducts
                        .filter(
                          (p) =>
                            p.itemName.toLowerCase().includes(testSearchProduct.toLowerCase()) ||
                            p.brand?.toLowerCase().includes(testSearchProduct.toLowerCase()) ||
                            p.code?.toLowerCase().includes(testSearchProduct.toLowerCase()) ||
                            p.barcode?.toLowerCase().includes(testSearchProduct.toLowerCase())
                        )
                        .slice(0, 10)
                        .map((p) => (
                          <div
                            key={p.id || p.code}
                            onClick={() => {
                              setSelectedTestProduct(p);
                              setTestSearchProduct('');
                              handleRunDebugger(p);
                            }}
                            className="p-2 hover:bg-amber-50 cursor-pointer flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold text-neutral-900">{p.itemName}</div>
                              <div className="text-[10px] text-neutral-500 font-mono">
                                Brand: {p.brand || 'N/A'} • Code: {p.code}
                              </div>
                            </div>
                            <span className="font-mono font-bold text-neutral-900">₹{p.retail}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Product Card */}
              {selectedTestProduct && (
                <div className="p-3 bg-neutral-900 text-white rounded-xl space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-black text-sm text-amber-400 uppercase">
                      {selectedTestProduct.itemName}
                    </span>
                    <span className="bg-amber-400 text-black px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                      SP ₹{selectedTestProduct.retail} / MRP ₹{selectedTestProduct.mrp}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-neutral-300 pt-1">
                    <div>
                      <span className="text-neutral-500 block">CODE:</span>
                      <span>{selectedTestProduct.code}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">BARCODE:</span>
                      <span>{selectedTestProduct.barcode || '—'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">BRAND:</span>
                      <span className="text-amber-300 font-bold">{selectedTestProduct.brand || '—'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">CATEGORY:</span>
                      <span>{selectedTestProduct.category || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Target Format */}
              <div className="flex items-center space-x-2">
                <label className="font-bold text-neutral-700 whitespace-nowrap">Target Format:</label>
                <select
                  value={testFormat}
                  onChange={(e) => {
                    const fmt = e.target.value as BoardFormat;
                    setTestFormat(fmt);
                    if (selectedTestProduct) {
                      RuleEngine.debugProductRules(selectedTestProduct, fmt).then(setDebugResult);
                    }
                  }}
                  className="w-full border border-neutral-300 rounded-lg p-1.5 font-semibold"
                >
                  <option value="1/8">1/8 A4 (8 Boards)</option>
                  <option value="1/4">1/4 A4 (4 Boards)</option>
                  <option value="1/2">1/2 A4 (2 Boards)</option>
                  <option value="1/1">1/1 A4 (1 Board)</option>
                  <option value="1/3">1/3 A4 (3 Strips)</option>
                  <option value="ROUND">ROUND (15 Oval Labels)</option>
                  <option value="NOTEBOOK">NOTE BOOK 1 (Special Promo)</option>
                </select>
              </div>

              <button
                onClick={() => handleRunDebugger()}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg cursor-pointer transition shadow"
              >
                RUN RULE DEBUGGER EVALUATION
              </button>

              {/* Debugger Inspection Results */}
              {debugResult && (
                <div className="space-y-3 pt-2">
                  {/* Winning Rule Summary */}
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-emerald-950 font-black">
                      <span>FINAL APPLIED ACTION:</span>
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-mono">
                        {debugResult.winningRule ? `WINNER: ${debugResult.winningRule.name}` : 'NO RULE TRIGGERED'}
                      </span>
                    </div>
                    {debugResult.finalAction ? (
                      <div className="text-emerald-900 font-mono text-[11px] pt-1">
                        Board Type: <strong>{debugResult.finalAction.setBoardType || 'KEEP CURRENT'}</strong>
                        {debugResult.finalAction.hideProductName && ' • Hide Name/Footer (SP Only)'}
                        {debugResult.finalAction.showStar && ' • Star Visible'}
                      </div>
                    ) : (
                      <div className="text-neutral-600 text-[11px]">
                        Default standard settings apply (Final Price, normal typography).
                      </div>
                    )}
                  </div>

                  {/* Matched Rules Breakdown */}
                  {debugResult.matchedRules.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-black text-emerald-800 uppercase block text-[11px]">
                        Matched Rules ({debugResult.matchedRules.length}):
                      </span>
                      {debugResult.matchedRules.map((m: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                            m.isWinner
                              ? 'bg-amber-50 border-amber-300'
                              : 'bg-neutral-50 border-neutral-200 opacity-70'
                          }`}
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-neutral-900">
                              #{m.rule.priority} {m.rule.name}
                            </span>
                            {m.isWinner ? (
                              <span className="bg-amber-400 text-black text-[9px] px-1.5 py-0.2 rounded font-black">
                                APPLIED WINNER
                              </span>
                            ) : (
                              <span className="text-neutral-500 text-[9px]">OVERRIDDEN BY HIGHER PRIORITY</span>
                            )}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-mono">
                            Matched: {m.matchedConditions.map((c: any) => `${c.field} ${c.operator} "${c.expected}" (Actual: "${c.actual}")`).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Failed Rules Breakdown */}
                  {debugResult.failedRules.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-bold text-neutral-500 uppercase block text-[10px]">
                        Rules That Did Not Trigger:
                      </span>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {debugResult.failedRules.slice(0, 5).map((f: any, idx: number) => (
                          <div key={idx} className="p-2 bg-neutral-50 rounded border border-neutral-200 text-[10px] space-y-0.5">
                            <div className="font-semibold text-neutral-700">{f.rule.name}</div>
                            {f.failedConditions.length > 0 && (
                              <div className="text-red-700 font-mono text-[9px]">
                                Failed: {f.failedConditions.map((c: any) => `${c.field} ${c.operator} "${c.expected}" (Actual: "${c.actual}")`).join('; ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPLIED RULES HISTORY DRAWER */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-sm uppercase">Applied Rules Execution Log</h3>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {historyList.length === 0 ? (
                <div className="p-8 text-center text-neutral-400">
                  No rule executions recorded yet. Add products to board slots in Board Maker to see live execution history.
                </div>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-neutral-900">{item.ruleName}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-600 font-mono">
                      Product: <strong>{item.productName}</strong> • Format: <strong>{item.format}</strong>
                    </div>
                    <div className="text-[10px] text-emerald-700 font-mono">
                      Action: {item.actionSummary}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT RULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="font-black text-sm uppercase">
                {editingRuleId ? 'Edit Business Rule' : 'Create New Business Rule'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Rule Name:</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg p-2 font-bold"
                  placeholder="e.g. Apsara Pencil MRP+Save Default"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Description / Notes:</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg p-2"
                  placeholder="Explain why this rule exists..."
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Priority (1 = highest):</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formPriority}
                  onChange={(e) => setFormPriority(parseInt(e.target.value, 10) || 20)}
                  className="w-24 border border-neutral-300 rounded-lg p-2 font-mono"
                />
              </div>

              {/* Conditions */}
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <label className="font-black text-neutral-900 block uppercase">Match Condition:</label>
                {formConditions.map((cond, cIdx) => (
                  <div key={cIdx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={cond.field}
                      onChange={(e) => {
                        const upd = [...formConditions];
                        upd[cIdx].field = e.target.value as RuleField;
                        setFormConditions(upd);
                      }}
                      className="col-span-4 border border-neutral-300 rounded p-1.5"
                    >
                      <option value="productName">Product Name</option>
                      <option value="format">Format</option>
                      <option value="barcode">Barcode</option>
                      <option value="productCode">Code</option>
                      <option value="category">Category</option>
                      <option value="brand">Brand</option>
                    </select>

                    <select
                      value={cond.operator}
                      onChange={(e) => {
                        const upd = [...formConditions];
                        upd[cIdx].operator = e.target.value as RuleOperator;
                        setFormConditions(upd);
                      }}
                      className="col-span-3 border border-neutral-300 rounded p-1.5"
                    >
                      <option value="contains">contains</option>
                      <option value="equals">equals</option>
                      <option value="startsWith">starts with</option>
                    </select>

                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => {
                        const upd = [...formConditions];
                        upd[cIdx].value = e.target.value;
                        setFormConditions(upd);
                      }}
                      placeholder="Value..."
                      className="col-span-5 border border-neutral-300 rounded p-1.5 font-mono"
                    />
                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <label className="font-black text-neutral-900 block uppercase">Automated Action:</label>

                <div className="space-y-2">
                  <div>
                    <label className="text-neutral-600 block mb-0.5">Board Type:</label>
                    <select
                      value={formAction.setBoardType || ''}
                      onChange={(e) =>
                        setFormAction({
                          ...formAction,
                          setBoardType: e.target.value ? (e.target.value as BoardType) : undefined,
                        })
                      }
                      className="w-full border border-neutral-300 rounded p-1.5"
                    >
                      <option value="">No change (keep current)</option>
                      <option value="FINAL_PRICE">Type A: FINAL PRICE</option>
                      <option value="MRP_SAVE">Type B: MRP + SAVE</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-neutral-600 block mb-0.5">Minimalist Display Overrides:</label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={Boolean(formAction.hideProductName)}
                        onChange={(e) =>
                          setFormAction({
                            ...formAction,
                            hideProductName: e.target.checked,
                            hidePackText: e.target.checked,
                            hideFooter: e.target.checked,
                            hideMrp: e.target.checked,
                            hideSave: e.target.checked,
                          })
                        }
                      />
                      <span>Hide Name, Pack, Footer, MRP, Save (Show SP + ONLY only)</span>
                    </label>
                  </div>

                  <div>
                    <label className="text-neutral-600 block mb-0.5">Suggest Format:</label>
                    <select
                      value={formAction.suggestFormat || ''}
                      onChange={(e) =>
                        setFormAction({
                          ...formAction,
                          suggestFormat: e.target.value ? (e.target.value as BoardFormat) : undefined,
                        })
                      }
                      className="w-full border border-neutral-300 rounded p-1.5"
                    >
                      <option value="">No format suggestion</option>
                      <option value="1/8">1/8 A4</option>
                      <option value="1/4">1/4 A4</option>
                      <option value="1/2">1/2 A4</option>
                      <option value="1/1">1/1 A4</option>
                      <option value="1/3">1/3 A4</option>
                      <option value="ROUND">ROUND BOARD</option>
                      <option value="NOTEBOOK">NOTE BOOK 1</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex justify-end space-x-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFormRule}
                  className="px-4 py-2 bg-black hover:bg-neutral-800 text-amber-400 font-black rounded-lg"
                >
                  Save Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
