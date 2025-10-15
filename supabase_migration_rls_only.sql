-- ============================================
-- MIGRATION: ATUALIZAÇÃO DE POLÍTICAS RLS
-- ============================================
-- Este script atualiza apenas as políticas RLS sem recriar tabelas
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- REMOVER POLÍTICAS EXISTENTES
-- ============================================

-- Políticas da tabela tire_status
DROP POLICY IF EXISTS "tire_status_select_policy" ON public.tire_status;
DROP POLICY IF EXISTS "tire_status_insert_policy" ON public.tire_status;
DROP POLICY IF EXISTS "tire_status_update_policy" ON public.tire_status;
DROP POLICY IF EXISTS "tire_status_delete_policy" ON public.tire_status;

-- Políticas da tabela tire_models
DROP POLICY IF EXISTS "tire_models_select_policy" ON public.tire_models;
DROP POLICY IF EXISTS "tire_models_insert_policy" ON public.tire_models;
DROP POLICY IF EXISTS "tire_models_update_policy" ON public.tire_models;
DROP POLICY IF EXISTS "tire_models_delete_policy" ON public.tire_models;

-- Políticas da tabela containers
DROP POLICY IF EXISTS "containers_select_policy" ON public.containers;
DROP POLICY IF EXISTS "containers_insert_policy" ON public.containers;
DROP POLICY IF EXISTS "containers_update_policy" ON public.containers;
DROP POLICY IF EXISTS "containers_delete_policy" ON public.containers;

-- Políticas da tabela stock_entries
DROP POLICY IF EXISTS "stock_entries_select_policy" ON public.stock_entries;
DROP POLICY IF EXISTS "stock_entries_insert_policy" ON public.stock_entries;
DROP POLICY IF EXISTS "stock_entries_update_policy" ON public.stock_entries;
DROP POLICY IF EXISTS "stock_entries_delete_policy" ON public.stock_entries;

-- Políticas da tabela tire_movements
DROP POLICY IF EXISTS "tire_movements_select_policy" ON public.tire_movements;
DROP POLICY IF EXISTS "tire_movements_insert_policy" ON public.tire_movements;

-- Políticas da tabela tire_consumption
DROP POLICY IF EXISTS "tire_consumption_select_policy" ON public.tire_consumption;
DROP POLICY IF EXISTS "tire_consumption_insert_policy" ON public.tire_consumption;

-- Políticas da tabela user_profiles
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;

-- Políticas da tabela freight_requests
DROP POLICY IF EXISTS "freight_requests_select_policy" ON public.freight_requests;
DROP POLICY IF EXISTS "freight_requests_insert_policy" ON public.freight_requests;
DROP POLICY IF EXISTS "freight_requests_update_policy" ON public.freight_requests;
DROP POLICY IF EXISTS "freight_requests_delete_policy" ON public.freight_requests;

-- ============================================
-- RECRIAR FUNÇÃO DE VERIFICAÇÃO DE ADMIN
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RECRIAR FUNÇÃO DE VERIFICAÇÃO DE USUÁRIO ATIVO
-- ============================================

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- POLÍTICAS ATUALIZADAS - TIRE_STATUS
-- ============================================

-- SELECT: Todos podem visualizar (incluindo anônimos)
CREATE POLICY "tire_status_select_policy" ON public.tire_status
    FOR SELECT
    USING (TRUE);

-- INSERT: Apenas admin OU status padrão do sistema
CREATE POLICY "tire_status_insert_policy" ON public.tire_status
    FOR INSERT
    WITH CHECK (is_default = TRUE OR is_admin());

-- UPDATE: Admin pode atualizar tudo, usuários ativos podem atualizar apenas status padrão
CREATE POLICY "tire_status_update_policy" ON public.tire_status
    FOR UPDATE
    USING (is_admin() OR (is_active_user() AND is_default = TRUE))
    WITH CHECK (is_admin() OR (is_active_user() AND is_default = TRUE));

-- DELETE: Apenas admin e não pode deletar status padrão
CREATE POLICY "tire_status_delete_policy" ON public.tire_status
    FOR DELETE
    USING (is_admin() AND is_default = FALSE);

-- ============================================
-- POLÍTICAS - TIRE_MODELS
-- ============================================

CREATE POLICY "tire_models_select_policy" ON public.tire_models
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "tire_models_insert_policy" ON public.tire_models
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "tire_models_update_policy" ON public.tire_models
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "tire_models_delete_policy" ON public.tire_models
    FOR DELETE
    USING (is_admin());

-- ============================================
-- POLÍTICAS - CONTAINERS
-- ============================================

CREATE POLICY "containers_select_policy" ON public.containers
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "containers_insert_policy" ON public.containers
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "containers_update_policy" ON public.containers
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "containers_delete_policy" ON public.containers
    FOR DELETE
    USING (is_admin());

-- ============================================
-- POLÍTICAS - STOCK_ENTRIES
-- ============================================

CREATE POLICY "stock_entries_select_policy" ON public.stock_entries
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "stock_entries_insert_policy" ON public.stock_entries
    FOR INSERT
    WITH CHECK (is_active_user());

CREATE POLICY "stock_entries_update_policy" ON public.stock_entries
    FOR UPDATE
    USING (is_active_user())
    WITH CHECK (is_active_user());

CREATE POLICY "stock_entries_delete_policy" ON public.stock_entries
    FOR DELETE
    USING (is_admin());

-- ============================================
-- POLÍTICAS - TIRE_MOVEMENTS
-- ============================================

CREATE POLICY "tire_movements_select_policy" ON public.tire_movements
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "tire_movements_insert_policy" ON public.tire_movements
    FOR INSERT
    WITH CHECK (is_active_user());

-- ============================================
-- POLÍTICAS - TIRE_CONSUMPTION
-- ============================================

CREATE POLICY "tire_consumption_select_policy" ON public.tire_consumption
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "tire_consumption_insert_policy" ON public.tire_consumption
    FOR INSERT
    WITH CHECK (is_active_user());

-- ============================================
-- POLÍTICAS - USER_PROFILES
-- ============================================

CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
    FOR SELECT
    USING (is_active_user() OR id = auth.uid());

CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles
    FOR INSERT
    WITH CHECK (id = auth.uid() OR is_admin());

CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
    FOR UPDATE
    USING (id = auth.uid() OR is_admin())
    WITH CHECK (id = auth.uid() OR is_admin());

-- ============================================
-- POLÍTICAS - FREIGHT_REQUESTS
-- ============================================

CREATE POLICY "freight_requests_select_policy" ON public.freight_requests
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "freight_requests_insert_policy" ON public.freight_requests
    FOR INSERT
    WITH CHECK (is_active_user());

CREATE POLICY "freight_requests_update_policy" ON public.freight_requests
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "freight_requests_delete_policy" ON public.freight_requests
    FOR DELETE
    USING (is_admin());

-- ============================================
-- GARANTIR PERMISSÕES PARA ROLE ANON
-- ============================================

-- Permitir anon ler tire_status (necessário para inicialização)
GRANT SELECT ON public.tire_status TO anon;

-- Permitir anon inserir tire_status padrão (apenas durante inicialização)
GRANT INSERT ON public.tire_status TO anon;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS atualizadas com sucesso!';
    RAISE NOTICE '📋 Verifique as políticas listadas acima.';
    RAISE NOTICE '🔒 Tire_status agora permite inserção de status padrão.';
END $$;
