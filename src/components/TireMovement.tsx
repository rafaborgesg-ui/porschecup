import { useState, useEffect, useRef } from 'react';
import { ArrowRightLeft, Search, Barcode, Truck, Package, Calendar, User, History, CheckCircle2, AlertCircle, FileUp, Layers, Filter, Loader2, Download } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
// import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { getStockEntries, getContainers, getTireModels, updateStockEntry, updateStockEntriesBatch, type StockEntry } from '../utils/storage';

interface TireMovement {
  id: string;
  barcode: string;
  modelName: string;
  modelType: 'Slick' | 'Wet';
  fromContainerId: string;
  fromContainerName: string;
  toContainerId: string;
  toContainerName: string;
  timestamp: string;
  movedBy: string;
  reason?: string;
}



async function saveTireMovement(movement: TireMovement): Promise<void> {
  const { createClient, getCurrentUser } = await import('../utils/supabase/client');
  const supabase = createClient();
  let user = await getCurrentUser();
  const movementForDB = {
    barcode: movement.barcode,
    model_name: movement.modelName,
    model_type: movement.modelType,
    from_container_id: movement.fromContainerId || null,
    from_container_name: movement.fromContainerName || null,
    to_container_id: movement.toContainerId,
    to_container_name: movement.toContainerName,
    moved_by: user?.id || null,
    moved_by_name: user?.name || movement.movedBy || null,
    reason: movement.reason || null,
    created_at: new Date(movement.timestamp).toISOString()
  };
  const { error } = await supabase.from('tire_movements').insert([movementForDB]);
  if (error) {
    console.error('Erro ao salvar movimentação no Supabase:', error);
  } else {
    console.log('✅ Movimentação salva no Supabase:', movementForDB.barcode);
    window.dispatchEvent(new Event('tire-movements-updated'));
  }
}

function updateTireContainer(barcode: string, newContainerId: string, newContainerName: string): void {
  // Atualiza o container do pneu tanto no localStorage quanto no Supabase
  const updates: any = {
    containerId: newContainerId,
    containerName: newContainerName,
  };
  
  // Atualiza localStorage
  updateStockEntry(barcode, updates);
  
  // Atualiza Supabase
  import('../utils/supabase/client').then(async ({ createClient }) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('stock_entries')
      .update({
        container_id: newContainerId,
        container_name: newContainerName,
        updated_at: new Date().toISOString()
      })
      .eq('barcode', barcode);
    
    if (error) {
      console.error('Erro ao atualizar container no Supabase:', error);
    } else {
      console.log('✅ Container atualizado no Supabase para pneu:', barcode);
    }
  });
}

export function TireMovement() {
  // Estado para movimentação individual
  const [barcode, setBarcode] = useState('');
  const [selectedTire, setSelectedTire] = useState<StockEntry | null>(null);
  const [targetContainer, setTargetContainer] = useState('');
  const [reason, setReason] = useState('');
  const [containers, setContainers] = useState<any[]>([]);
  const [movements, setMovements] = useState<TireMovement[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [searchResults, setSearchResults] = useState<StockEntry[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Estado para movimentação em massa
  const [bulkSourceContainer, setBulkSourceContainer] = useState('');
  const [bulkTargetContainer, setBulkTargetContainer] = useState('');
  const [bulkFilterModel, setBulkFilterModel] = useState('all');
  const [bulkFilterType, setBulkFilterType] = useState('all');
  const [bulkBarcodes, setBulkBarcodes] = useState('');
  const [selectedTires, setSelectedTires] = useState<StockEntry[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [tireModels, setTireModels] = useState<any[]>([]);

  // Paginação para histórico
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);

  useEffect(() => {
    loadContainers();
    loadMovements();
    loadTireModels();

    const handleStockUpdate = () => {
      loadMovements();
    };

    const handleContainersUpdate = () => {
      loadContainers();
    };

    const handleModelsUpdate = () => {
      loadTireModels();
    };

    window.addEventListener('stock-entries-updated', handleStockUpdate);
    window.addEventListener('containers-updated', handleContainersUpdate);
    window.addEventListener('tire-models-updated', handleModelsUpdate);
    
    return () => {
      window.removeEventListener('stock-entries-updated', handleStockUpdate);
      window.removeEventListener('containers-updated', handleContainersUpdate);
      window.removeEventListener('tire-models-updated', handleModelsUpdate);
    };
  }, []);

  const loadContainers = () => {
    const containersList = getContainers();
    setContainers(containersList);
  };

  const loadMovements = () => {
    // Carrega movimentações diretamente do Supabase
    import('../utils/supabase/client').then(async ({ createClient }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tire_movements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao carregar movimentações:', error);
        setMovements([]);
      } else {
        // Mapeia para o formato esperado pelo componente
        const movementsList = (data || []).map((mov: any) => ({
          id: mov.id,
          barcode: mov.barcode,
          modelName: mov.model_name,
          modelType: mov.model_type,
          fromContainerId: mov.from_container_id,
          fromContainerName: mov.from_container_name,
          toContainerId: mov.to_container_id,
          toContainerName: mov.to_container_name,
          movedBy: mov.moved_by_name,
          reason: mov.reason,
          timestamp: mov.created_at
        }));
        setMovements(movementsList);
      }
    });
  };

  const loadTireModels = () => {
    const models = getTireModels();
    setTireModels(models);
  };

  const handleBarcodeChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setBarcode(numericValue);

    if (numericValue.length >= 3) {
      const entries = getStockEntries();
      const results = entries.filter(entry => 
        entry.barcode.includes(numericValue)
      ).slice(0, 10);
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (barcode.length !== 8) {
      toast.error('Código inválido', {
        description: 'O código de barras deve ter 8 dígitos.',
      });
      return;
    }

    const entries = getStockEntries();
    const tire = entries.find(entry => entry.barcode === barcode);

    if (!tire) {
      toast.error('Pneu não encontrado', {
        description: `Código ${barcode} não existe no estoque.`,
      });
      return;
    }

    selectTire(tire);
  };

  const selectTire = (tire: StockEntry) => {
    setSelectedTire(tire);
    setBarcode(tire.barcode);
    setShowSearchResults(false);
    setTargetContainer('');
    toast.success('Pneu selecionado', {
      description: `${tire.modelName} - ${tire.containerName}`,
    });
  };

  const handleMove = () => {
    if (!selectedTire || !targetContainer) {
      toast.error('Dados incompletos', {
        description: 'Selecione o pneu e o contêiner de destino.',
      });
      return;
    }

    // Só valida se não estiver saindo de "sem contêiner"
    if (selectedTire.containerId && targetContainer === selectedTire.containerId) {
      toast.error('Mesmo contêiner', {
        description: 'O pneu já está neste contêiner.',
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmMove = async () => {
    if (isProcessingMove) return;
    setIsProcessingMove(true);
    if (!selectedTire || !targetContainer) {
      setIsProcessingMove(false);
      return;
    }
    const targetCont = containers.find(c => c.id === targetContainer);
    if (!targetCont) {
      setIsProcessingMove(false);
      return;
    }
    const movement: TireMovement = {
      id: crypto.randomUUID(),
      barcode: selectedTire.barcode,
      modelName: selectedTire.modelName,
      modelType: (selectedTire.modelType || 'Slick') as 'Slick' | 'Wet',
      fromContainerId: selectedTire.containerId || '',
      fromContainerName: selectedTire.containerName || 'Sem Contêiner',
      toContainerId: targetContainer,
      toContainerName: targetCont.name,
      timestamp: new Date().toISOString(),
      movedBy: '', // O nome do usuário será preenchido pelo Supabase
      reason: reason.trim() || undefined,
    };
    await saveTireMovement(movement);
    await updateTireContainer(selectedTire.barcode, targetContainer, targetCont.name);
    toast.success('Pneu movimentado!', {
      description: `${selectedTire.modelName} transferido para ${targetCont.name}`,
    });
    window.dispatchEvent(new Event('tire-moved'));
    setSelectedTire(null);
    setBarcode('');
    setTargetContainer('');
    setReason('');
    setShowConfirmDialog(false);
    loadMovements();
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
    setIsProcessingMove(false);
  };

  const getAvailableContainers = () => {
    if (!selectedTire) return containers;
    // Se não tem contêiner, mostra todos
    if (!selectedTire.containerId) return containers;
    return containers.filter(c => c.id !== selectedTire.containerId);
  };

  // Funções para movimentação em massa
  const loadBulkTires = () => {
    if (!bulkSourceContainer) {
      setSelectedTires([]);
      return;
    }

    const entries = getStockEntries();
    // Permite selecionar contêiner vazio (sem contêiner)
    let filteredTires = bulkSourceContainer === 'no-container' 
      ? entries.filter(entry => !entry.containerId || entry.containerId === '')
      : entries.filter(entry => entry.containerId === bulkSourceContainer);

    // Filtrar por modelo
    if (bulkFilterModel !== 'all') {
      filteredTires = filteredTires.filter(entry => entry.modelId === bulkFilterModel);
    }

    // Filtrar por tipo
    if (bulkFilterType !== 'all') {
      filteredTires = filteredTires.filter(entry => entry.modelType === bulkFilterType);
    }

    setSelectedTires(filteredTires);
  };

  const handleBulkBarcodeLoad = () => {
    const barcodes = bulkBarcodes
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length === 8 && /^\d+$/.test(line));

    if (barcodes.length === 0) {
      toast.error('Nenhum código válido', {
        description: 'Digite códigos de 8 dígitos, um por linha.',
      });
      return;
    }

    const entries = getStockEntries();
    const foundTires = entries.filter(entry => barcodes.includes(entry.barcode));

    if (foundTires.length === 0) {
      toast.error('Nenhum pneu encontrado', {
        description: 'Os códigos digitados não foram encontrados no estoque.',
      });
      return;
    }

    setSelectedTires(foundTires);
    toast.success(`${foundTires.length} pneus carregados`, {
      description: `${barcodes.length - foundTires.length} códigos não encontrados.`,
    });
  };

  const handleBulkMove = () => {
    if (selectedTires.length === 0) {
      toast.error('Nenhum pneu selecionado', {
        description: 'Selecione os pneus para movimentar.',
      });
      return;
    }

    if (!bulkTargetContainer) {
      toast.error('Contêiner não selecionado', {
        description: 'Selecione o contêiner de destino.',
      });
      return;
    }

    setShowBulkConfirm(true);
  };

  const confirmBulkMove = async () => {
  if (isBulkProcessing) return;
  if (selectedTires.length === 0 || !bulkTargetContainer) return;

  setIsBulkProcessing(true);
  setBulkProgress(0);

    const targetCont = containers.find(c => c.id === bulkTargetContainer);
    if (!targetCont) return;

    const totalTires = selectedTires.length;
    const movements: TireMovement[] = [];
    const batchUpdates: Array<{ barcode: string; updates: Partial<StockEntry> }> = [];

    // Prepara todos os dados em memória primeiro (não dispara eventos)
    for (let i = 0; i < selectedTires.length; i++) {
      const tire = selectedTires[i];
      
      // Prepara movimento
      movements.push({
        id: crypto.randomUUID(),
        barcode: tire.barcode,
        modelName: tire.modelName,
        modelType: (tire.modelType || 'Slick') as 'Slick' | 'Wet',
        fromContainerId: tire.containerId || '',
        fromContainerName: tire.containerName || 'Sem Contêiner',
        toContainerId: bulkTargetContainer,
        toContainerName: targetCont.name,
        timestamp: new Date().toISOString(),
        movedBy: '', // O nome do usuário será preenchido pelo Supabase
        reason: bulkReason.trim() || undefined,
      });

      // Prepara atualização do estoque
      const stockUpdates: any = {
        containerId: bulkTargetContainer,
        containerName: targetCont.name,
      };
      
      // Se o pneu está com status "Novo", muda para "Ativo" ao ser movimentado
      if (tire.status === 'Novo') {
        stockUpdates.status = 'Ativo';
      }
      
      batchUpdates.push({
        barcode: tire.barcode,
        updates: stockUpdates,
      });

      // Atualiza progresso gradualmente
      const newProgress = Math.round(((i + 1) / totalTires) * 100);
      setBulkProgress(newProgress);

      // Delay a cada 20 itens para manter UI responsiva
      if ((i + 1) % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Salva tudo de uma vez (apenas 1 evento disparado)
    try {
      // Salva movimentos diretamente no Supabase
      const { createClient, getCurrentUser } = await import('../utils/supabase/client');
      const supabase = createClient();
      const user = await getCurrentUser();
      
      // Mapeia movimentos para o formato do banco
      const movementsForDB = movements.map((movement: any) => ({
        barcode: movement.barcode,
        model_name: movement.modelName,
        model_type: movement.modelType,
        from_container_id: movement.fromContainerId || null,
        from_container_name: movement.fromContainerName || null,
        to_container_id: movement.toContainerId,
        to_container_name: movement.toContainerName,
        moved_by: user?.id || null,
        moved_by_name: user?.name || movement.movedBy || null,
        reason: movement.reason || null,
        created_at: new Date(movement.timestamp).toISOString()
      }));
      
      const { error } = await supabase.from('tire_movements').insert(movementsForDB);
      if (error) {
        console.error('Erro ao salvar movimentações no Supabase:', error);
      } else {
        console.log(`✅ ${movements.length} movimentações salvas no Supabase`);
        window.dispatchEvent(new Event('tire-movements-updated'));
      }
      
      // Atualiza estoque em lote no localStorage
      updateStockEntriesBatch(batchUpdates);
      
      // Atualiza estoque em lote no Supabase
      for (const update of batchUpdates) {
        const { error: updateError } = await supabase
          .from('stock_entries')
          .update({
            container_id: update.updates.containerId,
            container_name: update.updates.containerName,
            status: update.updates.status || undefined,
            updated_at: new Date().toISOString()
          })
          .eq('barcode', update.barcode);
        
        if (updateError) {
          console.error(`Erro ao atualizar pneu ${update.barcode} no Supabase:`, updateError);
        }
      }
      console.log(`✅ ${batchUpdates.length} pneus atualizados no Supabase`);
      
      // Pequena pausa para mostrar 100% completo
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('Movimentação concluída!', {
        description: `${totalTires} pneus transferidos para ${targetCont.name}`,
        duration: 5000,
      });

      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-moved'));

      // Aguarda um pouco antes de limpar para evitar piscar
      await new Promise(resolve => setTimeout(resolve, 300));

      // Limpa o formulário
      setSelectedTires([]);
      setBulkSourceContainer('');
      setBulkTargetContainer('');
      setBulkFilterModel('all');
      setBulkFilterType('all');
      setBulkBarcodes('');
      setBulkReason('');
      setShowBulkConfirm(false);
      setIsBulkProcessing(false);
      setBulkProgress(0);
      
      // Recarrega movimentos do Supabase
      await import('../utils/supabase/client').then(async ({ createClient }) => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('tire_movements')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          const movementsList = (data || []).map((mov: any) => ({
            id: mov.id,
            barcode: mov.barcode,
            modelName: mov.model_name,
            modelType: mov.model_type,
            fromContainerId: mov.from_container_id,
            fromContainerName: mov.from_container_name,
            toContainerId: mov.to_container_id,
            toContainerName: mov.to_container_name,
            movedBy: mov.moved_by_name,
            reason: mov.reason,
            timestamp: mov.created_at
          }));
          setMovements(movementsList);
        }
      });
    } catch (error) {
      console.error('Erro ao processar movimentação em massa:', error);
      toast.error('Erro ao processar movimentação', {
        description: 'Por favor, tente novamente.',
      });
      setIsBulkProcessing(false);
    }
  };

  const exportBulkBarcodes = () => {
    if (selectedTires.length === 0) {
      toast.error('Nenhum pneu selecionado');
      return;
    }

    const barcodes = selectedTires.map(tire => tire.barcode).join('\n');
    const blob = new Blob([barcodes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codigos-pneus-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Arquivo exportado', {
      description: `${selectedTires.length} códigos de barras`,
    });
  };

  const getBulkAvailableTargetContainers = () => {
    if (!bulkSourceContainer) return containers;
    // Se a origem é "sem contêiner", pode mover para qualquer contêiner
    if (bulkSourceContainer === 'no-container') return containers;
    return containers.filter(c => c.id !== bulkSourceContainer);
  };

  return (
    <div className="flex-1 px-2 py-2 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <ArrowRightLeft size={24} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-gray-900">Movimentação de Pneus</h1>
              <p className="text-gray-500">Transferir pneus entre contêineres</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="move" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-3">
            <TabsTrigger value="move">Individual</TabsTrigger>
            <TabsTrigger value="bulk">Movimentação em Massa</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Mover Pneu */}
          <TabsContent value="move" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulário de Movimentação */}
              <Card className="p-6">
                <h2 className="text-gray-900 mb-4 flex items-center gap-2">
                  <Package size={20} className="text-purple-600" />
                  Dados da Movimentação
                </h2>

                <form onSubmit={handleBarcodeSubmit} className="space-y-4">
                  {/* Código de Barras */}
                  <div className="relative">
                    <Label htmlFor="barcode" className="mb-2">Código de Barras do Pneu</Label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      <Input
                        ref={barcodeInputRef}
                        id="barcode"
                        type="text"
                        maxLength={8}
                        value={barcode}
                        onChange={(e) => handleBarcodeChange(e.target.value)}
                        placeholder="00000000"
                        className="pl-11 font-mono"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Digite ou escaneie o código de 8 dígitos
                    </p>

                    {/* Resultados da busca */}
                    {showSearchResults && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                        {searchResults.map((tire) => (
                          <button
                            key={tire.id}
                            type="button"
                            onClick={() => selectTire(tire)}
                            className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                  {tire.barcode}
                                </code>
                                <p className="text-sm text-gray-900 mt-1">{tire.modelName}</p>
                                <p className="text-xs text-gray-500">{tire.containerName}</p>
                              </div>
                              <Badge
                                variant="secondary"
                                className={tire.modelType === 'Slick' 
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-blue-100 text-blue-700'
                                }
                              >
                                {tire.modelType}
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botão Buscar */}
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                  >
                    <Search size={16} className="mr-2" />
                    Buscar Pneu
                  </Button>
                </form>

                {/* Dados do Pneu Selecionado */}
                {selectedTire && (
                  <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h3 className="text-sm text-purple-900 mb-3">Pneu Selecionado</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Código:</span>
                        <code className="bg-white px-2 py-1 rounded text-purple-900">
                          {selectedTire.barcode}
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modelo:</span>
                        <span className="text-gray-900">{selectedTire.modelName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <Badge
                          variant="secondary"
                          className={selectedTire.modelType === 'Slick' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                          }
                        >
                          {selectedTire.modelType}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contêiner Atual:</span>
                        <span className="text-gray-900">{selectedTire.containerName}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contêiner de Destino */}
                {selectedTire && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="target-container">Contêiner de Destino</Label>
                      <Select value={targetContainer} onValueChange={setTargetContainer}>
                        <SelectTrigger id="target-container">
                          <SelectValue placeholder="Selecione o contêiner" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableContainers().map((container) => (
                            <SelectItem key={container.id} value={container.id}>
                              <div className="flex items-center gap-2">
                                <Truck size={16} className="text-gray-400" />
                                <span>{container.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reason">Motivo (Opcional)</Label>
                      <Input
                        id="reason"
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ex: Troca após treino, manutenção..."
                        maxLength={100}
                      />
                    </div>

                    <Button
                      onClick={handleMove}
                      disabled={!targetContainer}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <ArrowRightLeft size={16} className="mr-2" />
                      Confirmar Movimentação
                    </Button>
                  </div>
                )}
              </Card>

              {/* Informações */}
              <div className="space-y-4">
                <Card className="p-6 border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-blue-900 text-sm mb-2">Como Funciona</h3>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Digite ou escaneie o código de barras do pneu</li>
                        <li>Selecione o contêiner de destino</li>
                        <li>Adicione um motivo se necessário</li>
                        <li>Confirme a movimentação</li>
                        <li>O histórico ficará registrado permanentemente</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-green-200 bg-green-50">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-green-900 text-sm mb-2">Rastreabilidade</h3>
                      <p className="text-xs text-green-700">
                        Todas as movimentações são registradas com data, hora e usuário responsável, 
                        garantindo controle total sobre a localização dos pneus.
                      </p>
                    </div>
                  </div>
                </Card>

                {containers.length > 0 && !isBulkProcessing && (
                  <Card className="p-6">
                    <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                      <Truck size={18} className="text-gray-600" />
                      Contêineres Disponíveis
                    </h3>
                    <div className="space-y-2">
                      {containers.map((container) => (
                        <div
                          key={container.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="text-sm text-gray-900">{container.name}</span>
                          <span className="text-xs text-gray-500">{container.location || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                
                {isBulkProcessing && (
                  <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300">
                    <div className="text-center space-y-4">
                      <div className="relative inline-flex items-center justify-center">
                        <div className="absolute inset-0 bg-purple-400 rounded-full opacity-20 animate-ping" />
                        <Loader2 className="w-12 h-12 text-purple-600 animate-spin relative" />
                      </div>
                      <div>
                        <h3 className="text-gray-900 mb-2">Processando Movimentação</h3>
                        <p className="text-sm text-gray-600 mb-1">
                          {selectedTires.length} {selectedTires.length === 1 ? 'pneu' : 'pneus'}
                        </p>
                        <p className="text-xs text-purple-700">
                          {Math.round((bulkProgress / 100) * selectedTires.length)} de {selectedTires.length} processados
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Progress value={bulkProgress} className="h-2" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-purple-900 font-medium">{Math.round(bulkProgress)}%</span>
                          <span className="text-purple-700">{100 - Math.round(bulkProgress)}% restante</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/60 rounded-lg backdrop-blur-sm">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                          <span>Aguarde, não saia desta página...</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Movimentação em Massa */}
          <TabsContent value="bulk" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Seleção de Pneus */}
              <Card className="p-6 lg:col-span-2">
                <h2 className="text-gray-900 mb-4 flex items-center gap-2">
                  <Layers size={20} className="text-purple-600" />
                  Selecionar Pneus para Movimentação
                </h2>

                <Tabs defaultValue="container" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="container">Por Contêiner</TabsTrigger>
                    <TabsTrigger value="barcodes">Por Códigos</TabsTrigger>
                  </TabsList>

                  {/* Por Contêiner */}
                  <TabsContent value="container" className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-source">Contêiner de Origem</Label>
                      <Select 
                        value={bulkSourceContainer} 
                        onValueChange={(value: string) => {
                          setBulkSourceContainer(value);
                          setBulkFilterModel('all');
                          setBulkFilterType('all');
                        }}
                        disabled={isBulkProcessing}
                      >
                        <SelectTrigger id="bulk-source">
                          <SelectValue placeholder="Selecione o contêiner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-container">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-orange-400" />
                              <span className="text-orange-700">Sem Contêiner</span>
                            </div>
                          </SelectItem>
                          {containers.map((container) => (
                            <SelectItem key={container.id} value={container.id}>
                              <div className="flex items-center gap-2">
                                <Truck size={16} className="text-gray-400" />
                                <span>{container.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkSourceContainer && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="bulk-filter-model">Filtrar por Modelo</Label>
                            <Select value={bulkFilterModel} onValueChange={setBulkFilterModel} disabled={isBulkProcessing}>
                              <SelectTrigger id="bulk-filter-model">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos os Modelos</SelectItem>
                                {tireModels.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="bulk-filter-type">Filtrar por Tipo</Label>
                            <Select value={bulkFilterType} onValueChange={setBulkFilterType} disabled={isBulkProcessing}>
                              <SelectTrigger id="bulk-filter-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos os Tipos</SelectItem>
                                <SelectItem value="Slick">Slick</SelectItem>
                                <SelectItem value="Wet">Wet</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button
                          onClick={loadBulkTires}
                          disabled={isBulkProcessing}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                        >
                          <Filter size={16} className="mr-2" />
                          Carregar Pneus
                        </Button>
                      </>
                    )}
                  </TabsContent>

                  {/* Por Códigos */}
                  <TabsContent value="barcodes" className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-barcodes">Códigos de Barras</Label>
                      <Textarea
                        id="bulk-barcodes"
                        value={bulkBarcodes}
                        onChange={(e) => setBulkBarcodes(e.target.value)}
                        placeholder="Digite os códigos de 8 dígitos, um por linha&#10;Ex:&#10;12345678&#10;87654321&#10;11223344"
                        rows={10}
                        className="font-mono text-sm"
                        disabled={isBulkProcessing}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cole ou digite um código por linha (8 dígitos cada)
                      </p>
                    </div>

                    <Button
                      onClick={handleBulkBarcodeLoad}
                      disabled={isBulkProcessing}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                    >
                      <FileUp size={16} className="mr-2" />
                      Carregar Códigos
                    </Button>
                  </TabsContent>
                </Tabs>

                {/* Preview dos pneus selecionados */}
                {selectedTires.length > 0 && (
                  <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm text-purple-900">
                        {selectedTires.length} {selectedTires.length === 1 ? 'Pneu Selecionado' : 'Pneus Selecionados'}
                      </h3>
                      <Button
                        onClick={exportBulkBarcodes}
                        variant="outline"
                        size="sm"
                        disabled={isBulkProcessing}
                      >
                        <Download size={14} className="mr-2" />
                        Exportar Códigos
                      </Button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {selectedTires.slice(0, 50).map((tire) => (
                        <div
                          key={tire.id}
                          className="flex items-center justify-between p-2 bg-white rounded text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {tire.barcode}
                            </code>
                            <span className="text-gray-900">{tire.modelName}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={tire.modelType === 'Slick' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-blue-100 text-blue-700'
                            }
                          >
                            {tire.modelType}
                          </Badge>
                        </div>
                      ))}
                      {selectedTires.length > 50 && (
                        <p className="text-xs text-purple-700 text-center py-2">
                          + {selectedTires.length - 50} pneus não exibidos
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">Slick:</span>
                          <span className="ml-2 text-orange-700">
                            {selectedTires.filter(t => t.modelType === 'Slick').length}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">Wet:</span>
                          <span className="ml-2 text-blue-700">
                            {selectedTires.filter(t => t.modelType === 'Wet').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Destino e Confirmação */}
              <div className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-gray-900 mb-4 flex items-center gap-2">
                    <Truck size={20} className="text-purple-600" />
                    Destino
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-target">Contêiner de Destino</Label>
                      <Select 
                        value={bulkTargetContainer} 
                        onValueChange={setBulkTargetContainer}
                        disabled={selectedTires.length === 0 || isBulkProcessing}
                      >
                        <SelectTrigger id="bulk-target">
                          <SelectValue placeholder="Selecione o contêiner" />
                        </SelectTrigger>
                        <SelectContent>
                          {getBulkAvailableTargetContainers().map((container) => (
                            <SelectItem key={container.id} value={container.id}>
                              <div className="flex items-center gap-2">
                                <Truck size={16} className="text-gray-400" />
                                <span>{container.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="bulk-reason">Motivo (Opcional)</Label>
                      <Textarea
                        id="bulk-reason"
                        value={bulkReason}
                        onChange={(e) => setBulkReason(e.target.value)}
                        placeholder="Ex: Troca após corrida, manutenção programada..."
                        rows={3}
                        maxLength={200}
                        disabled={isBulkProcessing}
                      />
                    </div>

                    <Button
                      onClick={handleBulkMove}
                      disabled={selectedTires.length === 0 || !bulkTargetContainer || isBulkProcessing}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                    >
                      {isBulkProcessing ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft size={16} className="mr-2" />
                          Mover {selectedTires.length} {selectedTires.length === 1 ? 'Pneu' : 'Pneus'}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-blue-900 text-sm mb-2">Movimentação em Massa</h3>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Selecione todos os pneus de um contêiner</li>
                        <li>Filtre por modelo ou tipo</li>
                        <li>Ou carregue uma lista de códigos</li>
                        <li>Todas as movimentações são registradas</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="history">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-gray-900 flex items-center gap-2">
                    <History size={20} className="text-purple-600" />
                    Histórico de Movimentações
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">
                    {movements.length} {movements.length === 1 ? 'registro' : 'registros'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Registros por página:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value: string) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {movements.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <History size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Nenhuma movimentação registrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Data/Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Modelo
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          De
                        </th>
                        <th className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wider">
                          →
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Para
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Motivo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {movements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((movement) => (
                        <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-900">
                                  {new Date(movement.timestamp).toLocaleDateString('pt-BR')}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(movement.timestamp).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {movement.barcode}
                            </code>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-gray-900">{movement.modelName}</div>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${movement.modelType === 'Slick' 
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {movement.modelType}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{movement.fromContainerName}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <ArrowRightLeft size={16} className="text-purple-600 mx-auto" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{movement.toContainerName}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-900">{movement.movedBy || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">
                              {movement.reason || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {movements.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, movements.length)} de {movements.length} registros
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {Math.ceil(movements.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(movements.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(movements.length / itemsPerPage)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog - Individual */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Movimentação de Pneu</AlertDialogTitle>
            <AlertDialogDescription>
              Revise os detalhes da movimentação antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedTire && targetContainer && (
            <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Código:</span>
                        <code className="text-gray-900">{selectedTire.barcode}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modelo:</span>
                        <span className="text-gray-900">{selectedTire.modelName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-center py-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">De:</p>
                      <p className="text-sm text-gray-900">{selectedTire.containerName}</p>
                    </div>
                    <ArrowRightLeft size={20} className="text-purple-600" />
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Para:</p>
                      <p className="text-sm text-gray-900">
                        {containers.find(c => c.id === targetContainer)?.name}
                      </p>
                    </div>
                  </div>

                  {reason && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Motivo:</p>
                      <p className="text-sm text-blue-900">{reason}</p>
                    </div>
                  )}

                <p className="text-sm text-gray-600 mt-4">
                  Deseja confirmar esta movimentação?
                </p>
              </div>
            )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMove}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isProcessingMove}
            >
              Confirmar Movimentação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog - Bulk */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Movimentação em Massa</AlertDialogTitle>
            <AlertDialogDescription>
              Revise os detalhes da movimentação em massa antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
                {!isBulkProcessing ? (
                  <>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-purple-900">Total de Pneus:</span>
                        <Badge className="bg-purple-600 text-white">
                          {selectedTires.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">Slick:</span>
                          <span className="ml-2 text-orange-700">
                            {selectedTires.filter(t => t.modelType === 'Slick').length}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">Wet:</span>
                          <span className="ml-2 text-blue-700">
                            {selectedTires.filter(t => t.modelType === 'Wet').length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-center py-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">De:</p>
                        <p className="text-sm text-gray-900">
                          {bulkSourceContainer === 'no-container' 
                            ? 'Sem Contêiner' 
                            : (selectedTires.length > 0 && selectedTires[0].containerName)}
                        </p>
                      </div>
                      <ArrowRightLeft size={24} className="text-purple-600" />
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Para:</p>
                        <p className="text-sm text-gray-900">
                          {containers.find(c => c.id === bulkTargetContainer)?.name}
                        </p>
                      </div>
                    </div>

                    {bulkReason && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600 mb-1">Motivo:</p>
                        <p className="text-sm text-blue-900">{bulkReason}</p>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 text-center">
                      Deseja confirmar a movimentação de <strong>{selectedTires.length}</strong> {selectedTires.length === 1 ? 'pneu' : 'pneus'}?
                    </p>
                  </>
                ) : (
                  <div className="py-8 px-6">
                    <div className="text-center mb-6">
                      <div className="relative inline-flex items-center justify-center mb-4">
                        <div className="absolute inset-0 bg-purple-400 rounded-full opacity-20 animate-ping" />
                        <Loader2 size={56} className="text-purple-600 animate-spin relative" />
                      </div>
                      <h4 className="text-gray-900 mb-2">Processando Movimentação em Massa</h4>
                      <p className="text-sm text-gray-600">
                        Movendo {selectedTires.length} {selectedTires.length === 1 ? 'pneu' : 'pneus'}...
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        Processado: {Math.round((bulkProgress / 100) * selectedTires.length)} de {selectedTires.length} pneus
                      </p>
                    </div>
                    
                    <div className="space-y-3 bg-purple-50 p-4 rounded-lg">
                      <Progress value={bulkProgress} className="h-3" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-purple-900 font-medium">{Math.round(bulkProgress)}% concluído</span>
                        <span className="text-purple-700">{100 - Math.round(bulkProgress)}% restante</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-gray-700">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                        <span>Aguarde, não feche esta janela...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          {!isBulkProcessing && (
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkMove}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isBulkProcessing}
              >
                Confirmar Movimentação
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
