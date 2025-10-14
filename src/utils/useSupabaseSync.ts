import { useEffect, useRef, useState } from 'react';
import {
  syncAllDataToSupabase
} from './supabaseDirectSync';
import {
  getTireModels,
  getContainers
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

      // Usa o novo sistema de sincronização direta
      const { success } = await syncAllDataToSupabase();

      lastSync.current = Date.now();
      setIsOnline(success);
      setSyncStatus(success ? 'synced' : 'error');
      
      if (!success) {
        lastError.current = Date.now();
      }
    } catch (error) {
      // Falha silenciosa - não mostra erro ao usuário
      lastError.current = Date.now();
      setIsOnline(false);
      setSyncStatus('error');
    } finally {
      isSyncing.current = false;
    }
  };

  // Sincroniza dados do localStorage para Supabase em background
  const syncFromSupabase = async () => {
    // Por enquanto, apenas registra que seria feito uma sincronização de entrada
    // Focamos na sincronização de saída (localStorage -> Supabase)
    console.log('📥 Sync from Supabase temporarily disabled - using localStorage as source of truth');
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
