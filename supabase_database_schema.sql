-- ============================================
-- PORSCHE CUP - DATABASE SCHEMA PARA SUPABASE
-- ============================================
-- Este arquivo contém todas as estruturas de tabelas necessárias
-- para o projeto Porsche Cup baseadas na análise dos componentes

-- ============================================
-- 1. TIRE MODELS - Modelos de Pneus
-- ============================================
CREATE TABLE public.tire_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Slick', 'Wet')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(name),
    UNIQUE(code)
);

-- ============================================
-- 2. CONTAINERS - Contêineres de Armazenamento
-- ============================================
CREATE TABLE public.containers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CHECK (current_stock <= capacity)
);

-- ============================================
-- 3. TIRE STATUS - Status Personalizados de Pneus
-- ============================================
CREATE TABLE public.tire_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- Hex color code
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Inserir status padrão do sistema
INSERT INTO public.tire_status (name, color, is_default) VALUES
('Novo', '#3B82F6', TRUE),
('Ativo', '#10B981', TRUE),
('Descarte', '#DC2626', TRUE);

-- ============================================
-- 4. STOCK ENTRIES - Entradas de Estoque de Pneus
-- ============================================
CREATE TABLE public.stock_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barcode VARCHAR(255) NOT NULL UNIQUE,
    model_id UUID NOT NULL REFERENCES public.tire_models(id) ON DELETE RESTRICT,
    model_name VARCHAR(255) NOT NULL, -- Desnormalizado para performance
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('Slick', 'Wet')),
    container_id UUID REFERENCES public.containers(id) ON DELETE SET NULL,
    container_name VARCHAR(100), -- Desnormalizado para performance
    status VARCHAR(50) DEFAULT 'Novo',
    session_id VARCHAR(255), -- Para agrupar entradas da mesma sessão
    pilot VARCHAR(255), -- Piloto quando transferido
    team VARCHAR(255), -- Equipe/etapa quando consumido
    notes TEXT, -- Observações gerais
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Índices para stock_entries
CREATE INDEX idx_stock_entries_barcode ON public.stock_entries (barcode);
CREATE INDEX idx_stock_entries_model_id ON public.stock_entries (model_id);
CREATE INDEX idx_stock_entries_container_id ON public.stock_entries (container_id);
CREATE INDEX idx_stock_entries_status ON public.stock_entries (status);
CREATE INDEX idx_stock_entries_created_at ON public.stock_entries (created_at);

-- ============================================
-- 5. TIRE MOVEMENTS - Movimentações de Pneus
-- ============================================
CREATE TABLE public.tire_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barcode VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('Slick', 'Wet')),
    from_container_id UUID REFERENCES public.containers(id) ON DELETE SET NULL,
    from_container_name VARCHAR(100),
    to_container_id UUID REFERENCES public.containers(id) ON DELETE SET NULL,
    to_container_name VARCHAR(100),
    reason TEXT, -- Motivo da movimentação
    moved_by UUID REFERENCES auth.users(id),
    moved_by_name VARCHAR(255), -- Desnormalizado para performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tire_movements
CREATE INDEX idx_tire_movements_barcode ON public.tire_movements (barcode);
CREATE INDEX idx_tire_movements_created_at ON public.tire_movements (created_at);
CREATE INDEX idx_tire_movements_moved_by ON public.tire_movements (moved_by);

-- ============================================
-- 6. TIRE CONSUMPTION - Consumo/Transferências de Pneus
-- ============================================
CREATE TABLE public.tire_consumption (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barcode VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('Slick', 'Wet')),
    container_name VARCHAR(100),
    pilot VARCHAR(255), -- Piloto que recebeu o pneu
    team VARCHAR(255), -- Etapa da corrida ou equipe
    notes TEXT, -- Observações sobre o consumo
    registered_by UUID REFERENCES auth.users(id),
    registered_by_name VARCHAR(255), -- Desnormalizado para performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tire_consumption
CREATE INDEX idx_tire_consumption_barcode ON public.tire_consumption (barcode);
CREATE INDEX idx_tire_consumption_pilot ON public.tire_consumption (pilot);
CREATE INDEX idx_tire_consumption_created_at ON public.tire_consumption (created_at);

-- ============================================
-- 7. USERS - Usuários do Sistema (Profile Extensions)
-- ============================================
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(email)
);

-- ============================================
-- 8. FREIGHT REQUESTS - Solicitações de Frete (Futura Implementação)
-- ============================================
CREATE TABLE public.freight_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('nacional', 'internacional')),
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    items JSONB NOT NULL, -- Array de itens a serem transportados
    weight DECIMAL(10,2),
    volume DECIMAL(10,2),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'em_transito', 'entregue', 'cancelado')),
    notes TEXT,
    requested_by UUID REFERENCES auth.users(id),
    requested_by_name VARCHAR(255),
    approved_by UUID REFERENCES auth.users(id),
    delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para freight_requests
CREATE INDEX idx_freight_requests_type ON public.freight_requests (type);
CREATE INDEX idx_freight_requests_status ON public.freight_requests (status);
CREATE INDEX idx_freight_requests_requested_by ON public.freight_requests (requested_by);
CREATE INDEX idx_freight_requests_created_at ON public.freight_requests (created_at);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas necessárias
CREATE TRIGGER update_tire_models_updated_at BEFORE UPDATE ON public.tire_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON public.containers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tire_status_updated_at BEFORE UPDATE ON public.tire_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_entries_updated_at BEFORE UPDATE ON public.stock_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_freight_requests_updated_at BEFORE UPDATE ON public.freight_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS PARA ATUALIZAÇÕES AUTOMÁTICAS
-- ============================================

-- Function para atualizar ocupação de containers automaticamente
CREATE OR REPLACE FUNCTION update_container_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza o container de origem (se houver)
    IF OLD.container_id IS NOT NULL THEN
        UPDATE public.containers 
        SET current_stock = (
            SELECT COUNT(*) 
            FROM public.stock_entries 
            WHERE container_id = OLD.container_id 
            AND status NOT IN ('Descarte')
        )
        WHERE id = OLD.container_id;
    END IF;
    
    -- Atualiza o container de destino (se houver)
    IF NEW.container_id IS NOT NULL THEN
        UPDATE public.containers 
        SET current_stock = (
            SELECT COUNT(*) 
            FROM public.stock_entries 
            WHERE container_id = NEW.container_id 
            AND status NOT IN ('Descarte')
        )
        WHERE id = NEW.container_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar ocupação dos containers quando stock_entries mudar
CREATE TRIGGER update_container_occupancy_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON public.stock_entries 
    FOR EACH ROW EXECUTE FUNCTION update_container_occupancy();

-- ============================================
-- FUNCTION PARA CRIAR USER PROFILE AUTOMATICAMENTE
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'operator')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger para criar profile quando usuário é criado
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DADOS INICIAIS (SEEDS)
-- ============================================

-- Modelos de pneus padrão
INSERT INTO public.tire_models (name, code, type) VALUES
('Slick 991 Dianteiro', '27/65-18 N2', 'Slick'),
('Slick 991 Traseiro', '31/71-18 N2', 'Slick'),
('Slick 992 Dianteiro', '30/65-18 N3', 'Slick'),
('Slick 992 Traseiro', '31/71-18 N3R', 'Slick'),
('Wet 991 Dianteiro', '27/65-18 P2L', 'Wet'),
('Wet 992 Dianteiro', '30/65-18 P2L', 'Wet'),
('Wet 991 e 992 Traseiro', '31/71-18 P2L', 'Wet')
ON CONFLICT (name) DO NOTHING;

-- Containers padrão
INSERT INTO public.containers (name, location, capacity) VALUES
('C-001', 'Galpão A - Setor 1', 200),
('C-002', 'Galpão A - Setor 2', 200),
('C-003', 'Galpão B - Setor 1', 150),
('C-004', 'Galpão B - Setor 2', 150),
('C-005', 'Galpão C - Setor 1', 300)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE public.tire_models IS 'Modelos de pneus cadastrados no sistema';
COMMENT ON TABLE public.containers IS 'Contêineres para armazenamento de pneus';
COMMENT ON TABLE public.tire_status IS 'Status personalizados para pneus';
COMMENT ON TABLE public.stock_entries IS 'Entradas de estoque de pneus com códigos de barras';
COMMENT ON TABLE public.tire_movements IS 'Histórico de movimentações de pneus entre contêineres';
COMMENT ON TABLE public.tire_consumption IS 'Registros de consumo/transferências de pneus para pilotos';
COMMENT ON TABLE public.user_profiles IS 'Perfis estendidos dos usuários do sistema';
COMMENT ON TABLE public.freight_requests IS 'Solicitações de frete nacional e internacional';

COMMENT ON COLUMN public.stock_entries.barcode IS 'Código de barras único do pneu';
COMMENT ON COLUMN public.stock_entries.session_id IS 'ID da sessão de entrada para agrupamento';
COMMENT ON COLUMN public.tire_movements.reason IS 'Motivo da movimentação do pneu';
COMMENT ON COLUMN public.tire_consumption.pilot IS 'Piloto que recebeu o pneu';
COMMENT ON COLUMN public.tire_consumption.team IS 'Etapa da corrida ou equipe';