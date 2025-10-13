import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { Eye, EyeOff, Lock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import porscheCupLogo from 'figma:asset/3ae08ff326060d9638298673cda23da363101b9f.png';
import { createClient } from '../utils/supabase/client';
import { PasswordRecovery } from './PasswordRecovery';

interface LoginProps {
  onLogin: (userRole: string) => void;
  onSignUp?: () => void;
}

type LoginView = 'login' | 'recovery';

interface ValidationState {
  isValid: boolean;
  message: string;
}

export function Login({ onLogin, onSignUp }: LoginProps) {
  const [currentView, setCurrentView] = useState<LoginView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailValidation, setEmailValidation] = useState<ValidationState>({ isValid: false, message: '' });
  const [passwordValidation, setPasswordValidation] = useState<ValidationState>({ isValid: false, message: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  // Validação em tempo real do email
  useEffect(() => {
    if (!touched.email) return;
    
    if (email.length === 0) {
      setEmailValidation({ isValid: false, message: 'Email é obrigatório' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailValidation({ isValid: false, message: 'Email inválido' });
    } else {
      setEmailValidation({ isValid: true, message: 'Email válido' });
    }
  }, [email, touched.email]);

  // Validação em tempo real da senha
  useEffect(() => {
    if (!touched.password) return;
    
    if (password.length === 0) {
      setPasswordValidation({ isValid: false, message: 'Senha é obrigatória' });
    } else if (password.length < 6) {
      setPasswordValidation({ isValid: false, message: 'Mínimo 6 caracteres' });
    } else {
      setPasswordValidation({ isValid: true, message: 'Senha válida' });
    }
  }, [password, touched.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Marca todos os campos como touched
    setTouched({ email: true, password: true });
    
    if (!email.trim() || !password.trim()) {
      toast.error('Campos obrigatórios', {
        description: 'Por favor, preencha email e senha.',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 🔓 CREDENCIAIS DE DESENVOLVIMENTO - Acesso rápido localhost
      // Email: rafael.borges@porschegt3cup.com.br | Senha: Porschegt3cupHere
      if (email === 'rafael.borges@porschegt3cup.com.br' && password === 'Porschegt3cupHere') {
        const devUser = {
          id: 'dev-admin-local',
          email: 'rafael.borges@porschegt3cup.com.br',
          name: 'Rafael Borges (DEV)',
          role: 'admin',
        };

        // Salva apenas os dados do usuário (não 'authenticated' que conflita com Supabase)
        localStorage.setItem('porsche-cup-user', JSON.stringify(devUser));

        toast.success('🚀 Login DEV realizado!', {
          description: 'Bem-vindo, Rafael Borges (modo desenvolvimento)',
        });

        onLogin('admin');
        return;
      }

      // Verifica validação para credenciais reais
      if (!emailValidation.isValid || !passwordValidation.isValid) {
        toast.error('Dados inválidos', {
          description: 'Por favor, corrija os erros antes de continuar.',
        });
        setIsLoading(false);
        return;
      }

      // Autentica via Supabase Auth (produção)
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        toast.error('Credenciais inválidas', {
          description: error.message || 'Email ou senha incorretos.',
        });
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        toast.error('Erro no login', {
          description: 'Não foi possível autenticar. Tente novamente.',
        });
        setIsLoading(false);
        return;
      }

      // Extrai informações do usuário
      const user = data.user;
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
      const role = user.user_metadata?.role || 'operator';

      // Salva informações do usuário no localStorage (Supabase Auth já gerencia a sessão)
      localStorage.setItem('porsche-cup-user', JSON.stringify({
        id: user.id,
        email: user.email,
        name,
        role,
      }));

      toast.success('Login realizado com sucesso!', {
        description: `Bem-vindo, ${name}`,
      });

      // Chama callback de login
      onLogin(role);
    } catch (error: any) {
      console.error('Login exception:', error);
      toast.error('Erro ao fazer login', {
        description: error.message || 'Ocorreu um erro inesperado. Tente novamente.',
      });
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Inicia OAuth com Google
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google login error:', error);
        toast.error('Erro no login com Google', {
          description: error.message || 'Não foi possível autenticar com Google.',
        });
        setIsLoading(false);
        return;
      }

      // O usuário será redirecionado para o Google
      // Após autenticação, voltará para a aplicação
    } catch (error: any) {
      console.error('Google login exception:', error);
      toast.error('Erro ao fazer login com Google', {
        description: error.message || 'Ocorreu um erro inesperado.',
      });
      setIsLoading(false);
    }
  };

  // Se está na view de recuperação, mostra o componente
  if (currentView === 'recovery') {
    return <PasswordRecovery onBack={() => setCurrentView('login')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,.05) 10px,
            rgba(255,255,255,.05) 20px
          )`
        }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-auto h-20 px-6 rounded-2xl bg-gradient-to-br from-[#000000] to-[#000000] mb-6 shadow-2xl shadow-red-900/50">
            <img 
              src={porscheCupLogo} 
              alt="Porsche Cup Brasil" 
              className="h-12 w-auto object-contain"
            />
          </div>

          <p className="text-gray-400">Supply Chain System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  placeholder="Digite seu email"
                  className={`!pl-12 pr-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 transition-all ${
                    touched.email
                      ? emailValidation.isValid
                        ? 'border-[#00A86B] focus:border-[#00A86B] focus:ring-[#00A86B]/20'
                        : 'border-[#D50000] focus:border-[#D50000] focus:ring-[#D50000]/20'
                      : 'focus:border-[#D50000] focus:ring-[#D50000]/20'
                  }`}
                  style={{ paddingLeft: '3rem' }}
                  disabled={isLoading}
                  autoFocus
                  autoComplete="email"
                />
                {touched.email && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {emailValidation.isValid ? (
                      <CheckCircle2 className="text-[#00A86B]" size={20} />
                    ) : (
                      <AlertCircle className="text-[#D50000]" size={20} />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  placeholder="Digite sua senha"
                  className={`!pl-12 pr-24 bg-white/10 border-white/20 text-white placeholder:text-gray-400 transition-all ${
                    touched.password
                      ? passwordValidation.isValid
                        ? 'border-[#00A86B] focus:border-[#00A86B] focus:ring-[#00A86B]/20'
                        : 'border-[#D50000] focus:border-[#D50000] focus:ring-[#D50000]/20'
                      : 'focus:border-[#D50000] focus:ring-[#D50000]/20'
                  }`}
                  style={{ paddingLeft: '3rem' }}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {touched.password && (
                    <div>
                      {passwordValidation.isValid ? (
                        <CheckCircle2 className="text-[#00A86B]" size={20} />
                      ) : (
                        <AlertCircle className="text-[#D50000]" size={20} />
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || (touched.email && !emailValidation.isValid) || (touched.password && !passwordValidation.isValid)}
              className="w-full bg-gradient-to-r from-[#D50000] to-[#B00000] hover:from-[#B00000] hover:to-[#8B0000] text-white py-6 rounded-xl shadow-lg shadow-red-900/30 transition-all duration-200 hover:shadow-xl hover:shadow-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                'Entrar'
              )}
            </Button>

            {/* Forgot Password & Sign Up */}
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setCurrentView('recovery')}
                className="text-gray-300 hover:text-white transition-colors underline"
                disabled={isLoading}
              >
                Esqueci minha senha
              </button>
              
              {onSignUp && (
                <button
                  type="button"
                  onClick={onSignUp}
                  className="text-[#D50000] hover:text-[#FF5252] transition-colors font-medium"
                  disabled={isLoading}
                >
                  Criar conta
                </button>
              )}
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/10 px-3 text-gray-400">Ou continue com</span>
            </div>
          </div>

          {/* Google Login */}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 py-6 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Conectando...' : 'Entrar com Google'}
          </Button>

          {/* Credenciais de DEV - Visível apenas em localhost */}
          {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
            <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-xs text-blue-300 text-center leading-relaxed">
                💻 <strong>Modo DEV:</strong> Use credenciais de desenvolvimento para acesso rápido como Admin
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            © 2025 Porsche Cup Brasil. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
