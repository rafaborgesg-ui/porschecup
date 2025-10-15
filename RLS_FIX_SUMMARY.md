# 🔒 CORREÇÃO DE POLÍTICAS RLS - RESUMO DAS ALTERAÇÕES

## ⚠️ PROBLEMA IDENTIFICADO

As políticas RLS estavam bloqueando o acesso às tabelas de configuração (`tire_models`, `containers`, `tire_status`), impedindo que:
- Usuários visualizassem modelos de pneus e containers cadastrados
- O sistema sincronizasse dados padrão na inicialização
- Operações UPSERT funcionassem corretamente

**Erros observados:**
```
tire_status new row violates row-level security policy (USING expression)
Sync from Supabase temporarily disabled - using localStorage as source of truth
```

## ✅ SOLUÇÕES IMPLEMENTADAS

### 1. **Tire Status** (Status de Pneus)
**ANTES:**
- SELECT: Apenas usuários ativos
- INSERT: Apenas admin
- UPDATE: Apenas admin

**AGORA:**
- SELECT: **Todos** (incluindo anônimos)
- INSERT: Status padrão (is_default=TRUE) **OU** admin
- UPDATE: **Usuários ativos podem atualizar status padrão** OU admin
- DELETE: Apenas admin (não pode deletar status padrão)

### 2. **Tire Models** (Modelos de Pneus)
**ANTES:**
- SELECT: Apenas usuários ativos
- INSERT/UPDATE/DELETE: Apenas admin

**AGORA:**
- SELECT: **Todos** (incluindo anônimos)
- INSERT/UPDATE: **Usuários ativos** OU admin
- DELETE: Apenas admin

### 3. **Containers** (Contêineres)
**ANTES:**
- SELECT: Apenas usuários ativos
- INSERT/UPDATE/DELETE: Apenas admin

**AGORA:**
- SELECT: **Todos** (incluindo anônimos)
- INSERT/UPDATE: **Usuários ativos** OU admin
- DELETE: Apenas admin

### 4. **GRANT Permissions**
Adicionadas permissões explícitas para os roles `anon` e `authenticated`:

```sql
-- Tire Status
GRANT SELECT, INSERT ON public.tire_status TO anon, authenticated;
GRANT UPDATE ON public.tire_status TO authenticated;

-- Tire Models
GRANT SELECT ON public.tire_models TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tire_models TO authenticated;

-- Containers
GRANT SELECT ON public.containers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.containers TO authenticated;

-- Stock Entries
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_entries TO authenticated;

-- Tire Movements
GRANT SELECT, INSERT ON public.tire_movements TO authenticated;

-- Tire Consumption
GRANT SELECT, INSERT ON public.tire_consumption TO authenticated;

-- User Profiles
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- Freight Requests
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freight_requests TO authenticated;
```

## 📋 COMO APLICAR AS CORREÇÕES

### Opção 1: Script de Migração Completo (Recomendado)
1. Abra o **Supabase Dashboard** → **SQL Editor**
2. Copie e cole o conteúdo de `supabase_migration_rls_only.sql`
3. Clique em **Run**

Este script:
- Remove todas as políticas existentes
- Recria as funções `is_admin()` e `is_active_user()`
- Cria as políticas atualizadas
- Aplica os GRANTs necessários
- Lista todas as políticas para verificação

### Opção 2: Script RLS Completo (Para Setup Inicial)
Se estiver configurando do zero, use `supabase_rls_policies.sql` que inclui:
- Funções auxiliares
- Todas as políticas RLS
- GRANTs de permissões
- Funções de dashboard

## 🎯 BENEFÍCIOS DAS ALTERAÇÕES

1. **Inicialização Simplificada**: Dados padrão (tire_status) podem ser inseridos sem autenticação
2. **Acesso Público de Leitura**: Modelos e containers podem ser visualizados antes do login
3. **Operações UPSERT**: Sincronização bidirecional funciona corretamente
4. **Permissões Claras**: Usuários ativos podem gerenciar configurações, apenas admin pode deletar
5. **Segurança Mantida**: Dados sensíveis (stock_entries, movements, consumption) continuam protegidos

## 🔍 VERIFICAÇÃO PÓS-MIGRAÇÃO

Execute no SQL Editor para verificar as políticas:

```sql
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    CASE 
        WHEN qual IS NULL THEN 'TRUE' 
        ELSE qual 
    END as using_expression,
    CASE 
        WHEN with_check IS NULL THEN 'TRUE' 
        ELSE with_check 
    END as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 📝 COMMITS RELACIONADOS

- `97f6f46` - Corrige RLS policy de tire_status para permitir UPSERT
- `2b8b0c2` - Permite acesso público de leitura para tire_models e containers + GRANT permissions

## 🚀 PRÓXIMOS PASSOS

1. ✅ Execute `supabase_migration_rls_only.sql` no Supabase SQL Editor
2. ✅ Recarregue a aplicação
3. ✅ Verifique se os cadastros de modelos e containers carregam corretamente
4. ✅ Teste a sincronização bidirecional
5. ✅ Confirme que não há mais erros 403 no console

## 📚 ARQUIVOS ATUALIZADOS

- `supabase_rls_policies.sql` - Políticas RLS completas (para referência)
- `supabase_migration_rls_only.sql` - Script de migração idempotente
- Commit: `2b8b0c2` - Publicado no GitHub
