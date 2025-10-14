import { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertCircle, Cloud, CloudOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { syncAllDataToSupabase, getSyncLogs, clearSyncLogs } from '../utils/supabaseDirectSync';

export function SupabaseSyncMonitor() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ success: boolean; results: Record<string, boolean> } | null>(null);
  const [syncLogs, setSyncLogs] = useState(getSyncLogs());

  const handleManualSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    
    try {
      toast.info('🔄 Iniciando sincronização com Supabase...', {
        description: 'Enviando dados do localStorage para o banco de dados'
      });

      const result = await syncAllDataToSupabase();
      setLastSyncResult(result);
      setSyncLogs(getSyncLogs());

      if (result.success) {
        const successCount = Object.values(result.results).filter(Boolean).length;
        toast.success('✅ Sincronização concluída!', {
          description: `${successCount} tabelas sincronizadas com sucesso`
        });
      } else {
        const failedTables = Object.entries(result.results)
          .filter(([, success]) => !success)
          .map(([table]) => table);
        
        toast.warning('⚠️ Sincronização parcial', {
          description: `Falha ao sincronizar: ${failedTables.join(', ')}`
        });
      }
    } catch (error) {
      toast.error('❌ Erro na sincronização', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearLogs = () => {
    clearSyncLogs();
    setSyncLogs([]);
    toast.success('Logs limpos');
  };

  const getTableDisplayName = (table: string): string => {
    const names: Record<string, string> = {
      tire_models: 'Modelos de Pneus',
      containers: 'Contêineres',
      stock_entries: 'Estoque de Pneus',
      tire_movements: 'Movimentações',
      tire_consumption: 'Consumo',
      tire_status: 'Status de Pneus'
    };
    return names[table] || table;
  };

  return (
    <div className="space-y-4">
      {/* Header com botão de sincronização */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="text-gray-900 font-medium">Sincronização Supabase</h3>
              <p className="text-gray-500 text-sm">Sincronize dados do app com o banco de dados</p>
            </div>
          </div>
          
          <Button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSyncing ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Cloud size={16} className="mr-2" />
                Sincronizar Agora
              </>
            )}
          </Button>
        </div>

        {/* Status da última sincronização */}
        {lastSyncResult && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              {lastSyncResult.success ? (
                <CheckCircle2 className="text-green-600" size={18} />
              ) : (
                <AlertCircle className="text-amber-600" size={18} />
              )}
              <span className="text-sm font-medium text-gray-900">
                {lastSyncResult.success ? 'Sincronização Completa' : 'Sincronização Parcial'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(lastSyncResult.results).map(([table, success]) => (
                <div key={table} className="flex items-center gap-2">
                  {success ? (
                    <CheckCircle2 className="text-green-500" size={14} />
                  ) : (
                    <CloudOff className="text-red-500" size={14} />
                  )}
                  <span className="text-xs text-gray-600">
                    {getTableDisplayName(table)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Logs de sincronização */}
      {syncLogs.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-900 font-medium">Logs de Sincronização</h4>
            <Button
              onClick={handleClearLogs}
              variant="outline"
              size="sm"
            >
              Limpar Logs
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {syncLogs.slice(-10).reverse().map((log: any, index: number) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <Badge
                  variant={log.operation === 'sync' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {log.table}
                </Badge>
                
                <span className="text-sm text-gray-600 flex-1">
                  {log.message}
                  {log.count && ` (${log.count} registros)`}
                </span>
                
                <span className="text-xs text-gray-400">
                  {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}