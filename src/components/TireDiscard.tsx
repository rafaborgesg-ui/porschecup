import { useState, useEffect, useRef } from 'react';
import { Trash2, AlertCircle, CheckCircle2, X, Package as PackageIcon, Layers, Filter, FileUp, Download, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
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
import { createClient } from '../utils/supabase/client';

interface DiscardedTire {
  id: string;
  barcode: string;
  model: string;
  container: string;
  timestamp: Date;
}

export function TireDiscard() {
  // Estado para descarte individual
  const [barcode, setBarcode] = useState('');
  const [discardedTires, setDiscardedTires] = useState<DiscardedTire[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Estado para descarte em massa
  const [bulkSourceContainer, setBulkSourceContainer] = useState('');
  const [bulkFilterModel, setBulkFilterModel] = useState('all');
  const [bulkFilterType, setBulkFilterType] = useState('all');
  const [bulkBarcodes, setBulkBarcodes] = useState('');
  const [selectedTires, setSelectedTires] = useState<StockEntry[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [containers, setContainers] = useState<any[]>([]);
  const [tireModels, setTireModels] = useState<any[]>([]);

  useEffect(() => {
    loadContainers();
    loadTireModels();
  }, []);

  const loadContainers = () => {
    const containersList = getContainers();
    setContainers(containersList);
  };

  const loadTireModels = () => {
    const modelsList = getTireModels();
    setTireModels(modelsList);
  };

  // Auto-focus no input ao carregar (somente na aba individual)
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-processar quando o código de barras atingir 8 dígitos
  useEffect(() => {
    if (barcode.length === 8) {
      handleDiscard();
    }
  }, [barcode]);

  // Helpers Supabase
  const getSupabaseUserContext = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    const userId = user?.id ?? null;
    const userName = (user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email) ?? null;
    return { supabase, userId, userName } as const;
  };

  const recordDiscardInSupabase = async (entry: any) => {
    try {
      const { supabase, userId, userName } = await getSupabaseUserContext();

      // 1) Insere registro em tire_discards (1 linha por descarte)
      const insertPayload = {
        barcode: entry.barcode,
        model_name: entry.modelName,
        model_type: entry.modelType,
        container_name: entry.containerName || null,
        discard_reason: null,
        discarded_by: userId,
        discarded_by_name: userName,
      };
      const { error: insertError } = await supabase.from('tire_discards').insert([insertPayload]);
      if (insertError) throw insertError;

      // 2) Atualiza status no stock_entries
      const { error: updateError } = await supabase
        .from('stock_entries')
        .update({ status: 'Descarte', container_id: null, container_name: null, updated_at: new Date().toISOString() })
        .eq('barcode', entry.barcode);
      if (updateError) throw updateError;

      return true;
    } catch (e) {
      console.error('Erro ao registrar descarte no Supabase:', e);
      return false;
    }
  };

  const handleDiscard = async () => {
    const trimmedBarcode = barcode.trim();

    if (!trimmedBarcode) {
      toast.error('Digite um código de barras');
      return;
    }

    if (trimmedBarcode.length !== 8) {
      toast.error('Código de barras deve ter 8 dígitos');
      return;
    }

    // Verifica se o código existe no estoque (incluindo descartados)
    const allEntries = getStockEntries(true);
    const entry = allEntries.find(e => e.barcode === trimmedBarcode);

    if (!entry) {
      toast.error('Código de barras não encontrado no estoque', {
        description: `Código: ${trimmedBarcode}`
      });
      setBarcode('');
      inputRef.current?.focus();
      return;
    }

    // Verifica se já foi descartado
    if (entry.status === 'Descarte') {
      toast.error('Este pneu já foi descartado anteriormente', {
        description: `Código: ${trimmedBarcode}`
      });
      setBarcode('');
      inputRef.current?.focus();
      return;
    }

    // Verifica se já foi descartado na sessão atual
    const alreadyDiscarded = discardedTires.some(d => d.barcode === trimmedBarcode);
    if (alreadyDiscarded) {
      toast.error('Este pneu já foi descartado nesta sessão', {
        description: `Código: ${trimmedBarcode}`
      });
      setBarcode('');
      inputRef.current?.focus();
      return;
    }

  // Atualiza localmente (otimista) o status para Descarte e limpa container
  const success = updateStockEntry(trimmedBarcode, { status: 'Descarte', containerId: '', containerName: '' });

    if (success) {
      // Adiciona à lista de descartados na sessão
      const newDiscard: DiscardedTire = {
        id: entry.id,
        barcode: trimmedBarcode,
        model: entry.modelName,
        container: entry.containerName,
        timestamp: new Date()
      };

      setDiscardedTires(prev => [newDiscard, ...prev]);
      
      // Mostra feedback de sucesso
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      toast.success('Pneu descartado com sucesso', {
        description: `${entry.modelName} - ${trimmedBarcode}`
      });

      // Grava no Supabase (registro e update de status)
      recordDiscardInSupabase(entry).then((ok) => {
        if (!ok) {
          toast.error('Falha ao registrar descarte no servidor (Supabase)');
        }
      });

      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-discarded'));
    } else {
      toast.error('Erro ao descartar pneu');
    }

    // Limpa o campo e foca novamente
    setBarcode('');
    inputRef.current?.focus();
  };

  const handleRemoveFromList = (id: string) => {
    setDiscardedTires(prev => prev.filter(tire => tire.id !== id));
    toast.info('Pneu removido da lista de descarte da sessão');
  };

  const handleFinish = () => {
    setShowFinishDialog(true);
  };

  const confirmFinish = () => {
    // Limpa a lista da sessão
    setDiscardedTires([]);
    setShowFinishDialog(false);
    toast.success('Sessão de descarte finalizada', {
      description: 'Você pode iniciar uma nova sessão'
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDiscard();
    }
  };

  // Funções de descarte em massa
  const loadBulkTires = () => {
    if (!bulkSourceContainer) {
      toast.error('Selecione um contêiner de origem');
      return;
    }

    // Carrega pneus ATIVOS do contêiner selecionado
    const stockEntries = getStockEntries(false); // false = apenas ativos
    let filtered = stockEntries.filter(entry => entry.containerId === bulkSourceContainer);

    // Aplica filtros
    if (bulkFilterModel !== 'all') {
      filtered = filtered.filter(entry => entry.modelId === bulkFilterModel);
    }

    if (bulkFilterType !== 'all') {
      filtered = filtered.filter(entry => entry.modelType === bulkFilterType);
    }

    if (filtered.length === 0) {
      toast.error('Nenhum pneu encontrado com os filtros selecionados');
      return;
    }

    setSelectedTires(filtered);
    toast.success(`${filtered.length} pneu(s) carregado(s)`);
  };

  const handleBulkBarcodeLoad = () => {
    if (!bulkBarcodes.trim()) {
      toast.error('Digite os códigos de barras');
      return;
    }

    // Processa os códigos linha por linha
    const codes = bulkBarcodes
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (codes.length === 0) {
      toast.error('Nenhum código válido encontrado');
      return;
    }

    // Valida códigos
    const invalidCodes = codes.filter(code => !/^\d{8}$/.test(code));
    if (invalidCodes.length > 0) {
      toast.error('Códigos inválidos encontrados', {
        description: `${invalidCodes.length} código(s) não tem 8 dígitos`
      });
      return;
    }

    // Busca pneus ATIVOS no estoque
    const stockEntries = getStockEntries(false); // false = apenas ativos
    const found: StockEntry[] = [];
    const notFound: string[] = [];

    codes.forEach(code => {
      const entry = stockEntries.find(e => e.barcode === code);
      if (entry) {
        // Verifica se não está duplicado na lista
        if (!found.some(f => f.barcode === code)) {
          found.push(entry);
        }
      } else {
        notFound.push(code);
      }
    });

    if (found.length === 0) {
      toast.error('Nenhum pneu ativo encontrado', {
        description: notFound.length > 0 ? `${notFound.length} código(s) não encontrado(s) ou já descartado(s)` : undefined
      });
      return;
    }

    setSelectedTires(found);
    
    if (notFound.length > 0) {
      toast.warning(`${found.length} pneu(s) carregado(s)`, {
        description: `${notFound.length} código(s) não encontrado(s) ou já descartado(s)`
      });
    } else {
      toast.success(`${found.length} pneu(s) carregado(s)`);
    }
  };

  const handleBulkDiscard = () => {
    if (selectedTires.length === 0) {
      toast.error('Nenhum pneu selecionado');
      return;
    }

    setShowBulkConfirm(true);
  };

  const confirmBulkDiscard = async () => {
    setIsBulkProcessing(true);
    setBulkProgress(0);

    try {
      const updates = selectedTires.map(tire => ({
        barcode: tire.barcode,
        updates: { status: 'Descarte' as const }
      }));

      const batchSize = 50;
      const totalBatches = Math.ceil(updates.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = updates.slice(i * batchSize, (i + 1) * batchSize);
        // Atualização local otimista
        updateStockEntriesBatch(batch);
        
        const progress = Math.round(((i + 1) / totalBatches) * 100);
        setBulkProgress(progress);
        
        // Pequeno delay para atualizar UI
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Supabase: insere descartar e atualiza status em lote
      try {
        const { supabase, userId, userName } = await getSupabaseUserContext();
        const barcodes = selectedTires.map(t => t.barcode);

        // 1) Insert em tire_discards (1 linha por pneu)
        const insertRows = selectedTires.map(t => ({
          barcode: t.barcode,
          model_name: t.modelName,
          model_type: t.modelType,
          container_name: t.containerName || null,
          discard_reason: null,
          discarded_by: userId,
          discarded_by_name: userName,
        }));
        const { error: bulkInsertError } = await supabase.from('tire_discards').insert(insertRows);
        if (bulkInsertError) {
          console.error('Erro no insert em massa de tire_discards:', bulkInsertError);
        }

        // 2) Update em stock_entries para todos barcodes
        const { error: bulkUpdateError } = await supabase
          .from('stock_entries')
          .update({ status: 'Descarte', container_id: null, container_name: null, updated_at: new Date().toISOString() })
          .in('barcode', barcodes);
        if (bulkUpdateError) {
          console.error('Erro no update em massa de stock_entries:', bulkUpdateError);
        }
      } catch (e) {
        console.error('Erro Supabase no descarte em massa:', e);
      }

      toast.success('Descarte em massa concluído', {
        description: `${selectedTires.length} pneu(s) descartado(s) com sucesso`
      });

      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-discarded'));

      // Aguarda um pouco antes de limpar
      await new Promise(resolve => setTimeout(resolve, 300));

      // Limpa o formulário
      setSelectedTires([]);
      setBulkSourceContainer('');
      setBulkFilterModel('all');
      setBulkFilterType('all');
      setBulkBarcodes('');
      setShowBulkConfirm(false);
      setIsBulkProcessing(false);
      setBulkProgress(0);
    } catch (error) {
      console.error('Erro ao processar descarte em massa:', error);
      toast.error('Erro ao processar descarte', {
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
    a.download = `codigos-descarte-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Arquivo exportado', {
      description: `${selectedTires.length} códigos de barras`,
    });
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl lg:mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-[#D50000] rounded-lg flex items-center justify-center">
            <Trash2 className="text-white" size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-gray-900">Saída de Estoque de Pneus (Descarte)</h1>
            <p className="text-gray-500">Registre os pneus que serão descartados do estoque</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-2">
          <TabsTrigger value="individual">Descarte Individual</TabsTrigger>
          <TabsTrigger value="bulk">Descarte em Massa</TabsTrigger>
        </TabsList>

        {/* Descarte Individual */}
        <TabsContent value="individual" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Barcode Input */}
            <div className="space-y-6">
              {/* Barcode Input Card */}
              <Card className="p-6 bg-white border border-gray-200 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="barcode" className="text-gray-900 mb-2 block">
                      Código de Barras do Pneu
                    </Label>
                    <div className="relative">
                      <Input
                        ref={inputRef}
                        id="barcode"
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Digite ou escaneie o código de 8 dígitos"
                        className="h-14 pr-12 bg-gray-50 border-gray-300"
                        maxLength={8}
                      />
                      {showSuccess && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="text-green-600" size={24} />
                        </div>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mt-2">
                      O descarte será processado automaticamente ao atingir 8 dígitos
                    </p>
                  </div>

                  <Button 
                    onClick={handleDiscard}
                    className="w-full bg-[#D50000] hover:bg-[#B00000] h-12"
                    disabled={barcode.length !== 8}
                  >
                    <Trash2 className="mr-2" size={20} />
                    Confirmar Descarte
                  </Button>
                </div>
              </Card>

              {/* Info Card */}
              <Card className="p-6 bg-blue-50 border border-blue-200">
                <div className="flex gap-3">
                  <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                  <div className="space-y-2">
                    <h3 className="text-blue-900">Instruções de Descarte</h3>
                    <ul className="text-blue-800 text-sm space-y-1">
                      <li>• Digite ou escaneie o código de barras de 8 dígitos</li>
                      <li>• O pneu será marcado como "Descarte" no sistema</li>
                      <li>• Pneus descartados não aparecem no estoque ativo</li>
                      <li>• O registro permanece no histórico do sistema</li>
                      <li>• Não é possível descartar o mesmo pneu duas vezes</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Discarded Tires List */}
            <div>
              <Card className="p-6 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">Pneus Descartados (Sessão Atual)</h3>
                  {discardedTires.length > 0 && (
                    <Badge variant="destructive" className="bg-[#D50000]">
                      {discardedTires.length}
                    </Badge>
                  )}
                </div>

                {discardedTires.length === 0 ? (
                  <div className="text-center py-12">
                    <PackageIcon className="mx-auto text-gray-300 mb-3" size={48} strokeWidth={1.5} />
                    <p className="text-gray-500">Nenhum pneu descartado nesta sessão</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Escaneie códigos de barras para iniciar
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-4 max-h-[500px] overflow-y-auto">
                      {discardedTires.map((tire) => (
                        <div
                          key={tire.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono bg-black text-white px-2 py-0.5 rounded text-sm">
                                {tire.barcode}
                              </span>
                              <Badge variant="destructive" className="bg-red-600">
                                Descartado
                              </Badge>
                            </div>
                            <p className="text-gray-900 text-sm">{tire.model}</p>
                            <p className="text-gray-500 text-sm">{tire.container}</p>
                            <p className="text-gray-400 text-xs">
                              {tire.timestamp.toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromList(tire.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X size={20} />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleFinish}
                      variant="outline"
                      className="w-full"
                    >
                      Finalizar Sessão de Descarte
                    </Button>
                  </>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Descarte em Massa */}
        <TabsContent value="bulk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Seleção de Pneus */}
            <Card className="p-6 lg:col-span-2">
              <h2 className="text-gray-900 mb-4 flex items-center gap-2">
                <Layers size={20} className="text-[#D50000]" />
                Selecionar Pneus para Descarte
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
                      onValueChange={(value) => {
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
                        {containers.map((container) => (
                          <SelectItem key={container.id} value={container.id}>
                            {container.name}
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
                        className="w-full bg-[#D50000] hover:bg-[#B00000] text-white disabled:opacity-50"
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
                    className="w-full bg-[#D50000] hover:bg-[#B00000] text-white disabled:opacity-50"
                  >
                    <FileUp size={16} className="mr-2" />
                    Carregar Códigos
                  </Button>
                </TabsContent>
              </Tabs>

              {/* Preview dos pneus selecionados */}
              {selectedTires.length > 0 && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm text-red-900">
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
                      <p className="text-xs text-red-700 text-center py-2">
                        + {selectedTires.length - 50} pneus não exibidos
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-red-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-white rounded">
                        <p className="text-gray-500">Slick</p>
                        <p className="text-gray-900">
                          {selectedTires.filter(t => t.modelType === 'Slick').length} pneus
                        </p>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <p className="text-gray-500">Wet</p>
                        <p className="text-gray-900">
                          {selectedTires.filter(t => t.modelType === 'Wet').length} pneus
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Painel de Ação */}
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-gray-900 mb-4">Confirmar Descarte</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Pneus selecionados:</span>
                        <span className="text-gray-900">{selectedTires.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Slick:</span>
                        <span className="text-gray-900">
                          {selectedTires.filter(t => t.modelType === 'Slick').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Wet:</span>
                        <span className="text-gray-900">
                          {selectedTires.filter(t => t.modelType === 'Wet').length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleBulkDiscard}
                    disabled={selectedTires.length === 0 || isBulkProcessing}
                    className="w-full bg-[#D50000] hover:bg-[#B00000] text-white h-12"
                  >
                    <Trash2 size={18} className="mr-2" />
                    Descartar {selectedTires.length} Pneu(s)
                  </Button>
                </div>
              </Card>

              <Card className="p-6 bg-yellow-50 border border-yellow-200">
                <div className="flex gap-3">
                  <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
                  <div className="space-y-2">
                    <h4 className="text-yellow-900">Atenção</h4>
                    <ul className="text-yellow-800 text-sm space-y-1">
                      <li>• Esta ação é permanente</li>
                      <li>• Pneus descartados não aparecem no estoque ativo</li>
                      <li>• O registro é mantido no histórico</li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Indicador de progresso */}
              {isBulkProcessing && (
                <Card className="p-6 bg-red-50 border-2 border-red-300">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="text-[#D50000] animate-spin" size={24} />
                      <div>
                        <h3 className="text-red-900">Processando Descarte...</h3>
                        <p className="text-xs text-red-700">
                          {Math.round((bulkProgress / 100) * selectedTires.length)} de {selectedTires.length} processados
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Progress value={bulkProgress} className="h-2" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-red-900">{Math.round(bulkProgress)}%</span>
                        <span className="text-red-700">{100 - Math.round(bulkProgress)}% restante</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/60 rounded-lg backdrop-blur-sm">
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                        <div className="w-2 h-2 bg-[#D50000] rounded-full animate-pulse" />
                        <span>Aguarde, não saia desta página...</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Finish Dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Sessão de Descarte?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os pneus já foram marcados como descartados no sistema.
              Esta ação irá limpar a lista da sessão atual e você poderá iniciar uma nova sessão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFinish}
              className="bg-[#D50000] hover:bg-[#B00000]"
            >
              Finalizar Sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Confirm Dialog */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Descarte em Massa</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a descartar <strong>{selectedTires.length} pneu(s)</strong>.
              Esta ação é permanente e os pneus não aparecerão mais no estoque ativo.
              <br /><br />
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDiscard}
              disabled={isBulkProcessing}
              className="bg-[#D50000] hover:bg-[#B00000]"
            >
              {isBulkProcessing ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  Processando...
                </>
              ) : (
                <>Confirmar Descarte</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
