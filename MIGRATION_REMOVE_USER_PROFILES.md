# 🔄 GUIA DE MIGRAÇÃO: REMOVER USER_PROFILES

## ⚠️ O QUE ESTAVA ERRADO

A tabela `user_profiles` criava:
1. **Ciclo de dependência**: Políticas RLS precisam de `user_profiles`, mas `user_profiles` precisa de políticas RLS
2. **Duplicação**: Mesmos dados em `auth.users` e `user_profiles`
3. **Complexidade**: Triggers, sincronização, funções extras
4. **Bugs**: Usuários sem perfil ficam bloqueados pelas políticas RLS

## ✅ SOLUÇÃO: Centralizar em Supabase Authentication

- ✅ Usar apenas `auth.users` para autenticação
- ✅ Armazenar role em `user_metadata` do Supabase Auth
- ✅ Políticas RLS simples baseadas em `auth.uid()` e `auth.jwt()`
- ✅ Sem tabelas extras, sem triggers, sem sincronização

## 📋 PASSO A PASSO DE EXECUÇÃO

### 1️⃣ EXECUTAR SCRIPT NO SUPABASE (OBRIGATÓRIO)

1. Acesse **Supabase Dashboard** → **SQL Editor**
2. Cole o conteúdo de `supabase_remove_user_profiles.sql`
3. **Run** o script completo
4. Aguarde a mensagem de sucesso

**O que o script faz:**
- ✅ Remove todas as políticas RLS antigas
- ✅ Remove funções `is_admin()`, `is_active_user()`, etc
- ✅ Remove triggers relacionados
- ✅ **DELETA a tabela `user_profiles`** (CUIDADO: dados serão perdidos)
- ✅ Cria funções simplificadas
- ✅ Cria políticas RLS baseadas apenas em autenticação
- ✅ Adiciona GRANTs necessários

### 2️⃣ CONFIGURAR ROLE DOS USUÁRIOS NO SUPABASE AUTH

Após executar o script, configure os usuários existentes:

```sql
-- Ver usuários existentes
SELECT id, email, raw_user_meta_data FROM auth.users;

-- Definir role como admin para um usuário específico
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
)
WHERE email = 'seu-email@exemplo.com';

-- Definir role como operator
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"operator"'
)
WHERE email = 'outro-email@exemplo.com';
```

### 3️⃣ ATUALIZAR COMPONENTE UserManagement (PRÓXIMO PASSO)

Precisamos atualizar `src/components/UserManagement.tsx` para:
- ✅ Listar usuários de `auth.users` (via Supabase Admin API ou Edge Function)
- ✅ Gerenciar roles via `user_metadata`
- ✅ Remover referências a `user_profiles`

### 4️⃣ REMOVER REFERÊNCIAS NO CÓDIGO

Arquivos que precisam ser atualizados:
- `src/components/UserManagement.tsx` - Gerenciamento de usuários
- Qualquer componente que use `user_profiles`

## 🔑 NOVA ESTRUTURA DE AUTENTICAÇÃO

### Como funciona agora:

```typescript
// Verificar se está autenticado
const { data: { user } } = await supabase.auth.getUser();
const isAuthenticated = !!user;

// Verificar se é admin
const isAdmin = user?.user_metadata?.role === 'admin';

// Criar novo usuário (Supabase Auth cuida de tudo)
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@exemplo.com',
  password: 'senha-segura',
  options: {
    data: {
      name: 'Nome do Usuário',
      role: 'operator' // ou 'admin'
    }
  }
});
```

### Políticas RLS (simplificadas):

```sql
-- Qualquer usuário autenticado pode ler/escrever
CREATE POLICY "policy_name" ON table_name
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- Apenas admin pode deletar
CREATE POLICY "admin_only" ON table_name
    FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'admin' 
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
```

## 🚀 BENEFÍCIOS

1. **Simplicidade**: Sem tabelas extras, sem sincronização
2. **Confiabilidade**: Supabase Auth é a fonte única da verdade
3. **Sem ciclos**: Políticas RLS não dependem de tabelas de dados
4. **Performance**: Menos JOINs, menos queries
5. **Manutenção**: Menos código, menos bugs

## ⚠️ AVISOS IMPORTANTES

1. **Dados de user_profiles serão DELETADOS**: Se tiver dados importantes (como histórico de ações), faça backup antes
2. **Usuários precisam re-login**: Após a migração, usuários podem precisar fazer logout/login
3. **Roles devem ser configurados**: Configure manualmente as roles dos usuários existentes no `auth.users`

## 🔍 VERIFICAÇÃO PÓS-MIGRAÇÃO

Execute no SQL Editor:

```sql
-- Verificar que user_profiles não existe mais
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_profiles';
-- Deve retornar vazio

-- Verificar usuários e suas roles
SELECT id, email, raw_user_meta_data ->> 'role' as role
FROM auth.users
ORDER BY created_at DESC;

-- Verificar políticas RLS
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 📝 PRÓXIMAS AÇÕES

1. ✅ Execute `supabase_remove_user_profiles.sql`
2. ✅ Configure roles dos usuários existentes
3. ⏳ Atualizar `UserManagement.tsx` (aguardando confirmação)
4. ⏳ Testar login e permissões
5. ⏳ Deploy no Vercel
