import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Use environment variables in production, fallback to hardcoded values for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nflgqugaabtxzifyhjor.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mbGdxdWdhYWJ0eHppZnloam9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNjU4MDQsImV4cCI6MjA3NTg0MTgwNH0.V6Is77Z0AfcY1K3H0b2yr5HDCGKX8OAHdx6bUnZYzOA';

// Singleton instance
let supabaseInstance: any = null;

/**
 * Cria ou retorna a instância singleton do cliente Supabase
 * Configurado para autenticação segura com persistência de sessão
 */
export function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-auth-token', // Nova chave isolada para Supabase
        storage: {
          getItem: (key: string) => {
            if (typeof window !== 'undefined') {
              const value = localStorage.getItem(key);
              // Valida que é um JSON válido antes de retornar
              if (value && value !== 'authenticated') {
                try {
                  JSON.parse(value);
                  return value;
                } catch {
                  // Se não for JSON válido, limpa e retorna null
                  console.warn(`Removendo valor inválido da chave ${key}`);
                  localStorage.removeItem(key);
                  return null;
                }
              }
              return null;
            }
            return null;
          },
          setItem: (key: string, value: string) => {
            if (typeof window !== 'undefined') {
              // Garante que apenas JSON válido é salvo
              try {
                JSON.parse(value);
                localStorage.setItem(key, value);
              } catch {
                console.error(`Tentativa de salvar valor inválido na chave ${key}`);
              }
            }
          },
          removeItem: (key: string) => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(key);
            }
          },
        },
      },
    });
  }
  return supabaseInstance;
}

/**
 * Obtém o token de acesso atual do usuário autenticado
 * @returns Token JWT ou null se não autenticado
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Obtém informações do usuário autenticado
 * @returns User object ou null se não autenticado
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
    role: user.user_metadata?.role || 'operator',
    user_metadata: user.user_metadata,
  };
}

/**
 * Verifica se o usuário está autenticado
 * @returns true se autenticado, false caso contrário
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Logout do usuário
 */
export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
