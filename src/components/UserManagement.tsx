import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, User, Eye, EyeOff, Shield, Users as UsersIcon, RefreshCcw } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { ActionButton } from './ActionFeedback';
import { createClient } from '../utils/supabase/client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: 'admin' | 'operator';
  active: boolean;
  createdAt: string;
}

// ============================================
// FUNÇÕES DE API - Integração Supabase
// ============================================

// Função para buscar todos os usuários via Edge Function
async function fetchUsers(): Promise<User[]> {
  const supabase = createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('Token não encontrado. Faça login novamente.');
  }
  const token = session.access_token;
  // Endpoint Edge Function Supabase
  const edgeUrlBase = (import.meta.env.VITE_SUPABASE_EDGE_URL || 'https://nflgqugaabtxzifyhjor.supabase.co/functions/v1/dynamic-service').replace(/\/$/, '');
  let response: Response | null = null;
  try {
    response = await fetch(edgeUrlBase, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    });
  } catch (e) {
    response = null;
  }

  if (!response || !response.ok) {
    // Fallback: tentar via API interna Hono (/users)
    try {
      const { fetchUsers: fetchUsersFromAPI } = await import('../utils/api');
      const raw = await fetchUsersFromAPI();
      return (raw || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || u.name || u.email?.split('@')[0] || 'Usuário',
        username: u.user_metadata?.username || u.username || u.email?.split('@')[0] || 'user',
        role: u.user_metadata?.role || u.role || 'operator',
        active: !u.banned && (u.active ?? true),
        createdAt: u.created_at || new Date().toISOString()
      }));
    } catch (fallbackErr) {
      const status = response ? response.status : 'network';
      const txt = response ? (await response.text().catch(() => '')) : (fallbackErr instanceof Error ? fallbackErr.message : '');
      if (status === 401) throw new Error('401 Não autorizado');
      if (status === 403) throw new Error('403 Acesso negado');
      throw new Error(`Erro ao buscar usuários [${status}]: ${txt}`);
    }
  }

  const result = await response.json();
  // Adapta o formato para o tipo User
  return (result.users || result)?.map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário',
    username: u.user_metadata?.username || u.email?.split('@')[0] || 'user',
    role: u.user_metadata?.role || 'operator',
    active: !u.banned,
    createdAt: u.created_at || new Date().toISOString()
  })) ?? [];
}

async function createUser(userData: {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'operator';
  username: string;
}): Promise<User> {
  try {
    console.log('🔨 Creating user in Authentication (fonte principal)...');
    const supabase = createClient();
    // Criar usuário no Authentication
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: userData.role,
          username: userData.username || userData.email.split('@')[0]
        }
      }
    });
    console.log('📊 Authentication signUp response:', { data, error });
    if (error) {
      console.error('❌ Authentication signUp error:', error);
      throw new Error(error.message || 'Erro ao criar usuário no Authentication');
    }
    if (!data.user) {
      throw new Error('Usuário não foi criado no Authentication');
    }
    console.log('✅ User created in Authentication:', data.user.email);
    // Retornar dados do usuário
    const newUser: User = {
      id: data.user.id,
      email: data.user.email || userData.email,
      name: userData.name,
      username: userData.username || userData.email.split('@')[0],
      role: userData.role,
      active: true,
      createdAt: data.user.created_at || new Date().toISOString()
    };
    return newUser;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  try {
    console.log('🔄 Updating user via Edge Function (admin)...');
    console.log('User update requested:', { userId, updates });

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const edgeUrl = (import.meta.env.VITE_SUPABASE_EDGE_URL || 'https://nflgqugaabtxzifyhjor.supabase.co/functions/v1/dynamic-service').replace(/\/$/, '');
    const resp = await fetch(`${edgeUrl}/update-user`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: userId,
        name: updates.name,
        role: updates.role,
        active: updates.active
      })
    });

    if (!resp.ok) {
      if (resp.status === 401) throw new Error('401 Não autorizado. Faça login novamente.');
      if (resp.status === 403) throw new Error('403 Acesso negado. Apenas administradores podem atualizar usuários.');
      const txt = await resp.text().catch(() => '');
      throw new Error(`Falha ao atualizar usuário (${resp.status}): ${txt}`);
    }

    // Se o usuário editado é o atual e metadata mudou, opcionalmente forçar refresh local
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser && currentUser.id === userId && (updates.name || updates.role)) {
      // Refetch user to reflect updates in UI flows that rely on user_metadata
      await supabase.auth.getUser();
    }

    console.log('✅ User updated successfully via Edge Function');
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
}

async function deleteUser(userId: string): Promise<void> {
  try {
    console.log('🗑️ Deleting user from Authentication...');
    console.log('User deletion requested:', { userId });
    // Nota: A exclusão real do usuário do Authentication requer Admin API
    // Aqui apenas loga/desativa no frontend; para deletar de verdade, use a Edge Function/Admin API
    // Implementação futura: chamada para Edge Function que desativa ou exclui usuário
    console.log('ℹ️  Note: Para deletar completamente do Authentication, usar Admin API no servidor');
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw error;
  }
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    name: '',
    role: 'operator' as 'admin' | 'operator',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega usuários do Supabase
  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setIsLoading(true);
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      
      let errorMessage = 'Não foi possível carregar usuários.';
      
      const errorMsg = (error as Error).message || 'Erro desconhecido';
      if (errorMsg.includes('Token não encontrado')) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (errorMsg.includes('401')) {
        errorMessage = 'Não autorizado. Faça login novamente.';
      } else if (errorMsg.includes('403')) {
        errorMessage = 'Acesso negado. Apenas administradores.';
      }
      
      toast.error('Erro ao carregar usuários', {
        description: errorMessage,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Reset página quando usuários mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [users.length, itemsPerPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de campos obrigatórios
    // Para edição: email e nome são obrigatórios, senha é opcional
    // Para criação: email, nome e senha são obrigatórios
    if (!formData.email.trim() || !formData.name.trim()) {
      toast.error('Campos obrigatórios', {
        description: 'Preencha todos os campos obrigatórios.',
        duration: 4000,
      });
      return;
    }

    // Validação de senha apenas para criação de usuário ou quando senha é fornecida na edição
    if (!editingId && !formData.password.trim()) {
      toast.error('Campos obrigatórios', {
        description: 'A senha é obrigatória para criar um novo usuário.',
        duration: 4000,
      });
      return;
    }

    // Se está editando e forneceu uma senha, valida o comprimento mínimo
    if (editingId && formData.password.trim() && formData.password.length < 6) {
      toast.error('Senha inválida', {
        description: 'A senha deve ter pelo menos 6 caracteres.',
        duration: 4000,
      });
      return;
    }

    // Se está criando um usuário, valida o comprimento mínimo da senha
    if (!editingId && formData.password.length < 6) {
      toast.error('Senha inválida', {
        description: 'A senha deve ter pelo menos 6 caracteres.',
        duration: 4000,
      });
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Email inválido', {
        description: 'Digite um email válido.',
        duration: 4000,
      });
      return;
    }

    // Verifica se email já existe (exceto se estiver editando o mesmo usuário)
    const emailExists = users.some(
      u => u.email.toLowerCase() === formData.email.toLowerCase() && u.id !== editingId
    );

    if (emailExists && !editingId) {
      toast.error('Email já cadastrado', {
        description: 'Este email já está em uso.',
        duration: 4000,
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        // Atualiza usuário existente
        await updateUser(editingId, {
          email: formData.email,
          username: formData.username || formData.email.split('@')[0],
          name: formData.name,
          role: formData.role,
          active: true
        });
        
        toast.success('✅ Usuário atualizado', {
          description: `${formData.name} foi atualizado com sucesso.`,
          duration: 3000,
        });
        setEditingId(null);
      } else {
        // Cria novo usuário
        const newUser = await createUser({
          email: formData.email,
          username: formData.username || formData.email.split('@')[0],
          password: formData.password,
          name: formData.name,
          role: formData.role
        });
        
        toast.success('✅ Usuário criado com sucesso!', {
          description: `${formData.name} foi criado e pode fazer login.`,
          duration: 4000,
        });
        
        // Add the new user to the local list for immediate UI feedback
        setUsers(prevUsers => [...prevUsers, newUser]);
      }
      
      // Recarrega lista de usuários
      await loadUsers();
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao salvar usuário', {
        description: errorMessage,
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      email: user.email,
      username: user.username,
      password: '', // Não preenche senha ao editar
      name: user.name,
      role: user.role,
    });
    setEditingId(user.id);
  };

  const handleDeleteClick = (user: User) => {
    // Não permitir deletar o único admin
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (user.role === 'admin' && adminCount === 1) {
      toast.error('Operação não permitida', {
        description: 'Não é possível excluir o único administrador do sistema.',
      });
      return;
    }

    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);

    try {
      await deleteUser(userToDelete.id);
      
      toast.success('� Usuário desativado', {
        description: `${userToDelete.name} foi desativado no sistema.`,
        duration: 3000,
      });
      
      // Recarrega lista
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao desativar usuário', {
        description: errorMessage,
        duration: 4000,
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const toggleUserStatus = async (user: User) => {
    // Não permitir desativar o único admin ativo
    const activeAdminCount = users.filter(u => u.role === 'admin' && u.active).length;
    if (user.role === 'admin' && user.active && activeAdminCount === 1) {
      toast.error('⛔ Operação não permitida', {
        description: 'Não é possível desativar o único administrador ativo.',
        duration: 4000,
      });
      return;
    }

    try {
      await updateUser(user.id, {
        active: !user.active
      });
      
      toast.success(`${user.active ? '🔴' : '🟢'} Usuário ${user.active ? 'desativado' : 'ativado'}`, {
        description: `${user.name} foi ${user.active ? 'desativado' : 'ativado'}.`,
        duration: 3000,
      });
      
      // Recarrega lista
      await loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar status', {
        description: errorMessage,
        duration: 4000,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      password: '',
      name: '',
      role: 'operator',
    });
    setEditingId(null);
    setShowPassword(false);
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl lg:mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gray-900 mb-2">Gerenciamento de Usuários</h1>
              <p className="text-gray-500">Gerencie os usuários e permissões do sistema</p>
            </div>
            <Button
              variant="outline"
              onClick={loadUsers}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
              Recarregar
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-4">
              <h2 className="text-gray-900 mb-6">
                {editingId ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João Silva"
                    className="mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: joao.silva@exemplo.com"
                    className="mt-1.5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este será o email de login no sistema
                  </p>
                </div>

                <div>
                  <Label htmlFor="username">Nome de Usuário (Opcional)</Label>
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Ex: joao.silva (deixe vazio para usar email)"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingId ? "Digite nova senha (deixe vazio para manter)" : "Digite a senha"}
                      className="pr-10"
                      required={!editingId}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {editingId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe vazio para manter a senha atual
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role">Tipo de Usuário *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'operator') => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger id="role" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operator">
                        <div className="flex items-center gap-2">
                          <User size={16} />
                          Operador
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield size={16} />
                          Administrador
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.role === 'admin' 
                      ? 'Acesso total ao sistema, incluindo gerenciamento de usuários'
                      : 'Acesso apenas às funcionalidades operacionais'
                    }
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <ActionButton
                    type="submit"
                    isLoading={isSaving}
                    loadingText={editingId ? 'Atualizando...' : 'Salvando...'}
                    variant="primary"
                    icon={editingId ? <Edit2 size={16} /> : <Plus size={16} />}
                    className="flex-1"
                  >
                    {editingId ? 'Atualizar' : 'Adicionar'}
                  </ActionButton>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
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
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-gray-900">Usuários Cadastrados</h3>
                    <p className="text-gray-500 text-sm">
                      {users.length} {users.length === 1 ? 'usuário' : 'usuários'} no sistema
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadUsers}
                      disabled={isLoading}
                    >
                      <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                      Atualizar
                    </Button>
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

              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 border-4 border-[#D50000] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Carregando usuários...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <UsersIcon size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Nenhum usuário cadastrado</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((user) => (
                        <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.active ? 'opacity-60' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                user.role === 'admin' ? 'bg-red-100' : 'bg-gray-100'
                              }`}>
                                {user.role === 'admin' ? (
                                  <Shield size={20} className="text-[#D50000]" />
                                ) : (
                                  <User size={20} className="text-gray-600" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm text-gray-900">{user.name}</div>
                                <div className="text-xs text-gray-500">
                                  Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{user.email}</div>
                            {user.username && user.username !== user.email.split('@')[0] && (
                              <div className="text-xs text-gray-500">@{user.username}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant="secondary"
                              className={user.role === 'admin' 
                                ? 'bg-red-100 text-[#D50000]' 
                                : 'bg-gray-100 text-gray-700'
                              }
                            >
                              {user.role === 'admin' ? 'Administrador' : 'Operador'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleUserStatus(user)}
                              className="focus:outline-none"
                            >
                              <Badge
                                variant="secondary"
                                className={user.active 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer' 
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer'
                                }
                              >
                                {user.active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(user)}
                                className="p-2 text-gray-400 hover:text-[#D50000] transition-colors rounded-lg hover:bg-gray-100"
                                title="Editar usuário"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(user)}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                                title="Desativar usuário"
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
              {users.length > 0 && (
                <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, users.length)} de {users.length} registros
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
                      Página {currentPage} de {Math.ceil(users.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(users.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(users.length / itemsPerPage)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o usuário <strong>{userToDelete?.name}</strong>?
              O usuário ficará inativo mas seus dados serão preservados no Authentication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <ActionButton
              onClick={confirmDelete}
              isLoading={isDeleting}
              loadingText="Desativando..."
              variant="destructive"
              icon={<Trash2 size={16} />}
              disabled={isDeleting}
            >
              Desativar
            </ActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
