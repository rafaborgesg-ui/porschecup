import { createClient } from './supabase/client';
import { getTireModels, getContainers, getStockEntries, getTireStatus } from './storage';

// Cliente Supabase
const supabase = createClient();

// Interface para logs de sincronização
interface SyncLog {
  table: string;
  operation: 'sync' | 'error';
  count?: number;
  message: string;
  timestamp: string;
}

// Logs de sincronização (para debug)
const syncLogs: SyncLog[] = [];

const addSyncLog = (log: Omit<SyncLog, 'timestamp'>) => {
  syncLogs.push({
    ...log,
    timestamp: new Date().toISOString()
  });
  
  // Mantém apenas os últimos 50 logs
  if (syncLogs.length > 50) {
    syncLogs.splice(0, syncLogs.length - 50);
  }
};

async function getAuthRole(): Promise<'admin' | 'operator' | 'anon'> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return 'anon';
    const role = (user.user_metadata?.role as 'admin' | 'operator' | undefined) || 'operator';
    return role;
  } catch {
    return 'anon';
  }
}

async function requireAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return !!data?.user;
}

// Util helper para validar UUID v4 simples
function isUUID(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// Helpers para mapear chaves naturais -> IDs do banco
async function getModelIdByNameOrCode(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const { data } = await supabase.from('tire_models').select('id,name,code');
  (data || []).forEach((row: any) => {
    if (row.name) map[row.name] = row.id;
    if (row.code) map[row.code] = row.id;
  });
  return map;
}

async function getContainerIdByName(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const { data } = await supabase.from('containers').select('id,name');
  (data || []).forEach((row: any) => {
    if (row.name) map[row.name] = row.id;
  });
  return map;
}

/**
 * Sincroniza modelos de pneus do localStorage para o Supabase
 */
export async function syncTireModelsToSupabase(): Promise<boolean> {
  try {
    // Admin-only table (by RLS). Skip if user is not admin.
    const role = await getAuthRole();
    if (role !== 'admin') {
      addSyncLog({ table: 'tire_models', operation: 'sync', count: 0, message: 'Skipped (requires admin)' });
      return true;
    }
    const models = getTireModels();
    
    if (models.length === 0) {
      addSyncLog({ table: 'tire_models', operation: 'sync', count: 0, message: 'No models to sync' });
      return true;
    }

    // Mapeia para o formato esperado pela tabela
    const modelsForDB = models.map(model => ({
      // Não enviar id (UUID é gerado no banco). Conflito por 'code' que é UNIQUE
      name: model.name,
      code: model.code,
      type: model.type,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('tire_models')
      .upsert(modelsForDB, { onConflict: 'code', ignoreDuplicates: false });

    if (error) {
      addSyncLog({ table: 'tire_models', operation: 'error', message: error.message });
      console.error('Error syncing tire models:', error);
      return false;
    }

    addSyncLog({ table: 'tire_models', operation: 'sync', count: models.length, message: 'Synced successfully' });
    console.log(`Synced ${models.length} tire models to Supabase`);
    return true;
  } catch (error) {
    addSyncLog({ table: 'tire_models', operation: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Error syncing tire models:', error);
    return false;
  }
}

/**
 * Sincroniza contêineres do localStorage para o Supabase
 */
export async function syncContainersToSupabase(): Promise<boolean> {
  try {
    // Admin-only table (by RLS). Skip if user is not admin.
    const role = await getAuthRole();
    if (role !== 'admin') {
      addSyncLog({ table: 'containers', operation: 'sync', count: 0, message: 'Skipped (requires admin)' });
      return true;
    }
    const containers = getContainers();
    
    if (containers.length === 0) {
      addSyncLog({ table: 'containers', operation: 'sync', count: 0, message: 'No containers to sync' });
      return true;
    }

    // Mapeia para o formato esperado pela tabela
    const containersForDB = containers.map(container => ({
      // Não enviar id (UUID é gerado no banco). Conflito por 'name' que é UNIQUE
      name: container.name,
      location: container.location,
      capacity: container.capacity,
      current_stock: container.current,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('containers')
      .upsert(containersForDB, { onConflict: 'name', ignoreDuplicates: false });

    if (error) {
      addSyncLog({ table: 'containers', operation: 'error', message: error.message });
      console.error('Error syncing containers:', error);
      return false;
    }

    addSyncLog({ table: 'containers', operation: 'sync', count: containers.length, message: 'Synced successfully' });
    console.log(`Synced ${containers.length} containers to Supabase`);
    return true;
  } catch (error) {
    addSyncLog({ table: 'containers', operation: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Error syncing containers:', error);
    return false;
  }
}

/**
 * Sincroniza entradas de estoque do localStorage para o Supabase
 */
export async function syncStockEntriesToSupabase(): Promise<boolean> {
  try {
    // Requires authenticated user per RLS
    const authed = await requireAuthenticated();
    if (!authed) {
      addSyncLog({ table: 'stock_entries', operation: 'error', message: 'Skipped: user not authenticated' });
      return false;
    }
    const entries = getStockEntries(true); // Inclui descartados
    
    if (entries.length === 0) {
      addSyncLog({ table: 'stock_entries', operation: 'sync', count: 0, message: 'No stock entries to sync' });
      return true;
    }

    // Obter mapas de IDs atuais do banco
    const [modelIdMap, containerIdMap] = await Promise.all([
      getModelIdByNameOrCode(),
      getContainerIdByName()
    ]);

    // Log detalhado para debug
    console.log(`📊 Sync Debug - Total entries to sync: ${entries.length}`);
    console.log(`📊 Model ID Map:`, modelIdMap);
    console.log(`📊 Container ID Map:`, containerIdMap);

    // Mapeia para o formato esperado pela tabela
    const entriesForDB: {
      barcode: string;
      model_id: string;
      model_name: string;
      model_type: string;
      container_id: string | null;
      container_name: string | null;
      status: string;
      session_id: string | null;
      pilot: string | null;
      team: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }[] = [];
    const failedEntries: any[] = [];

    entries.forEach((entry, index) => {
      const model_id = modelIdMap[entry.modelId] || modelIdMap[entry.modelName] || modelIdMap[entry.modelType];
      
      if (!model_id) {
        console.error(`❌ SKIP Entry ${index + 1}: No model_id found for modelId:'${entry.modelId}', modelName:'${entry.modelName}', modelType:'${entry.modelType}'`);
        failedEntries.push({
          barcode: entry.barcode,
          reason: 'model_id not found',
          entry
        });
        return;
      }

      const mapped = {
        // Não enviar id (UUID gerado pelo banco). barcode é UNIQUE natural
        barcode: entry.barcode,
        model_id: model_id,
        model_name: entry.modelName,
        model_type: entry.modelType,
        container_id: containerIdMap[entry.containerName] || null,
        container_name: entry.containerName || null,
        status: entry.status || 'Novo',
        session_id: entry.sessionId || null,
        pilot: entry.pilot || null,
        team: entry.team || null,
        notes: entry.notes || null,
        created_at: new Date(entry.timestamp).toISOString(),
        updated_at: new Date().toISOString()
      };

      // Log problemas de mapeamento de container (não crítico)
      if (!mapped.container_id) {
        console.warn(`⚠️ Entry ${index + 1}: No container_id found for containerName:'${entry.containerName}' - will be NULL`);
      }

      entriesForDB.push(mapped);
    });

    console.log(`📊 Valid entries for DB: ${entriesForDB.length}`);
    console.log(`📊 Failed entries: ${failedEntries.length}`);
    
    if (failedEntries.length > 0) {
      console.error(`❌ Failed entries details:`, failedEntries);
      addSyncLog({ 
        table: 'stock_entries', 
        operation: 'error', 
        message: `${failedEntries.length} entries skipped due to missing model_id` 
      });
    }
    
    if (entriesForDB.length === 0) {
      addSyncLog({ table: 'stock_entries', operation: 'error', message: 'No valid entries to sync' });
      return false;
    }

    console.log(`📊 Sample valid entry:`, entriesForDB[0]);

    console.log(`🚀 Attempting to upsert ${entriesForDB.length} entries to Supabase...`);
    
    const { data, error } = await supabase
      .from('stock_entries')
      .upsert(entriesForDB, { onConflict: 'barcode', ignoreDuplicates: false })
      .select();

    if (error) {
      console.error('❌ Upsert error details:', error);
      addSyncLog({ table: 'stock_entries', operation: 'error', message: error.message });
      console.error('Error syncing stock entries:', error);
      return false;
    }

    console.log(`✅ Upsert successful! Rows affected: ${data ? data.length : 'unknown'}`);
    if (data) {
      console.log(`✅ Successfully inserted/updated entries:`, data.map((d: any) => d.barcode));
    }

    addSyncLog({ table: 'stock_entries', operation: 'sync', count: entries.length, message: 'Synced successfully' });
    console.log(`Synced ${entries.length} stock entries to Supabase`);
    return true;
  } catch (error) {
    addSyncLog({ table: 'stock_entries', operation: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Error syncing stock entries:', error);
    return false;
  }
}

/**
 * Sincroniza movimentações de pneus do localStorage para o Supabase
 */
export async function syncTireMovementsToSupabase(): Promise<boolean> {
  try {
    // Requires authenticated user per RLS
    const authed = await requireAuthenticated();
    if (!authed) {
      addSyncLog({ table: 'tire_movements', operation: 'error', message: 'Skipped: user not authenticated' });
      return false;
    }
    const movements = JSON.parse(localStorage.getItem('porsche-cup-tire-movements') || '[]');
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;
    
    if (movements.length === 0) {
      addSyncLog({ table: 'tire_movements', operation: 'sync', count: 0, message: 'No movements to sync' });
      return true;
    }

    // Mapeia para o formato esperado pela tabela
    const movementsForDB = movements.map((movement: any) => ({
      barcode: movement.barcode,
      model_name: movement.modelName,
      model_type: movement.modelType,
      from_container_id: movement.fromContainerId || null,
      from_container_name: movement.fromContainerName || null,
      to_container_id: movement.toContainerId,
      to_container_name: movement.toContainerName,
      moved_by: isUUID(movement.movedBy) ? movement.movedBy : (authUser?.id ?? null),
      moved_by_name: movement.movedByName || authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || authUser?.email || null,
      reason: movement.reason || null,
      created_at: new Date(movement.timestamp).toISOString()
    }));

    const { error } = await supabase
      .from('tire_movements')
      .insert(movementsForDB);

    if (error) {
      addSyncLog({ table: 'tire_movements', operation: 'error', message: error.message });
      console.error('Error syncing tire movements:', error);
      return false;
    }

    addSyncLog({ table: 'tire_movements', operation: 'sync', count: movements.length, message: 'Synced successfully' });
    console.log(`Synced ${movements.length} tire movements to Supabase`);
    return true;
  } catch (error) {
    addSyncLog({ table: 'tire_movements', operation: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Error syncing tire movements:', error);
    return false;
  }
}

/**
 * Sincroniza registros de consumo do localStorage para o Supabase
 */
export async function syncTireConsumptionToSupabase(): Promise<boolean> {
  try {
    // Requires authenticated user per RLS
    const authed = await requireAuthenticated();
    if (!authed) {
      addSyncLog({ table: 'tire_consumption', operation: 'error', message: 'Skipped: user not authenticated' });
      return false;
    }
    const consumption = JSON.parse(localStorage.getItem('porsche-cup-tire-consumption') || '[]');
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;
    
    if (consumption.length === 0) {
      addSyncLog({ table: 'tire_consumption', operation: 'sync', count: 0, message: 'No consumption records to sync' });
      return true;
    }

    // Mapeia para o formato esperado pela tabela
    const consumptionForDB = consumption.map((record: any) => ({
      barcode: record.barcode,
      model_name: record.modelName,
      model_type: record.modelType,
      container_name: record.containerName || null,
      pilot: record.pilot || null,
      team: record.team || null,
      notes: record.notes || null,
      registered_by: authUser?.id ?? null,
      registered_by_name: record.registeredBy || authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || authUser?.email || null,
      created_at: new Date(record.timestamp).toISOString()
    }));

    const { error } = await supabase
      .from('tire_consumption')
      .insert(consumptionForDB);

    if (error) {
      addSyncLog({ table: 'tire_consumption', operation: 'error', message: error.message });
      console.error('Error syncing tire consumption:', error);
      return false;
    }

    addSyncLog({ table: 'tire_consumption', operation: 'sync', count: consumption.length, message: 'Synced successfully' });
    console.log(`Synced ${consumption.length} tire consumption records to Supabase`);
    return true;
  } catch (error) {
    addSyncLog({ table: 'tire_consumption', operation: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Error syncing tire consumption:', error);
    return false;
  }
}

/**
 * Sincroniza status de pneus do localStorage para o Supabase
 */
export async function syncTireStatusToSupabase(): Promise<boolean> {
  try {
    // Admin-only table (custom status maintenance). Skip if not admin.
    const role = await getAuthRole();
    if (role !== 'admin') {
      addSyncLog({ table: 'tire_status', operation: 'sync', count: 0, message: 'Skipped (requires admin)' });
      return true;
    }
    const statusList = getTireStatus();
    
    if (statusList.length === 0) {
      addSyncLog({ table: 'tire_status', operation: 'sync', count: 0, message: 'No status to sync' });
      return true;
    }

    // Mapeia para o formato esperado pela tabela
    const statusForDB = statusList.map(status => ({
      // Não enviar id (UUID gerado no banco). Conflito por 'name' que é UNIQUE
      name: status.name,
      color: status.color,
      is_default: status.isDefault,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('tire_status')
      .upsert(statusForDB, { onConflict: 'name', ignoreDuplicates: false });

    if (error) {
      addSyncLog({ table: 'tire_status', operation: 'error', message: error.message });
      console.error('Error syncing tire status:', error);
      return false;
    }

    addSyncLog({ table: 'tire_status', operation: 'sync', count: statusList.length, message: 'Synced successfully' });
    console.log(`Synced ${statusList.length} tire status to Supabase`);
    return true;
  } catch (error) {
    addSyncLog({ table: 'tire_status', operation: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Error syncing tire status:', error);
    return false;
  }
}

/**
 * Baixa dados do Supabase para localStorage (sincronização bidirecional)
 */
export async function syncFromSupabaseToLocalStorage(): Promise<boolean> {
  try {
    console.log('📥 Starting sync FROM Supabase TO localStorage...');
    
    const authed = await requireAuthenticated();
    if (!authed) {
      console.log('❌ User not authenticated - skipping sync from Supabase');
      return false;
    }

    // 1. Sync stock entries (todos usuários podem ler)
    try {
      const { data: stockEntries, error: stockError } = await supabase
        .from('stock_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!stockError && stockEntries) {
        // Converte dados do Supabase para formato localStorage
        const localEntries = stockEntries.map((entry: any) => ({
          id: entry.id,
          barcode: entry.barcode,
          modelId: entry.model_id,
          modelName: entry.model_name,
          modelType: entry.model_type,
          containerId: entry.container_id || '',
          containerName: entry.container_name || '',
          status: entry.status || 'Novo',
          timestamp: entry.created_at
        }));
        
  // MERGE: preserva registros locais que não estão no Supabase
  const localRaw = localStorage.getItem('porsche-cup-tire-entries');
  const localExisting: any[] = localRaw ? JSON.parse(localRaw) : [];
  // Cria mapa de barcodes do Supabase
  const supabaseBarcodes = new Set(localEntries.map(e => e.barcode));
  // Filtra registros locais que não estão no Supabase
  const onlyLocal = localExisting.filter(e => !supabaseBarcodes.has(e.barcode));
  // Junta tudo: Supabase + locais não enviados
  const mergedEntries = [...localEntries, ...onlyLocal];
  localStorage.setItem('porsche-cup-tire-entries', JSON.stringify(mergedEntries));
  console.log(`📦 Synced ${localEntries.length} stock entries from Supabase (merged, total: ${mergedEntries.length})`);
      }
    } catch (err) {
      console.error('Error syncing stock entries from Supabase:', err);
    }

    // 2. Sync tire movements
    try {
      const { data: movements, error: movError } = await supabase
        .from('tire_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!movError && movements) {
        const localMovements = movements.map((mov: any) => ({
          id: mov.id,
          barcode: mov.barcode,
          modelName: mov.model_name,
          modelType: mov.model_type,
          fromContainerId: mov.from_container_id,
          fromContainerName: mov.from_container_name,
          toContainerId: mov.to_container_id,
          toContainerName: mov.to_container_name,
          movedBy: mov.moved_by,
          movedByName: mov.moved_by_name,
          reason: mov.reason,
          timestamp: mov.created_at
        }));
        
        localStorage.setItem('porsche-cup-tire-movements', JSON.stringify(localMovements));
        console.log(`🚚 Synced ${localMovements.length} tire movements from Supabase`);
      }
    } catch (err) {
      console.error('Error syncing tire movements from Supabase:', err);
    }

    // 3. Sync tire consumption
    try {
      const { data: consumption, error: consError } = await supabase
        .from('tire_consumption')
        .select('*')
        .order('created_at', { ascending: false });

      if (!consError && consumption) {
        const localConsumption = consumption.map((cons: any) => ({
          id: cons.id,
          barcode: cons.barcode,
          modelName: cons.model_name,
          modelType: cons.model_type,
          containerName: cons.container_name,
          consumedBy: cons.pilot,
          pilot: cons.pilot,
          team: cons.team,
          reason: cons.notes,
          notes: cons.notes,
          registeredBy: cons.registered_by,
          registeredByName: cons.registered_by_name,
          timestamp: cons.created_at
        }));
        
        localStorage.setItem('porsche-cup-tire-consumption', JSON.stringify(localConsumption));
        console.log(`👨‍✈️ Synced ${localConsumption.length} tire consumption records from Supabase`);
      }
    } catch (err) {
      console.error('Error syncing tire consumption from Supabase:', err);
    }

    // 4. Sync master data apenas se admin
    const role = await getAuthRole();
    if (role === 'admin') {
      // Tire models
      try {
        const { data: models, error: modError } = await supabase
          .from('tire_models')
          .select('*')
          .order('name');

        if (!modError && models) {
          const localModels = models.map((model: any) => ({
            id: model.id,
            name: model.name,
            code: model.code,
            type: model.type
          }));
          
          localStorage.setItem('porsche_cup_tire_models', JSON.stringify(localModels));
          console.log(`🏎️ Synced ${localModels.length} tire models from Supabase`);
        }
      } catch (err) {
        console.error('Error syncing tire models from Supabase:', err);
      }

      // Containers
      try {
        const { data: containers, error: contError } = await supabase
          .from('containers')
          .select('*')
          .order('name');

        if (!contError && containers) {
          const localContainers = containers.map((container: any) => ({
            id: container.id,
            name: container.name,
            location: container.location,
            capacity: container.capacity,
            current: container.current_stock
          }));
          
          localStorage.setItem('porsche_cup_containers', JSON.stringify(localContainers));
          console.log(`📦 Synced ${localContainers.length} containers from Supabase`);
        }
      } catch (err) {
        console.error('Error syncing containers from Supabase:', err);
      }

      // Tire status
      try {
        const { data: status, error: statError } = await supabase
          .from('tire_status')
          .select('*')
          .order('name');

        if (!statError && status) {
          const localStatus = status.map((stat: any) => ({
            id: stat.id,
            name: stat.name,
            color: stat.color,
            isDefault: stat.is_default,
            createdAt: stat.created_at
          }));
          
          localStorage.setItem('porsche_cup_tire_status', JSON.stringify(localStatus));
          console.log(`🏷️ Synced ${localStatus.length} tire status from Supabase`);
        }
      } catch (err) {
        console.error('Error syncing tire status from Supabase:', err);
      }
    }

    // Dispara eventos para atualizar UI
    window.dispatchEvent(new Event('tire-entries-updated'));
    window.dispatchEvent(new Event('tire-movements-updated'));
    window.dispatchEvent(new Event('tire-consumption-updated'));
    window.dispatchEvent(new Event('tire-models-updated'));
    window.dispatchEvent(new Event('containers-updated'));
    window.dispatchEvent(new Event('tire-status-updated'));

    console.log('✅ Sync FROM Supabase completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error syncing from Supabase:', error);
    return false;
  }
}

/**
 * Executa sincronização completa BIDIRECIONAL (Supabase ↔ localStorage)
 */
export async function syncAllDataToSupabase(): Promise<{ success: boolean; results: Record<string, boolean> }> {
  console.log('🔄 Starting BIDIRECTIONAL sync...');
  
  // PRIMEIRO: Baixa dados do Supabase para localStorage
  const downloadSuccess = await syncFromSupabaseToLocalStorage();
  
  // SEGUNDO: Sobe dados do localStorage para Supabase (como antes)
  console.log('📤 Starting sync TO Supabase...');
  const results = {
    tire_models: false,
    containers: false,
    stock_entries: false,
    tire_movements: false,
    tire_consumption: false,
    tire_status: false
  };

  // Executa todas as sincronizações em paralelo
  const [
    tireModelsResult,
    containersResult,
    stockEntriesResult,
    tireMovementsResult,
    tireConsumptionResult,
    tireStatusResult
  ] = await Promise.all([
    syncTireModelsToSupabase(),
    syncContainersToSupabase(),
    syncStockEntriesToSupabase(),
    syncTireMovementsToSupabase(),
    syncTireConsumptionToSupabase(),
    syncTireStatusToSupabase()
  ]);

  results.tire_models = tireModelsResult;
  results.containers = containersResult;
  results.stock_entries = stockEntriesResult;
  results.tire_movements = tireMovementsResult;
  results.tire_consumption = tireConsumptionResult;
  results.tire_status = tireStatusResult;

  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`✅ BIDIRECTIONAL sync completed: Download=${downloadSuccess}, Upload=${successCount}/${totalCount}`);
  
  return {
    success: downloadSuccess && successCount === totalCount,
    results
  };
}

/**
 * Obtém logs de sincronização para debug
 */
export function getSyncLogs(): SyncLog[] {
  return [...syncLogs];
}

/**
 * Limpa logs de sincronização
 */
export function clearSyncLogs(): void {
  syncLogs.length = 0;
}