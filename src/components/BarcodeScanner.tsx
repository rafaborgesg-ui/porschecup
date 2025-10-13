import { useState, useEffect, useRef } from 'react';
import { Camera, X, Zap, AlertCircle, FlipHorizontal, RotateCw } from 'lucide-react';
import { Button } from './ui/button';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [showSuccess, setShowSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const readerElementId = 'barcode-reader-fullscreen';
  const originalOrientation = useRef<ScreenOrientation['type'] | null>(null);

  // Entra em fullscreen e força landscape (100% opcional e silencioso)
  const enterFullscreenLandscape = async () => {
    try {
      const element = containerRef.current;
      if (!element) {
        // Silencioso - não é crítico
        return;
      }

      // Tenta entrar em fullscreen com diferentes APIs (totalmente opcional)
      try {
        // Fullscreen API padrão
        if (element.requestFullscreen) {
          await element.requestFullscreen({ navigationUI: 'hide' });
        } 
        // Safari iOS e versões antigas do Safari
        else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } 
        // Firefox
        else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen();
        } 
        // IE/Edge legado
        else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
        // Se não suporta, tudo bem - funciona sem fullscreen
      } catch (fullscreenErr: any) {
        // Fullscreen pode falhar - completamente normal e esperado
        // Não loga nada para evitar poluir console
      }

      // Screen Orientation API - força landscape (totalmente opcional)
      if (screen.orientation && screen.orientation.lock) {
        try {
          originalOrientation.current = screen.orientation.type;
          await screen.orientation.lock('landscape');
          // Sucesso silencioso
        } catch (err: any) {
          // Falha silenciosa - nem todos os browsers suportam
        }
      }

      // Log simplificado
      console.log('✅ Scanner iniciado');
    } catch (err: any) {
      // Erro silencioso - não crítico
    }
  };

  // Sai de fullscreen e restaura orientação (silencioso)
  const exitFullscreenLandscape = async () => {
    try {
      // Destravar orientação (silencioso)
      if (screen.orientation && screen.orientation.unlock) {
        try {
          screen.orientation.unlock();
        } catch (err) {
          // Erro silencioso - esperado em muitos browsers
        }
      }

      // Sair de fullscreen (silencioso)
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if ((document as any).webkitFullscreenElement) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozFullScreenElement) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msFullscreenElement) {
        await (document as any).msExitFullscreen();
      }

      // Sucesso silencioso
    } catch (err) {
      // Erro silencioso - não crítico
    }
  };

  useEffect(() => {
    console.log('📸 BarcodeScanner - isOpen mudou:', isOpen);
    if (isOpen) {
      console.log('🎬 Iniciando scanner fullscreen...');
      // Pequeno delay para garantir que o DOM está pronto
      setTimeout(() => {
        enterFullscreenLandscape();
        setTimeout(() => startScanner(), 500); // Delay adicional após fullscreen
      }, 100);
    } else {
      console.log('🛑 Fechando scanner...');
      exitFullscreenLandscape();
      stopScanner();
    }

    return () => {
      exitFullscreenLandscape();
      stopScanner();
    };
  }, [isOpen]);

  // Listener para saída de fullscreen (botão do navegador ou ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isOpen) {
        console.log('🚪 Usuário saiu do fullscreen - fechando scanner');
        handleClose();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setError(null);
      setScanning(true);

      console.log('🔍 Verificando elemento do reader...');
      
      // Aguarda um pouco mais para garantir que o DOM está pronto
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const readerElement = document.getElementById(readerElementId);
      if (!readerElement) {
        console.error('❌ Elemento do reader não encontrado!');
        console.error('DOM atual:', document.body.innerHTML.substring(0, 500));
        setError('Erro ao inicializar scanner. Elemento não encontrado.');
        return;
      }

      // Verifica se já existe uma instância
      if (scannerRef.current) {
        console.log('🔄 Parando scanner existente...');
        await stopScanner();
      }

      // Cria nova instância do scanner
      console.log('🎬 Criando nova instância do scanner...');
      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      // Configurações otimizadas - MÁXIMA COMPATIBILIDADE
      const config: any = {
        fps: 20, // Aumentado para 20 para melhor detecção
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Caixa MUITO generosa baseada no tamanho da tela
          const boxWidth = Math.min(viewfinderWidth * 0.85, 600); // 85% da largura, máx 600px
          const boxHeight = Math.min(viewfinderHeight * 0.5, 250); // 50% da altura, máx 250px
          console.log(`📐 QR Box calculado: ${boxWidth}x${boxHeight} (viewport: ${viewfinderWidth}x${viewfinderHeight})`);
          return { width: boxWidth, height: boxHeight };
        },
        aspectRatio: 1.777778, // 16:9 - mais padrão e compatível
        disableFlip: false, // Permite flip horizontal para melhor leitura
        videoConstraints: {
          facingMode: cameraFacing,
          advanced: [
            { focusMode: 'continuous' }, // Foco contínuo
            { zoom: 1.0 }
          ]
        },
        // Suporte explícito a todos os formatos de código de barras
        formatsToSupport: [
          0,  // CODE_128
          1,  // CODE_39
          2,  // CODE_93
          3,  // CODABAR
          4,  // EAN_13
          5,  // EAN_8
          6,  // ITF
          7,  // UPC_A
          8,  // UPC_E
          9,  // UPC_EAN_EXTENSION
          10, // RSS_14
          11, // RSS_EXPANDED
          12, // QR_CODE
          13, // DATA_MATRIX
          14, // AZTEC
          15, // PDF_417
          16, // MAXICODE
        ]
      };

      console.log(`📷 Iniciando câmera - Facing mode: ${cameraFacing}`);
      console.log(`⚙️ Configurações do scanner:`, config);
      
      // Html5Qrcode.start() solicita permissão automaticamente
      // Não precisa solicitar manualmente - isso causava conflito
      console.log('🎥 Iniciando câmera (Html5Qrcode solicitará permissão automaticamente)...');
      
      // Inicia a câmera com html5-qrcode (solicita permissão internamente)
      await html5QrCode.start(
        { facingMode: cameraFacing },
        config,
        (decodedText) => {
          // Evita scans duplicados consecutivos
          if (decodedText !== lastScanned) {
            console.log('🎉🎉🎉 CÓDIGO LIDO COM SUCESSO! 🎉🎉🎉');
            console.log('📊 Código detectado:', decodedText);
            console.log('📏 Comprimento:', decodedText.length, 'caracteres');
            setLastScanned(decodedText);
            
            // Feedback visual de sucesso
            setShowSuccess(true);
            
            // Vibração de sucesso
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100]); // Padrão de vibração dupla
            }
            
            // Chama callback e fecha após feedback
            setTimeout(() => {
              onScan(decodedText);
              handleClose();
            }, 800);
          }
        },
        (errorMessage) => {
          // Ignora erros normais de scan (muito verbosos)
          // console.log('🔍 Escaneando...', errorMessage);
        }
      );

      console.log('✅ Scanner iniciado com sucesso - Câmera:', cameraFacing);
      console.log('📹 Estado do scanner:', {
        isScanning: html5QrCode.isScanning,
        state: html5QrCode.getState()
      });
      
    } catch (err: any) {
      console.error('❌ Erro ao iniciar scanner:', err);
      console.error('Tipo:', err.name);
      console.error('Mensagem:', err.message);
      console.error('Stack:', err.stack);
      setScanning(false);
      
      // Tratamento de erros mais detalhado
      const errorName = err?.name || '';
      const errorMessage = err?.message || '';
      
      if (errorName === 'NotAllowedError' || errorMessage.includes('Permission denied') || errorMessage.includes('permission')) {
        setError('Permissão de câmera negada.\n\nPor favor:\n1. Permita o acesso à câmera nas configurações do navegador\n2. Recarregue a página\n3. Tente novamente');
      } else if (errorName === 'NotFoundError' || errorMessage.includes('not found') || errorMessage.includes('No camera')) {
        setError('Nenhuma câmera encontrada no dispositivo.');
      } else if (errorName === 'NotReadableError' || errorMessage.includes('in use') || errorMessage.includes('being used')) {
        setError('Câmera está sendo usada por outro aplicativo.\n\nFeche outros apps que possam estar usando a câmera e tente novamente.');
      } else if (errorMessage.includes('element not found')) {
        setError('Erro ao inicializar scanner.\n\nTente fechar e abrir novamente.');
      } else if (errorMessage.includes('https') || errorMessage.includes('secure')) {
        setError('Câmera requer conexão segura (HTTPS).\n\nEste site precisa estar em HTTPS para acessar a câmera.');
      } else {
        // Mensagem genérica com detalhes do erro
        const errorDetail = errorMessage || errorName || 'Erro desconhecido';
        setError(`Erro ao acessar a câmera:\n\n${errorDetail}\n\nTente novamente ou use a entrada manual.`);
      }
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        console.log('🛑 Parando scanner...');
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        console.log('✅ Scanner parado');
      }
      setScanning(false);
      setShowSuccess(false);
    } catch (err) {
      console.error('Erro ao parar scanner:', err);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    await exitFullscreenLandscape();
    onClose();
  };

  const toggleCamera = async () => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    console.log(`🔄 Trocando câmera para: ${newFacing}`);
    setCameraFacing(newFacing);
    await stopScanner();
    setTimeout(() => startScanner(), 500);
  };

  const handleRotateInstruction = () => {
    // Vibração de alerta
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="scanner-fullscreen-container"
      data-scanning={scanning}
      data-success={showSuccess}
    >
      {/* Área do Scanner - Fullscreen */}
      <div className="scanner-fullscreen-content">
        {error ? (
          // Tela de Erro
          <div className="scanner-error-screen">
            <div className="scanner-error-content">
              <AlertCircle className="scanner-error-icon" />
              <h3 className="scanner-error-title">Erro ao Acessar Câmera</h3>
              <p className="scanner-error-message">{error}</p>
              <Button 
                onClick={handleClose} 
                className="scanner-error-button"
                size="lg"
              >
                <X className="w-5 h-5 mr-2" />
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Container do Vídeo da Câmera - SEM RESTRIÇÕES DE CSS */}
            <div className="scanner-video-wrapper">
              <div id={readerElementId} className="scanner-video-element" />
            </div>
            
            {/* Overlay com guia de posicionamento */}
            <div className="scanner-overlay">
              {/* Área escurecida superior */}
              <div className="scanner-overlay-top" />
              
              {/* Container central com guia */}
              <div className="scanner-guide-container">
                <div className="scanner-overlay-left" />
                
                {/* Guia de scan - retangular horizontal */}
                <div className="scanner-guide-box">
                  {/* Cantos da guia */}
                  <div className="scanner-corner scanner-corner-tl" />
                  <div className="scanner-corner scanner-corner-tr" />
                  <div className="scanner-corner scanner-corner-bl" />
                  <div className="scanner-corner scanner-corner-br" />
                  
                  {/* Linha de scan animada */}
                  {scanning && !showSuccess && (
                    <div className="scanner-line" />
                  )}
                  
                  {/* Feedback de sucesso */}
                  {showSuccess && (
                    <div className="scanner-success-overlay">
                      <div className="scanner-success-icon">
                        <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="scanner-overlay-right" />
              </div>
              
              {/* Área escurecida inferior */}
              <div className="scanner-overlay-bottom" />
            </div>

            {/* Instruções - Aparecem só em portrait */}
            <div className="scanner-rotate-instruction">
              <RotateCw 
                className="w-12 h-12 text-white mb-4 animate-pulse" 
                onClick={handleRotateInstruction}
              />
              <p className="text-white text-lg font-medium text-center px-6">
                Gire seu dispositivo para o modo horizontal
              </p>
              <p className="text-white/70 text-sm text-center px-6 mt-2">
                O scanner funciona melhor em paisagem
              </p>
            </div>

            {/* Instruções em landscape */}
            <div className="scanner-instructions">
              <div className="flex items-center gap-2">
                {scanning && (
                  <div className="w-2 h-2 bg-[#00A86B] rounded-full animate-pulse" />
                )}
                <p className="scanner-instruction-text">
                  Posicione o código de barras dentro da área destacada
                </p>
              </div>
            </div>

            {/* Controles - Parte inferior */}
            <div className="scanner-controls">
              {/* Botão Fechar */}
              <button
                onClick={handleClose}
                className="scanner-control-button scanner-close-button"
                aria-label="Fechar scanner"
              >
                <X className="w-6 h-6" />
                <span className="scanner-control-label">Fechar</span>
              </button>

              {/* Botão Trocar Câmera */}
              <button
                onClick={toggleCamera}
                className="scanner-control-button"
                aria-label="Trocar câmera"
              >
                <FlipHorizontal className="w-6 h-6" />
                <span className="scanner-control-label">
                  {cameraFacing === 'environment' ? 'Traseira' : 'Frontal'}
                </span>
              </button>

              {/* Indicador de Status */}
              <div className="scanner-status">
                <div className="scanner-status-indicator">
                  <Zap className="w-4 h-4 text-[#00A86B] animate-pulse" />
                  <span className="scanner-status-text">
                    {scanning ? 'Escaneando...' : 'Aguardando...'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
