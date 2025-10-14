import { useState, useEffect } from 'react';
import { CircleDot, Plus, Edit2, Trash2, Save, X, AlertCircle, Shield } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
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
import { toast } from 'sonner';
import { getTireStatus, addTireStatus, updateTireStatus, deleteTireStatus, type TireStatus } from '../utils/storage';

const COLOR_PRESETS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Vermelho', value: '#DC2626' },
  { name: 'Amarelo', value: '#F59E0B' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Cinza', value: '#6B7280' },
  { name: 'Índigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
];

export function StatusRegistration() {
  const [statusList, setStatusList] = useState<TireStatus[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#3B82F6');

  useEffect(() => {
    loadStatus();
    
    // Escuta atualizações
    const handleUpdate = () => loadStatus();
    window.addEventListener('tire-status-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('tire-status-updated', handleUpdate);
    };
  }, []);

  const loadStatus = () => {
    const status = getTireStatus();
    setStatusList(status);
  };

  const resetForm = () => {
    setFormName('');
    setFormColor('#3B82F6');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!formName.trim()) {
      toast.error('Nome obrigatório', {
        description: 'Informe o nome do status.',
      });
      return;
    }

    const newStatus = addTireStatus({
      name: formName.trim(),
      color: formColor,
      isDefault: false,
    });

    if (newStatus) {
      toast.success('Status criado!', {
        description: `Status "${newStatus.name}" cadastrado com sucesso.`,
      });
      resetForm();
      loadStatus();
    } else {
      toast.error('Status já existe', {
        description: 'Já existe um status com este nome.',
      });
    }
  };

  const handleEdit = (status: TireStatus) => {
    setEditingId(status.id);
    setFormName(status.name);
    setFormColor(status.color);
    setIsAdding(false);
  };

  const handleUpdate = () => {
    if (!formName.trim()) {
      toast.error('Nome obrigatório', {
        description: 'Informe o nome do status.',
      });
      return;
    }

    if (!editingId) return;

    const success = updateTireStatus(editingId, {
      name: formName.trim(),
      color: formColor,
    });

    if (success) {
      toast.success('Status atualizado!', {
        description: 'Alterações salvas com sucesso.',
      });
      resetForm();
      loadStatus();
    } else {
      toast.error('Erro ao atualizar', {
        description: 'Não foi possível atualizar o status.',
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;

    const success = deleteTireStatus(deleteId);

    if (success) {
      toast.success('Status excluído!', {
        description: 'O status foi removido do sistema.',
      });
      setDeleteId(null);
      loadStatus();
    } else {
      toast.error('Não é possível excluir', {
        description: 'Status padrão do sistema não podem ser excluídos.',
      });
      setDeleteId(null);
    }
  };

  const defaultStatus = statusList.filter(s => s.isDefault);
  const customStatus = statusList.filter(s => !s.isDefault);

  return (
    <div className="flex-1 px-2 py-2 sm:p-4 lg:p-8 w-full max-w-full">
      <div className="max-w-4xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <CircleDot className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-gray-900">Cadastro de Status</h1>
              <p className="text-gray-500 text-sm">Gerencie os status personalizados dos pneus</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card className="p-4 bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Total</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{statusList.length}</p>
              </div>
              <CircleDot className="text-gray-400" size={24} />
            </div>
          </Card>

          <Card className="p-4 bg-white border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-blue-600 mb-1">Padrão</p>
                <p className="text-xl sm:text-2xl font-semibold text-blue-700">{defaultStatus.length}</p>
              </div>
              <Shield className="text-blue-500" size={24} />
            </div>
          </Card>

          <Card className="p-4 bg-white border border-indigo-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-indigo-600 mb-1">Personalizados</p>
                <p className="text-xl sm:text-2xl font-semibold text-indigo-700">{customStatus.length}</p>
              </div>
              <Plus className="text-indigo-500" size={24} />
            </div>
          </Card>
        </div>

        {/* Form Card */}
        {(isAdding || editingId) && (
          <Card className="p-4 sm:p-6 mb-6 bg-gradient-to-r from-indigo-50 to-white border border-indigo-200 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 flex items-center gap-2">
                {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
                {editingId ? 'Editar Status' : 'Novo Status'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <Label htmlFor="statusName">Nome do Status *</Label>
                <Input
                  id="statusName"
                  type="text"
                  placeholder="Ex: Em Manutenção"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={50}
                  disabled={editingId ? statusList.find(s => s.id === editingId)?.isDefault : false}
                />
                {editingId && statusList.find(s => s.id === editingId)?.isDefault && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <Shield size={12} />
                    Status padrão não pode ter o nome alterado
                  </p>
                )}
              </div>

              {/* Cor */}
              <div>
                <Label htmlFor="statusColor">Cor do Status *</Label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    id="statusColor"
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-14 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    placeholder="#3B82F6"
                    maxLength={7}
                    className="flex-1"
                  />
                </div>

                {/* Color Presets */}
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormColor(preset.value)}
                      className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                        formColor === preset.value ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <Label className="text-xs text-gray-500 mb-2 block">Preview</Label>
                <Badge
                  variant="secondary"
                  className="border"
                  style={{
                    backgroundColor: `${formColor}20`,
                    borderColor: formColor,
                    color: formColor,
                  }}
                >
                  {formName || 'Nome do Status'}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={editingId ? handleUpdate : handleAdd}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save size={16} className="mr-2" />
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Status'}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="border-gray-300"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Add Button */}
        {!isAdding && !editingId && (
          <Button
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto mb-6 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus size={16} className="mr-2" />
            Adicionar Novo Status
          </Button>
        )}

        {/* Status List */}
        <div className="space-y-6">
          {/* Default Status */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="text-blue-600" size={18} />
              <h3 className="text-gray-900">Status Padrão do Sistema</h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {defaultStatus.length}
              </Badge>
            </div>

            <div className="grid gap-3">
              {defaultStatus.map((status) => (
                <Card key={status.id} className="p-4 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: `${status.color}20`, border: `2px solid ${status.color}` }}
                      >
                        <CircleDot size={20} style={{ color: status.color }} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-gray-900">{status.name}</h4>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            <Shield size={10} className="mr-1" />
                            Padrão
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">Cor: {status.color}</p>
                      </div>

                      <Badge
                        variant="secondary"
                        className="border hidden sm:block"
                        style={{
                          backgroundColor: `${status.color}20`,
                          borderColor: status.color,
                          color: status.color,
                        }}
                      >
                        {status.name}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(status)}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        title="Editar cor"
                      >
                        <Edit2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Status */}
          {customStatus.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Plus className="text-indigo-600" size={18} />
                <h3 className="text-gray-900">Status Personalizados</h3>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                  {customStatus.length}
                </Badge>
              </div>

              <div className="grid gap-3">
                {customStatus.map((status) => (
                  <Card key={status.id} className="p-4 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: `${status.color}20`, border: `2px solid ${status.color}` }}
                        >
                          <CircleDot size={20} style={{ color: status.color }} />
                        </div>

                        <div className="flex-1">
                          <h4 className="text-gray-900 mb-1">{status.name}</h4>
                          <p className="text-sm text-gray-500">
                            Cor: {status.color} • Criado em {new Date(status.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <Badge
                          variant="secondary"
                          className="border hidden sm:block"
                          style={{
                            backgroundColor: `${status.color}20`,
                            borderColor: status.color,
                            color: status.color,
                          }}
                        >
                          {status.name}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(status)}
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(status.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {customStatus.length === 0 && !isAdding && !editingId && (
            <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-white border border-gray-200">
              <CircleDot size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-gray-900 mb-2">Nenhum status personalizado</h3>
              <p className="text-gray-500 text-sm mb-4">
                Adicione status personalizados para atender necessidades específicas
              </p>
              <Button
                onClick={() => setIsAdding(true)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus size={16} className="mr-2" />
                Criar Primeiro Status
              </Button>
            </Card>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="text-red-600" size={24} />
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Tem certeza que deseja excluir este status?
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900">
                    <strong>Atenção:</strong> Pneus que usam este status não serão afetados, mas o status não estará mais disponível para novos registros.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir Status
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
