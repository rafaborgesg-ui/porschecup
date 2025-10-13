import { useEffect, useState } from 'react';
import { 
  getStockEntries, 
  getTireModels, 
  getContainers,
  type StockEntry,
  type TireModel,
  type Container
} from './storage';

/**
 * Hook customizado para sincronizar dados do localStorage
 * Escuta eventos de atualização e recarrega automaticamente
 */

export function useStockEntries() {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      const data = getStockEntries();
      setEntries(data);
      setIsLoading(false);
    };

    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('stock-entries-updated', handleUpdate);
    return () => window.removeEventListener('stock-entries-updated', handleUpdate);
  }, []);

  return { entries, isLoading };
}

export function useTireModels() {
  const [models, setModels] = useState<TireModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      const data = getTireModels();
      setModels(data);
      setIsLoading(false);
    };

    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('tire-models-updated', handleUpdate);
    return () => window.removeEventListener('tire-models-updated', handleUpdate);
  }, []);

  return { models, isLoading };
}

export function useContainers() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      const data = getContainers();
      setContainers(data);
      setIsLoading(false);
    };

    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('containers-updated', handleUpdate);
    return () => window.removeEventListener('containers-updated', handleUpdate);
  }, []);

  return { containers, isLoading };
}

/**
 * Hook que força recarregamento quando QUALQUER dado muda
 * Útil para componentes que dependem de múltiplas fontes de dados
 */
export function useStorageRefresh(callback: () => void) {
  useEffect(() => {
    const handleUpdate = () => {
      callback();
    };

    window.addEventListener('stock-entries-updated', handleUpdate);
    window.addEventListener('tire-models-updated', handleUpdate);
    window.addEventListener('containers-updated', handleUpdate);

    return () => {
      window.removeEventListener('stock-entries-updated', handleUpdate);
      window.removeEventListener('tire-models-updated', handleUpdate);
      window.removeEventListener('containers-updated', handleUpdate);
    };
  }, [callback]);
}

/**
 * Hook que retorna timestamp da última atualização
 * Útil para forçar re-render de componentes
 */
export function useStorageTimestamp() {
  const [timestamp, setTimestamp] = useState(Date.now());

  useEffect(() => {
    const handleUpdate = () => {
      setTimestamp(Date.now());
    };

    window.addEventListener('stock-entries-updated', handleUpdate);
    window.addEventListener('tire-models-updated', handleUpdate);
    window.addEventListener('containers-updated', handleUpdate);

    return () => {
      window.removeEventListener('stock-entries-updated', handleUpdate);
      window.removeEventListener('tire-models-updated', handleUpdate);
      window.removeEventListener('containers-updated', handleUpdate);
    };
  }, []);

  return timestamp;
}
