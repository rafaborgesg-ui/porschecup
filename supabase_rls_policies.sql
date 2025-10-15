-- ============================================
-- PORSCHE CUP - ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Este arquivo contém as políticas de segurança para controle de acesso

-- ============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE public.tire_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freight_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS PARA RLS
-- ============================================

-- Function para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND is_active = TRUE
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function para verificar se usuário está ativo
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND is_active = TRUE
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================
-- RLS POLICIES - TIRE MODELS
-- ============================================

-- Todos podem visualizar (incluindo anônimos para inicialização)
CREATE POLICY "tire_models_select_policy" ON public.tire_models
    FOR SELECT USING (TRUE);

-- Usuários ativos podem inserir modelos
CREATE POLICY "tire_models_insert_policy" ON public.tire_models
    FOR INSERT WITH CHECK (public.is_active_user() OR public.is_admin());

-- Usuários ativos podem atualizar modelos
CREATE POLICY "tire_models_update_policy" ON public.tire_models
    FOR UPDATE USING (public.is_active_user() OR public.is_admin());

-- Apenas admins podem deletar modelos
CREATE POLICY "tire_models_delete_policy" ON public.tire_models
    FOR DELETE USING (public.is_admin());

-- ============================================
-- RLS POLICIES - CONTAINERS
-- ============================================

-- Todos podem visualizar (incluindo anônimos para inicialização)
CREATE POLICY "containers_select_policy" ON public.containers
    FOR SELECT USING (TRUE);

-- Usuários ativos podem inserir containers
CREATE POLICY "containers_insert_policy" ON public.containers
    FOR INSERT WITH CHECK (public.is_active_user() OR public.is_admin());

-- Usuários ativos podem atualizar containers
CREATE POLICY "containers_update_policy" ON public.containers
    FOR UPDATE USING (public.is_active_user() OR public.is_admin());

-- Apenas admins podem deletar containers
CREATE POLICY "containers_delete_policy" ON public.containers
    FOR DELETE USING (public.is_admin());

-- ============================================
-- RLS POLICIES - TIRE STATUS
-- ============================================

-- Todos (incluindo anon) podem ver os status para inicialização
CREATE POLICY "tire_status_select_policy" ON public.tire_status
    FOR SELECT USING (TRUE);

-- Permite inserção de status padrão durante inicialização + admins podem inserir customizados
CREATE POLICY "tire_status_insert_policy" ON public.tire_status
    FOR INSERT WITH CHECK (
        is_default = TRUE OR public.is_admin()
    );

-- Admin pode atualizar tudo, usuários ativos podem atualizar apenas status padrão
CREATE POLICY "tire_status_update_policy" ON public.tire_status
    FOR UPDATE 
    USING (public.is_admin() OR (public.is_active_user() AND is_default = TRUE))
    WITH CHECK (public.is_admin() OR (public.is_active_user() AND is_default = TRUE));

-- Apenas admins podem deletar status não-padrão
CREATE POLICY "tire_status_delete_policy" ON public.tire_status
    FOR DELETE USING (public.is_admin() AND NOT is_default);

-- ============================================
-- RLS POLICIES - STOCK ENTRIES
-- ============================================

-- Qualquer usuário ativo pode ver entradas de estoque
CREATE POLICY "stock_entries_select_policy" ON public.stock_entries
    FOR SELECT USING (public.is_active_user());

-- Qualquer usuário ativo pode inserir entradas
CREATE POLICY "stock_entries_insert_policy" ON public.stock_entries
    FOR INSERT WITH CHECK (public.is_active_user());

-- Qualquer usuário ativo pode atualizar entradas
CREATE POLICY "stock_entries_update_policy" ON public.stock_entries
    FOR UPDATE USING (public.is_active_user());

-- Apenas admins podem deletar entradas de estoque
CREATE POLICY "stock_entries_delete_policy" ON public.stock_entries
    FOR DELETE USING (public.is_admin());

-- ============================================
-- RLS POLICIES - TIRE MOVEMENTS
-- ============================================

-- Qualquer usuário ativo pode ver movimentações
CREATE POLICY "tire_movements_select_policy" ON public.tire_movements
    FOR SELECT USING (public.is_active_user());

-- Qualquer usuário ativo pode inserir movimentações
CREATE POLICY "tire_movements_insert_policy" ON public.tire_movements
    FOR INSERT WITH CHECK (public.is_active_user());

-- Não permite atualização de movimentações (histórico imutável)
-- CREATE POLICY "tire_movements_update_policy" ON public.tire_movements
--     FOR UPDATE USING (false);

-- Apenas admins podem deletar movimentações (para correções)
CREATE POLICY "tire_movements_delete_policy" ON public.tire_movements
    FOR DELETE USING (public.is_admin());

-- ============================================
-- RLS POLICIES - TIRE CONSUMPTION
-- ============================================

-- Qualquer usuário ativo pode ver registros de consumo
CREATE POLICY "tire_consumption_select_policy" ON public.tire_consumption
    FOR SELECT USING (public.is_active_user());

-- Qualquer usuário ativo pode inserir registros de consumo
CREATE POLICY "tire_consumption_insert_policy" ON public.tire_consumption
    FOR INSERT WITH CHECK (public.is_active_user());

-- Não permite atualização de consumo (histórico imutável)
-- CREATE POLICY "tire_consumption_update_policy" ON public.tire_consumption
--     FOR UPDATE USING (false);

-- Apenas admins podem deletar registros de consumo (para correções)
CREATE POLICY "tire_consumption_delete_policy" ON public.tire_consumption
    FOR DELETE USING (public.is_admin());

-- ============================================
-- RLS POLICIES - USER PROFILES
-- ============================================

-- Usuários podem ver apenas seus próprios perfis (admins veem todos)
CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
    FOR SELECT USING (
        auth.uid() = id OR public.is_admin()
    );

-- Apenas o próprio usuário pode atualizar seu perfil (admins podem atualizar qualquer um)
CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
    FOR UPDATE USING (
        auth.uid() = id OR public.is_admin()
    );

-- Apenas admins podem deletar perfis de usuário
CREATE POLICY "user_profiles_delete_policy" ON public.user_profiles
    FOR DELETE USING (public.is_admin());

-- ============================================
-- RLS POLICIES - FREIGHT REQUESTS
-- ============================================

-- Usuários podem ver suas próprias solicitações (admins veem todas)
CREATE POLICY "freight_requests_select_policy" ON public.freight_requests
    FOR SELECT USING (
        auth.uid() = requested_by OR public.is_admin()
    );

-- Qualquer usuário ativo pode criar solicitações
CREATE POLICY "freight_requests_insert_policy" ON public.freight_requests
    FOR INSERT WITH CHECK (public.is_active_user());

-- Usuários podem atualizar suas próprias solicitações pendentes (admins podem atualizar qualquer uma)
CREATE POLICY "freight_requests_update_policy" ON public.freight_requests
    FOR UPDATE USING (
        (auth.uid() = requested_by AND status = 'pendente') OR 
        public.is_admin()
    );

-- Usuários podem deletar suas próprias solicitações pendentes (admins podem deletar qualquer uma)
CREATE POLICY "freight_requests_delete_policy" ON public.freight_requests
    FOR DELETE USING (
        (auth.uid() = requested_by AND status = 'pendente') OR 
        public.is_admin()
    );

-- ============================================
-- GRANTS PARA AUTHENTICATED USERS
-- ============================================

-- Garante que usuários autenticados tenham permissões básicas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Tire Models
GRANT SELECT ON TABLE public.tire_models TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.tire_models TO authenticated;

-- Containers
GRANT SELECT ON TABLE public.containers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.containers TO authenticated;

-- Tire Status
GRANT SELECT ON TABLE public.tire_status TO authenticated;
GRANT SELECT ON TABLE public.tire_status TO anon;
GRANT INSERT, UPDATE, DELETE ON TABLE public.tire_status TO authenticated;
GRANT INSERT ON TABLE public.tire_status TO anon;

-- Stock Entries
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stock_entries TO authenticated;

-- Tire Movements
GRANT SELECT, INSERT ON TABLE public.tire_movements TO authenticated;
GRANT DELETE ON TABLE public.tire_movements TO authenticated;

-- Tire Consumption
GRANT SELECT, INSERT ON TABLE public.tire_consumption TO authenticated;
GRANT DELETE ON TABLE public.tire_consumption TO authenticated;

-- User Profiles
GRANT SELECT, UPDATE ON TABLE public.user_profiles TO authenticated;
GRANT DELETE ON TABLE public.user_profiles TO authenticated;

-- Freight Requests
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.freight_requests TO authenticated;

-- Sequences (para IDs gerados automaticamente)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- FUNÇÕES ADICIONAIS PARA BUSINESS LOGIC
-- ============================================

-- Function para validar se um pneu pode ser movido
CREATE OR REPLACE FUNCTION public.can_move_tire(p_barcode VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    tire_status VARCHAR;
BEGIN
    SELECT status INTO tire_status 
    FROM public.stock_entries 
    WHERE barcode = p_barcode;
    
    -- Só pode mover pneus que não estão descartados
    RETURN tire_status IS NOT NULL AND tire_status != 'Descarte';
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function para obter estatísticas de dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_tires', (SELECT COUNT(*) FROM public.stock_entries WHERE status != 'Descarte'),
        'active_tires', (SELECT COUNT(*) FROM public.stock_entries WHERE status = 'Ativo'),
        'new_tires', (SELECT COUNT(*) FROM public.stock_entries WHERE status = 'Novo'),
        'discarded_tires', (SELECT COUNT(*) FROM public.stock_entries WHERE status = 'Descarte'),
        'total_containers', (SELECT COUNT(*) FROM public.containers),
        'total_models', (SELECT COUNT(*) FROM public.tire_models),
        'movements_today', (SELECT COUNT(*) FROM public.tire_movements WHERE DATE(created_at) = CURRENT_DATE),
        'consumption_today', (SELECT COUNT(*) FROM public.tire_consumption WHERE DATE(created_at) = CURRENT_DATE)
    ) INTO result;
    
    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function para proteger status padrão de alterações
CREATE OR REPLACE FUNCTION public.protect_default_tire_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Impede alteração do campo is_default dos status padrão
    IF OLD.is_default = TRUE AND NEW.is_default != OLD.is_default THEN
        RAISE EXCEPTION 'Cannot change is_default for default tire status';
    END IF;
    
    -- Impede alteração do nome dos status padrão
    IF OLD.is_default = TRUE AND NEW.name != OLD.name THEN
        RAISE EXCEPTION 'Cannot change name for default tire status';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger para proteger status padrão
CREATE TRIGGER protect_default_tire_status_trigger
    BEFORE UPDATE ON public.tire_status
    FOR EACH ROW EXECUTE FUNCTION public.protect_default_tire_status();

-- Grant para usar as funções
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_move_tire(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_default_tire_status() TO authenticated;

-- ============================================
-- GRANT PERMISSIONS PARA TABELAS
-- ============================================

-- Permitir leitura de tire_status (necessário para inicialização)
GRANT SELECT ON public.tire_status TO anon, authenticated;
GRANT INSERT ON public.tire_status TO anon, authenticated;
GRANT UPDATE ON public.tire_status TO authenticated;

-- Permitir leitura de tire_models (necessário para cadastros)
GRANT SELECT ON public.tire_models TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tire_models TO authenticated;

-- Permitir leitura de containers (necessário para cadastros)
GRANT SELECT ON public.containers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.containers TO authenticated;

-- Permitir operações em stock_entries
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_entries TO authenticated;

-- Permitir operações em tire_movements
GRANT SELECT, INSERT ON public.tire_movements TO authenticated;

-- Permitir operações em tire_consumption
GRANT SELECT, INSERT ON public.tire_consumption TO authenticated;

-- Permitir operações em user_profiles
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- Permitir operações em freight_requests
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freight_requests TO authenticated;

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON FUNCTION public.is_admin() IS 'Verifica se o usuário atual é administrador';
COMMENT ON FUNCTION public.is_active_user() IS 'Verifica se o usuário atual está ativo';
COMMENT ON FUNCTION public.can_move_tire(VARCHAR) IS 'Verifica se um pneu pode ser movimentado baseado em seu status';
COMMENT ON FUNCTION public.get_dashboard_stats() IS 'Retorna estatísticas para o dashboard em formato JSON';
COMMENT ON FUNCTION public.protect_default_tire_status() IS 'Protege status padrão de alterações indevidas';