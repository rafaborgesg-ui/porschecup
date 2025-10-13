import { useState, useEffect } from 'react';
import { BarChart3, Package, TrendingUp, Calendar, Search, Truck, Box } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts@2.15.2';
import { getStockEntries, getTireModels, getContainers, type StockEntry } from '../utils/storage';

interface StockSummary {
  model: string;
  container: string;
  quantity: number;
  lastEntry: string;
}

import { ResponsiveTable } from './ResponsiveTable';

// Cores para gráficos - DEFINIDO NO TOPO
const COLORS = ['#D50000', '#FF6B00', '#FFA500', '#FFD700', '#90EE90', '#4169E1', '#9370DB', '#FF69B4'];

export function Reports() {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState('all');
  const [filterContainer, setFilterContainer] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(200);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState('all');

  // Estados para filtros da aba Ocupação de Contêineres
  const [occupancySearchTerm, setOccupancySearchTerm] = useState('');
  const [occupancyFilterLocation, setOccupancyFilterLocation] = useState('all');
  const [occupancyFilterOccupancy, setOccupancyFilterOccupancy] = useState('all');
  const [occupancyFilterStatus, setOccupancyFilterStatus] = useState('all');

  // Carrega entradas do localStorage e escuta todas as atualizações
  useEffect(() => {
    loadEntries();

    // Dispara evento para onboarding checklist
    window.dispatchEvent(new Event('reports-viewed'));

    // Escuta atualizações de estoque, modelos e contêineres
    const handleUpdate = () => {
      loadEntries();
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

  const loadEntries = () => {
    // Carrega TODOS os registros incluindo descartados para o histórico completo
    const stockEntries = getStockEntries(true);
    setEntries(stockEntries);
    console.log(`[Reports] Carregados ${stockEntries.length} registros (incluindo descartados)`);
  };

  // Filtra entradas por status antes de agrupar
  const filteredEntriesByStatus = filterStatus === 'all' 
    ? entries 
    : entries.filter(entry => entry.status === filterStatus);

  // Agrupa entradas por modelo e contêiner
  const stockSummary: StockSummary[] = filteredEntriesByStatus.reduce((acc: StockSummary[], entry) => {
    const key = `${entry.modelName}-${entry.containerName}`;
    const existing = acc.find(item => 
      item.model === entry.modelName && item.container === entry.containerName
    );

    if (existing) {
      existing.quantity += 1;
      if (new Date(entry.timestamp) > new Date(existing.lastEntry)) {
        existing.lastEntry = entry.timestamp;
      }
    } else {
      acc.push({
        model: entry.modelName,
        container: entry.containerName,
        quantity: 1,
        lastEntry: entry.timestamp,
      });
    }

    return acc;
  }, []);

  // Ordena do maior para o menor
  const sortedSummary = [...stockSummary].sort((a, b) => b.quantity - a.quantity);

  // Filtra dados
  const filteredSummary = sortedSummary.filter(item => {
    const matchesSearch = item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.container.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModel = filterModel === 'all' || item.model === filterModel;
    const matchesContainer = filterContainer === 'all' || item.container === filterContainer;
    
    return matchesSearch && matchesModel && matchesContainer;
  });

  // Paginação
  const totalPages = Math.ceil(filteredSummary.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredSummary.slice(startIndex, endIndex);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterModel, filterContainer, filterStatus, itemsPerPage]);

  // Reset página de histórico quando itens por página ou filtros mudam
  useEffect(() => {
    setHistoryPage(1);
    console.log(`[Reports] Paginação alterada para: ${historyItemsPerPage} itens por página`);
  }, [historyItemsPerPage, historySearchTerm, historyFilterStatus]);

  // Prepara dados para o gráfico - agrupa por modelo (soma todos os containers)
  const modelSummary = filteredEntriesByStatus.reduce((acc: { [key: string]: number }, entry) => {
    if (!acc[entry.modelName]) {
      acc[entry.modelName] = 0;
    }
    acc[entry.modelName] += 1;
    return acc;
  }, {});

  const chartData = Object.entries(modelSummary)
    .map(([name, quantidade]) => ({ name, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
  
  // Debug log para verificar dados
  console.log('[Reports] chartData:', chartData);

  // Estatísticas gerais (usa entradas filtradas por status)
  const totalTires = filteredEntriesByStatus.length;
  const totalModels = new Set(filteredEntriesByStatus.map(e => e.modelName)).size;
  const totalContainers = new Set(filteredEntriesByStatus.map(e => e.containerName)).size;

  // Modelos únicos para filtro (remove vazios)
  const uniqueModels = Array.from(new Set(entries.map(e => e.modelName)))
    .filter(m => m && m.trim() !== '')
    .sort();
  const uniqueContainers = Array.from(new Set(entries.map(e => e.containerName)))
    .filter(c => c && c.trim() !== '' && c !== 'Sem Contêiner')
    .sort();

  // Busca o tipo do modelo a partir dos modelos cadastrados
  const tireModels = getTireModels();
  const getModelType = (modelName: string): string => {
    const model = tireModels.find(m => m.name === modelName);
    return model?.type || 'Slick';
  };

  // Agrupa pneus por container para visualização
  const containerGroups = uniqueContainers.map(containerName => {
    const containerEntries = entries.filter(e => e.containerName === containerName);
    const modelBreakdown = containerEntries.reduce((acc: any[], entry) => {
      const existing = acc.find(item => item.model === entry.modelName);
      if (existing) {
        existing.quantity += 1;
      } else {
        acc.push({
          model: entry.modelName,
          type: entry.modelType || getModelType(entry.modelName),
          quantity: 1,
        });
      }
      return acc;
    }, []);

    return {
      containerName,
      totalPneus: containerEntries.length,
      models: modelBreakdown.sort((a, b) => b.quantity - a.quantity),
      lastEntry: containerEntries.length > 0 
        ? new Date(Math.max(...containerEntries.map(e => new Date(e.timestamp).getTime())))
        : null,
      entries: containerEntries,
    };
  }).sort((a, b) => b.totalPneus - a.totalPneus);

  return (
    <div className="flex-1 px-2 py-2 sm:p-4 lg:p-8 w-full max-w-full">
      <div className="max-w-7xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Relatórios & Histórico</h1>
          <p className="text-gray-500">Visualize e analise o estoque de pneus</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total de Pneus</p>
                <p className="text-gray-900">{totalTires}</p>
              </div>
              <div className="w-12 h-12 bg-[#D50000]/10 rounded-lg flex items-center justify-center">
                <Package className="text-[#D50000]" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Modelos Ativos</p>
                <p className="text-gray-900">{totalModels}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Contêineres em Uso</p>
                <p className="text-gray-900">{totalContainers}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-green-600" size={24} />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="space-y-4 sm:space-y-6 w-full">
          <Card className="bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
            {/* Tabs com scroll horizontal em mobile */}
            <div className="w-full overflow-hidden rounded-xl">
              <TabsList className="grid grid-cols-4 w-full p-1.5 sm:p-2 bg-gray-100 gap-1 min-h-[36px]">
                <TabsTrigger 
                  value="summary" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all"
                >
                  <span className="hidden sm:inline">Visão Geral</span>
                  <span className="sm:hidden">Visão</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="by-container" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all"
                >
                  <span className="hidden sm:inline">Por Contêiner</span>
                  <span className="sm:hidden">Contêiner</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="container-occupancy" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all"
                >
                  <span className="hidden sm:inline">Ocupação Contêiner</span>
                  <span className="sm:hidden">Ocupação</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all"
                >
                  Histórico
                </TabsTrigger>
              </TabsList>
            </div>
          </Card>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-8 w-full">
            {/* Chart */}
            {chartData.length > 0 ? (
              <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint', willChange: 'auto' }}>
                <h3 className="text-gray-900 mb-6">
                  {chartData.length === 1 ? 'Modelo por Quantidade' : `${chartData.length} Modelos por Quantidade`}
                </h3>
                <div className="w-full overflow-hidden touch-pan-y" style={{ height: '500px', contain: 'strict', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={chartData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                      barSize={60}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#666', fontSize: 13 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis 
                        tick={{ fill: '#666', fontSize: 13 }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        cursor={{ fill: 'rgba(213, 0, 0, 0.1)' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                      />
                      <Bar 
                        dataKey="quantidade" 
                        name="Quantidade de Pneus" 
                        fill="#D50000" 
                        radius={[8, 8, 0, 0]}
                        animationDuration={800}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ) : (
              <Card className="p-6 bg-white border border-gray-200 shadow-sm">
                <p className="text-gray-500 text-center">Nenhum dado disponível para o gráfico</p>
              </Card>
            )}

            {/* Filters */}
            <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <Input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="!pl-[2.75rem]"
                    style={{ paddingLeft: '2.75rem' }}
                  />
                </div>

                <Select value={filterModel} onValueChange={setFilterModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os modelos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os modelos</SelectItem>
                    {uniqueModels.map(model => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterContainer} onValueChange={setFilterContainer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os contêineres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os contêineres</SelectItem>
                    {uniqueContainers.map(container => (
                      <SelectItem key={container} value={container}>{container}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="Novo">Novo</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Descarte">Descarte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Stock Table */}
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden" style={{ contain: 'layout style paint' }}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-gray-900">Estoque Consolidado</h3>
                <p className="text-gray-500 text-sm">Pneus agrupados por modelo e contêiner</p>
              </div>

              <div className="overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hide-scrollbar touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                {filteredSummary.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Package size={48} className="mx-auto mb-4 opacity-30" />
                    <p>
                      {entries.length === 0 
                        ? 'Nenhum pneu registrado ainda' 
                        : 'Nenhum resultado encontrado'}
                    </p>
                    {entries.length === 0 && (
                      <p className="text-sm mt-2">
                        Comece registrando pneus no módulo "Entrada de Estoque"
                      </p>
                    )}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Modelo
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Contêiner
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Quantidade
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Última Entrada
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSummary.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{item.model}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{item.container}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant="secondary" 
                              className="bg-[#D50000] text-white hover:bg-[#B00000]"
                            >
                              {item.quantity}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(item.lastEntry).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {filteredSummary.length > 0 && (
                <div className="p-6 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-600">
                      {filteredSummary.length} {filteredSummary.length === 1 ? 'registro' : 'registros'}
                    </span>
                    <span className="text-sm text-gray-600">
                      Total: {filteredSummary.reduce((sum, item) => sum + item.quantity, 0)} pneus
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                    <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                      Mostrando {startIndex + 1} a {Math.min(endIndex, filteredSummary.length)} de {filteredSummary.length} registros
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-2 sm:px-3 py-1.5 sm:py-1 border border-gray-300 rounded-md text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors whitespace-nowrap flex-shrink-0"
                      >
                        Anterior
                      </button>
                      <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 sm:px-3 py-1.5 sm:py-1 border border-gray-300 rounded-md text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors whitespace-nowrap flex-shrink-0"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* By Container Tab */}
          <TabsContent value="by-container" className="space-y-6 w-full">
            {containerGroups.length === 0 ? (
              <Card className="p-12 text-center text-gray-400">
                <Truck size={48} className="mx-auto mb-4 opacity-30" />
                <p>Nenhum contêiner com pneus registrados</p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {containerGroups.map((container, idx) => (
                  <Card key={container.containerName} className="bg-white border border-gray-200 shadow-sm overflow-hidden" style={{ contain: 'layout style paint' }}>
                    <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-[#D50000]/10 rounded-xl flex items-center justify-center">
                            <Truck size={28} className="text-[#D50000]" />
                          </div>
                          <div>
                            <h3 className="text-gray-900">{container.containerName}</h3>
                            <p className="text-gray-500 text-sm">
                              {container.totalPneus} {container.totalPneus === 1 ? 'pneu' : 'pneus'} • {container.models.length} {container.models.length === 1 ? 'modelo' : 'modelos'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant="secondary" 
                            className="bg-[#D50000] text-white"
                          >
                            {container.totalPneus}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 p-6">
                      {/* Chart */}
                      <div>
                        <h4 className="text-gray-900 mb-4">Distribuição por Modelo</h4>
                        <div className="w-full overflow-hidden touch-pan-y" style={{ height: '300px', contain: 'strict', position: 'relative' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={container.models}
                                dataKey="quantity"
                                nameKey="model"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                innerRadius={40}
                                label={(entry) => `${entry.quantity}`}
                                labelLine={true}
                                animationDuration={800}
                              >
                                {container.models.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e5e5e5',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Models Table */}
                      <div>
                        <h4 className="text-gray-900 mb-4">Detalhamento</h4>
                        <div className="space-y-3">
                          {container.models.map((model, modelIdx) => (
                            <div 
                              key={modelIdx}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: COLORS[modelIdx % COLORS.length] }}
                                />
                                <div>
                                  <p className="text-sm text-gray-900">{model.model}</p>
                                  <Badge
                                    variant="secondary"
                                    className={`text-xs ${model.type === 'Slick' 
                                      ? 'bg-orange-100 text-orange-700' 
                                      : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {model.type}
                                  </Badge>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-gray-200 text-gray-900">
                                {model.quantity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                        {container.lastEntry && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              Última entrada: {container.lastEntry.toLocaleString('pt-BR')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Container Occupancy Tab */}
          <TabsContent value="container-occupancy" className="space-y-6 w-full">
            {/* Filtros */}
            <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <Input
                    type="text"
                    placeholder="Buscar container..."
                    value={occupancySearchTerm}
                    onChange={(e) => setOccupancySearchTerm(e.target.value)}
                    className="!pl-12"
                    style={{ paddingLeft: '3rem' }}
                  />
                </div>

                <Select value={occupancyFilterLocation} onValueChange={setOccupancyFilterLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as localizações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as localizações</SelectItem>
                    {Array.from(new Set(getContainers().map(c => c.location))).map(location => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={occupancyFilterOccupancy} onValueChange={setOccupancyFilterOccupancy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Taxa de ocupação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as taxas</SelectItem>
                    <SelectItem value="low">Baixa (&lt; 50%)</SelectItem>
                    <SelectItem value="medium">Média (50-80%)</SelectItem>
                    <SelectItem value="high">Alta (80-100%)</SelectItem>
                    <SelectItem value="full">Lotado (100%)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={occupancyFilterStatus} onValueChange={setOccupancyFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status dos pneus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="has-novo">Com pneus Novos</SelectItem>
                    <SelectItem value="has-ativo">Com pneus Ativos</SelectItem>
                    <SelectItem value="has-descarte">Com pneus Descarte</SelectItem>
                    <SelectItem value="empty">Vazios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-gray-900">Ocupação dos Contêineres</h3>
                <p className="text-gray-500 text-sm">Status de capacidade e utilização</p>
              </div>

              <div className="overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                {(() => {
                  const allContainers = getContainers();
                  
                  // Aplica filtros
                  const filteredContainers = allContainers.filter(container => {
                    // Filtro de busca
                    const matchesSearch = occupancySearchTerm === '' ||
                      container.name.toLowerCase().includes(occupancySearchTerm.toLowerCase()) ||
                      container.location.toLowerCase().includes(occupancySearchTerm.toLowerCase());
                    
                    // Filtro de localização
                    const matchesLocation = occupancyFilterLocation === 'all' || 
                      container.location === occupancyFilterLocation;
                    
                    // Filtro de taxa de ocupação
                    const occupancyRate = container.capacity > 0 
                      ? (container.current / container.capacity) * 100 
                      : 0;
                    
                    let matchesOccupancy = true;
                    if (occupancyFilterOccupancy === 'low') {
                      matchesOccupancy = occupancyRate < 50;
                    } else if (occupancyFilterOccupancy === 'medium') {
                      matchesOccupancy = occupancyRate >= 50 && occupancyRate < 80;
                    } else if (occupancyFilterOccupancy === 'high') {
                      matchesOccupancy = occupancyRate >= 80 && occupancyRate < 100;
                    } else if (occupancyFilterOccupancy === 'full') {
                      matchesOccupancy = occupancyRate >= 100;
                    }
                    
                    // Filtro de status dos pneus
                    const tiresInContainer = entries.filter(e => e.containerId === container.id);
                    const hasNovo = tiresInContainer.some(e => e.status === 'Novo');
                    const hasAtivo = tiresInContainer.some(e => e.status === 'Ativo');
                    const hasDescarte = tiresInContainer.some(e => e.status === 'Descarte');
                    const isEmpty = tiresInContainer.length === 0;
                    
                    let matchesStatus = true;
                    if (occupancyFilterStatus === 'has-novo') {
                      matchesStatus = hasNovo;
                    } else if (occupancyFilterStatus === 'has-ativo') {
                      matchesStatus = hasAtivo;
                    } else if (occupancyFilterStatus === 'has-descarte') {
                      matchesStatus = hasDescarte;
                    } else if (occupancyFilterStatus === 'empty') {
                      matchesStatus = isEmpty;
                    }
                    
                    return matchesSearch && matchesLocation && matchesOccupancy && matchesStatus;
                  });

                  const containers = filteredContainers;
                  const totalQuantity = containers.reduce((sum, c) => sum + c.current, 0);
                  const totalCapacity = containers.reduce((sum, c) => sum + c.capacity, 0);
                  const globalRate = totalCapacity > 0 ? (totalQuantity / totalCapacity) * 100 : 0;

                  return (
                    <>
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                              Contêiner
                            </th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                              Localização
                            </th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wider">
                              Quantidade
                            </th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wider">
                              Capacidade
                            </th>
                            <th className="px-6 py-3 text-center text-xs text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wider">
                              Ocupação
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {containers.map((container) => {
                            const occupancyRate = container.capacity > 0 
                              ? (container.current / container.capacity) * 100 
                              : 0;
                            
                            // Busca pneus neste container e conta por status
                            const tiresInContainer = entries.filter(e => e.containerId === container.id);
                            const statusCounts = {
                              Novo: tiresInContainer.filter(e => e.status === 'Novo').length,
                              Ativo: tiresInContainer.filter(e => e.status === 'Ativo').length,
                              Descarte: tiresInContainer.filter(e => e.status === 'Descarte').length,
                            };
                            
                            return (
                              <tr key={container.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">{container.name}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-600">{container.location}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <span className="text-sm text-gray-900">{container.current}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <span className="text-sm text-gray-900">{container.capacity}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5" title={`Novo: ${statusCounts.Novo} | Ativo: ${statusCounts.Ativo} | Descarte: ${statusCounts.Descarte}`}>
                                    {statusCounts.Novo > 0 && (
                                      <div className="group relative">
                                        <div className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-600 shadow-sm" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                          {statusCounts.Novo} Novo{statusCounts.Novo !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    )}
                                    {statusCounts.Ativo > 0 && (
                                      <div className="group relative">
                                        <div className="w-3 h-3 rounded-sm bg-green-500 border border-green-600 shadow-sm" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                          {statusCounts.Ativo} Ativo{statusCounts.Ativo !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    )}
                                    {statusCounts.Descarte > 0 && (
                                      <div className="group relative">
                                        <div className="w-3 h-3 rounded-sm bg-red-500 border border-red-600 shadow-sm" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                          {statusCounts.Descarte} Descarte{statusCounts.Descarte !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    )}
                                    {tiresInContainer.length === 0 && (
                                      <span className="text-xs text-gray-400">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <div className="flex items-center justify-end gap-3">
                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all ${
                                          occupancyRate >= 90 ? 'bg-red-500' :
                                          occupancyRate >= 70 ? 'bg-yellow-500' :
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                                      />
                                    </div>
                                    <Badge 
                                      variant="secondary"
                                      className={`min-w-[60px] justify-center ${
                                        occupancyRate >= 90 ? 'bg-red-100 text-red-700' :
                                        occupancyRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                      }`}
                                    >
                                      {occupancyRate.toFixed(1)}%
                                    </Badge>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Informações e Legenda */}
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-600">
                            {containers.length === 0 ? (
                              'Nenhum container encontrado'
                            ) : (
                              `Mostrando ${containers.length} ${containers.length === 1 ? 'container' : 'containers'}`
                            )}
                          </span>
                          {occupancySearchTerm || occupancyFilterLocation !== 'all' || 
                           occupancyFilterOccupancy !== 'all' || occupancyFilterStatus !== 'all' ? (
                            <button
                              onClick={() => {
                                setOccupancySearchTerm('');
                                setOccupancyFilterLocation('all');
                                setOccupancyFilterOccupancy('all');
                                setOccupancyFilterStatus('all');
                              }}
                              className="text-sm text-[#D50000] hover:text-[#A80000] transition-colors"
                            >
                              Limpar filtros
                            </button>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-center gap-6 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-600 shadow-sm" />
                            <span className="text-gray-600">Novo</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-green-500 border border-green-600 shadow-sm" />
                            <span className="text-gray-600">Ativo</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-red-500 border border-red-600 shadow-sm" />
                            <span className="text-gray-600">Descarte</span>
                          </div>
                        </div>
                      </div>

                      {/* Taxa Global (apenas se não houver filtros ativos) */}
                      {containers.length > 0 && (
                        <div className="p-6 border-t-2 border-gray-300 bg-gradient-to-r from-gray-50 to-white">
                          <div className="max-w-2xl mx-auto">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-gray-900">
                                {occupancySearchTerm || occupancyFilterLocation !== 'all' || 
                                 occupancyFilterOccupancy !== 'all' || occupancyFilterStatus !== 'all'
                                  ? 'Taxa de Ocupação (Filtrada)'
                                  : 'Taxa Global de Ocupação'}
                              </h4>
                              <Badge 
                                variant="secondary"
                                className={`text-lg px-4 py-2 ${
                                  globalRate >= 90 ? 'bg-red-100 text-red-700' :
                                  globalRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}
                              >
                                {globalRate.toFixed(1)}%
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    globalRate >= 90 ? 'bg-red-500' :
                                    globalRate >= 70 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(globalRate, 100)}%` }}
                                />
                              </div>
                              
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>Total: {totalQuantity} pneus</span>
                                <span>Capacidade: {totalCapacity} pneus</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="w-full">
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden" style={{ contain: 'layout style paint' }}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-gray-900">Histórico Completo</h3>
                <p className="text-gray-500 text-sm">Todas as entradas registradas no sistema</p>
              </div>
              <div className="p-12 text-center text-gray-400">
                <Calendar size={48} className="mx-auto mb-4 opacity-30" />
                <p>Em construção</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
