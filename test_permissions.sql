-- ============================================
-- TESTE DE PERMISSÕES E GRANTS
-- ============================================
-- Execute este script para verificar se os GRANTs foram aplicados

-- Verificar permissões de tabelas
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
    AND table_name IN ('tire_status', 'tire_models', 'containers', 'stock_entries', 
                       'tire_movements', 'tire_consumption', 'user_profiles', 'freight_requests')
    AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY table_name, grantee, privilege_type;

-- Verificar se as funções existem e estão acessíveis
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('is_admin', 'is_active_user')
ORDER BY routine_name;

-- Testar autenticação atual
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- Verificar user_profiles do usuário atual
SELECT id, email, role, is_active 
FROM public.user_profiles 
WHERE id = auth.uid();
