import {
  AppSettings,
  AppliedRuleHistoryItem,
  AutosaveDraft,
  BoardClipboard,
  BoardFormat,
  BoardTemplateConfig,
  FocusApprovalStatus,
  FocusCampaign,
  FocusItem,
  ImportSummary,
  MasterFormatTemplate,
  MasterTemplateVersion,
  PrintHistoryItem,
  Product,
  SavedProductDesign,
  NamedBoardDesign,
} from '../types';
import { DEFAULT_TEMPLATE_CONFIGS } from './templateConfig';
import { ProductSearchService, normalizeIdentifier, stripLeadingZeros } from './searchService';

const DB_NAME = 'non_core_board_printer_db';
const DB_VERSION = 5;

const DEFAULT_SETTINGS: AppSettings = {
  defaultFormat: '1/8',
  defaultBoardType: 'FINAL_PRICE',
  defaultFooterText: '(FINAL PRICE ON THE PRODUCT)',
  showMrpGlobal: false,
  storeName: 'RETAIL PROMOTIONS',
  templateConfigs: DEFAULT_TEMPLATE_CONFIGS,
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'code' });
        productStore.createIndex('barcode', 'barcode', { unique: false });
        productStore.createIndex('itemName', 'itemName', { unique: false });
        productStore.createIndex('mainCode', 'mainCode', { unique: false });
      }

      if (!db.objectStoreNames.contains('import_history')) {
        db.createObjectStore('import_history', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('print_history')) {
        db.createObjectStore('print_history', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('saved_product_designs')) {
        const designStore = db.createObjectStore('saved_product_designs', { keyPath: 'id' });
        designStore.createIndex('productCode', 'productCode', { unique: false });
        designStore.createIndex('productBarcode', 'productBarcode', { unique: false });
      }

      if (!db.objectStoreNames.contains('board_drafts')) {
        db.createObjectStore('board_drafts', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('focus_campaigns')) {
        db.createObjectStore('focus_campaigns', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('focus_items')) {
        const itemStore = db.createObjectStore('focus_items', { keyPath: 'id' });
        itemStore.createIndex('campaignId', 'campaignId', { unique: false });
        itemStore.createIndex('productCode', 'productCode', { unique: false });
        itemStore.createIndex('barcode', 'barcode', { unique: false });
      }

      if (!db.objectStoreNames.contains('named_board_designs')) {
        const designStore = db.createObjectStore('named_board_designs', { keyPath: 'id' });
        designStore.createIndex('format', 'format', { unique: false });
        designStore.createIndex('name', 'name', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const StorageService = {
  async getAllProducts(): Promise<Product[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('products', 'readonly');
      const store = transaction.objectStore('products');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async getProductCount(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('products', 'readonly');
      const store = transaction.objectStore('products');
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  },

  async upsertProducts(
    newProducts: Product[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ added: number; updated: number; total: number }> {
    const db = await openDB();
    const existingCodes = new Set<string>();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const req = store.getAllKeys();
      req.onsuccess = () => {
        (req.result as string[]).forEach((k) => existingCodes.add(k));
        resolve();
      };
      req.onerror = () => reject(req.error);
    });

    let added = 0;
    let updated = 0;
    const batchSize = 500;
    const total = newProducts.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = newProducts.slice(i, i + batchSize);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');

        batch.forEach((p) => {
          if (existingCodes.has(p.code)) {
            updated++;
          } else {
            added++;
            existingCodes.add(p.code);
          }
          store.put(p);
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      if (onProgress) {
        onProgress(Math.min(i + batchSize, total), total);
      }
    }

    return { added, updated, total: existingCodes.size };
  },

  /**
   * Unified normalized search across catalogue:
   * Handles exact barcodes, codes, leading zero variants (13000113 vs 013000113), partial codes, and names.
   */
  async searchProducts(query: string, limit = 50): Promise<Product[]> {
    const all = await this.getAllProducts();
    return ProductSearchService.search(all, query, limit);
  },

  async clearAllProducts(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      tx.objectStore('products').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async addImportSummary(summary: ImportSummary): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('import_history', 'readwrite');
      tx.objectStore('import_history').add({
        ...summary,
        savedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getLatestImportSummary(): Promise<ImportSummary | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('import_history', 'readonly');
      const req = tx.objectStore('import_history').getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        if (list.length === 0) return resolve(null);
        resolve(list[list.length - 1]);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getImportHistory(): Promise<ImportSummary[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('import_history', 'readonly');
      const req = tx.objectStore('import_history').getAll();
      req.onsuccess = () => resolve((req.result || []).reverse());
      req.onerror = () => reject(req.error);
    });
  },

  async savePrintHistory(item: PrintHistoryItem): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('print_history', 'readwrite');
      tx.objectStore('print_history').put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getPrintHistory(): Promise<PrintHistoryItem[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('print_history', 'readonly');
      const req = tx.objectStore('print_history').getAll();
      req.onsuccess = () => {
        const list: PrintHistoryItem[] = req.result || [];
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async deletePrintHistory(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('print_history', 'readwrite');
      tx.objectStore('print_history').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // -------------------------------------------------------------
  // Smart Product Design Memory
  // -------------------------------------------------------------
  async saveProductDesign(design: SavedProductDesign): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('saved_product_designs', 'readwrite');
      tx.objectStore('saved_product_designs').put(design);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getSavedProductDesign(codeOrBarcode: string): Promise<SavedProductDesign | null> {
    const db = await openDB();
    const queryStripped = stripLeadingZeros(normalizeIdentifier(codeOrBarcode)).toLowerCase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('saved_product_designs', 'readonly');
      const req = tx.objectStore('saved_product_designs').getAll();
      req.onsuccess = () => {
        const list: SavedProductDesign[] = req.result || [];
        const match = list.find((d) => {
          const c = stripLeadingZeros(normalizeIdentifier(d.productCode)).toLowerCase();
          const b = stripLeadingZeros(normalizeIdentifier(d.productBarcode)).toLowerCase();
          return c === queryStripped || b === queryStripped || d.id === codeOrBarcode;
        });
        resolve(match || null);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getAllSavedProductDesigns(): Promise<SavedProductDesign[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('saved_product_designs', 'readonly');
      const req = tx.objectStore('saved_product_designs').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // -------------------------------------------------------------
  // Autosave Current Board Draft
  // -------------------------------------------------------------
  async saveBoardDraft(draft: AutosaveDraft): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('board_drafts', 'readwrite');
      tx.objectStore('board_drafts').put(draft);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getLatestBoardDraft(): Promise<AutosaveDraft | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('board_drafts', 'readonly');
      const req = tx.objectStore('board_drafts').get('current_draft');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  },

  async clearBoardDraft(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('board_drafts', 'readwrite');
      tx.objectStore('board_drafts').delete('current_draft');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  },

  // -------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------
  async getSettings(): Promise<AppSettings> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get('app_settings');
        req.onsuccess = () => {
          if (req.result && req.result.value) {
            resolve({
              ...DEFAULT_SETTINGS,
              ...req.result.value,
              templateConfigs: {
                ...DEFAULT_SETTINGS.templateConfigs,
                ...(req.result.value.templateConfigs || {}),
              },
            });
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        };
        req.onerror = () => resolve(DEFAULT_SETTINGS);
      });
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key: 'app_settings', value: settings });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // -------------------------------------------------------------
  // Calibrated Master Geometries per Format
  // -------------------------------------------------------------
  async saveCalibratedMasterConfig(format: BoardFormat, config: BoardTemplateConfig): Promise<void> {
    const settings = await this.getSettings();
    const currentCalibrated = settings.calibratedConfigs || ({} as Record<BoardFormat, BoardTemplateConfig>);
    const updated: AppSettings = {
      ...settings,
      templateConfigs: {
        ...settings.templateConfigs,
        [format]: config,
      },
      calibratedConfigs: {
        ...currentCalibrated,
        [format]: config,
      } as Record<BoardFormat, BoardTemplateConfig>,
    };
    await this.saveSettings(updated);
  },

  async getCalibratedMasterConfigs(): Promise<Record<BoardFormat, BoardTemplateConfig>> {
    const settings = await this.getSettings();
    return settings.calibratedConfigs || settings.templateConfigs || DEFAULT_TEMPLATE_CONFIGS;
  },

  async restoreOriginalMasterConfig(format: BoardFormat): Promise<BoardTemplateConfig> {
    const original = DEFAULT_TEMPLATE_CONFIGS[format];
    await this.saveCalibratedMasterConfig(format, original);
    return original;
  },

  // -------------------------------------------------------------
  // Format Master Library Templates & Versioning
  // -------------------------------------------------------------
  async saveMasterFormatTemplate(template: MasterFormatTemplate): Promise<void> {
    try {
      const key = `master_template_${template.format}`;
      localStorage.setItem(key, JSON.stringify(template));
      // Also update default geometry
      if (template.calibratedConfig) {
        await this.saveCalibratedMasterConfig(template.format, template.calibratedConfig);
      }
    } catch (err) {
      console.error('Failed to save master format template:', err);
    }
  },

  async getMasterFormatTemplate(format: BoardFormat): Promise<MasterFormatTemplate | null> {
    try {
      const key = `master_template_${format}`;
      const item = localStorage.getItem(key);
      if (item) return JSON.parse(item);
    } catch {
      // Fallback
    }
    return null;
  },

  async saveMasterTemplateVersion(
    format: BoardFormat,
    versionName: string,
    config: BoardTemplateConfig,
    isDefault = true,
    notes?: string
  ): Promise<MasterTemplateVersion> {
    const version: MasterTemplateVersion = {
      id: `ver_${format}_${Date.now()}`,
      versionName,
      format,
      config,
      savedAt: new Date().toISOString(),
      isDefault,
      notes,
    };

    const currentTpl = (await this.getMasterFormatTemplate(format)) || {
      format,
      name: config.name,
      pageRef: config.pageRef,
      calibratedConfig: config,
      isUserCalibrated: true,
      updatedAt: new Date().toISOString(),
      versions: [],
    };

    const versions = currentTpl.versions || [];
    if (isDefault) {
      versions.forEach((v) => (v.isDefault = false));
    }
    versions.unshift(version);
    currentTpl.versions = versions.slice(0, 20); // Keep last 20 versions
    currentTpl.calibratedConfig = config;
    currentTpl.isUserCalibrated = true;
    currentTpl.updatedAt = new Date().toISOString();

    await this.saveMasterFormatTemplate(currentTpl);
    return version;
  },

  async getMasterTemplateVersions(format: BoardFormat): Promise<MasterTemplateVersion[]> {
    const tpl = await this.getMasterFormatTemplate(format);
    return tpl?.versions || [];
  },

  // -------------------------------------------------------------
  // Applied Rules History Log
  // -------------------------------------------------------------
  async saveAppliedRuleHistory(item: AppliedRuleHistoryItem): Promise<void> {
    try {
      const key = 'applied_rules_history_log';
      const existing = localStorage.getItem(key);
      const list: AppliedRuleHistoryItem[] = existing ? JSON.parse(existing) : [];
      list.unshift(item);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
    } catch (err) {
      console.error('Failed to save rule history:', err);
    }
  },

  async getAppliedRuleHistory(): Promise<AppliedRuleHistoryItem[]> {
    try {
      const key = 'applied_rules_history_log';
      const existing = localStorage.getItem(key);
      return existing ? JSON.parse(existing) : [];
    } catch {
      return [];
    }
  },

  // -------------------------------------------------------------
  // Focus Campaigns & Focus Items (Monthly HO Promotion)
  // -------------------------------------------------------------
  async saveFocusCampaign(campaign: FocusCampaign): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('focus_campaigns', 'readwrite');
      tx.objectStore('focus_campaigns').put(campaign);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getFocusCampaigns(): Promise<FocusCampaign[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('focus_campaigns', 'readonly');
      const req = tx.objectStore('focus_campaigns').getAll();
      req.onsuccess = () => {
        const list: FocusCampaign[] = req.result || [];
        list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getActiveFocusCampaign(): Promise<FocusCampaign | null> {
    const campaigns = await this.getFocusCampaigns();
    return campaigns.find((c) => c.status === 'ACTIVE') || campaigns[0] || null;
  },

  async deleteFocusCampaign(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['focus_campaigns', 'focus_items'], 'readwrite');
      tx.objectStore('focus_campaigns').delete(id);
      const itemsStore = tx.objectStore('focus_items');
      const idx = itemsStore.index('campaignId');
      const req = idx.getAllKeys(id);
      req.onsuccess = () => {
        const keys = req.result || [];
        keys.forEach((k) => itemsStore.delete(k));
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async saveFocusItems(items: FocusItem[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('focus_items', 'readwrite');
      const store = tx.objectStore('focus_items');
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getFocusItems(campaignId?: string): Promise<FocusItem[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('focus_items', 'readonly');
      const store = tx.objectStore('focus_items');
      const req = campaignId ? store.index('campaignId').getAll(campaignId) : store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async updateFocusItem(item: FocusItem): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('focus_items', 'readwrite');
      tx.objectStore('focus_items').put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async batchUpdateFocusApproval(
    campaignId: string,
    itemIds: string[],
    status: FocusApprovalStatus
  ): Promise<void> {
    const items = await this.getFocusItems(campaignId);
    const idSet = new Set(itemIds);
    const updated = items.map((it) => {
      if (idSet.has(it.id)) {
        return {
          ...it,
          approvalStatus: status,
          effectiveSp: status === 'APPROVED' ? it.hoFocusSp : it.currentBaseSp,
        };
      }
      return it;
    });
    await this.saveFocusItems(updated);

    // Update campaign counts
    const campaigns = await this.getFocusCampaigns();
    const camp = campaigns.find((c) => c.id === campaignId);
    if (camp) {
      camp.approvedCount = updated.filter((i) => i.approvalStatus === 'APPROVED').length;
      await this.saveFocusCampaign(camp);
    }
  },

  // -------------------------------------------------------------
  // One-Click Board Layout Clipboard
  // -------------------------------------------------------------
  getBoardClipboard(): BoardClipboard | null {
    try {
      const stored = localStorage.getItem('non_core_board_clipboard');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  setBoardClipboard(clipboard: BoardClipboard): void {
    try {
      localStorage.setItem('non_core_board_clipboard', JSON.stringify(clipboard));
    } catch (err) {
      console.error('Failed to save clipboard:', err);
    }
  },

  // -------------------------------------------------------------
  // Reusable Named Board Designs ("Mahir", "Full Bold", etc.)
  // -------------------------------------------------------------
  async getAllNamedDesigns(): Promise<NamedBoardDesign[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        try {
          if (!db.objectStoreNames.contains('named_board_designs')) {
            const fallback = localStorage.getItem('non_core_named_designs');
            resolve(fallback ? JSON.parse(fallback) : []);
            return;
          }
          const tx = db.transaction('named_board_designs', 'readonly');
          const store = tx.objectStore('named_board_designs');
          const req = store.getAll();
          req.onsuccess = () => {
            const results: NamedBoardDesign[] = req.result || [];
            try {
              localStorage.setItem('non_core_named_designs', JSON.stringify(results));
            } catch {}
            resolve(results);
          };
          req.onerror = () => {
            const fallback = localStorage.getItem('non_core_named_designs');
            resolve(fallback ? JSON.parse(fallback) : []);
          };
        } catch {
          const fallback = localStorage.getItem('non_core_named_designs');
          resolve(fallback ? JSON.parse(fallback) : []);
        }
      });
    } catch {
      const fallback = localStorage.getItem('non_core_named_designs');
      return fallback ? JSON.parse(fallback) : [];
    }
  },

  async saveNamedDesign(design: NamedBoardDesign): Promise<void> {
    try {
      const db = await openDB();
      if (db.objectStoreNames.contains('named_board_designs')) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('named_board_designs', 'readwrite');
          tx.objectStore('named_board_designs').put(design);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch (e) {
      console.warn('Could not save to IndexedDB, fallback to localStorage', e);
    }
    try {
      const existing = (await this.getAllNamedDesigns()).filter((d) => d.id !== design.id);
      existing.push(design);
      localStorage.setItem('non_core_named_designs', JSON.stringify(existing));
    } catch {}
  },

  async deleteNamedDesign(id: string): Promise<void> {
    try {
      const db = await openDB();
      if (db.objectStoreNames.contains('named_board_designs')) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('named_board_designs', 'readwrite');
          tx.objectStore('named_board_designs').delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch (e) {
      console.warn('Could not delete from IndexedDB', e);
    }
    try {
      const existing = (await this.getAllNamedDesigns()).filter((d) => d.id !== id);
      localStorage.setItem('non_core_named_designs', JSON.stringify(existing));
    } catch {}

    // If deleted design was set as default for any format, safely remove its default assignment
    try {
      const defaults = await this.getAllDefaultDesigns();
      let changed = false;
      for (const fmt of Object.keys(defaults) as BoardFormat[]) {
        if (defaults[fmt] === id) {
          delete defaults[fmt];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem('non_core_default_designs_map', JSON.stringify(defaults));
      }
    } catch {}
  },

  // -------------------------------------------------------------
  // Default Named Designs Per Board Format
  // -------------------------------------------------------------
  async getDefaultDesignId(format: BoardFormat): Promise<string | null> {
    try {
      const mapStr = localStorage.getItem('non_core_default_designs_map');
      if (mapStr) {
        const map = JSON.parse(mapStr);
        return map[format] || null;
      }
    } catch {}
    return null;
  },

  async getAllDefaultDesigns(): Promise<Partial<Record<BoardFormat, string>>> {
    try {
      const mapStr = localStorage.getItem('non_core_default_designs_map');
      if (mapStr) {
        return JSON.parse(mapStr);
      }
    } catch {}
    return {};
  },

  async setDefaultDesignId(format: BoardFormat, designId: string | null): Promise<void> {
    try {
      const current = await this.getAllDefaultDesigns();
      if (designId) {
        current[format] = designId;
      } else {
        delete current[format];
      }
      localStorage.setItem('non_core_default_designs_map', JSON.stringify(current));
    } catch (err) {
      console.error('Failed to save default design id:', err);
    }
  },
};
