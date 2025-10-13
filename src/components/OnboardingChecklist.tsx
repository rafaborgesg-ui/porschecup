import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  Check, 
  X,
  Package, 
  UserCircle, 
  Archive, 
  Trash2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  module: string;
  iconName: string;
  completed: boolean;
}

interface OnboardingChecklistProps {
  onModuleChange: (module: string) => void;
}

export function OnboardingChecklist({ onModuleChange }: OnboardingChecklistProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'first-tire',
      title: 'Cadastrar primeiro pneu',
      description: 'Registre seu primeiro pneu no sistema',
      module: 'tire-stock',
      iconName: 'Package',
      completed: false,
    },
    {
      id: 'first-consumption',
      title: 'Transferir primeiro pneu',
      description: 'Transfira um pneu para um piloto',
      module: 'tire-consumption',
      iconName: 'UserCircle',
      completed: false,
    },
    {
      id: 'first-movement',
      title: 'Mover pneu entre containers',
      description: 'Organize pneus movendo entre containers',
      module: 'tire-movement',
      iconName: 'Archive',
      completed: false,
    },
    {
      id: 'view-reports',
      title: 'Visualizar relatórios',
      description: 'Explore os relatórios e dashboards',
      module: 'reports',
      iconName: 'BarChart3',
      completed: false,
    },
    {
      id: 'first-discard',
      title: 'Descartar pneu',
      description: 'Marque um pneu como descartado',
      module: 'tire-discard-entry',
      iconName: 'Trash2',
      completed: false,
    },
  ]);
  
  // Map de ícones
  const iconMap: Record<string, any> = {
    Package: Package,
    UserCircle: UserCircle,
    Archive: Archive,
    BarChart3: BarChart3,
    Trash2: Trash2,
  };

  const [showChecklist, setShowChecklist] = useState(true);

  useEffect(() => {
    // Carrega progresso do localStorage
    const saved = localStorage.getItem('onboarding-checklist');
    if (saved) {
      try {
        const savedChecklist = JSON.parse(saved);
        setChecklist(savedChecklist);
      } catch (e) {
        console.error('Erro ao carregar checklist:', e);
      }
    }

    // Verifica se deve mostrar checklist
    const dismissed = localStorage.getItem('onboarding-checklist-dismissed');
    if (dismissed === 'true') {
      setShowChecklist(false);
    }
  }, []);

  useEffect(() => {
    // Salva progresso no localStorage
    localStorage.setItem('onboarding-checklist', JSON.stringify(checklist));
  }, [checklist]);

  // Monitora eventos de ações do usuário
  useEffect(() => {
    const handleTireAdded = () => markCompleted('first-tire');
    const handleTireConsumed = () => markCompleted('first-consumption');
    const handleTireMoved = () => markCompleted('first-movement');
    const handleTireDiscarded = () => markCompleted('first-discard');
    const handleReportsViewed = () => markCompleted('view-reports');

    window.addEventListener('tire-added', handleTireAdded);
    window.addEventListener('tire-consumed', handleTireConsumed);
    window.addEventListener('tire-moved', handleTireMoved);
    window.addEventListener('tire-discarded', handleTireDiscarded);
    window.addEventListener('reports-viewed', handleReportsViewed);

    return () => {
      window.removeEventListener('tire-added', handleTireAdded);
      window.removeEventListener('tire-consumed', handleTireConsumed);
      window.removeEventListener('tire-moved', handleTireMoved);
      window.removeEventListener('tire-discarded', handleTireDiscarded);
      window.removeEventListener('reports-viewed', handleReportsViewed);
    };
  }, []);

  const markCompleted = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, completed: true } : item
    ));
  };

  const handleDismiss = () => {
    localStorage.setItem('onboarding-checklist-dismissed', 'true');
    setShowChecklist(false);
  };

  const handleReset = () => {
    setChecklist(prev => prev.map(item => ({ ...item, completed: false })));
    localStorage.removeItem('onboarding-checklist-dismissed');
    setShowChecklist(true);
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;
  const isAllCompleted = completedCount === checklist.length;

  if (!showChecklist) {
    // Não mostra o botão se o usuário dispensou permanentemente
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-40 lg:bottom-6 w-80 sm:w-96">
      <Card className="bg-white border-2 border-[#D50000] shadow-2xl overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="bg-gradient-to-r from-[#D50000] to-[#A80000] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-white" />
                <h3 className="font-semibold text-white">Primeiros Passos</h3>
              </div>
              <div className="flex items-center gap-2">
                {isAllCompleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-white hover:bg-white/20 h-8 px-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 h-8 px-2"
                  >
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20 h-8 px-2"
                  title="Ocultar permanentemente"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm text-white/90">
                <span>{completedCount} de {checklist.length} completos</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-white/20" />
            </div>

            {isAllCompleted && (
              <div className="mt-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-sm text-white flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Parabéns! Você completou todos os passos! 🎉
                </p>
              </div>
            )}
          </div>

          <CollapsibleContent>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {checklist.map((item) => {
                const Icon = iconMap[item.iconName] || Package;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onModuleChange(item.module);
                      setIsOpen(false);
                    }}
                    disabled={item.completed}
                    className={`
                      w-full text-left p-3 rounded-lg border-2 transition-all
                      ${item.completed 
                        ? 'bg-green-50 border-green-200 cursor-default' 
                        : 'bg-white border-gray-200 hover:border-[#D50000] hover:shadow-md cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                        ${item.completed 
                          ? 'bg-green-500' 
                          : 'bg-gray-100'}
                      `}>
                        {item.completed ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <Icon className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-semibold ${
                            item.completed ? 'text-green-900 line-through' : 'text-gray-900'
                          }`}>
                            {item.title}
                          </h4>
                          {item.completed && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                              Feito
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${
                          item.completed ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
              <p className="text-xs text-center text-gray-600">
                Clique em cada item para ir direto ao módulo
              </p>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="w-full text-gray-700 hover:text-[#D50000] hover:border-[#D50000]"
              >
                <X className="w-3 h-3 mr-2" />
                Não mostrar novamente
              </Button>
              <p className="text-[10px] text-center text-gray-400 pt-1">
                Para reativar, abra o console e digite: <code className="bg-gray-200 px-1 rounded">resetOnboarding()</code>
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
