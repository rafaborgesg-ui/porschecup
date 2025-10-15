-- ============================================
-- MIGRAÇÃO: REMOVER USER_PROFILES E SIMPLIFICAR RLS
-- ============================================
-- Este script remove a tabela user_profiles e simplifica as políticas RLS
-- para usar apenas Supabase Authentication (auth.users)

-- ============================================
-- 1. REMOVER POLÍTICAS RLS ANTIGAS
-- ============================================

DROP POLICY IF EXISTS "tire_status_select_policy" ON public.tire_status;
DROP POLICY IF EXISTS "tire_status_insert_policy" ON public.tire_status;
DROP POLICY IF EXISTS "tire_status_update_policy" ON public.tire_status;
DROP POLICY IF EXISTS "tire_status_delete_policy" ON public.tire_status;

DROP POLICY IF EXISTS "tire_models_select_policy" ON public.tire_models;
DROP POLICY IF EXISTS "tire_models_insert_policy" ON public.tire_models;
DROP POLICY IF EXISTS "tire_models_update_policy" ON public.tire_models;
DROP POLICY IF EXISTS "tire_models_delete_policy" ON public.tire_models;

DROP POLICY IF EXISTS "containers_select_policy" ON public.containers;
DROP POLICY IF EXISTS "containers_insert_policy" ON public.containers;
DROP POLICY IF EXISTS "containers_update_policy" ON public.containers;
DROP POLICY IF EXISTS "containers_delete_policy" ON public.containers;

DROP POLICY IF EXISTS "stock_entries_select_policy" ON public.stock_entries;
DROP POLICY IF EXISTS "stock_entries_insert_policy" ON public.stock_entries;
DROP POLICY IF EXISTS "stock_entries_update_policy" ON public.stock_entries;
DROP POLICY IF EXISTS "stock_entries_delete_policy" ON public.stock_entries;

DROP POLICY IF EXISTS "tire_movements_select_policy" ON public.tire_movements;
DROP POLICY IF EXISTS "tire_movements_insert_policy" ON public.tire_movements;
DROP POLICY IF EXISTS "tire_movements_delete_policy" ON public.tire_movements;

DROP POLICY IF EXISTS "tire_consumption_select_policy" ON public.tire_consumption;
DROP POLICY IF EXISTS "tire_consumption_insert_policy" ON public.tire_consumption;
DROP POLICY IF EXISTS "tire_consumption_delete_policy" ON public.tire_consumption;

DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;

DROP POLICY IF EXISTS "freight_requests_select_policy" ON public.freight_requests;
DROP POLICY IF EXISTS "freight_requests_insert_policy" ON public.freight_requests;
DROP POLICY IF EXISTS "freight_requests_update_policy" ON public.freight_requests;
DROP POLICY IF EXISTS "freight_requests_delete_policy" ON public.freight_requests;

-- ============================================
-- 2. REMOVER FUNÇÕES ANTIGAS QUE DEPENDEM DE USER_PROFILES
-- ============================================

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_active_user();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.protect_default_tire_status();
DROP FUNCTION IF EXISTS public.can_move_tire(VARCHAR);
DROP FUNCTION IF EXISTS public.get_dashboard_stats();

-- ============================================
-- 3. REMOVER TRIGGERS E TABELA USER_PROFILES
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS protect_default_tire_status_trigger ON public.tire_status;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;

DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ============================================
-- 4. CRIAR FUNÇÕES SIMPLIFICADAS (SEM USER_PROFILES)
-- ============================================

-- Função para verificar se usuário está autenticado
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se é admin (usando metadata do auth.users)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' = 'admin' 
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. POLÍTICAS RLS SIMPLIFICADAS - TIRE_STATUS
-- ============================================

CREATE POLICY "tire_status_select_policy" ON public.tire_status
    FOR SELECT
    USING (TRUE); -- Todos podem visualizar

CREATE POLICY "tire_status_insert_policy" ON public.tire_status
    FOR INSERT
    WITH CHECK (is_authenticated()); -- Qualquer usuário autenticado pode inserir

CREATE POLICY "tire_status_update_policy" ON public.tire_status
    FOR UPDATE
    USING (is_authenticated())
    WITH CHECK (is_authenticated()); -- Qualquer usuário autenticado pode atualizar

CREATE POLICY "tire_status_delete_policy" ON public.tire_status
    FOR DELETE
    USING (is_admin() AND is_default = FALSE); -- Apenas admin pode deletar (não-padrão)

-- ============================================
-- 6. POLÍTICAS RLS - TIRE_MODELS
-- ============================================

CREATE POLICY "tire_models_select_policy" ON public.tire_models
    FOR SELECT
    USING (TRUE); -- Todos podem visualizar

CREATE POLICY "tire_models_insert_policy" ON public.tire_models
    FOR INSERT
    WITH CHECK (is_authenticated());

CREATE POLICY "tire_models_update_policy" ON public.tire_models
    FOR UPDATE
    USING (is_authenticated())
    WITH CHECK (is_authenticated());

CREATE POLICY "tire_models_delete_policy" ON public.tire_models
    FOR DELETE
    USING (is_admin());

-- ============================================
-- 7. POLÍTICAS RLS - CONTAINERS
-- ============================================

CREATE POLICY "containers_select_policy" ON public.containers
    FOR SELECT
    USING (TRUE); -- Todos podem visualizar

CREATE POLICY "containers_insert_policy" ON public.containers
    FOR INSERT
    WITH CHECK (is_authenticated());

CREATE POLICY "containers_update_policy" ON public.containers
    FOR UPDATE
    USING (is_authenticated())
    WITH CHECK (is_authenticated());

CREATE POLICY "containers_delete_policy" ON public.containers
    FOR DELETE
    USING (is_admin());

-- ============================================
-- 8. POLÍTICAS RLS - STOCK_ENTRIES
-- ============================================

CREATE POLICY "stock_entries_select_policy" ON public.stock_entries
    FOR SELECT
    USING (is_authenticated());

CREATE POLICY "stock_entries_insert_policy" ON public.stock_entries
    FOR INSERT
    WITH CHECK (is_authenticated());

CREATE POLICY "stock_entries_update_policy" ON public.stock_entries
    FOR UPDATE
    USING (is_authenticated())
    WITH CHECK (is_authenticated());

CREATE POLICY "stock_entries_delete_policy" ON public.stock_entries
    FOR DELETE
    USING (is_admin());

-- ============================================
-- 9. POLÍTICAS RLS - TIRE_MOVEMENTS
-- ============================================

CREATE POLICY "tire_movements_select_policy" ON public.tire_movements
    FOR SELECT
    USING (is_authenticated());

CREATE POLICY "tire_movements_insert_policy" ON public.tire_movements
    FOR INSERT
    WITH CHECK (is_authenticated());

-- ============================================
-- 10. POLÍTICAS RLS - TIRE_CONSUMPTION
-- ============================================

CREATE POLICY "tire_consumption_select_policy" ON public.tire_consumption
    FOR SELECT
    USING (is_authenticated());

CREATE POLICY "tire_consumption_insert_policy" ON public.tire_consumption
    FOR INSERT
    WITH CHECK (is_authenticated());

-- ============================================
-- 11. POLÍTICAS RLS - FREIGHT_REQUESTS
-- ============================================

CREATE POLICY "freight_requests_select_policy" ON public.freight_requests
    FOR SELECT
    USING (is_authenticated());

CREATE POLICY "freight_requests_insert_policy" ON public.freight_requests
    FOR INSERT
    WITH CHECK (is_authenticated());

CREATE POLICY "freight_requests_update_policy" ON public.freight_requests
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "freight_requests_delete_policy" ON public.freight_requests
    FOR DELETE
    USING (is_admin());

-- ============================================
-- 12. GRANTS DE PERMISSÕES
-- ============================================

GRANT SELECT ON public.tire_status TO anon, authenticated;
GRANT INSERT, UPDATE ON public.tire_status TO authenticated;
GRANT DELETE ON public.tire_status TO authenticated;

GRANT SELECT ON public.tire_models TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tire_models TO authenticated;

GRANT SELECT ON public.containers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.containers TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_entries TO authenticated;
GRANT SELECT, INSERT ON public.tire_movements TO authenticated;
GRANT SELECT, INSERT ON public.tire_consumption TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freight_requests TO authenticated;

-- ============================================
-- 13. VERIFICAÇÃO FINAL
-- ============================================

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE '✅ User_profiles removido com sucesso!';
    RAISE NOTICE '✅ Políticas RLS simplificadas usando apenas auth.uid()';
    RAISE NOTICE '✅ Sistema agora 100%% centralizado no Supabase Authentication';
    RAISE NOTICE '📋 Verifique as políticas listadas acima.';
END $$;
