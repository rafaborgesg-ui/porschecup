-- ============================================
-- FIX: RLS POLICY PARA TIRE_STATUS
-- ============================================
-- Correção para permitir a inserção dos status padrão
-- durante a inicialização do sistema

-- Remove a política de INSERT existente
DROP POLICY IF EXISTS "tire_status_insert_policy" ON public.tire_status;

-- Cria uma nova política que permite:
-- 1. Admins podem inserir qualquer status
-- 2. Sistema pode inserir status padrão (is_default = TRUE) mesmo sem autenticação
CREATE POLICY "tire_status_insert_policy" ON public.tire_status
    FOR INSERT WITH CHECK (
        public.is_admin() OR 
        (is_default = TRUE AND auth.uid() IS NULL) OR
        (is_default = TRUE)
    );

-- Alternativa: Desabilitar RLS temporariamente apenas para inserção dos status padrão
-- Se preferir, pode executar este bloco em vez da policy acima:
/*
-- Desabilita RLS temporariamente
ALTER TABLE public.tire_status DISABLE ROW LEVEL SECURITY;

-- Insere os status padrão se ainda não existirem
INSERT INTO public.tire_status (name, color, is_default) 
VALUES
    ('Novo', '#3B82F6', TRUE),
    ('Ativo', '#10B981', TRUE),
    ('Descarte', '#DC2626', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Reabilita RLS
ALTER TABLE public.tire_status ENABLE ROW LEVEL SECURITY;

-- Cria policy normal (apenas admins podem inserir novos status)
CREATE POLICY "tire_status_insert_policy" ON public.tire_status
    FOR INSERT WITH CHECK (public.is_admin());
*/

-- ============================================
-- GRANT ADICIONAL PARA ANON (se necessário)
-- ============================================
-- Permite que o usuário anônimo insira apenas os status padrão
GRANT INSERT ON TABLE public.tire_status TO anon;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Para verificar se os status padrão existem:
-- SELECT * FROM public.tire_status WHERE is_default = TRUE;

-- Para testar a inserção (como admin):
-- INSERT INTO public.tire_status (name, color, is_default) VALUES ('Teste', '#FF0000', FALSE);
