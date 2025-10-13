import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ActionFeedbackProps {
  show: boolean;
  type: FeedbackType;
  message: string;
  description?: string;
  onClose?: () => void;
  duration?: number;
}

export function ActionFeedback({ 
  show, 
  type, 
  message, 
  description, 
  onClose,
  duration = 3000 
}: ActionFeedbackProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-[#00A86B]" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-[#D50000]" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-[#FFB800]" />;
      case 'info':
        return <Info className="w-6 h-6 text-[#3B82F6]" />;
      case 'loading':
        return <Loader2 className="w-6 h-6 text-[#3B82F6] animate-spin" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-br from-[#00A86B]/10 to-[#00A86B]/5',
          border: 'border-[#00A86B]/30',
          text: 'text-[#00A86B]',
          glow: 'shadow-[0_0_20px_rgba(0,168,107,0.2)]'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-br from-[#D50000]/10 to-[#D50000]/5',
          border: 'border-[#D50000]/30',
          text: 'text-[#D50000]',
          glow: 'shadow-[0_0_20px_rgba(213,0,0,0.2)]'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-br from-[#FFB800]/10 to-[#FFB800]/5',
          border: 'border-[#FFB800]/30',
          text: 'text-[#FFB800]',
          glow: 'shadow-[0_0_20px_rgba(255,184,0,0.2)]'
        };
      case 'info':
      case 'loading':
        return {
          bg: 'bg-gradient-to-br from-[#3B82F6]/10 to-[#3B82F6]/5',
          border: 'border-[#3B82F6]/30',
          text: 'text-[#3B82F6]',
          glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]'
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div className={`${colors.bg} ${colors.border} ${colors.glow} border-2 rounded-2xl p-5 backdrop-blur-xl`}>
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${colors.text} mb-1`}>
                  {message}
                </p>
                {description && (
                  <p className="text-sm text-gray-600">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook para gerenciar feedback
export function useActionFeedback() {
  const [feedback, setFeedback] = React.useState<{
    show: boolean;
    type: FeedbackType;
    message: string;
    description?: string;
  }>({
    show: false,
    type: 'info',
    message: '',
  });

  const showFeedback = (
    type: FeedbackType,
    message: string,
    description?: string,
    duration: number = 3000
  ) => {
    setFeedback({ show: true, type, message, description });
    
    if (type !== 'loading' && duration > 0) {
      setTimeout(() => {
        setFeedback(prev => ({ ...prev, show: false }));
      }, duration);
    }
  };

  const hideFeedback = () => {
    setFeedback(prev => ({ ...prev, show: false }));
  };

  return {
    feedback,
    showFeedback,
    hideFeedback,
  };
}

// Componente de botão com loading state
interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function ActionButton({
  isLoading = false,
  loadingText,
  variant = 'primary',
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ActionButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#D50000] hover:bg-[#A80000] text-white disabled:bg-gray-300 disabled:text-gray-500';
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400';
      case 'destructive':
        return 'bg-[#D50000] hover:bg-[#A80000] text-white disabled:bg-gray-300 disabled:text-gray-500';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-100 text-gray-700 disabled:bg-transparent disabled:text-gray-400';
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        relative inline-flex items-center justify-center gap-2 
        px-6 py-3 rounded-xl font-medium
        transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-60
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D50000] focus-visible:ring-offset-2
        ${getVariantClasses()}
        ${className}
      `}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{loadingText || 'Processando...'}</span>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            {icon}
            <span>{children}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

// Indicador de status inline para campos
interface FieldStatusProps {
  status: 'idle' | 'validating' | 'valid' | 'invalid';
  message?: string;
}

export function FieldStatus({ status, message }: FieldStatusProps) {
  if (status === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center gap-2 mt-2"
    >
      {status === 'validating' && (
        <>
          <Loader2 className="w-4 h-4 text-[#3B82F6] animate-spin" />
          <span className="text-sm text-[#3B82F6]">Validando...</span>
        </>
      )}
      {status === 'valid' && (
        <>
          <CheckCircle2 className="w-4 h-4 text-[#00A86B]" />
          <span className="text-sm text-[#00A86B]">{message || 'Válido'}</span>
        </>
      )}
      {status === 'invalid' && (
        <>
          <XCircle className="w-4 h-4 text-[#D50000]" />
          <span className="text-sm text-[#D50000]">{message || 'Inválido'}</span>
        </>
      )}
    </motion.div>
  );
}

// Import React para o hook
import React from 'react';
