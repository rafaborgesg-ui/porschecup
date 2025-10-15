import { useState, useEffect, useRef } from 'react';
import { UserCircle, Barcode, CheckCircle2, User, Package, Search, Download, Camera } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
// import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarcodeScanner } from './BarcodeScanner';
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
import { getStockEntries, updateStockEntry, type StockEntry } from '../utils/storage';

interface ConsumptionRecord {
  id: string;
  barcode: string;
  modelName: string;
  modelType: 'Slick' | 'Wet';
  containerName: string;
  pilot?: string;
  team?: string; // Representa a etapa da corrida
  timestamp: string;
  registeredBy: string;
  notes?: string;
}

const CONSUMPTION_KEY = 'porsche-cup-tire-consumption';

function getConsumptionRecords(): ConsumptionRecord[] {
  try {
    const stored = localStorage.getItem(CONSUMPTION_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erro ao carregar registros de consumo:', error);
    return [];
  }
}

async function saveConsumptionRecord(record: ConsumptionRecord): Promise<void> {
  try {
    // Salva no localStorage
    const records = getConsumptionRecords();
    records.push(record);
    localStorage.setItem(CONSUMPTION_KEY, JSON.stringify(records));
    
    // Salva no Supabase
    const { createClient, getCurrentUser } = await import('../utils/supabase/client');
    const supabase = createClient();
    const user = await getCurrentUser();
    
    const recordForDB = {
      barcode: record.barcode,
      model_name: record.modelName,
      model_type: record.modelType,
      container_name: record.containerName,
      pilot: record.pilot || null,
      team: record.team || null,
      notes: record.notes || null,
      registered_by_name: user?.name || record.registeredBy || null,
      created_at: new Date(record.timestamp).toISOString()
    };
    
    const { error } = await supabase.from('tire_consumption').insert([recordForDB]);
    
    if (error) {
      console.error('Erro ao salvar registro de consumo no Supabase:', error);
    } else {
      console.log('✅ Registro de consumo salvo no Supabase:', recordForDB.barcode);
    }
    
    // Dispara evento para sincronização
    window.dispatchEvent(new Event('tire-consumption-updated'));
  } catch (error) {
    console.error('Erro ao salvar registro de consumo:', error);
  }
}

async function updateTireToPilot(barcode: string, pilot?: string, team?: string, notes?: string): Promise<boolean> {
  const currentEntry = getStockEntries(true).find(e => e.barcode === barcode);
  
  if (!currentEntry) {
    return false;
  }

  // Só pode transferir pneus com status "Novo"
  if (currentEntry.status !== 'Novo') {
    toast.error('Apenas pneus com status "Novo" podem ser transferidos para piloto');
    return false;
  }

  const updates: any = {
    status: 'Piloto',
  };

  // Adiciona informações opcionais
  if (pilot) updates.pilot = pilot;
  if (team) updates.team = team;
  if (notes) updates.notes = notes;

  // Atualiza no localStorage
  const localSuccess = updateStockEntry(barcode, updates);
  
  // Atualiza no Supabase
  try {
    const { createClient } = await import('../utils/supabase/client');
    const supabase = createClient();
    
    const { error } = await supabase
      .from('stock_entries')
      .update({
        status: 'Piloto',
        pilot: pilot || null,
        team: team || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('barcode', barcode);
    
    if (error) {
      console.error('Erro ao atualizar status do pneu no Supabase:', error);
    } else {
      console.log('✅ Status do pneu atualizado no Supabase:', barcode);
    }
  } catch (error) {
    console.error('Erro ao atualizar pneu no Supabase:', error);
  }
  
  return localSuccess;
}

export function TireConsumption() {
  // Estado para registro individual
  const [barcode, setBarcode] = useState('');
  const [selectedTire, setSelectedTire] = useState<StockEntry | null>(null);
  const [pilot, setPilot] = useState('');
  const [team, setTeam] = useState('');
  const [notes, setNotes] = useState('');
  const [consumptionRecords, setConsumptionRecords] = useState<ConsumptionRecord[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchResults, setSearchResults] = useState<StockEntry[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // const [statusList, setStatusList] = useState<TireStatus[]>([]);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Estado para registro em lote
  const [bulkBarcodes, setBulkBarcodes] = useState('');
  const [bulkPilot, setBulkPilot] = useState('');
  const [bulkTeam, setBulkTeam] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [selectedTires, setSelectedTires] = useState<StockEntry[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Estado para histórico
  const [filterPilot, setFilterPilot] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadConsumptionRecords();
    loadStatus();
    barcodeInputRef.current?.focus();
    
    // Detecta se é mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Escuta atualizações de status
    const handleStatusUpdate = () => loadStatus();
    window.addEventListener('tire-status-updated', handleStatusUpdate);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('tire-status-updated', handleStatusUpdate);
    };
  }, []);

  const loadStatus = () => {
    // const status = getTireStatus();
    // setStatusList(status);
  };

  const loadConsumptionRecords = async () => {
    // Tenta carregar do Supabase primeiro
    try {
      const { createClient } = await import('../utils/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('tire_consumption')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao carregar registros do Supabase:', error);
        // Fallback para localStorage
        setConsumptionRecords(getConsumptionRecords());
      } else {
        // Mapeia para o formato do componente
        const records: ConsumptionRecord[] = (data || []).map((record: any) => ({
          id: record.id,
          barcode: record.barcode,
          modelName: record.model_name,
          modelType: record.model_type,
          containerName: record.container_name,
          pilot: record.pilot,
          team: record.team,
          timestamp: record.created_at,
          registeredBy: record.registered_by_name || 'Sistema',
          notes: record.notes,
        }));
        setConsumptionRecords(records);
      }
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
      // Fallback para localStorage
      setConsumptionRecords(getConsumptionRecords());
    }
  };

  const handleScanComplete = (code: string) => {
    console.log('📸 Código escaneado:', code);
    setBarcode(code);
    handleSearchTire(code);
    setShowScanner(false);
  };

  const handleBarcodeChange = (value: string) => {
    setBarcode(value);

    if (value.length >= 3) {
      const stockEntries = getStockEntries(true);
      const results = stockEntries.filter(
        (entry) =>
          entry.status === 'Novo' && // Só mostra pneus Novos
          (entry.barcode.toLowerCase().includes(value.toLowerCase()) ||
            entry.modelName.toLowerCase().includes(value.toLowerCase()))
      );
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }

    // Auto-busca quando o código tiver 8 dígitos
    if (value.length === 8) {
      handleSearchTire(value);
    }
  };

  const handleSearchTire = (searchBarcode: string = barcode) => {
    setShowSearchResults(false);

    const stockEntries = getStockEntries(true);
    const foundTire = stockEntries.find(
      (entry) => entry.barcode === searchBarcode && entry.status === 'Novo'
    );

    if (foundTire) {
      setSelectedTire(foundTire);
      toast.success('Pneu encontrado!');
    } else {
      const existingTire = stockEntries.find((entry) => entry.barcode === searchBarcode);
      if (existingTire) {
        if (existingTire.status === 'Piloto') {
          toast.error('Este pneu já está com um piloto');
        } else if (existingTire.status === 'Descarte') {
          toast.error('Este pneu foi descartado');
        } else {
          toast.error(`Este pneu já possui status "${existingTire.status}"`);
        }
      } else {
        toast.error('Pneu não encontrado no estoque');
      }
      setSelectedTire(null);
    }
  };

  const handleConfirmConsumption = async () => {
    if (!selectedTire) return;

    const success = await updateTireToPilot(selectedTire.barcode, pilot, team, notes);

    if (success) {
      const user = JSON.parse(localStorage.getItem('porsche-cup-user') || '{}');

      const consumptionRecord: ConsumptionRecord = {
        id: `CONS-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        barcode: selectedTire.barcode,
        modelName: selectedTire.modelName,
        modelType: selectedTire.modelType,
        containerName: selectedTire.containerName,
        pilot: pilot || undefined,
        team: team || undefined,
        timestamp: new Date().toISOString(),
        registeredBy: user.name || user.username || 'Sistema',
        notes: notes || undefined,
      };

      await saveConsumptionRecord(consumptionRecord);
      loadConsumptionRecords();

      toast.success('Pneu transferido para piloto com sucesso!', {
        description: `Código: ${selectedTire.barcode}`,
      });

      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-consumed'));

      // Reset form
      setBarcode('');
      setSelectedTire(null);
      setPilot('');
      setTeam('');
      setNotes('');
      setShowConfirmDialog(false);
      barcodeInputRef.current?.focus();
    } else {
      toast.error('Erro ao transferir pneu');
    }
  };

  const handleBulkBarcodeChange = (value: string) => {
    setBulkBarcodes(value);

    // Parse barcodes separados por linha ou vírgula
    const barcodes = value
      .split(/[\n,]/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    if (barcodes.length > 0) {
      const stockEntries = getStockEntries(true);
      const foundTires = stockEntries.filter(
        (entry) => barcodes.includes(entry.barcode) && entry.status === 'Novo'
      );
      setSelectedTires(foundTires);
    } else {
      setSelectedTires([]);
    }
  };

  const handleBulkConsumption = async () => {
    if (selectedTires.length === 0) {
      toast.error('Nenhum pneu válido encontrado');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const user = JSON.parse(localStorage.getItem('porsche-cup-user') || '{}');

    for (const tire of selectedTires) {
      const success = await updateTireToPilot(tire.barcode, bulkPilot, bulkTeam, bulkNotes);

      if (success) {
        const consumptionRecord: ConsumptionRecord = {
          id: `CONS-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          barcode: tire.barcode,
          modelName: tire.modelName,
          modelType: tire.modelType,
          containerName: tire.containerName,
          pilot: bulkPilot || undefined,
          team: bulkTeam || undefined,
          timestamp: new Date().toISOString(),
          registeredBy: user.name || user.username || 'Sistema',
          notes: bulkNotes || undefined,
        };
        await saveConsumptionRecord(consumptionRecord);
        successCount++;
      } else {
        errorCount++;
      }
    }

    loadConsumptionRecords();

    if (successCount > 0) {
      toast.success(`${successCount} pneu(s) transferido(s) para piloto com sucesso!`);
      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-consumed'));
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} pneu(s) não puderam ser transferidos`);
    }

    // Reset form
    setBulkBarcodes('');
    setBulkPilot('');
    setBulkTeam('');
    setBulkNotes('');
    setSelectedTires([]);
    setShowBulkConfirm(false);
  };

  const handleSelectFromSearch = (tire: StockEntry) => {
    setSelectedTire(tire);
    setBarcode(tire.barcode);
    setShowSearchResults(false);
    toast.success('Pneu selecionado');
  };

  const handleClear = () => {
    setBarcode('');
    setSelectedTire(null);
    setPilot('');
    setTeam('');
    setNotes('');
    setSearchResults([]);
    setShowSearchResults(false);
    barcodeInputRef.current?.focus();
  };

  // Filtros para histórico
  const uniquePilots = Array.from(new Set(consumptionRecords.map((r) => r.pilot).filter(Boolean)));
  const uniqueTeams = Array.from(new Set(consumptionRecords.map((r) => r.team).filter(Boolean)));

  const filteredRecords = consumptionRecords.filter((record) => {
    const matchesPilot = filterPilot === 'all' || record.pilot === filterPilot;
    const matchesTeam = filterTeam === 'all' || record.team === filterTeam;
    const matchesType = filterType === 'all' || record.modelType === filterType;
    const matchesSearch =
      searchTerm === '' ||
      record.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.pilot?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.team?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesPilot && matchesTeam && matchesType && matchesSearch;
  });

  const exportToCSV = () => {
    const headers = ['Data/Hora', 'Código de Barras', 'Modelo', 'Tipo', 'Piloto', 'Etapa', 'Container', 'Registrado Por', 'Observações'];
    const rows = filteredRecords.map(record => [
      new Date(record.timestamp).toLocaleString('pt-BR'),
      record.barcode,
      record.modelName,
      record.modelType,
      record.pilot || '-',
      record.team || '-',
      record.containerName,
      record.registeredBy,
      record.notes || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `consumo-pneus-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-xl flex items-center justify-center shadow-lg">
            <UserCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-gray-900">Transferir Pneu para Piloto</h1>
            <p className="text-gray-500">Registre a transferência de pneus para os pilotos</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="individual">Registro Individual</TabsTrigger>
          <TabsTrigger value="batch">Registro em Lote</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Registro Individual */}
        <TabsContent value="individual" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-6">
              {/* Busca por Código de Barras */}
              <div className="space-y-4">
                <Label htmlFor="barcode">Código de Barras do Pneu</Label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <Input
                    id="barcode"
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Digite ou escaneie o código de barras"
                    value={barcode}
                    onChange={(e) => handleBarcodeChange(e.target.value)}
                    onFocus={() => {
                      if (isMobile && barcode.length === 0) {
                        setTimeout(() => {
                          setShowScanner(true);
                        }, 300);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchTire();
                      }
                    }}
                    className={`!pl-12 ${isMobile ? 'pr-16' : 'pr-10'}`}
                    style={{ paddingLeft: '3rem' }}
                    autoFocus={!isMobile}
                  />
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D50000] hover:text-[#A80000] transition-colors p-1"
                      aria-label="Abrir câmera"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  )}
                  {barcode && (
                    <button
                      onClick={handleClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}

                  {/* Resultados da busca */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {searchResults.map((tire) => (
                        <button
                          key={tire.barcode}
                          onClick={() => handleSelectFromSearch(tire)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-gray-900">{tire.barcode}</div>
                              <div className="text-sm text-gray-500">{tire.modelName}</div>
                            </div>
                            <Badge variant={tire.modelType === 'Slick' ? 'default' : 'secondary'}>
                              {tire.modelType}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Digite pelo menos 3 caracteres ou escaneie o código completo (8 dígitos)
                </p>
              </div>

              {/* Informações do Pneu Selecionado */}
              {selectedTire && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <h3 className="text-green-900">Pneu Encontrado</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-green-700">Código:</span>
                          <span className="ml-2 text-green-900">{selectedTire.barcode}</span>
                        </div>
                        <div>
                          <span className="text-green-700">Modelo:</span>
                          <span className="ml-2 text-green-900">{selectedTire.modelName}</span>
                        </div>
                        <div>
                          <span className="text-green-700">Tipo:</span>
                          <Badge variant={selectedTire.modelType === 'Slick' ? 'default' : 'secondary'} className="ml-2">
                            {selectedTire.modelType}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-green-700">Container:</span>
                          <span className="ml-2 text-green-900">{selectedTire.containerName}</span>
                        </div>
                        <div>
                          <span className="text-green-700">Status:</span>
                          <Badge variant="outline" className="ml-2 border-blue-500 text-blue-700">
                            {selectedTire.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Informações do Piloto/Etapa (Opcional) */}
              {selectedTire && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pilot">Piloto (Opcional)</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="pilot"
                          type="text"
                          placeholder="Nome do piloto"
                          value={pilot}
                          onChange={(e) => setPilot(e.target.value)}
                          className="pl-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="team">Etapa (Opcional)</Label>
                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="team"
                          type="text"
                          placeholder="Ex: Classificação, Corrida 1, Corrida 2"
                          value={team}
                          onChange={(e) => setTeam(e.target.value)}
                          className="pl-11"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações (Opcional)</Label>
                    <textarea
                      id="notes"
                      placeholder="Observações sobre o uso do pneu"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full min-h-[80px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D50000]"
                    />
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={!selectedTire}
                  className="flex-1 bg-gradient-to-r from-[#D50000] to-[#A80000] hover:from-[#A80000] hover:to-[#8B0000]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Transferir para Piloto
                </Button>
                <Button onClick={handleClear} variant="outline">
                  Limpar
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Registro em Lote */}
        <TabsContent value="batch" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bulk-barcodes">Códigos de Barras</Label>
                <textarea
                  id="bulk-barcodes"
                  placeholder="Digite ou cole os códigos de barras (um por linha ou separados por vírgula)"
                  value={bulkBarcodes}
                  onChange={(e) => handleBulkBarcodeChange(e.target.value)}
                  className="w-full min-h-[120px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D50000] font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  Pneus encontrados: {selectedTires.length}
                </p>
              </div>

              {/* Preview dos pneus selecionados */}
              {selectedTires.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-blue-900 mb-3">Pneus Encontrados ({selectedTires.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTires.map((tire) => (
                      <div key={tire.barcode} className="bg-white rounded p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-900">{tire.barcode}</div>
                          <div className="text-xs text-gray-500">{tire.modelName}</div>
                        </div>
                        <Badge variant={tire.modelType === 'Slick' ? 'default' : 'secondary'}>
                          {tire.modelType}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informações Comuns */}
              {selectedTires.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-pilot">Piloto (Opcional)</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="bulk-pilot"
                          type="text"
                          placeholder="Nome do piloto"
                          value={bulkPilot}
                          onChange={(e) => setBulkPilot(e.target.value)}
                          className="pl-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bulk-team">Etapa (Opcional)</Label>
                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="bulk-team"
                          type="text"
                          placeholder="Ex: Classificação, Corrida 1, Corrida 2"
                          value={bulkTeam}
                          onChange={(e) => setBulkTeam(e.target.value)}
                          className="pl-11"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulk-notes">Observações (Opcional)</Label>
                    <textarea
                      id="bulk-notes"
                      placeholder="Observações sobre o uso dos pneus"
                      value={bulkNotes}
                      onChange={(e) => setBulkNotes(e.target.value)}
                      className="w-full min-h-[80px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D50000]"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={() => setShowBulkConfirm(true)}
                disabled={selectedTires.length === 0}
                className="w-full bg-gradient-to-r from-[#D50000] to-[#A80000] hover:from-[#A80000] hover:to-[#8B0000]"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Ativar {selectedTires.length} Pneu(s)
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="history" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Código, modelo, piloto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-pilot">Piloto</Label>
                  <Select value={filterPilot} onValueChange={setFilterPilot}>
                    <SelectTrigger id="filter-pilot">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {uniquePilots.map((pilot) => (
                        <SelectItem key={pilot} value={pilot!}>
                          {pilot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-team">Etapa</Label>
                  <Select value={filterTeam} onValueChange={setFilterTeam}>
                    <SelectTrigger id="filter-team">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {uniqueTeams.map((team) => (
                        <SelectItem key={team} value={team!}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-type">Tipo</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger id="filter-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Slick">Slick</SelectItem>
                      <SelectItem value="Wet">Wet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-700">Total de Transferências</div>
                  <div className="text-2xl text-blue-900 mt-1">{filteredRecords.length}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-700">Pneus Slick</div>
                  <div className="text-2xl text-green-900 mt-1">
                    {filteredRecords.filter((r) => r.modelType === 'Slick').length}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-sm text-purple-700">Pneus Wet</div>
                  <div className="text-2xl text-purple-900 mt-1">
                    {filteredRecords.filter((r) => r.modelType === 'Wet').length}
                  </div>
                </div>
              </div>

              {/* Botão Exportar */}
              <div className="flex justify-end">
                <Button onClick={exportToCSV} variant="outline" disabled={filteredRecords.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>

              {/* Tabela de Histórico */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider">
                          Data/Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider">
                          Modelo
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider">
                          Piloto
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider">
                          Etapa
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider">
                          Registrado Por
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            Nenhum registro encontrado
                          </td>
                        </tr>
                      ) : (
                        filteredRecords
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {new Date(record.timestamp).toLocaleString('pt-BR')}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-mono">{record.barcode}</td>
                              <td className="px-4 py-3 text-sm">
                                <div>{record.modelName}</div>
                                <Badge variant={record.modelType === 'Slick' ? 'default' : 'secondary'} className="mt-1">
                                  {record.modelType}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{record.pilot || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{record.team || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{record.registeredBy}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Confirmação - Individual */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Transferência</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a transferir o pneu <strong>{selectedTire?.barcode}</strong> para um piloto.
              <br />
              <br />
              Esta ação irá alterar o status do pneu de <strong>Novo</strong> para <strong>Piloto</strong>.
              {pilot && (
                <>
                  <br />
                  Piloto: <strong>{pilot}</strong>
                </>
              )}
              {team && (
                <>
                  <br />
                  Etapa: <strong>{team}</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmConsumption}
              className="bg-gradient-to-r from-[#D50000] to-[#A80000] hover:from-[#A80000] hover:to-[#8B0000]"
            >
              Confirmar Transferência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação - Em Lote */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Transferência em Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a transferir <strong>{selectedTires.length} pneu(s)</strong> para pilotos.
              <br />
              <br />
              Esta ação irá alterar o status de todos os pneus selecionados de <strong>Novo</strong> para{' '}
              <strong>Piloto</strong>.
              {bulkPilot && (
                <>
                  <br />
                  Piloto: <strong>{bulkPilot}</strong>
                </>
              )}
              {bulkTeam && (
                <>
                  <br />
                  Etapa: <strong>{bulkTeam}</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkConsumption}
              className="bg-gradient-to-r from-[#D50000] to-[#A80000] hover:from-[#A80000] hover:to-[#8B0000]"
            >
              Confirmar Transferência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scanner de Código de Barras */}
      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleScanComplete}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
}
