// Utilities para PWA

/**
 * Registra o Service Worker
 */
export async function registerServiceWorker() {
  // Não tenta registrar em ambientes de preview/desenvolvimento
  if (window.location.hostname.includes('figma') || 
      window.location.hostname === 'localhost') {
  // eslint-disable-next-line no-console
  console.log('Service Worker desabilitado em ambiente de preview');
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      // debug-only
      if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
        // eslint-disable-next-line no-console
        console.log('Service Worker registrado:', registration);
      }
      
      // Verifica atualizações a cada 24h
      setInterval(() => {
        registration.update();
      }, 24 * 60 * 60 * 1000);
      
      return registration;
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
    }
  }
}

/**
 * Solicita permissão para notificações
 */
export async function requestNotificationPermission() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
        // eslint-disable-next-line no-console
        console.log('Permissão de notificação concedida');
      }
      return true;
    }
  }
  return false;
}

/**
 * Envia notificação local
 */
export async function sendNotification(title: string, options?: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      // vibrate: [200, 100, 200], // Removido: não suportado em todas as versões
      ...options,
    });
  }
}

/**
 * Detecta se o app está sendo executado como PWA
 */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Detecta se é um dispositivo móvel
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detecta se é iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Detecta se é Android
 */
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/**
 * Adiciona o app à tela inicial (Android/Chrome/Edge)
 */
export const addToHomeScreen = async (): Promise<boolean> => {
  if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
    // eslint-disable-next-line no-console
    console.log('🚀 Tentando instalar PWA...');
  }
  
  const deferredPrompt = (window as any).deferredPrompt;
  
  if (deferredPrompt) {
    if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
      // eslint-disable-next-line no-console
      console.log('📱 Usando prompt nativo');
    }
    try {
      const promptResult = await deferredPrompt.prompt();
      if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
        // eslint-disable-next-line no-console
        console.log('📤 Prompt resultado:', promptResult);
      }
      
      const { outcome } = await deferredPrompt.userChoice;
      if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
        // eslint-disable-next-line no-console
        console.log('👤 Escolha do usuário:', outcome);
      }
      
      if (outcome === 'accepted') {
        if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
          // eslint-disable-next-line no-console
          console.log('✅ Usuário aceitou instalar o PWA');
        }
        return true;
      } else {
        if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
          // eslint-disable-next-line no-console
          console.log('❌ Usuário rejeitou instalar o PWA');
        }
        return false;
      }
    } catch (error) {
      console.error('Erro ao mostrar prompt de instalação:', error);
      // Não retorna false, continua para fallback
    }
  }
  
  // Fallback para todos os navegadores
  if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
    // eslint-disable-next-line no-console
    console.log('ℹ️ Prompt nativo não disponível, mostrando instruções');
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  let instructions = '';
  let title = 'Instalar Porsche Cup';
  
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    instructions = 'Para instalar no iOS:\n\n1. Toque no botão de compartilhar (□↑)\n2. Role para baixo e selecione "Adicionar à Tela de Início"\n3. Toque em "Adicionar"';
  } else if (userAgent.includes('android')) {
    instructions = 'Para instalar no Android:\n\n1. Toque no menu (⋮) do navegador\n2. Selecione "Adicionar à tela inicial" ou "Instalar app"\n3. Confirme a instalação';
  } else if (userAgent.includes('chrome')) {
    instructions = 'Para instalar no Chrome Desktop:\n\n1. Procure o ícone de instalação (⊞) na barra de endereços\n2. Clique em "Instalar"\n\nOu:\n1. Menu (⋮) > "Instalar Porsche Cup..."\n2. Confirme a instalação';
  } else if (userAgent.includes('edge')) {
    instructions = 'Para instalar no Edge:\n\n1. Menu (...) > "Aplicativos"\n2. Clique em "Instalar este site como um aplicativo"\n3. Confirme a instalação';
  } else {
    instructions = 'Para uma melhor experiência:\n\n• Use Chrome ou Edge para instalação automática\n• Em dispositivos móveis, use o menu do navegador\n• Procure por opções como "Adicionar à tela inicial" ou "Instalar app"';
  }
  
  // Usa confirm em vez de alert para melhor UX
  const shouldProceed = confirm(`${title}\n\n${instructions}\n\nDeseja continuar com as instruções?`);
  
  if (shouldProceed && (userAgent.includes('chrome') || userAgent.includes('edge'))) {
    // Para desktop, abre em nova aba para facilitar a instalação
    setTimeout(() => {
      if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
        // eslint-disable-next-line no-console
        console.log('💡 Dica: Procure o ícone de instalação na barra de endereços');
      }
    }, 1000);
  }
  
  return shouldProceed;
};

/**
 * Verifica suporte a recursos PWA
 */
export function checkPWASupport() {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    pushManager: 'PushManager' in window,
    backgroundSync: 'SyncManager' in window,
    badging: 'setAppBadge' in navigator,
  };
}

/**
 * Atualiza badge do app (quantos itens pendentes)
 */
export function updateAppBadge(count: number) {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count);
    } else {
      (navigator as any).clearAppBadge();
    }
  }
}

/**
 * Vibração háptica (se suportado)
 */
export function hapticFeedback(pattern: number | number[] = 10) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Compartilhamento nativo (Web Share API)
 */
export async function nativeShare(data: ShareData) {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      return false;
    }
  }
  return false;
}

/**
 * Wake Lock - mantém a tela ligada
 */
export async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      const wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('Wake Lock ativado');
      
      return () => {
        wakeLock.release();
        console.log('Wake Lock liberado');
      };
    } catch (error) {
      console.error('Erro ao requisitar Wake Lock:', error);
    }
  }
  return () => {};
}

/**
 * Detecta modo de exibição
 */
export function getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  return 'browser';
}

/**
 * Captura o evento de instalação do PWA
 */
export function setupInstallPrompt() {
  // Configura em todos os ambientes de produção (Vercel)
  if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
    // eslint-disable-next-line no-console
    console.log('🚀 Configurando PWA Install Prompt...');
    // eslint-disable-next-line no-console
    console.log('🌐 Hostname:', window.location.hostname);
    // eslint-disable-next-line no-console
    console.log('📱 User Agent:', navigator.userAgent);
  }
  
  // Verifica se é um dispositivo compatível com PWA
  const isCompatible = isMobile() || isDesktopCompatible();
  if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
    // eslint-disable-next-line no-console
    console.log('✅ PWA Compatible:', isCompatible);
  }
  
  // Para iOS, mostra prompt personalizado imediatamente se for móvel
  if (isIOS()) {
    if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
      // eslint-disable-next-line no-console
      console.log('🍎 iOS detectado - Configurando prompt personalizado');
    }
    setTimeout(() => {
      if (!isPWA() && !localStorage.getItem('pwa-install-dismissed')) {
        if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
          // eslint-disable-next-line no-console
          console.log('📲 Disparando evento PWA para iOS');
        }
        window.dispatchEvent(new Event('pwa-installable'));
      }
    }, 3000); // Aguarda 3 segundos após carregar
    return;
  }

  // Para Android/Chrome/Edge/Desktop
  let deferredPrompt: any = null;
  let promptShown = false;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
      // eslint-disable-next-line no-console
      console.log('📱 beforeinstallprompt capturado!');
    }
    e.preventDefault();
    deferredPrompt = e;
    (window as any).deferredPrompt = e;
    
    // Dispara evento customizado para mostrar botão de instalação
    if (!promptShown && !localStorage.getItem('pwa-install-dismissed')) {
      if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
        // eslint-disable-next-line no-console
        console.log('🎯 Disparando evento pwa-installable');
      }
      promptShown = true;
      setTimeout(() => {
        window.dispatchEvent(new Event('pwa-installable'));
      }, 1000);
    }
  });
  
  window.addEventListener('appinstalled', () => {
    if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
      // eslint-disable-next-line no-console
      console.log('✅ PWA instalado com sucesso');
    }
    deferredPrompt = null;
    (window as any).deferredPrompt = null;
    localStorage.removeItem('pwa-install-dismissed');
    promptShown = false;
  });
  
  // Fallback mais rápido: se não receber beforeinstallprompt em 3 segundos
  setTimeout(() => {
    if (!deferredPrompt && !isPWA() && isCompatible && !localStorage.getItem('pwa-install-dismissed') && !promptShown) {
      if ((window as any).__DEBUG_LOGS || localStorage.getItem('DEBUG_LOGS') === '1') {
        // eslint-disable-next-line no-console
        console.log('⚠️ Fallback: Mostrando prompt sem beforeinstallprompt');
        // eslint-disable-next-line no-console
        console.log('💡 No desktop Chrome, procure o ícone de instalação na barra de endereços');
      }
      promptShown = true;
      window.dispatchEvent(new Event('pwa-installable'));
    }
  }, 3000);
}

/**
 * Verifica se é um desktop compatível com PWA
 */
function isDesktopCompatible(): boolean {
  return /Chrome|Edge|Chromium/.test(navigator.userAgent) && !isMobile();
}
