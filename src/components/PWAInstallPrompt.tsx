import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { addToHomeScreen, isIOS, isMobile, isPWA } from '../utils/pwa';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    const iosDevice = isIOS();
    setIsIOSDevice(iosDevice);
    
    // Debug info
    const debug = `iOS: ${iosDevice}, Mobile: ${isMobile()}, PWA: ${isPWA()}, UA: ${navigator.userAgent.substring(0, 50)}...`;
    console.log('🔍 PWA Debug:', debug);
    
    // Listen for the custom event
    const handleInstallable = () => {
      console.log('🎯 PWA Installable event received!');
      setShowPrompt(true);
    };
    
    window.addEventListener('pwa-installable', handleInstallable);
    
    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const alreadyPWA = isPWA();
    
    console.log('📊 PWA Status:', { dismissed, alreadyPWA, iosDevice });
    
    if (dismissed || alreadyPWA) {
      setShowPrompt(false);
      console.log('❌ PWA Prompt não será mostrado:', { dismissed, alreadyPWA });
    } else {
      // Para debug em desenvolvimento, mostra sempre após 3 segundos
      if (window.location.hostname === 'localhost') {
        setTimeout(() => {
          console.log('🧪 Debug: Forçando prompt em localhost');
          setShowPrompt(true);
        }, 3000);
      }
    }
    
    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  const handleInstall = () => {
    addToHomeScreen();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

  if (isIOSDevice) {
    return (
      <Card className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 p-4 bg-white shadow-xl z-50 border-2 border-[#D50000]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-xl flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">
              Instalar Aplicativo
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Para instalar este app no seu iPhone:
            </p>
            <ol className="text-xs text-gray-600 space-y-1 mb-3">
              <li>1. Toque no ícone de compartilhamento <span className="inline-block">⬆️</span></li>
              <li>2. Role para baixo e toque em "Adicionar à Tela Início"</li>
              <li>3. Toque em "Adicionar"</li>
            </ol>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 p-4 bg-white shadow-xl z-50 border-2 border-[#D50000] animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-xl flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">
            Instalar Aplicativo
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Instale o app na sua tela inicial para acesso rápido e experiência completa.
          </p>
          
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="bg-gradient-to-r from-[#D50000] to-[#A80000] text-white hover:from-[#A80000] hover:to-[#8B0000]"
            >
              Instalar
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              className="text-gray-600"
            >
              Agora não
            </Button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </Card>
  );
}
