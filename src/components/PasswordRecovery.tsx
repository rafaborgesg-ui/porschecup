import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import porscheCupLogo from 'figma:asset/3ae08ff326060d9638298673cda23da363101b9f.png';
import { requestPasswordRecoveryAPI } from '../utils/api';

interface PasswordRecoveryProps {
  onBack: () => void;
}

export function PasswordRecovery({ onBack }: PasswordRecoveryProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailValidation, setEmailValidation] = useState<{ isValid: boolean; message: string }>({ 
    isValid: false, 
    message: '' 
  });
  const [touched, setTouched] = useState(false);

  // Validação em tempo real do email
  const validateEmail = (value: string) => {
    if (!touched) return;
    
    if (value.length === 0) {
      setEmailValidation({ isValid: false, message: 'Email é obrigatório' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailValidation({ isValid: false, message: 'Email inválido' });
    } else {
      setEmailValidation({ isValid: true, message: 'Email válido' });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched(true);
    validateEmail(email);
    
    if (!email.trim()) {
      toast.error('Email obrigatório', {
        description: 'Por favor, informe seu email.',
      });
      return;
    }

    if (!emailValidation.isValid) {
      toast.error('Email inválido', {
        description: 'Por favor, informe um email válido.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await requestPasswordRecoveryAPI(email);

      if (response.success) {
        setIsSuccess(true);
        toast.success('Email enviado!', {
          description: response.message || 'Verifique sua caixa de entrada.',
        });
      } else {
        toast.error('Erro ao enviar email', {
          description: response.error || 'Tente novamente mais tarde.',
        });
      }
    } catch (error: any) {
      console.error('Password recovery error:', error);
      toast.error('Erro ao enviar email', {
        description: 'Ocorreu um erro inesperado. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
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
          </div>

          {/* Success Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#00A86B] to-[#008F5A] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Mail className="text-white" size={40} />
            </div>

            <h2 className="text-white text-2xl mb-4">Email Enviado!</h2>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              Enviamos instruções para recuperação de senha para <strong className="text-white">{email}</strong>.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-300">
                Verifique sua caixa de entrada e spam. O link é válido por 1 hora.
              </p>
            </div>

            <Button
              onClick={onBack}
              className="w-full bg-gradient-to-r from-[#D50000] to-[#B00000] hover:from-[#B00000] hover:to-[#8B0000] text-white py-6 rounded-xl shadow-lg shadow-red-900/30 transition-all duration-200 hover:shadow-xl hover:shadow-red-900/50"
            >
              Voltar ao Login
            </Button>
          </div>
        </div>
      </div>
    );
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

          <h2 className="text-white text-2xl mb-2">Recuperar Senha</h2>
          <p className="text-gray-400">Informe seu email para receber instruções</p>
        </div>

        {/* Recovery Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="recovery-email" className="text-white">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => {
                    setTouched(true);
                    validateEmail(email);
                  }}
                  placeholder="Digite seu email"
                  className={`!pl-12 pr-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 transition-all ${
                    touched
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
                {touched && (
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || (touched && !emailValidation.isValid)}
              className="w-full bg-gradient-to-r from-[#D50000] to-[#B00000] hover:from-[#B00000] hover:to-[#8B0000] text-white py-6 rounded-xl shadow-lg shadow-red-900/30 transition-all duration-200 hover:shadow-xl hover:shadow-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </div>
              ) : (
                'Enviar Email de Recuperação'
              )}
            </Button>

            {/* Back Button */}
            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 text-gray-300 hover:text-white transition-colors py-3"
              disabled={isLoading}
            >
              <ArrowLeft size={18} />
              Voltar ao Login
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Você receberá um email com instruções para criar uma nova senha. 
              O link é válido por 1 hora.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
