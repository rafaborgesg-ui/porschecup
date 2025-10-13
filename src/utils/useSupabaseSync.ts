import { useEffect, useRef, useState } from 'react';
import {
  fetchTireModels,
  fetchContainers,
  fetchStockEntries,
  saveTireModelsToAPI,
  saveContainersToAPI,
  saveStockEntriesToAPI,
  fetchTireMovements,
  saveTireMovementsToAPI,
  fetchTireConsumption,
  saveTireConsumptionRecordsToAPI,
  fetchUsers,
  saveUsersToAPI,
} from './api';
import {
  getTireModels,
  getContainers,
  getStockEntries,
  setTireModels,
  setContainers,
  setStockEntries,
} from './storage';

const SYNC_INTERVAL = 30000; // Sincroniza a cada 30 segundos (mais conservador)
const RETRY_DELAY = 60000; // Aguarda 1 minuto antes de tentar novamente após erro

export function useSupabaseSync() {
  const isSyncing = useRef(false);
  const lastSync = useRef<number>(0);
  const lastError = useRef<number>(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  // Sincroniza localStorage -> Supabase (silenciosamente)
  const syncToSupabase = async () => {
    if (isSyncing.current) return;
    
    // Não tenta sincronizar se teve erro recentemente
    const timeSinceError = Date.now() - lastError.current;
    if (timeSinceError < RETRY_DELAY) return;
    
    try {
      isSyncing.current = true;
      setSyncStatus('syncing');

      const models = getTireModels();
      const containers = getContainers();
      const entries = getStockEntries(true); // true = incluindo descartados
      
      // Busca movimentações, consumo e usuários do localStorage
      const movements = JSON.parse(localStorage.getItem('porsche-cup-tire-movements') || '[]');
      const consumption = JSON.parse(localStorage.getItem('porsche-cup-tire-consumption') || '[]');
      const users = JSON.parse(localStorage.getItem('porsche-cup-users') || '[]');

      await Promise.all([
        saveTireModelsToAPI(models).catch(() => {}), // Falha silenciosa
        saveContainersToAPI(containers).catch(() => {}), // Falha silenciosa
        saveStockEntriesToAPI(entries).catch(() => {}), // Falha silenciosa
        saveTireMovementsToAPI(movements).catch(() => {}), // Falha silenciosa
        saveTireConsumptionRecordsToAPI(consumption).catch(() => {}), // Falha silenciosa
        saveUsersToAPI(users).catch(() => {}), // Falha silenciosa
      ]);

      lastSync.current = Date.now();
      setIsOnline(true);
      setSyncStatus('synced');
    } catch (error) {
      // Falha silenciosa - não mostra erro ao usuário
      lastError.current = Date.now();
      setIsOnline(false);
      setSyncStatus('error');
    } finally {
      isSyncing.current = false;
    }
  };

  // Sincroniza Supabase -> localStorage (silenciosamente)
  const syncFromSupabase = async () => {
    if (isSyncing.current) return;

    // Não tenta sincronizar se teve erro recentemente
    const timeSinceError = Date.now() - lastError.current;
    if (timeSinceError < RETRY_DELAY) return;

    try {
      isSyncing.current = true;
      setSyncStatus('syncing');

      const [models, containers, entries, movements, consumption, users] = await Promise.all([
        fetchTireModels().catch(() => []),
        fetchContainers().catch(() => []),
        fetchStockEntries().catch(() => []),
        fetchTireMovements().catch(() => []),
        fetchTireConsumption().catch(() => []),
        fetchUsers().catch(() => []),
      ]);

      // Só atualiza se realmente recebeu dados
      // setTireModels, setContainers e setStockEntries já disparam eventos internamente
      if (models.length > 0) {
        setTireModels(models);
      }

      if (containers.length > 0) {
        setContainers(containers);
      }

      if (entries.length > 0) {
        setStockEntries(entries);
      }
      
      // Sincroniza movimentações
      if (movements.length > 0) {
        localStorage.setItem('porsche-cup-tire-movements', JSON.stringify(movements));
        window.dispatchEvent(new Event('tire-movements-updated'));
      }
      
      // Sincroniza consumo
      if (consumption.length > 0) {
        localStorage.setItem('porsche-cup-tire-consumption', JSON.stringify(consumption));
        window.dispatchEvent(new Event('tire-consumption-updated'));
      }
      
      // Sincroniza usuários
      if (users.length > 0) {
        localStorage.setItem('porsche-cup-users', JSON.stringify(users));
        window.dispatchEvent(new Event('users-updated'));
      }

      lastSync.current = Date.now();
      setIsOnline(true);
      setSyncStatus('synced');
    } catch (error) {
      // Falha silenciosa - aplicação funciona normalmente com localStorage
      lastError.current = Date.now();
      setIsOnline(false);
      setSyncStatus('error');
    } finally {
      isSyncing.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Inicialização: tenta buscar dados do Supabase
    const initialize = async () => {
      await syncFromSupabase();
      
      // Se não recebeu dados do Supabase, envia dados locais (defaults) para lá
      if (mounted) {
        const hasLocalData = getTireModels().length > 0 || getContainers().length > 0;
        if (hasLocalData) {
          setTimeout(() => syncToSupabase(), 2000);
        }
      }
    };

    initialize();

    // Configura sincronização periódica (menos frequente)
    const interval = setInterval(() => {
      if (!mounted) return;
      const timeSinceLastSync = Date.now() - lastSync.current;
      if (timeSinceLastSync >= SYNC_INTERVAL) {
        syncFromSupabase();
      }
    }, SYNC_INTERVAL);

    // Escuta mudanças locais para sincronizar para o Supabase (background)
    const handleLocalChange = () => {
      if (!mounted) return;
      // Sincroniza em background, sem bloquear a UI
      setTimeout(() => syncToSupabase(), 1000);
    };

    window.addEventListener('tire-models-updated', handleLocalChange);
    window.addEventListener('containers-updated', handleLocalChange);
    window.addEventListener('stock-entries-updated', handleLocalChange);
    window.addEventListener('tire-movements-updated', handleLocalChange);
    window.addEventListener('tire-consumption-updated', handleLocalChange);
    window.addEventListener('users-updated', handleLocalChange);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('tire-models-updated', handleLocalChange);
      window.removeEventListener('containers-updated', handleLocalChange);
      window.removeEventListener('stock-entries-updated', handleLocalChange);
      window.removeEventListener('tire-movements-updated', handleLocalChange);
      window.removeEventListener('tire-consumption-updated', handleLocalChange);
      window.removeEventListener('users-updated', handleLocalChange);
    };
  }, []);

  return { syncToSupabase, syncFromSupabase, isOnline, syncStatus };
}
