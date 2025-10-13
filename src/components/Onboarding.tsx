import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Package, 
  UserCircle, 
  Archive, 
  Trash2,
  BarChart3,
  Lightbulb,
  Rocket,
  PlayCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  target?: string;
  action?: string;
  tip?: string;
  video?: string;
}

interface OnboardingProps {
  userRole: string;
  onComplete: () => void;
  onModuleChange: (module: string) => void;
}

export function Onboarding({ userRole, onComplete, onModuleChange }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showTour, setShowTour] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao Porsche Cup Brasil! 🏁',
      description: 'Sistema de Gestão de Pneus para operações de competição de alto desempenho.',
      icon: Rocket,
      tip: 'Este sistema foi desenvolvido especificamente para a Porsche Cup Brasil, oferecendo controle total sobre o estoque de pneus.'
    },
    {
      id: 'dashboard',
      title: 'Dashboard - Visão Geral',
      description: 'Acompanhe métricas em tempo real: total de pneus, ativos, novos e descartados.',
      icon: BarChart3,
      target: 'dashboard',
      action: 'dashboard',
      tip: 'Clique em qualquer card do dashboard para ver detalhes completos dos pneus daquela categoria.',
    },
    {
      id: 'entry',
      title: 'Entrada de Estoque',
      description: 'Registre novos pneus usando código de barras (8 dígitos) ou entrada manual.',
      icon: Package,
      target: 'tire-stock',
      action: 'tire-stock',
      tip: 'O sistema registra automaticamente quando você digita ou escaneia um código de 8 dígitos. Use os botões A-G para seleção rápida de modelos.',
    },
    {
      id: 'consumption',
      title: 'Consumo - Ativação de Pneus',
      description: 'Transfira pneus para pilotos. Isso altera o status de Novo → Piloto.',
      icon: UserCircle,
      target: 'tire-consumption',
      action: 'tire-consumption',
      tip: 'IMPORTANTE: Apenas o módulo Transferir para Piloto altera o status dos pneus de Novo para Piloto. Movimentação de containers não afeta o status.',
    },
    {
      id: 'movement',
      title: 'Movimentação de Containers',
      description: 'Mova pneus entre containers para organizar o estoque.',
      icon: Archive,
      target: 'tire-movement',
      action: 'tire-movement',
      tip: 'A movimentação organiza fisicamente os pneus, mas não altera seu status (Novo/Ativo/Descarte).',
    },
    {
      id: 'discard',
      title: 'Descarte de Pneus',
      description: 'Marque pneus como descartados quando atingirem fim de vida útil.',
      icon: Trash2,
      target: 'tire-discard-entry',
      action: 'tire-discard-entry',
      tip: 'Pneus descartados são removidos do estoque ativo mas mantidos no histórico para auditoria.',
    },
    {
      id: 'reports',
      title: 'Relatórios & Histórico',
      description: 'Visualize ocupação de containers, histórico completo e análises detalhadas.',
      icon: BarChart3,
      target: 'reports',
      action: 'reports',
      tip: 'Use os filtros para encontrar rapidamente pneus específicos, containers ou períodos.',
    },
  ];

  // Adiciona steps admin
  const adminSteps: OnboardingStep[] = userRole === 'admin' ? [
    {
      id: 'admin',
      title: 'Área Administrativa',
      description: 'Como administrador, você tem acesso a módulos exclusivos: Ajuste de Estoque, Cadastros, Importação de Dados e Gerenciamento de Usuários.',
      icon: Lightbulb,
      tip: 'Os módulos administrativos aparecem no menu lateral após os módulos principais.',
    },
  ] : [];

  const allSteps = [...steps, ...adminSteps];
  const progress = ((currentStep + 1) / allSteps.length) * 100;

  useEffect(() => {
    // Verifica se onboarding já foi completado
    const completed = localStorage.getItem('onboarding-completed');
    if (completed === 'true') {
      setShowWelcome(false);
      setShowTour(false);
    }
  }, []);

  const handleNext = () => {
    const step = allSteps[currentStep];
    
    // Marca step como completado
    if (!completedSteps.includes(step.id)) {
      setCompletedSteps([...completedSteps, step.id]);
    }

    // Navega para o módulo se houver ação
    if (step.action) {
      onModuleChange(step.action);
    }

    if (currentStep < allSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      const step = allSteps[currentStep - 1];
      if (step.action) {
        onModuleChange(step.action);
      }
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding-completed', 'true');
    setShowWelcome(false);
    setShowTour(false);
    onComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding-completed', 'true');
    localStorage.setItem('onboarding-completed-date', new Date().toISOString());
    setShowWelcome(false);
    setShowTour(false);
    onComplete();
  };

  const startTour = () => {
    setShowWelcome(false);
    setShowTour(true);
    setCurrentStep(0);
  };

  // Welcome Dialog
  if (showWelcome) {
    return (
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-xl flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl">
                  Bem-vindo ao Porsche Cup Brasil! 🏁
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  Sistema de Gestão de Pneus de Alto Desempenho
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 my-6">
            {/* Features */}
            <div className="grid gap-4">
              <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Entrada Rápida</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Cadastre pneus em segundos com scanner de código de barras
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-l-green-500 bg-green-50">
                <div className="flex items-start gap-3">
                  <UserCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900">Controle Total</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Gerencie status, movimentações e consumo em tempo real
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-l-purple-500 bg-purple-50">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900">Analytics Poderoso</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      Relatórios detalhados e dashboards com insights acionáveis
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">7</div>
                <div className="text-xs text-gray-500 mt-1">Módulos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">2</div>
                <div className="text-xs text-gray-500 mt-1">Minutos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">100%</div>
                <div className="text-xs text-gray-500 mt-1">Cloud</div>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-gray-600">Você está logado como:</span>
              <Badge 
                variant="secondary"
                className={userRole === 'admin' 
                  ? 'bg-purple-100 text-purple-700 border-purple-200' 
                  : 'bg-blue-100 text-blue-700 border-blue-200'
                }
              >
                {userRole === 'admin' ? '👑 Administrador' : '👤 Operador'}
              </Badge>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              Pular Tutorial
            </Button>
            <Button
              onClick={startTour}
              className="flex-1 bg-gradient-to-r from-[#D50000] to-[#A80000] text-white hover:from-[#A80000] hover:to-[#8B0000]"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Iniciar Tour (2 min)
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Você pode refazer este tutorial a qualquer momento nas configurações
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  // Tour Dialog
  if (showTour) {
    const step = allSteps[currentStep];
    const Icon = step.icon;
    const isLastStep = currentStep === allSteps.length - 1;

    return (
      <Dialog open={showTour} onOpenChange={(open) => !open && handleSkip()}>
        <DialogContent className="sm:max-w-lg">
          <button
            onClick={handleSkip}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </button>

          <DialogHeader>
            <div className="flex items-start gap-4 pr-8">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                ${step.id === 'welcome' ? 'bg-gradient-to-br from-[#D50000] to-[#A80000]' :
                  step.id === 'dashboard' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                  step.id === 'entry' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                  step.id === 'consumption' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                  step.id === 'movement' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                  step.id === 'discard' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                  step.id === 'reports' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' :
                  'bg-gradient-to-br from-gray-500 to-gray-600'}
              `}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl mb-2">
                  {step.title}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {step.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Passo {currentStep + 1} de {allSteps.length}
                </span>
                <span className="font-medium text-[#D50000]">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Tip */}
            {step.tip && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 text-sm">
                      Dica Importante
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {step.tip}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Completed Steps Counter */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Check className="w-4 h-4 text-green-600" />
              <span>
                {completedSteps.length} de {allSteps.length} passos completados
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-[#D50000] to-[#A80000] text-white hover:from-[#A80000] hover:to-[#8B0000]"
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-1.5 mt-4">
            {allSteps.map((s, index) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-8 bg-[#D50000]' 
                    : completedSteps.includes(s.id)
                    ? 'w-1.5 bg-green-500'
                    : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
