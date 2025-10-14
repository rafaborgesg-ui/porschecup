-- ============================================
-- POLÍTICA INSERT PARA USER_PROFILES
-- ============================================
-- Esta política permite que novos usuários sejam criados na tabela user_profiles

-- Política de INSERT: permite inserção para usuários autenticados ou admins
CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles
    FOR INSERT 
    WITH CHECK (
        auth.uid() = id OR public.is_admin()
    );

-- Grant permission para INSERT na tabela user_profiles
GRANT INSERT ON TABLE public.user_profiles TO authenticated;

-- ============================================
-- TRIGGER PARA AUTO-CRIAÇÃO DE PERFIL
-- ============================================
-- Este trigger cria automaticamente um perfil quando um usuário se cadastra

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'operator'),
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, user_profiles.name),
        role = COALESCE(EXCLUDED.role, user_profiles.role);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que executa quando um novo usuário é criado no Auth
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON POLICY "user_profiles_insert_policy" ON public.user_profiles IS 'Permite inserção de perfis para usuários autenticados ou admins';
COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-cria perfil de usuário quando um novo usuário se registra no Auth';