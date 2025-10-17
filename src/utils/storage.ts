export interface TireModel { id: string; name: string; code: string; type: string; }
export interface Container { id: string; name: string; location: string; capacity: number; current: number; }
export interface StockEntry {
  id: string;
  barcode: string;
  modelId: string;
  modelName: string;
  modelType: 'Slick' | 'Wet';
  containerId: string;
  containerName: string;
  timestamp: string;
  status?: 'Novo' | 'Piloto' | 'Descarte' | 'Descarte Piloto';
  sessionId?: string;
  pilot?: string;
  team?: string;
  notes?: string;
}

const STORAGE_KEYS = {
  TIRE_MODELS: 'porsche_cup_tire_models',
  CONTAINERS: 'porsche_cup_containers',
  STOCK_ENTRIES: 'porsche-cup-tire-entries',
  TIRE_STATUS: 'porsche_cup_tire_status',
};

const DEFAULT_TIRE_MODELS: TireModel[] = [
  { id: '1', name: 'Slick 991 Dianteiro', code: '27/65-18 N2', type: 'Slick' },
  { id: '2', name: 'Slick 991 Traseiro', code: '31/71-18 N2', type: 'Slick' },
  { id: '3', name: 'Slick 992 Dianteiro', code: '30/65-18 N3', type: 'Slick' },
  { id: '4', name: 'Slick 992 Traseiro', code: '31/71-18 N3R', type: 'Slick' },
  { id: '5', name: 'Wet 991 Dianteiro', code: '27/65-18 P2L', type: 'Wet' },
  { id: '6', name: 'Wet 992 Dianteiro', code: '30/65-18 P2L', type: 'Wet' },
  { id: '7', name: 'Wet 991 e 992 Traseiro', code: '31/71-18 P2L', type: 'Wet' },
];

const DEFAULT_CONTAINERS: Container[] = [
  { id: 'C-001', name: 'C-001', location: 'Galpão A - Setor 1', capacity: 200, current: 45 },
  { id: 'C-002', name: 'C-002', location: 'Galpão A - Setor 2', capacity: 200, current: 120 },
  { id: 'C-003', name: 'C-003', location: 'Galpão B - Setor 1', capacity: 150, current: 78 },
  { id: 'C-004', name: 'C-004', location: 'Galpão B - Setor 2', capacity: 150, current: 34 },
  { id: 'C-005', name: 'C-005', location: 'Galpão C - Setor 1', capacity: 300, current: 156 },
];

export function getTireModels(): TireModel[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TIRE_MODELS);
    if (stored) {
      const models = JSON.parse(stored) as TireModel[];
      return models.filter((m) => m.id && m.id.trim() !== '');
    }
    return DEFAULT_TIRE_MODELS;
  } catch {
    return DEFAULT_TIRE_MODELS;
  }
}

export function saveTireModels(models: TireModel[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TIRE_MODELS, JSON.stringify(models));
    window.dispatchEvent(new CustomEvent('tire-models-updated'));
  } catch (error) {
    console.error('Erro ao salvar modelos de pneus:', error);
  }
}

export const setTireModels = saveTireModels;

export function getContainers(): Container[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTAINERS);
    let containers: Container[] = stored ? JSON.parse(stored) : DEFAULT_CONTAINERS;
    containers = containers.filter((c) => c.id && c.id.trim() !== '');

    const stockEntries = getStockEntries(false);
    return containers.map((container) => ({
      ...container,
      current: stockEntries.filter((entry) => entry.containerId === container.id).length,
    }));
  } catch {
    return DEFAULT_CONTAINERS;
  }
}

export function saveContainers(containers: Container[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTAINERS, JSON.stringify(containers));
    window.dispatchEvent(new CustomEvent('containers-updated'));
  } catch (error) {
    console.error('Erro ao salvar contêineres:', error);
  }
}

export const setContainers = saveContainers;

export function getContainerOccupancy(containerId: string): number {
  const stockEntries = getStockEntries(false);
  return stockEntries.filter((entry) => entry.containerId === containerId).length;
}

export function getStockEntries(includeDiscarded: boolean = false): StockEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STOCK_ENTRIES);
    if (!stored) return [];
    // Normalize legacy statuses (map 'Ativo' -> 'Piloto')
    const rawEntries = JSON.parse(stored) as (Omit<StockEntry, 'status'> & { status?: string })[];
    const entries: StockEntry[] = rawEntries.map(e => ({
      ...e,
      status: e.status === 'Ativo' ? 'Piloto' : (e.status as StockEntry['status']),
    }));
    // If any normalization occurred, persist back
    if (rawEntries.some((_, i) => rawEntries[i].status === 'Ativo')) {
      try { localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(entries)); } catch {}
    }
    if (includeDiscarded) return entries;
    return entries.filter((e) => e.status !== 'Descarte' && e.status !== 'Descarte Piloto');
  } catch {
    return [];
  }
}

export function saveStockEntry(entry: StockEntry): boolean {
  try {
    const entries = getStockEntries(true);
    if (entries.some((e) => e.barcode === entry.barcode)) return false;
    entries.push(entry);
    localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('stock-entries-updated'));
    return true;
  } catch (error) {
    console.error('Erro ao salvar entrada de estoque:', error);
    return false;
  }
}

export function setStockEntries(entries: StockEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('stock-entries-updated'));
  } catch (error) {
    console.error('Erro ao definir entradas de estoque:', error);
  }
}

export function deleteStockEntry(id: string): void {
  try {
    const entries = getStockEntries(true);
    const updated = entries.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('stock-entries-updated'));
  } catch (error) {
    console.error('Erro ao deletar entrada de estoque:', error);
  }
}

export function checkBarcodeExists(barcode: string): boolean {
  const entries = getStockEntries(true);
  return entries.some((e) => e.barcode === barcode);
}

export function normalizeContainerId(containerId: string | undefined): string {
  return containerId || '';
}

export function updateStockEntry(barcode: string, updates: Partial<StockEntry>, silent: boolean = false): boolean {
  try {
    const entries = getStockEntries(true);
    const index = entries.findIndex((e) => e.barcode === barcode);
    if (index === -1) return false;
    entries[index] = { ...entries[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(entries));
    if (!silent) window.dispatchEvent(new CustomEvent('stock-entries-updated'));
    return true;
  } catch (error) {
    console.error('Erro ao atualizar entrada de estoque:', error);
    return false;
  }
}

export function updateStockEntriesBatch(updates: Array<{ barcode: string; updates: Partial<StockEntry> }>): boolean {
  try {
    const entries = getStockEntries(true);
    updates.forEach(({ barcode, updates: updateData }) => {
      const index = entries.findIndex((e) => e.barcode === barcode);
      if (index !== -1) entries[index] = { ...entries[index], ...updateData };
    });
    localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('stock-entries-updated'));
    return true;
  } catch (error) {
    console.error('Erro ao atualizar entradas de estoque em lote:', error);
    return false;
  }
}

export interface TireStatus { id: string; name: string; color: string; isDefault: boolean; createdAt: string; }

const DEFAULT_TIRE_STATUS: TireStatus[] = [
  { id: 'status-novo', name: 'Novo', color: '#3B82F6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'status-piloto', name: 'Piloto', color: '#F59E0B', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'status-descarte', name: 'Descarte', color: '#DC2626', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'status-descarte-piloto', name: 'Descarte Piloto', color: '#F59E0B', isDefault: true, createdAt: new Date().toISOString() },
];

export function getTireStatus(): TireStatus[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TIRE_STATUS);
    if (stored) {
      const status = (JSON.parse(stored) as TireStatus[]).map(s => (
        s.name === 'Ativo' ? { ...s, name: 'Piloto', color: '#F59E0B' } : s
      ));
      // Persist normalization if any
      if ((JSON.parse(stored) as TireStatus[]).some(s => s.name === 'Ativo')) {
        try { localStorage.setItem(STORAGE_KEYS.TIRE_STATUS, JSON.stringify(status)); } catch {}
      }
      const required = ['Novo', 'Piloto', 'Descarte', 'Descarte Piloto'];
      let changed = false;
      required.forEach((name) => {
        if (!status.some((s) => s.name === name)) {
          const def = DEFAULT_TIRE_STATUS.find((s) => s.name === name);
          if (def) { status.push({ ...def, createdAt: new Date().toISOString() }); changed = true; }
        }
      });
      if (changed) { try { localStorage.setItem(STORAGE_KEYS.TIRE_STATUS, JSON.stringify(status)); } catch {} }
      return status;
    }
    return DEFAULT_TIRE_STATUS;
  } catch {
    return DEFAULT_TIRE_STATUS;
  }
}

export function saveTireStatus(status: TireStatus[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TIRE_STATUS, JSON.stringify(status));
    window.dispatchEvent(new CustomEvent('tire-status-updated'));
  } catch (error) {
    console.error('Erro ao salvar status de pneus:', error);
  }
}

export function addTireStatus(status: Omit<TireStatus, 'id' | 'createdAt'>): TireStatus | null {
  try {
    const currentStatus = getTireStatus();
    if (currentStatus.some((s) => s.name.toLowerCase() === status.name.toLowerCase())) return null;
    const newStatus: TireStatus = { ...status, id: `status-${Date.now()}`, createdAt: new Date().toISOString() };
    const updatedStatus = [...currentStatus, newStatus];
    saveTireStatus(updatedStatus);
    return newStatus;
  } catch (error) {
    console.error('Erro ao adicionar status:', error);
    return null;
  }
}

export function updateTireStatus(id: string, updates: Partial<TireStatus>): boolean {
  try {
    const currentStatus = getTireStatus();
    const index = currentStatus.findIndex((s) => s.id === id);
    if (index === -1) return false;
    if (currentStatus[index].isDefault && updates.name && updates.name !== currentStatus[index].name) return false;
    currentStatus[index] = { ...currentStatus[index], ...updates };
    saveTireStatus(currentStatus);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return false;
  }
}

export function deleteTireStatus(id: string): boolean {
  try {
    const currentStatus = getTireStatus();
    const statusToDelete = currentStatus.find((s) => s.id === id);
    if (!statusToDelete || statusToDelete.isDefault) return false;
    const updatedStatus = currentStatus.filter((s) => s.id !== id);
    saveTireStatus(updatedStatus);
    return true;
  } catch (error) {
    console.error('Erro ao deletar status:', error);
    return false;
  }
}
