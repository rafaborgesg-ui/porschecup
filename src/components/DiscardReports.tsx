import { useState, useEffect } from 'react';
import { FileText, Calendar, Filter, Download, Trash2, Package, TrendingDown, BarChart3, Search, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getStockEntries, getContainers, getTireModels, type StockEntry } from '../utils/storage';
import { toast } from 'sonner@2.0.3';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function DiscardReports() {
  const [discardedTires, setDiscardedTires] = useState<StockEntry[]>([]);
  const [filteredTires, setFilteredTires] = useState<StockEntry[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [tireModels, setTireModels] = useState<any[]>([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [filterContainer, setFilterContainer] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [discardedTires, searchTerm, filterType, filterModel, filterContainer, dateFrom, dateTo]);

  const loadData = () => {
    // Carrega apenas pneus descartados
    const allEntries = getStockEntries(true); // true = incluindo descartados
    const discarded = allEntries.filter(entry => entry.status === 'Descarte');
    setDiscardedTires(discarded);
    
    setContainers(getContainers());
    setTireModels(getTireModels());
  };

  const applyFilters = () => {
    let filtered = [...discardedTires];

    // Busca por termo
    if (searchTerm) {
      filtered = filtered.filter(tire =>
        tire.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tire.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tire.containerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(tire => tire.modelType === filterType);
    }

    // Filtro por modelo
    if (filterModel !== 'all') {
      filtered = filtered.filter(tire => tire.modelId === filterModel);
    }

    // Filtro por contêiner
    if (filterContainer !== 'all') {
      filtered = filtered.filter(tire => tire.containerId === filterContainer);
    }

    // Filtro por data
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(tire => {
        const tireDate = new Date(tire.timestamp);
        return tireDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(tire => {
        const tireDate = new Date(tire.timestamp);
        return tireDate <= toDate;
      });
    }

    setFilteredTires(filtered);
    setCurrentPage(1);
  };

  // Estatísticas
  const totalDiscarded = discardedTires.length;
  const slickDiscarded = discardedTires.filter(t => t.modelType === 'Slick').length;
  const wetDiscarded = discardedTires.filter(t => t.modelType === 'Wet').length;

  // Dados para gráfico de modelos
  const modelStats = tireModels.map(model => ({
    name: model.name,
    quantidade: filteredTires.filter(t => t.modelId === model.id).length,
    type: model.type
  })).filter(stat => stat.quantidade > 0);

  // Dados para gráfico de contêineres
  const containerStats = containers.map(container => ({
    name: container.name,
    quantidade: filteredTires.filter(t => t.containerId === container.id).length
  })).filter(stat => stat.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 10);

  // Dados para gráfico de pizza (Slick vs Wet)
  const pieData = [
    { name: 'Slick', value: filteredTires.filter(t => t.modelType === 'Slick').length, color: '#FF6B00' },
    { name: 'Wet', value: filteredTires.filter(t => t.modelType === 'Wet').length, color: '#0066CC' },
  ].filter(item => item.value > 0);

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTires.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTires.length / itemsPerPage);

  const exportToCSV = () => {
    if (filteredTires.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = ['Código de Barras', 'Modelo', 'Tipo', 'Contêiner', 'Data de Descarte'];
    const rows = filteredTires.map(tire => [
      tire.barcode,
      tire.modelName,
      tire.modelType,
      tire.containerName,
      new Date(tire.timestamp).toLocaleString('pt-BR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-descarte-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Relatório exportado', {
      description: `${filteredTires.length} registros exportados`
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterModel('all');
    setFilterContainer('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl lg:mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
            <FileText className="text-white" size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-gray-900">Relatórios & Histórico de Descarte</h1>
            <p className="text-gray-500">Análise completa dos pneus descartados do estoque</p>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6 border-l-4 border-[#D50000]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Total Descartado</p>
              <h3 className="text-gray-900">{totalDiscarded} pneus</h3>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Trash2 className="text-[#D50000]" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Slick Descartados</p>
              <h3 className="text-gray-900">{slickDiscarded} pneus</h3>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="text-orange-500" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Wet Descartados</p>
              <h3 className="text-gray-900">{wetDiscarded} pneus</h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="text-blue-500" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 flex items-center gap-2">
            <Filter size={20} className="text-purple-600" />
            Filtros
          </h3>
          {(searchTerm || filterType !== 'all' || filterModel !== 'all' || filterContainer !== 'all' || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500 hover:text-[#D50000]"
            >
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Busca */}
          <div className="lg:col-span-3">
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              <Input
                id="search"
                type="text"
                placeholder="Código de barras, modelo ou contêiner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11"
              />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <Label htmlFor="filter-type">Tipo de Pneu</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger id="filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="Slick">Slick</SelectItem>
                <SelectItem value="Wet">Wet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Modelo */}
          <div>
            <Label htmlFor="filter-model">Modelo</Label>
            <Select value={filterModel} onValueChange={setFilterModel}>
              <SelectTrigger id="filter-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Modelos</SelectItem>
                {tireModels.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contêiner */}
          <div>
            <Label htmlFor="filter-container">Contêiner</Label>
            <Select value={filterContainer} onValueChange={setFilterContainer}>
              <SelectTrigger id="filter-container">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Contêineres</SelectItem>
                {containers.map(container => (
                  <SelectItem key={container.id} value={container.id}>
                    {container.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data De */}
          <div>
            <Label htmlFor="date-from">Data Inicial</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Data Até */}
          <div>
            <Label htmlFor="date-to">Data Final</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Gráficos */}
      {filteredTires.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Tipos */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-purple-600" />
              Descarte por Tipo
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Gráfico de Modelos */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <TrendingDown size={20} className="text-purple-600" />
              Descarte por Modelo
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={modelStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#D50000" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Gráfico de Contêineres */}
          {containerStats.length > 0 && (
            <Card className="p-6 lg:col-span-2">
              <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                <Package size={20} className="text-purple-600" />
                Top 10 Contêineres com Mais Descartes
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={containerStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#7C3AED" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* Histórico Detalhado */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 flex items-center gap-2">
            <Calendar size={20} className="text-purple-600" />
            Histórico Detalhado ({filteredTires.length} registros)
          </h3>
          <Button
            onClick={exportToCSV}
            disabled={filteredTires.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Download size={16} className="mr-2" />
            Exportar CSV
          </Button>
        </div>

        {filteredTires.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">Nenhum registro de descarte encontrado</p>
            <p className="text-gray-400 text-sm mt-1">
              Ajuste os filtros ou descarte alguns pneus para ver o histórico
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-700">Código</th>
                    <th className="text-left py-3 px-4 text-gray-700">Modelo</th>
                    <th className="text-left py-3 px-4 text-gray-700">Tipo</th>
                    <th className="text-left py-3 px-4 text-gray-700">Contêiner</th>
                    <th className="text-left py-3 px-4 text-gray-700">Data de Descarte</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((tire) => (
                    <tr key={tire.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {tire.barcode}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{tire.modelName}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="secondary"
                          className={tire.modelType === 'Slick' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                          }
                        >
                          {tire.modelType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{tire.containerName}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(tire.timestamp).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredTires.length)} de {filteredTires.length} registros
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="flex items-center px-4 text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
