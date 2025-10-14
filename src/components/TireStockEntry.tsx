import { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle, X, Package as PackageIcon, AlertCircle, Keyboard, CheckCircle2, Camera, Focus } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import { BarcodeScanner } from './BarcodeScanner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { 
  getTireModels, 
  getContainers, 
  saveStockEntry, 
  deleteStockEntry,
  checkBarcodeExists,
  type TireModel, 
  type Container,
  type StockEntry 
} from '../utils/storage';

interface TireEntry {
  id: string;
  barcode: string;
  model: string;
  modelId: string;
  container: string;
  containerId: string;
  timestamp: Date;
}

type ShortcutMode = 'numeric' | 'letters';

export function TireStockEntry() {
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [barcode, setBarcode] = useState('');
  const [entries, setEntries] = useState<TireEntry[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shortcutMode, setShortcutMode] = useState<ShortcutMode>('letters');
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishProgress, setFinishProgress] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  const [autoFocusEnabled, setAutoFocusEnabled] = useState<boolean>(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastShortcutTime = useRef<number>(0);
  const allowAutoFocus = useRef<boolean>(true);

  // Carrega modelos e contêineres na montagem
  useEffect(() => {
    const models = getTireModels();
    const containersList = getContainers();
    
    setTireModels(models);
    setContainers(containersList);
    
    // Define seleção inicial
    if (models.length > 0) {
      setSelectedModel(models[0].id);
    }
    if (containersList.length > 0) {
      setSelectedContainer(containersList[0].id);
    }

    // Carrega preferência de modo de atalho
    const savedMode = localStorage.getItem('shortcut-mode') as ShortcutMode;
    if (savedMode) {
      setShortcutMode(savedMode);
    }

    // Carrega preferência de auto-foco
    const savedAutoFocus = localStorage.getItem('auto-focus-enabled');
    if (savedAutoFocus !== null) {
      setAutoFocusEnabled(savedAutoFocus === 'true');
    }

    // Detecta se é dispositivo móvel
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 1024;
      const isMobileResult = isMobileDevice || (isTouchDevice && isSmallScreen);
      setIsMobile(isMobileResult);
      console.log('📱 Detecção Mobile:', { isMobileDevice, isTouchDevice, isSmallScreen, resultado: isMobileResult });
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // NÃO carrega registros antigos - a lista começa vazia para cada sessão
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Salva preferência de auto-foco quando mudado
  useEffect(() => {
    localStorage.setItem('auto-focus-enabled', autoFocusEnabled.toString());
  }, [autoFocusEnabled]);

  // Escuta mudanças nos modelos de pneus
  useEffect(() => {
    const handleUpdate = () => {
      const models = getTireModels();
      setTireModels(models);
      // Atualiza seleção se o modelo atual não existir mais
      if (selectedModel && !models.find(m => m.id === selectedModel)) {
        setSelectedModel(models.length > 0 ? models[0].id : '');
      }
    };

    window.addEventListener('tire-models-updated', handleUpdate);
    return () => window.removeEventListener('tire-models-updated', handleUpdate);
  }, [selectedModel]);

  // Escuta mudanças nos contêineres
  useEffect(() => {
    const handleUpdate = () => {
      const containersList = getContainers();
      setContainers(containersList);
      // Atualiza seleção se o contêiner atual não existir mais
      if (selectedContainer && !containersList.find(c => c.id === selectedContainer)) {
        setSelectedContainer(containersList.length > 0 ? containersList[0].id : '');
      }
    };

    window.addEventListener('containers-updated', handleUpdate);
    return () => window.removeEventListener('containers-updated', handleUpdate);
  }, [selectedContainer]);

  // Escuta mudanças no estoque para atualizar ocupação dos contêineres
  useEffect(() => {
    const handleStockUpdate = () => {
      // Recarrega os containers para atualizar a ocupação calculada dinamicamente
      const containersList = getContainers();
      setContainers(containersList);
    };

    window.addEventListener('stock-entries-updated', handleStockUpdate);
    return () => window.removeEventListener('stock-entries-updated', handleStockUpdate);
  }, []);

  // NÃO escuta eventos globais - a lista de escaneados é apenas local da sessão atual

  // Atualiza contadores de modelos em tempo real
  useEffect(() => {
    const counts: Record<string, number> = {};
    entries.forEach(entry => {
      counts[entry.modelId] = (counts[entry.modelId] || 0) + 1;
    });
    setModelCounts(counts);
  }, [entries]);

  // Keyboard shortcuts com detecção de scanner de código de barras
  useEffect(() => {
    let lastKeyTime = 0;
    const SCANNER_THRESHOLD = 50; // Tempo em ms para detectar scanner (muito rápido)

    const handleKeyPress = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Se o tempo entre teclas for muito curto, provavelmente é um scanner
      // Ignora atalhos de teclado nesse caso
      if (timeDiff < SCANNER_THRESHOLD && timeDiff > 0) {
        return;
      }

      // Verifica se a tecla é um atalho válido
      let isValidShortcut = false;
      
      if (shortcutMode === 'numeric') {
        const num = parseInt(e.key);
        isValidShortcut = num >= 1 && num <= tireModels.length;
      } else {
        const validKeys = ['a', 'A', 'b', 'B', 'c', 'C', 'd', 'D', 'e', 'E', 'f', 'F', 'g', 'G'];
        isValidShortcut = validKeys.includes(e.key);
      }

      // Se for um atalho válido, processa mesmo que o foco esteja no input
      if (isValidShortcut) {
        // Previne que a tecla seja digitada no input
        e.preventDefault();
        
        // Marca que um atalho foi usado recentemente
        lastShortcutTime.current = currentTime;
        allowAutoFocus.current = false;
        
        // Permite auto-foco novamente após 800ms
        setTimeout(() => {
          allowAutoFocus.current = true;
        }, 800);

        if (shortcutMode === 'numeric') {
          // Atalhos numéricos (1-7)
          const num = parseInt(e.key);
          const modelIndex = num - 1;
          if (tireModels[modelIndex]) {
            setSelectedModel(tireModels[modelIndex].id);
            toast.success('Modelo selecionado', {
              description: tireModels[modelIndex].name,
              duration: 1500,
            });
          }
        } else {
          // Atalhos com letras (A-G)
          const keyMap: { [key: string]: number } = {
            'a': 0, 'A': 0,
            'b': 1, 'B': 1,
            'c': 2, 'C': 2,
            'd': 3, 'D': 3,
            'e': 4, 'E': 4,
            'f': 5, 'F': 5,
            'g': 6, 'G': 6,
          };
          
          const modelIndex = keyMap[e.key];
          if (tireModels[modelIndex]) {
            setSelectedModel(tireModels[modelIndex].id);
            toast.success('Modelo selecionado', {
              description: tireModels[modelIndex].name,
              duration: 1500,
            });
          }
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [tireModels, shortcutMode]);

  // Mantém o foco sempre no input de código de barras (com controle inteligente)
  useEffect(() => {
    const interval = setInterval(() => {
      // Não força foco se o auto-foco está desabilitado
      if (!autoFocusEnabled) {
        return;
      }

      // Não força foco se atalho foi usado recentemente
      if (!allowAutoFocus.current) {
        return;
      }

      // Verifica se o foco não está no input de barcode
      if (inputRef.current && document.activeElement !== inputRef.current) {
        // Verifica se não há modal ou dialog aberto
        const hasModalOpen = document.querySelector('[role="dialog"]') || 
                            document.querySelector('[role="alertdialog"]') ||
                            document.querySelector('.sonner-toast');
        
        // Se não há modal aberto, retorna o foco para o input
        if (!hasModalOpen) {
          inputRef.current.focus();
        }
      }
    }, 100); // Verifica a cada 100ms

    return () => clearInterval(interval);
  }, [autoFocusEnabled]);

  // Auto-submit quando atingir exatamente 8 dígitos numéricos
  useEffect(() => {
    if (barcode.length === 8 && /^\d{8}$/.test(barcode) && selectedModel && selectedContainer) {
      // Pequeno delay para garantir que o estado foi atualizado e evitar duplo registro
      const timer = setTimeout(() => {
        registerEntry();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [barcode]);

  const toggleShortcutMode = () => {
    const newMode: ShortcutMode = shortcutMode === 'numeric' ? 'letters' : 'numeric';
    setShortcutMode(newMode);
    localStorage.setItem('shortcut-mode', newMode);
    toast.success(`Atalhos alterados para ${newMode === 'numeric' ? 'números (1-7)' : 'letras (A-G)'}`, {
      description: 'Use o teclado para selecionar modelos rapidamente',
    });
  };

  const registerEntry = () => {
    if (!barcode.trim() || !selectedModel || !selectedContainer) return;

    const barcodeValue = barcode.trim();

    // Valida se o código tem exatamente 8 dígitos numéricos
    if (!/^\d{8}$/.test(barcodeValue)) {
      toast.error('Código inválido', {
        description: 'O código de barras deve conter exatamente 8 dígitos numéricos.',
      });
      setBarcode('');
      inputRef.current?.focus();
      return;
    }

    // Verifica se o código de barras já existe
    if (checkBarcodeExists(barcodeValue)) {
      toast.error('Código de barras duplicado', {
        description: `O código ${barcodeValue} já foi registrado anteriormente.`,
      });
      setBarcode('');
      inputRef.current?.focus();
      return;
    }

    const model = tireModels.find(m => m.id === selectedModel);
    const container = containers.find(c => c.id === selectedContainer);
    
    if (!model || !container) return;

    const stockEntry: StockEntry = {
      id: Date.now().toString(),
      barcode: barcodeValue,
      modelId: model.id,
      modelName: model.name,
      modelType: model.type as 'Slick' | 'Wet',
      containerId: container.id,
      containerName: container.name,
      timestamp: new Date().toISOString(),
      status: 'Novo', // Todos os pneus novos começam com status "Novo"
    };

    const success = saveStockEntry(stockEntry);
    
    if (success) {
      const newEntry: TireEntry = {
        id: stockEntry.id,
        barcode: stockEntry.barcode,
        model: stockEntry.modelName,
        modelId: stockEntry.modelId,
        container: stockEntry.containerName,
        containerId: stockEntry.containerId,
        timestamp: new Date(stockEntry.timestamp),
      };

      setEntries([newEntry, ...entries]);
      setBarcode('');
      setShowSuccess(true);
      toast.success('Pneu registrado com sucesso', {
        description: `${model.name} - ${barcodeValue}`,
      });
      setTimeout(() => setShowSuccess(false), 1000);
      
      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-added'));
    } else {
      toast.error('Erro ao registrar pneu', {
        description: 'Tente novamente.',
      });
    }

    inputRef.current?.focus();
  };

  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    registerEntry();
  };

  const handleScan = (scannedCode: string) => {
    console.log('📸 handleScan chamado com código:', scannedCode);
    // Define o código escaneado no input
    setBarcode(scannedCode);
    
    // Se o código tem 8 dígitos, registra automaticamente
    if (/^\d{8}$/.test(scannedCode) && selectedModel && selectedContainer) {
      console.log('✅ Código válido - registrando automaticamente...');
      // Pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        registerEntry();
      }, 300);
    } else if (!/^\d{8}$/.test(scannedCode)) {
      toast.warning('Código não tem 8 dígitos', {
        description: `Código escaneado: ${scannedCode}`,
        duration: 3000,
      });
    }
  };

  const removeEntry = (id: string) => {
    // Remove do localStorage primeiro
    deleteStockEntry(id);
    
    // Atualiza o estado local imediatamente (sincronamente)
    setEntries(prevEntries => prevEntries.filter(e => e.id !== id));
    
    toast.info('Entrada removida', {
      description: 'O registro foi removido do estoque.',
    });
  };

  const handleFinishEntry = () => {
    const totalEntries = entries.length;
    
    if (totalEntries === 0) {
      setShowFinishDialog(false);
      return;
    }
    
    // Inicia o processo de finalização
    setIsFinishing(true);
    setFinishProgress(0);
    
    // Simula processo com progresso usando setInterval
    const steps = 20;
    const stepDuration = 1500 / steps; // 1.5 segundos total
    let currentStep = 0;
    
    const progressInterval = setInterval(() => {
      currentStep++;
      setFinishProgress((currentStep / steps) * 100);
      
      if (currentStep >= steps) {
        clearInterval(progressInterval);
        
        // Aguarda um pouco para mostrar 100%
        setTimeout(() => {
          // Limpa a lista de entradas da sessão atual
          setEntries([]);
          
          // Reseta os contadores de modelos
          setModelCounts({});
          
          // Fecha o diálogo e reseta estados
          setIsFinishing(false);
          setFinishProgress(0);
          setShowFinishDialog(false);
          
          // Mostra mensagem de sucesso
          toast.success('Entrada finalizada com sucesso!', {
            description: `${totalEntries} ${totalEntries === 1 ? 'pneu registrado' : 'pneus registrados'} no sistema.`,
            duration: 3000,
          });
          
          // Retorna o foco para o input
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, 300);
        }, 300);
      }
    }, stepDuration);
  };

  const selectedModelData = tireModels.find(m => m.id === selectedModel);
  const selectedContainerData = containers.find(c => c.id === selectedContainer);
  // const modelEntries = entries.filter(e => e.model === selectedModelData?.name);

  if (tireModels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="text-center max-w-md">
          <div className="mb-4 text-gray-400">
            <PackageIcon size={64} className="mx-auto opacity-30" />
          </div>
          <h2 className="text-gray-900 mb-2">Nenhum modelo cadastrado</h2>
          <p className="text-gray-500 mb-6">
            Para usar este módulo, primeiro cadastre modelos de pneus no menu "Cadastro de Modelos".
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 sm:gap-6 px-2 py-2 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      {/* Header with Shortcut Toggle */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-gray-900 mb-1 truncate">Entrada de Estoque</h1>
          <p className="text-gray-500 text-xs sm:text-sm truncate">Registro rápido de pneus no sistema</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoFocusEnabled(!autoFocusEnabled)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 ${autoFocusEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
            title={autoFocusEnabled ? 'Desativar foco automático' : 'Ativar foco automático'}
          >
            <Focus size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline text-xs sm:text-sm">Auto-foco</span>
            <span className="text-xs sm:text-sm font-bold">{autoFocusEnabled ? 'ON' : 'OFF'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleShortcutMode}
            className="flex items-center gap-1.5 sm:gap-2 bg-white px-2.5 sm:px-3"
          >
            <Keyboard size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline text-xs sm:text-sm">Atalhos:</span>
            <span className="font-mono text-xs sm:text-sm font-bold">{shortcutMode === 'numeric' ? '1-7' : 'A-G'}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 w-full max-w-full">
        {/* Left Column - Container and Model Selection */}
        <div className="lg:w-80 bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm h-fit w-full max-w-full">
        {/* Container Selection */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <Label htmlFor="container-select" className="text-gray-900 mb-2 block">
            Contêiner de Destino
          </Label>
          <Select value={selectedContainer} onValueChange={setSelectedContainer}>
            <SelectTrigger id="container-select" className="w-full">
              <SelectValue placeholder="Selecione o contêiner" />
            </SelectTrigger>
            <SelectContent>
              {containers.map((container) => {
                const percentage = ((container.current / container.capacity) * 100).toFixed(0);
                return (
                  <SelectItem key={container.id} value={container.id}>
                    <div className="flex items-center gap-2">
                      <PackageIcon size={14} className="text-gray-500" />
                      <span>{container.name}</span>
                      <span className="text-xs text-gray-500">({percentage}%)</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selectedContainerData && (
            <div className="mt-3 text-xs text-gray-500">
              <div className="flex items-center justify-between mb-1">
                <span>{selectedContainerData.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ocupação:</span>
                <span className="text-gray-700">
                  {selectedContainerData.current}/{selectedContainerData.capacity}
                </span>
              </div>
            </div>
          )}
        </div>

        <h2 className="text-gray-900 mb-1 text-base sm:text-lg">Seleção Rápida</h2>
        <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6 flex items-center gap-2">
          <Keyboard size={14} className="text-[#D50000] flex-shrink-0" />
          <span className="line-clamp-2">
            {shortcutMode === 'numeric' 
              ? `Pressione 1-${tireModels.length}` 
              : `Pressione A-${String.fromCharCode(64 + tireModels.length)}`
            }
          </span>
        </p>

        {/* Model buttons - VERTICAL em mobile, horizontal apenas em desktop */}
        <div className="flex flex-col gap-2 lg:gap-2 w-full">
          {tireModels.map((model, index) => {
            const shortcutKey = shortcutMode === 'numeric' 
              ? (index + 1).toString() 
              : String.fromCharCode(65 + index); // A, B, C...
            const sessionCount = modelCounts[model.id] || 0;
            
            return (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  toast.success('Modelo selecionado', {
                    description: model.name,
                    duration: 1500,
                  });
                }}
                className={`
                  relative w-full px-3 sm:px-4 py-3 sm:py-3 rounded-lg border-2 transition-all duration-200
                  flex items-center gap-2 sm:gap-3
                  ${selectedModel === model.id
                    ? 'bg-[#D50000] border-[#D50000] text-white shadow-lg shadow-red-200'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 active:scale-[0.98]'
                  }
                `}
              >
                {/* Session count badge - bolinha verde */}
                {sessionCount > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[24px] sm:min-w-[28px] h-6 sm:h-7 px-1.5 sm:px-2 bg-[#00A86B] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg animate-in zoom-in duration-200">
                    {sessionCount}
                  </div>
                )}
                
                <div className={`
                  w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-base sm:text-lg font-bold
                  ${selectedModel === model.id ? 'bg-white/20' : 'bg-gray-100'}
                `}>
                  <span className={selectedModel === model.id ? 'text-white' : 'text-gray-900'}>
                    {shortcutKey}
                  </span>
                </div>
              <div className="text-left flex-1 min-w-0">
                <div className={`text-sm sm:text-base font-medium truncate ${selectedModel === model.id ? 'text-white' : 'text-gray-900'}`}>
                  {model.name}
                </div>
                <div className={`text-xs sm:text-sm ${selectedModel === model.id ? 'text-white/80' : 'text-gray-500'}`}>
                  {model.code}
                </div>
                {sessionCount > 0 && (
                  <div className={`text-xs sm:text-sm font-medium mt-0.5 flex items-center gap-1 ${selectedModel === model.id ? 'text-white' : 'text-[#00A86B]'}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current"></span>
                    {sessionCount} {sessionCount === 1 ? 'pneu' : 'pneus'} nesta sessão
                  </div>
                )}
              </div>
              </button>
            );
          })}
        </div>

        {/* Selected Model Info */}
        {selectedModelData && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Modelo Ativo:</div>
            <div className="text-gray-900 mb-4">{selectedModelData.name}</div>
            
            {/* Resumo da sessão */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gradient-to-r from-[#D50000] to-[#B00000] p-3 rounded-lg text-white">
                <span className="text-sm font-medium">Total Nesta Sessão:</span>
                <Badge variant="secondary" className="bg-white text-[#D50000] hover:bg-white font-bold">
                  {entries.length}
                </Badge>
              </div>
              
              {modelCounts[selectedModelData.id] > 0 && (
                <div className="flex items-center justify-between bg-[#00A86B] p-3 rounded-lg text-white">
                  <span className="text-sm">Deste Modelo:</span>
                  <Badge variant="secondary" className="bg-white text-[#00A86B] hover:bg-white font-bold">
                    {modelCounts[selectedModelData.id]}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Registration Area */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Resumo da Sessão Atual */}
        {entries.length > 0 && (
          <div className="bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-xl p-6 shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold mb-1">Resumo da Sessão Atual</h3>
                <p className="text-sm text-white/80">Pneus escaneados até finalizar</p>
              </div>
              <div className="text-3xl font-bold">{entries.length}</div>
            </div>
            
            {/* Breakdown por modelo */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/20">
              {tireModels.map(model => {
                const count = modelCounts[model.id] || 0;
                if (count === 0) return null;
                
                return (
                  <div key={model.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xs text-white/70 mb-1">{model.code}</div>
                    <div className="text-lg font-bold">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Barcode Input */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:p-8 shadow-sm">
          <h2 className="text-gray-900 mb-2">Código de Barras Amarelo</h2>
          <p className="text-gray-500 text-sm mb-6">
            {isMobile ? (
              <>
                <span className="flex items-center gap-2 mb-1">
                  <Camera size={16} className="text-[#D50000]" />
                  Toque no ícone da câmera para escanear
                </span>
                <span className="text-xs">ou digite manualmente o código de 8 dígitos</span>
              </>
            ) : (
              'Escaneie ou digite o código de 8 dígitos do pneu'
            )}
          </p>

          <form onSubmit={handleBarcodeSubmit} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={barcode}
                onChange={(e) => {
                  const value = e.target.value;
                  // Aceita apenas números e limita a 8 dígitos
                  const numericValue = value.replace(/\D/g, '').slice(0, 8);
                  setBarcode(numericValue);
                }}
                onFocus={() => {
                  console.log('📸 Campo focado');
                  // Não abre mais a câmera automaticamente
                  // Usuário deve clicar no ícone da câmera para abrir
                }}
                placeholder="00000000 (8 dígitos)"
                className={`!pl-12 ${isMobile ? 'pr-16' : 'pr-20'} py-6 text-lg tracking-wider border-2 rounded-xl font-mono transition-all ${
                  barcode.length === 0
                    ? 'border-gray-300 focus:border-[#D50000]'
                    : barcode.length === 8
                    ? 'border-[#00A86B] focus:border-[#00A86B] bg-green-50'
                    : 'border-[#FFB800] focus:border-[#FFB800] bg-yellow-50'
                }`}
                style={{ paddingLeft: '3rem' }}
                autoFocus={!isMobile}
                maxLength={8}
              />
              {showSuccess ? (
                <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00A86B] animate-bounce-scale" size={24} />
              ) : isMobile && barcode.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    console.log('📸 Botão câmera clicado (ícone dentro do input)');
                    setShowScanner(true);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-[#D50000] text-white hover:bg-[#B00000] rounded-lg transition-all shadow-lg animate-pulse-slow"
                  title="Usar câmera"
                  aria-label="Abrir scanner de código de barras"
                >
                  <Camera size={20} />
                </button>
              ) : barcode.length > 0 && barcode.length < 8 ? (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <AlertCircle className="text-[#FFB800]" size={20} />
                  <span className="text-xs text-white bg-[#FFB800] px-2 py-1 rounded-md font-mono font-bold">
                    {barcode.length}/8
                  </span>
                </div>
              ) : barcode.length === 8 ? (
                <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00A86B]" size={24} />
              ) : null}
            </div>
            
            {/* Status de validação em tempo real */}
            {barcode.length > 0 && (
              <div className={`flex items-center gap-2 text-sm font-medium transition-all ${
                barcode.length === 8
                  ? 'text-[#00A86B]'
                  : 'text-[#FFB800]'
              }`}>
                {barcode.length === 8 ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Código válido • Pronto para registro automático</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} />
                    <span>Digite mais {8 - barcode.length} {8 - barcode.length === 1 ? 'dígito' : 'dígitos'}</span>
                  </>
                )}
              </div>
            )}
            
            {barcode.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <AlertCircle size={14} />
                <span>Apenas números • Auto-registro ao completar 8 dígitos</span>
              </div>
            )}

            {/* Botão grande de abrir câmera removido em mobile (ícone no input já cobre a funcionalidade) */}

            <Button 
              type="submit" 
              className="w-full py-6 bg-[#D50000] hover:bg-[#B00000] text-white rounded-xl"
            >
              Registrar Entrada
            </Button>
          </form>
        </div>

        {/* Entries Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-gray-900">Pneus Escaneados</h3>
            <p className="text-gray-500 text-sm">Últimas entradas registradas</p>
          </div>

          <div className="overflow-x-auto">
            {entries.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Package size={48} className="mx-auto mb-4 opacity-30" />
                <p>Nenhum pneu registrado ainda</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Código de Barras
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Modelo
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Contêiner
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm bg-yellow-50 text-yellow-900 px-2 py-1 rounded">
                          {entry.barcode}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.container}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.timestamp.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {entries.length > 0 && (
            <div className="p-6 border-t border-gray-200">
              {/* Resumo por modelo */}
              <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(modelCounts).map(([modelId, count]) => {
                  const model = tireModels.find(m => m.id === modelId);
                  if (!model) return null;
                  
                  return (
                    <div key={modelId} className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-xs text-gray-600">{model.code}</span>
                      <Badge variant="secondary" className="bg-[#00A86B] text-white">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {entries.length} {entries.length === 1 ? 'pneu registrado' : 'pneus registrados'} nesta sessão
                </span>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFinishDialog(true)}
                  className="border-[#D50000] text-[#D50000] hover:bg-[#D50000] hover:text-white"
                >
                  <CheckCircle2 size={16} className="mr-2" />
                  Finalizar Entrada ({entries.length})
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Alert Dialog para Finalizar Entrada */}
      <AlertDialog open={showFinishDialog} onOpenChange={(open) => {
        if (!isFinishing) {
          setShowFinishDialog(open);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isFinishing ? 'Finalizando entrada...' : 'Finalizar entrada de estoque?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isFinishing ? (
                <>
                  Processando a finalização de {entries.length} {entries.length === 1 ? 'pneu' : 'pneus'}. Por favor, aguarde.
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Processando {entries.length} {entries.length === 1 ? 'pneu' : 'pneus'}...</span>
                        <span>{Math.round(finishProgress)}%</span>
                      </div>
                      <Progress value={finishProgress} className="h-2" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  Você está prestes a finalizar a entrada de {entries.length} {entries.length === 1 ? 'pneu' : 'pneus'}.
                  Os dados já foram salvos no sistema. Deseja limpar a lista e iniciar uma nova sessão de entrada?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isFinishing && (
            <AlertDialogFooter>
              <AlertDialogCancel>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFinishEntry}
                className="bg-[#D50000] hover:bg-[#B00000] text-white"
              >
                Finalizar
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleScan}
        onClose={() => {
          console.log('🚪 Fechando scanner via onClose');
          setShowScanner(false);
        }}
      />
    </div>
  );
}

function Package({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}
