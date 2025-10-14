import { useState, useEffect } from 'react';
import { Trash2, Search, Filter, Package, Calendar, Barcode, Tag, Truck, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, ChevronsUpDown, Edit } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { toast } from 'sonner';
// import { ActionButton } from './ActionFeedback';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { getStockEntries, deleteStockEntry, getTireModels, getContainers, checkBarcodeExists, setStockEntries } from '../utils/storage';

interface TireEntry {
  id: string;
  barcode: string;
  modelId: string;
  modelName: string;
  modelType: 'Slick' | 'Wet';
  containerId: string;
  containerName: string;
  timestamp: string;
  status?: 'Novo' | 'Ativo' | 'Descarte' | 'Piloto';
  sessionId?: string;
}

function saveTireEntries(entries: TireEntry[]): void {
  setStockEntries(entries);
  // Dispara evento para sincronizar com outros módulos
  window.dispatchEvent(new Event('stock-entries-updated'));
}

type SortField = 'barcode' | 'model' | 'type' | 'container' | 'status' | 'date';
type SortDirection = 'asc' | 'desc' | null;

export function StockAdjustment() {
  const [entries, setEntries] = useState<TireEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TireEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterContainer, setFilterContainer] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TireEntry | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  // const [isRefreshing, setIsRefreshing] = useState(false);
  // const [isDeleting, setIsDeleting] = useState(false);
  // const [isSaving, setIsSaving] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TireEntry | null>(null);
  const [editFormData, setEditFormData] = useState({
    barcode: '',
    modelId: '',
    containerId: '',
    timestamp: '',
    status: 'Novo' as 'Novo' | 'Ativo' | 'Descarte' | 'Piloto',
  });
  const [tireModels, setTireModels] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);

  useEffect(() => {
    loadEntries();
    loadTireModels();
    loadContainers();
    
    // Escuta atualizações de outros módulos
    const handleUpdate = () => {
      loadEntries();
    };
    
    window.addEventListener('stock-entries-updated', handleUpdate);
    return () => window.removeEventListener('stock-entries-updated', handleUpdate);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, searchTerm, filterType, filterContainer, filterStatus, sortField, sortDirection]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterContainer, filterStatus, itemsPerPage]);

  const loadEntries = () => {
    setIsLoading(true);
    try {
      // StockAdjustment mostra TODOS os pneus incluindo descartados para gestão completa
      const allEntries = getStockEntries(true);
      setEntries(allEntries);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados', {
        description: 'Não foi possível carregar os dados do estoque.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTireModels = () => {
    const models = getTireModels();
    setTireModels(models);
  };

  const loadContainers = () => {
    const containersList = getContainers();
    setContainers(containersList);
  };

  // const handleRefresh = () => {
  //   // setIsRefreshing(true);
  //   loadEntries();
  //   // setIsRefreshing(false);
  //   toast.success('Dados atualizados', {
  //     description: `${entries.length} pneus carregados.`,
  //   });
  // };

  const applyFilters = () => {
    let filtered = [...entries];

    // Filtro de busca (código de barras ou modelo)
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.containerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(entry => entry.modelType === filterType);
    }

    // Filtro de contêiner
    if (filterContainer !== 'all') {
      filtered = filtered.filter(entry => entry.containerId === filterContainer);
    }

    // Filtro de status
    if (filterStatus !== 'all') {
      if (filterStatus === 'new') {
        filtered = filtered.filter(entry => entry.status === 'Novo');
      } else if (filterStatus === 'active') {
        filtered = filtered.filter(entry => entry.status === 'Ativo');
      } else if (filterStatus === 'discarded') {
        filtered = filtered.filter(entry => entry.status === 'Descarte');
      } else if (filterStatus === 'pilot') {
        filtered = filtered.filter(entry => entry.status === 'Piloto');
      }
    }

    // Ordenação
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let compareA: any;
        let compareB: any;

        switch (sortField) {
          case 'barcode':
            compareA = a.barcode;
            compareB = b.barcode;
            break;
          case 'model':
            compareA = a.modelName;
            compareB = b.modelName;
            break;
          case 'type':
            compareA = a.modelType;
            compareB = b.modelType;
            break;
          case 'container':
            compareA = a.containerName;
            compareB = b.containerName;
            break;
          case 'status':
            compareA = a.status || 'Novo';
            compareB = b.status || 'Novo';
            break;
          case 'date':
            compareA = new Date(a.timestamp).getTime();
            compareB = new Date(b.timestamp).getTime();
            break;
          default:
            return 0;
        }

        if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
        if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredEntries(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Ciclo: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown size={14} className="text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp size={14} className="text-[#D50000]" />;
    }
    return <ChevronDown size={14} className="text-[#D50000]" />;
  };

  const handleDeleteClick = (entry: TireEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (entry: TireEntry) => {
    setEntryToEdit(entry);
    setEditFormData({
      barcode: entry.barcode,
      modelId: entry.modelId,
      containerId: entry.containerId,
      timestamp: entry.timestamp,
      status: entry.status || 'Novo',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!entryToEdit) return;

    // Validação
    if (!editFormData.barcode || editFormData.barcode.length !== 8) {
      toast.error('❌ Código inválido', {
        description: 'O código de barras deve ter exatamente 8 dígitos.',
        duration: 4000,
      });
      return;
    }

    if (!/^\d{8}$/.test(editFormData.barcode)) {
      toast.error('❌ Código inválido', {
        description: 'O código de barras deve conter apenas números.',
        duration: 4000,
      });
      return;
    }

    // Verifica se o código já existe (exceto o próprio)
    if (editFormData.barcode !== entryToEdit.barcode) {
      if (checkBarcodeExists(editFormData.barcode)) {
        toast.error('⚠️ Código duplicado', {
          description: 'Este código de barras já está cadastrado.',
          duration: 4000,
        });
        return;
      }
    }

    if (!editFormData.modelId || !editFormData.containerId) {
      toast.error('❌ Campos obrigatórios', {
        description: 'Selecione o modelo e o contêiner.',
        duration: 4000,
      });
      return;
    }

    // Busca dados do modelo e contêiner
    const model = tireModels.find(m => m.id === editFormData.modelId);
    const container = containers.find(c => c.id === editFormData.containerId);

    if (!model || !container) {
      toast.error('❌ Erro ao salvar', {
        description: 'Modelo ou contêiner não encontrado.',
        duration: 4000,
      });
      return;
    }

    // setIsSaving(true);

    // Simula operação assíncrona
    await new Promise(resolve => setTimeout(resolve, 800));

    // Atualiza a entrada
    const updatedEntry: TireEntry = {
      ...entryToEdit,
      barcode: editFormData.barcode,
      modelId: model.id,
      modelName: model.name,
      modelType: model.type,
      containerId: container.id,
      containerName: container.name,
      timestamp: editFormData.timestamp,
      status: editFormData.status,
    };

    // Atualiza no array
    const updatedEntries = entries.map(e => e.id === entryToEdit.id ? updatedEntry : e);
    setEntries(updatedEntries);
    saveTireEntries(updatedEntries);

    toast.success('✅ Pneu atualizado', {
      description: `Código ${editFormData.barcode} atualizado com sucesso.`,
      duration: 3000,
    });

    // setIsSaving(false);
    setEditDialogOpen(false);
    setEntryToEdit(null);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;

    // setIsDeleting(true);

    // Simula operação assíncrona
    await new Promise(resolve => setTimeout(resolve, 800));

    // Deleta do localStorage
    deleteStockEntry(entryToDelete.id);

    // Remove da lista local
    const updatedEntries = entries.filter(e => e.id !== entryToDelete.id);
    setEntries(updatedEntries);
    saveTireEntries(updatedEntries);

    toast.success('🗑️ Pneu excluído', {
      description: `Código ${entryToDelete.barcode} removido do estoque.`,
      duration: 3000,
    });

    // setIsDeleting(false);
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  const handleBulkDelete = () => {
    if (selectedEntries.size === 0) {
      toast.error('Nenhum pneu selecionado', {
        description: 'Selecione os pneus que deseja excluir.',
      });
      return;
    }

    const count = selectedEntries.size;
    const idsToDelete = Array.from(selectedEntries);

    // Deleta do localStorage
    idsToDelete.forEach(id => deleteStockEntry(id));

    // Remove da lista local
    const updatedEntries = entries.filter(e => !selectedEntries.has(e.id));
    setEntries(updatedEntries);
    saveTireEntries(updatedEntries);
    setSelectedEntries(new Set());

    toast.success(`${count} ${count === 1 ? 'pneu excluído' : 'pneus excluídos'}`, {
      description: 'Itens removidos do estoque com sucesso.',
    });
  };

  const toggleSelectEntry = (id: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEntries(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map(e => e.id)));
    }
  };

  // Obter lista única de contêineres (filtra vazios)
  const uniqueContainers = Array.from(new Set(entries.map(e => ({ id: e.containerId, name: e.containerName }))))
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    .filter(c => c.id !== ''); // Remove contêineres vazios

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-[#D50000]" />
            </div>
            <div>
              <h1 className="text-gray-900">Ajuste de Estoque</h1>
              <p className="text-gray-500">Gerencie e remova pneus cadastrados (Área Restrita)</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Total de Pneus</p>
                <p className="text-gray-900">{entries.length}</p>
              </div>
              <Package className="text-gray-400" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Filtrados</p>
                <p className="text-gray-900">{filteredEntries.length}</p>
              </div>
              <Filter className="text-gray-400" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Selecionados</p>
                <p className="text-gray-900">{selectedEntries.size}</p>
              </div>
              <Trash2 className="text-gray-400" size={24} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-gray-500" />
            <h3 className="text-gray-700">Filtros e Busca</h3>
            {(searchTerm || filterType !== 'all' || filterContainer !== 'all' || filterStatus !== 'all' || sortField) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterContainer('all');
                  setFilterStatus('all');
                  setSortField(null);
                  setSortDirection(null);
                }}
                className="ml-auto text-xs text-gray-500 hover:text-[#D50000]"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Buscar por código, modelo ou contêiner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!pl-12"
                  style={{ paddingLeft: '3rem' }}
                />
              </div>
            </div>
            <div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Pneu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="Slick">Slick</SelectItem>
                  <SelectItem value="Wet">Wet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterContainer} onValueChange={setFilterContainer}>
                <SelectTrigger>
                  <SelectValue placeholder="Contêiner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Contêineres</SelectItem>
                  {uniqueContainers.map(container => (
                    <SelectItem key={container.id} value={container.id}>
                      {container.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="discarded">Descarte</SelectItem>
                  <SelectItem value="pilot">Piloto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {sortField && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Tag size={14} />
                <span>
                  Ordenando por <strong>{
                    sortField === 'barcode' ? 'Código' :
                    sortField === 'model' ? 'Modelo' :
                    sortField === 'type' ? 'Tipo' :
                    sortField === 'container' ? 'Contêiner' :
                    sortField === 'status' ? 'Status' : 'Data'
                  }</strong> ({sortDirection === 'asc' ? 'Crescente' : 'Decrescente'})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedEntries.size > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-[#D50000]" size={20} />
              <span className="text-gray-900">
                {selectedEntries.size} {selectedEntries.size === 1 ? 'pneu selecionado' : 'pneus selecionados'}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedEntries(new Set())}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 size={16} className="mr-2" />
                Excluir Selecionados
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'registro encontrado' : 'registros encontrados'}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Registros por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
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
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <RefreshCw size={48} className="mx-auto mb-4 text-gray-300 animate-spin" />
                <p className="text-gray-500">Carregando dados do banco...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Package size={48} className="mx-auto mb-4 opacity-30" />
                <p>
                  {entries.length === 0 
                    ? 'Nenhum pneu cadastrado no estoque' 
                    : 'Nenhum pneu encontrado com os filtros aplicados'
                  }
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-[#D50000] rounded border-gray-300 focus:ring-[#D50000]"
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('barcode')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Código de Barras</span>
                        {getSortIcon('barcode')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('model')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Modelo</span>
                        {getSortIcon('model')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Tipo</span>
                        {getSortIcon('type')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('container')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Contêiner</span>
                        {getSortIcon('container')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Status</span>
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Data de Entrada</span>
                        {getSortIcon('date')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((entry) => (
                    <tr 
                      key={entry.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedEntries.has(entry.id) ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={() => toggleSelectEntry(entry.id)}
                          className="w-4 h-4 text-[#D50000] rounded border-gray-300 focus:ring-[#D50000]"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Barcode size={16} className="text-gray-400" />
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {entry.barcode}
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Tag size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-900">{entry.modelName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={entry.modelType === 'Slick' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                          }
                        >
                          {entry.modelType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-900">{entry.containerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={
                            entry.status === 'Descarte' 
                              ? 'bg-red-100 text-red-700' 
                              : entry.status === 'Novo'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }
                        >
                          {entry.status || 'Novo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {new Date(entry.timestamp).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(entry)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
                            title="Editar pneu"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(entry)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                            title="Excluir pneu"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {filteredEntries.length > 0 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredEntries.length)} de {filteredEntries.length} registros
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
                  Página {currentPage} de {Math.ceil(filteredEntries.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredEntries.length / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(filteredEntries.length / itemsPerPage)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-gray-900 mb-1">Atenção: Área Restrita</p>
              <p className="text-xs text-gray-600">
                Esta funcionalidade é exclusiva para administradores. A exclusão de pneus é permanente 
                e afetará os relatórios e históricos do sistema. Use com cautela.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pneu do estoque?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pneu com código <strong>{entryToDelete?.barcode}</strong>?
              <br /><br />
              <strong>Modelo:</strong> {entryToDelete?.modelName}
              <br />
              <strong>Contêiner:</strong> {entryToDelete?.containerName}
              <br /><br />
              Esta ação não pode ser desfeita e o pneu será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Pneu</DialogTitle>
            <DialogDescription>
              Altere os dados do pneu cadastrado no estoque.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Código de Barras */}
            <div className="space-y-2">
              <Label htmlFor="edit-barcode">Código de Barras</Label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <Input
                  id="edit-barcode"
                  type="text"
                  maxLength={8}
                  value={editFormData.barcode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setEditFormData({ ...editFormData, barcode: value });
                  }}
                  placeholder="00000000"
                  className="pl-11 font-mono"
                />
              </div>
              <p className="text-xs text-gray-500">8 dígitos numéricos</p>
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label htmlFor="edit-model">Modelo do Pneu</Label>
              <Select 
                value={editFormData.modelId} 
                onValueChange={(value) => setEditFormData({ ...editFormData, modelId: value })}
              >
                <SelectTrigger id="edit-model">
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {tireModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={model.type === 'Slick' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                          }
                        >
                          {model.type}
                        </Badge>
                        <span>{model.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contêiner */}
            <div className="space-y-2">
              <Label htmlFor="edit-container">Contêiner</Label>
              <Select 
                value={editFormData.containerId} 
                onValueChange={(value) => setEditFormData({ ...editFormData, containerId: value })}
              >
                <SelectTrigger id="edit-container">
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

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status do Pneu</Label>
              <Select 
                value={editFormData.status} 
                onValueChange={(value: 'Novo' | 'Ativo' | 'Descarte' | 'Piloto') => setEditFormData({ ...editFormData, status: value })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Novo">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>Novo</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Ativo">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Ativo</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Descarte">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Descarte</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Piloto">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span>Piloto</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Piloto">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span>Piloto</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {editFormData.status === 'Novo' && '🔵 Pneu novo, ainda não utilizado'}
                {editFormData.status === 'Ativo' && '🟢 Pneu em uso ativo'}
                {editFormData.status === 'Descarte' && '🔴 Pneu marcado para descarte'}
                {editFormData.status === 'Piloto' && '🟠 Pneu em condição de piloto (em avaliação/teste)'}
              </p>
            </div>

            {/* Data/Hora */}
            <div className="space-y-2">
              <Label htmlFor="edit-timestamp">Data e Hora</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <Input
                  id="edit-timestamp"
                  type="datetime-local"
                  value={editFormData.timestamp ? new Date(editFormData.timestamp).toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    const isoString = new Date(e.target.value).toISOString();
                    setEditFormData({ ...editFormData, timestamp: isoString });
                  }}
                  className="pl-11"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEntryToEdit(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[#D50000] hover:bg-[#B00000] text-white"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
