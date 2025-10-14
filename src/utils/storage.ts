export interface TireModel {
  id: string;
  name: string;
  code: string;
  type: string;
}

export interface Container {
  id: string;
  name: string;
  location: string;
  capacity: number;
  current: number;
}

export interface StockEntry {
  id: string;
  barcode: string;
  modelId: string;
  modelName: string;
  modelType: 'Slick' | 'Wet';
  containerId: string;
  containerName: string;
  timestamp: string;
  status?: 'Novo' | 'Ativo' | 'Descarte' | 'Piloto';
}

const STORAGE_KEYS = {
  TIRE_MODELS: 'porsche_cup_tire_models',
  CONTAINERS: 'porsche_cup_containers',
  STOCK_ENTRIES: 'porsche-cup-tire-entries', // Padronizado com hífen
  TIRE_STATUS: 'porsche_cup_tire_status',
};

// Modelos padrão se não houver nada cadastrado
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

// Tire Models
export function getTireModels(): TireModel[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TIRE_MODELS);
    if (stored) {
      const models = JSON.parse(stored);
      // Filtra modelos com ID vazio (proteção contra dados corrompidos)
      return models.filter((m: TireModel) => m.id && m.id.trim() !== '');
    }
    return DEFAULT_TIRE_MODELS;
  } catch {
    return DEFAULT_TIRE_MODELS;
  }
}

export function saveTireModels(models: TireModel[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TIRE_MODELS, JSON.stringify(models));
    // Dispara evento customizado para notificar outros componentes
    window.dispatchEvent(new CustomEvent('tire-models-updated'));
  } catch (error) {
    console.error('Erro ao salvar modelos de pneus:', error);
  }
}

// Alias para compatibilidade - usa mesma função interna
export const setTireModels = saveTireModels;

// Containers
export function getContainers(): Container[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTAINERS);
    let containers: Container[];
    
    if (stored) {
      containers = JSON.parse(stored);
      // Filtra contêineres com ID vazio (proteção contra dados corrompidos)
      containers = containers.filter((c: Container) => c.id && c.id.trim() !== '');
    } else {
      containers = DEFAULT_CONTAINERS;
    }
    
    // Calcula a ocupação real baseada nos pneus cadastrados (apenas ativos, sem descartados)
    const stockEntries = getStockEntries(false); // false = apenas ativos
    
    return containers.map(container => {
      // Conta quantos pneus estão neste contêiner
      const tiresInContainer = stockEntries.filter(entry => entry.containerId === container.id).length;
      
      return {
        ...container,
        current: tiresInContainer
      };
    });
  } catch {
    return DEFAULT_CONTAINERS;
  }
}

export function saveContainers(containers: Container[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTAINERS, JSON.stringify(containers));
    // Dispara evento customizado para notificar outros componentes
    window.dispatchEvent(new CustomEvent('containers-updated'));
  } catch (error) {
    console.error('Erro ao salvar contêineres:', error);
  }
}

// Alias para compatibilidade - usa mesma função interna
export const setContainers = saveContainers;

// Helper para calcular a ocupação real de um container (apenas pneus ativos)
export function getContainerOccupancy(containerId: string): number {
  const stockEntries = getStockEntries(false); // false = apenas ativos
  return stockEntries.filter(entry => entry.containerId === containerId).length;
}

// Stock Entries
export function getStockEntries(includeDiscarded: boolean = false): StockEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STOCK_ENTRIES);
    if (stored) {
      const entries = JSON.parse(stored);
      if (includeDiscarded) {
        return entries;
      }
      // Por padrão, retorna todos os pneus que NÃO estão descartados
      // Inclui: Novo, Ativo, Piloto e quaisquer outros status personalizados diferentes de "Descarte"
      return entries.filter((e: StockEntry) => e.status !== 'Descarte');
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStockEntry(entry: StockEntry): boolean {
  try {
    const entries = getStockEntries(true); // true = incluindo descartados para verificar duplicatas
    
    // Verifica se o código de barras já existe
    const duplicate = entries.find(e => e.barcode === entry.barcode);
    if (duplicate) {
      return false;
    }
    
    entries.push(entry);
    localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(entries));
    
    // Dispara evento customizado para notificar outros componentes
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
    // Dispara evento customizado para notificar outros componentes
    window.dispatchEvent(new CustomEvent('stock-entries-updated'));
  } catch (error) {
    console.error('Erro ao definir entradas de estoque:', error);
  }
}

export function deleteStockEntry(id: string): void {
  try {
    const entries = getStockEntries(true); // true = incluindo descartados
    const updated = entries.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('stock-entries-updated'));
  } catch (error) {
    console.error('Erro ao deletar entrada de estoque:', error);
  }
}

export function checkBarcodeExists(barcode: string): boolean {
  const entries = getStockEntries(true); // true = incluindo descartados
  return entries.some(e => e.barcode === barcode);
}

// Helper para normalizar containerId (garante string vazia em vez de undefined)
export function normalizeContainerId(containerId: string | undefined): string {
  return containerId || '';
}

// Helper para atualizar um pneu específico
export function updateStockEntry(barcode: string, updates: Partial<StockEntry>, silent: boolean = false): boolean {
  try {
    const entries = getStockEntries(true); // true = incluindo descartados
    const index = entries.findIndex(e => e.barcode === barcode);
    
    if (index === -1) {
      return false;
    }
    
    entries[index] = { ...entries[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(entries));
    
    if (!silent) {
      window.dispatchEvent(new CustomEvent('stock-entries-updated'));
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar entrada de estoque:', error);
    return false;
  }
}

// Helper para atualizar múltiplos pneus em lote (sem disparar eventos intermediários)
export function updateStockEntriesBatch(updates: Array<{ barcode: string; updates: Partial<StockEntry> }>): boolean {
  try {
    const entries = getStockEntries(true); // true = incluindo descartados
    
    updates.forEach(({ barcode, updates: updateData }) => {
      const index = entries.findIndex(e => e.barcode === barcode);
      if (index !== -1) {
        entries[index] = { ...entries[index], ...updateData };
      }
    });
    
    localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(entries));
    // Dispara evento apenas uma vez após todas as atualizações
    window.dispatchEvent(new CustomEvent('stock-entries-updated'));
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar entradas de estoque em lote:', error);
    return false;
  }
}

// ===================================
// TIRE STATUS (Gerenciamento de Status Personalizados)
// ===================================

export interface TireStatus {
  id: string;
  name: string;
  color: string;
  isDefault: boolean; // true para Novo, Ativo, Descarte (não podem ser deletados)
  createdAt: string;
}

// Status padrão do sistema
const DEFAULT_TIRE_STATUS: TireStatus[] = [
  { id: 'status-novo', name: 'Novo', color: '#3B82F6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'status-ativo', name: 'Ativo', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'status-descarte', name: 'Descarte', color: '#DC2626', isDefault: true, createdAt: new Date().toISOString() },
];

export function getTireStatus(): TireStatus[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TIRE_STATUS);
    if (stored) {
      const status = JSON.parse(stored);
      // Garante que os status padrão sempre existem
      const hasNovo = status.some((s: TireStatus) => s.name === 'Novo');
      const hasAtivo = status.some((s: TireStatus) => s.name === 'Ativo');
      const hasDescarte = status.some((s: TireStatus) => s.name === 'Descarte');
      
      if (!hasNovo || !hasAtivo || !hasDescarte) {
        // Se faltam status padrão, restaura defaults
        return DEFAULT_TIRE_STATUS;
      }
      
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
    
    // Valida se já existe um status com o mesmo nome
    if (currentStatus.some(s => s.name.toLowerCase() === status.name.toLowerCase())) {
      return null;
    }
    
    const newStatus: TireStatus = {
      ...status,
      id: `status-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    
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
    const index = currentStatus.findIndex(s => s.id === id);
    
    if (index === -1) return false;
    
    // Não permite alterar nome de status padrão (apenas cor pode ser personalizada)
    if (currentStatus[index].isDefault && updates.name && updates.name !== currentStatus[index].name) {
      return false;
    }
    
    currentStatus[index] = {
      ...currentStatus[index],
      ...updates,
    };
    
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
    const statusToDelete = currentStatus.find(s => s.id === id);
    
    // Não permite deletar status padrão
    if (!statusToDelete || statusToDelete.isDefault) {
      return false;
    }
    
    const updatedStatus = currentStatus.filter(s => s.id !== id);
    saveTireStatus(updatedStatus);
    
    return true;
  } catch (error) {
    console.error('Erro ao deletar status:', error);
    return false;
  }
}
