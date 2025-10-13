import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getContainers, saveContainers, getStockEntries, type Container as StorageContainer } from '../utils/storage';

interface Container {
  id: string;
  containerId: string;
  location: string;
  capacity: string;
  currentStock: number;
}

// Função para converter do formato de storage para o formato local
function fromStorage(containers: StorageContainer[]): Container[] {
  return containers.map(c => ({
    id: c.id,
    containerId: c.name,
    location: c.location,
    capacity: c.capacity.toString(),
    currentStock: c.current,
  }));
}

// Função para converter do formato local para o formato de storage
function toStorage(containers: Container[]): StorageContainer[] {
  return containers.map(c => ({
    id: c.id,
    name: c.containerId,
    location: c.location,
    capacity: parseInt(c.capacity) || 0,
    current: c.currentStock,
  }));
}

export function ContainerRegistration() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);

  // Função para calcular ocupação real dos contêineres
  const calculateRealOccupancy = (containersList: Container[]): Container[] => {
    const stockEntries = getStockEntries();
    
    // Conta quantos pneus tem em cada contêiner
    const occupancyMap = new Map<string, number>();
    stockEntries.forEach(entry => {
      if (entry.containerId) {
        occupancyMap.set(entry.containerId, (occupancyMap.get(entry.containerId) || 0) + 1);
      }
    });

    // Atualiza cada contêiner com a ocupação real
    return containersList.map(container => ({
      ...container,
      currentStock: occupancyMap.get(container.id) || 0,
    }));
  };

  // Carrega contêineres do localStorage na montagem
  useEffect(() => {
    const stored = getContainers();
    const containersWithOccupancy = calculateRealOccupancy(fromStorage(stored));
    setContainers(containersWithOccupancy);
  }, []);

  // Atualiza ocupação quando os dados de estoque mudarem
  useEffect(() => {
    const handleStockUpdate = () => {
      const stored = getContainers();
      const containersWithOccupancy = calculateRealOccupancy(fromStorage(stored));
      setContainers(containersWithOccupancy);
    };

    window.addEventListener('stock-entries-updated', handleStockUpdate);
    return () => {
      window.removeEventListener('stock-entries-updated', handleStockUpdate);
    };
  }, []);

  // Reset página quando contêineres mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [containers.length, itemsPerPage]);

  const [formData, setFormData] = useState({
    containerId: '',
    location: '',
    capacity: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.containerId || !formData.location) return;

    let updatedContainers: Container[];

    if (editingId) {
      updatedContainers = containers.map(c => {
        if (c.id === editingId) {
          return {
            id: c.id,
            containerId: formData.containerId,
            location: formData.location,
            capacity: formData.capacity,
            currentStock: c.currentStock, // Preserva o estoque atual
          };
        }
        return c;
      });
      setEditingId(null);
    } else {
      const newContainer: Container = {
        id: Date.now().toString(),
        containerId: formData.containerId,
        location: formData.location,
        capacity: formData.capacity,
        currentStock: 0,
      };
      updatedContainers = [...containers, newContainer];
    }

    // Recalcula ocupação real antes de salvar
    const containersWithOccupancy = calculateRealOccupancy(updatedContainers);
    setContainers(containersWithOccupancy);
    saveContainers(toStorage(containersWithOccupancy));
    setFormData({ containerId: '', location: '', capacity: '' });
  };

  const handleEdit = (container: Container) => {
    setFormData({
      containerId: container.containerId,
      location: container.location,
      capacity: container.capacity,
    });
    setEditingId(container.id);
  };

  const handleDelete = (id: string) => {
    const updatedContainers = containers.filter(c => c.id !== id);
    // Recalcula ocupação real antes de salvar
    const containersWithOccupancy = calculateRealOccupancy(updatedContainers);
    setContainers(containersWithOccupancy);
    saveContainers(toStorage(containersWithOccupancy));
  };

  const handleCancel = () => {
    setFormData({ containerId: '', location: '', capacity: '' });
    setEditingId(null);
  };

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Cadastro de Contêineres</h1>
          <p className="text-gray-500">Gerencie os contêineres e locais de armazenamento</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-4">
              <h2 className="text-gray-900 mb-6">
                {editingId ? 'Editar Contêiner' : 'Novo Contêiner'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="containerId">ID do Contêiner *</Label>
                  <Input
                    id="containerId"
                    type="text"
                    value={formData.containerId}
                    onChange={(e) => setFormData({ ...formData, containerId: e.target.value })}
                    placeholder="Ex: C-001"
                    className="mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="location">Localização *</Label>
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Galpão A - Setor 1"
                    className="mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="capacity">Capacidade</Label>
                  <Input
                    id="capacity"
                    type="text"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="Ex: 200 pneus"
                    className="mt-1.5"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-[#D50000] hover:bg-[#B00000] text-white"
                  >
                    {editingId ? (
                      <>
                        <Edit2 size={16} className="mr-2" />
                        Atualizar
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="mr-2" />
                        Adicionar
                      </>
                    )}
                  </Button>
                  {editingId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancel}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-900">Contêineres Cadastrados</h3>
                    <p className="text-gray-500 text-sm">{containers.length} contêineres no sistema</p>
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
              </div>

              <div className="grid gap-4 p-6">
                {containers.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Package size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Nenhum contêiner cadastrado</p>
                  </div>
                ) : (
                  containers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((container) => {
                    const capacity = parseInt(container.capacity) || 0;
                    const percentage = capacity > 0 ? (container.currentStock / capacity) * 100 : 0;

                    return (
                      <div key={container.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-gray-900">{container.containerId}</h4>
                              <Badge 
                                variant="secondary" 
                                className={`
                                  ${percentage > 80 ? 'bg-red-100 text-red-700' : 
                                    percentage > 50 ? 'bg-yellow-100 text-yellow-700' : 
                                    'bg-green-100 text-green-700'}
                                `}
                              >
                                {container.currentStock}/{container.capacity || '∞'}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm">{container.location}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(container)}
                              className="p-2 text-gray-400 hover:text-[#D50000] transition-colors rounded-lg hover:bg-gray-100"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(container.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {capacity > 0 && (
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                percentage > 80 ? 'bg-red-500' : 
                                percentage > 50 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {containers.length > 0 && (
                <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, containers.length)} de {containers.length} registros
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
                      Página {currentPage} de {Math.ceil(containers.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(containers.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(containers.length / itemsPerPage)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
