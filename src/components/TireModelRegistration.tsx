import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { getTireModels, saveTireModels, type TireModel } from '../utils/storage';

const tireTypes = [
  'Slick',
  'Wet',
];

export function TireModelRegistration() {
  const [models, setModels] = useState<TireModel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);

  // Carrega modelos do localStorage na montagem
  useEffect(() => {
    setModels(getTireModels());
  }, []);

  // Reset página quando modelos mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [models.length, itemsPerPage]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) return;

    let updatedModels: TireModel[];

    if (editingId) {
      updatedModels = models.map(m => 
        m.id === editingId 
          ? { ...m, ...formData }
          : m
      );
      setEditingId(null);
    } else {
      const newModel: TireModel = {
        id: Date.now().toString(),
        ...formData,
      };
      updatedModels = [...models, newModel];
    }

    setModels(updatedModels);
    saveTireModels(updatedModels);
    setFormData({ name: '', code: '', type: '' });
  };

  const handleEdit = (model: TireModel) => {
    setFormData({
      name: model.name,
      code: model.code,
      type: model.type,
    });
    setEditingId(model.id);
  };

  const handleDelete = (id: string) => {
    const updatedModels = models.filter(m => m.id !== id);
    setModels(updatedModels);
    saveTireModels(updatedModels);
  };

  const handleCancel = () => {
    setFormData({ name: '', code: '', type: '' });
    setEditingId(null);
  };

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Cadastro de Modelos de Pneus</h1>
          <p className="text-gray-500">Gerencie os modelos de pneus disponíveis no sistema</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-4">
              <h2 className="text-gray-900 mb-6">
                {editingId ? 'Editar Modelo' : 'Novo Modelo'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Modelo *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Slick Seco P1"
                    className="mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="code">Código Interno</Label>
                  <Input
                    id="code"
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: SLP1"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Tipo de Pneu *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: string) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tireTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <h3 className="text-gray-900">Modelos Cadastrados</h3>
                    <p className="text-gray-500 text-sm">{models.length} modelos no sistema</p>
                  </div>
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

              <div className="divide-y divide-gray-200">
                {models.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <p>Nenhum modelo cadastrado</p>
                  </div>
                ) : (
                  models.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((model) => (
                    <div key={model.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-gray-900">{model.name}</h4>
                            {model.code && (
                              <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {model.code}
                              </code>
                            )}
                          </div>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                            {model.type}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(model)}
                            className="p-2 text-gray-400 hover:text-[#D50000] transition-colors rounded-lg hover:bg-gray-100"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(model.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {models.length > 0 && (
                <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, models.length)} de {models.length} registros
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
                      Página {currentPage} de {Math.ceil(models.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(models.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(models.length / itemsPerPage)}
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
