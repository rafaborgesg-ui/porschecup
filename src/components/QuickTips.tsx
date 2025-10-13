import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { X, Lightbulb, Keyboard, Zap, UserCircle } from 'lucide-react';

interface Tip {
  id: string;
  title: string;
  description: string;
  iconName: string;
  module: string;
}

const tips: Record<string, Tip[]> = {
  'tire-stock': [
    {
      id: 'barcode-auto',
      title: 'Entrada Automática',
      description: 'O sistema registra automaticamente quando você digita ou escaneia 8 dígitos no campo de código.',
      iconName: 'Zap',
      module: 'tire-stock',
    },
    {
      id: 'camera-scanner',
      title: 'Scanner de Câmera',
      description: 'No smartphone, clique no ícone da câmera para escanear códigos de barras diretamente com a câmera do dispositivo.',
      iconName: 'Zap',
      module: 'tire-stock',
    },
    {
      id: 'session-counter',
      title: 'Contador de Sessão',
      description: 'As bolinhas verdes nos botões mostram quantos pneus de cada modelo foram escaneados nesta sessão. Perfeito para conferência!',
      iconName: 'Zap',
      module: 'tire-stock',
    },
    {
      id: 'model-buttons',
      title: 'Seleção Rápida',
      description: 'Use os botões A-G para selecionar modelos rapidamente. Alterne para 1-7 clicando no botão de alternância.',
      iconName: 'Keyboard',
      module: 'tire-stock',
    },
  ],
  'tire-consumption': [
    {
      id: 'status-change',
      title: 'Mudança de Status',
      description: 'IMPORTANTE: Apenas o módulo Transferir para Piloto altera o status de pneus de Novo → Piloto. Movimentação não afeta status.',
      iconName: 'UserCircle',
      module: 'tire-consumption',
    },
  ],
  'tire-movement': [
    {
      id: 'no-status-change',
      title: 'Organização Física',
      description: 'Movimentação organiza fisicamente os pneus entre containers, mas não altera o status (Novo/Ativo/Descarte).',
      iconName: 'Lightbulb',
      module: 'tire-movement',
    },
  ],
  'reports': [
    {
      id: 'dashboard-details',
      title: 'Detalhes no Dashboard',
      description: 'Clique em qualquer card do Dashboard para ver uma tabela detalhada dos pneus daquela categoria.',
      iconName: 'Zap',
      module: 'reports',
    },
    {
      id: 'filters',
      title: 'Use os Filtros',
      description: 'Utilize os filtros para encontrar rapidamente pneus específicos, containers ou períodos.',
      iconName: 'Keyboard',
      module: 'reports',
    },
  ],
};

// Mapa de ícones
const iconMap: Record<string, any> = {
  Zap,
  Keyboard,
  UserCircle,
  Lightbulb,
};

interface QuickTipsProps {
  module: string;
}

export function QuickTips({ module }: QuickTipsProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [globalDisabled, setGlobalDisabled] = useState(false);

  const moduleTips = tips[module] || [];
  const visibleTips = moduleTips.filter(tip => !dismissed.includes(tip.id));

  useEffect(() => {
    // Verifica se QuickTips está desabilitado globalmente
    const disabled = localStorage.getItem('quick-tips-disabled');
    if (disabled === 'true') {
      setGlobalDisabled(true);
      return;
    }

    // Carrega dicas dispensadas
    const saved = localStorage.getItem('dismissed-tips');
    if (saved) {
      try {
        setDismissed(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar tips:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Salva dicas dispensadas
    localStorage.setItem('dismissed-tips', JSON.stringify(dismissed));
  }, [dismissed]);

  useEffect(() => {
    // Reset current tip quando mudar de módulo
    setCurrentTip(0);
    
    // Mostra tip após 2 segundos no módulo
    const timer = setTimeout(() => {
      if (visibleTips.length > 0) {
        setShow(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [module]);

  const handleDismiss = () => {
    if (visibleTips.length > 0) {
      const tip = visibleTips[currentTip];
      setDismissed([...dismissed, tip.id]);
      
      if (currentTip < visibleTips.length - 1) {
        setCurrentTip(currentTip + 1);
      } else {
        setShow(false);
      }
    }
  };

  const handleDisableAll = () => {
    localStorage.setItem('quick-tips-disabled', 'true');
    setGlobalDisabled(true);
    setShow(false);
  };

  const handleNext = () => {
    if (currentTip < visibleTips.length - 1) {
      setCurrentTip(currentTip + 1);
    } else {
      setShow(false);
    }
  };

  if (globalDisabled || !show || visibleTips.length === 0) {
    return null;
  }

  const tip = visibleTips[currentTip];
  if (!tip) {
    return null;
  }
  
  const Icon = iconMap[tip.iconName] || Lightbulb;

  return (
    <div className="fixed bottom-24 left-6 z-40 lg:bottom-6 max-w-sm animate-in slide-in-from-bottom-4">
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-xl">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-yellow-900 text-sm">
                  💡 {tip.title}
                </h4>
                <button
                  onClick={handleDismiss}
                  className="text-yellow-600 hover:text-yellow-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-yellow-800">
                {tip.description}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {visibleTips.length > 1 && (
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {visibleTips.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentTip ? 'w-6 bg-yellow-600' : 'w-1.5 bg-yellow-300'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs h-7 px-3"
                >
                  {currentTip < visibleTips.length - 1 ? 'Próxima' : 'Entendi'}
                </Button>
              </div>
            )}
            <button
              onClick={handleDisableAll}
              className="w-full text-center text-xs text-yellow-700 hover:text-yellow-900 underline transition-colors"
            >
              Não mostrar mais dicas
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
