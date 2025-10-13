// Utilities para PWA

/**
 * Registra o Service Worker
 */
export async function registerServiceWorker() {
  // Não tenta registrar em ambientes de preview/desenvolvimento
  if (window.location.hostname.includes('figma') || 
      window.location.hostname === 'localhost') {
    console.log('Service Worker desabilitado em ambiente de preview');
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado:', registration);
      
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
      console.log('Permissão de notificação concedida');
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
      vibrate: [200, 100, 200],
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
export function addToHomeScreen() {
  console.log('🚀 Tentando instalar PWA...');
  
  // Verifica se já está rodando como PWA
  if (isPWA()) {
    console.log('✅ App já está instalado como PWA');
    return;
  }
  
  // Para iOS, mostra instruções
  if (isIOS()) {
    console.log('🍎 iOS: Mostrando instruções de instalação');
    // O componente PWAInstallPrompt já cuida das instruções para iOS
    return;
  }
  
  // Para Android/Chrome/Edge
  const deferredPrompt = (window as any).deferredPrompt;
  
  if (deferredPrompt) {
    console.log('📱 Executando prompt de instalação nativo');
    deferredPrompt.prompt();
    
    deferredPrompt.userChoice.then((choiceResult: any) => {
      console.log('🎯 Resposta do usuário:', choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ Usuário aceitou adicionar à tela inicial');
        // Remove o prompt dismissed para não mostrar novamente
        localStorage.removeItem('pwa-install-dismissed');
      } else {
        console.log('❌ Usuário rejeitou a instalação');
        // Não marca como dismissed para permitir tentar novamente mais tarde
      }
      (window as any).deferredPrompt = null;
    }).catch((error: any) => {
      console.error('❌ Erro no prompt de instalação:', error);
    });
  } else {
    console.log('⚠️ beforeinstallprompt não disponível');
    // Pode ser que o usuário já tenha instalado ou o browser não suporte
    if ('serviceWorker' in navigator) {
      console.log('💡 Dica: Procure pelo ícone de instalação na barra de endereços');
    }
  }
}

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
  console.log('🚀 Configurando PWA Install Prompt...');
  console.log('🌐 Hostname:', window.location.hostname);
  console.log('📱 User Agent:', navigator.userAgent);
  
  // Verifica se é um dispositivo compatível com PWA
  const isCompatible = isMobile() || isDesktopCompatible();
  console.log('✅ PWA Compatible:', isCompatible);
  
  // Para iOS, mostra prompt personalizado imediatamente se for móvel
  if (isIOS()) {
    console.log('🍎 iOS detectado - Configurando prompt personalizado');
    setTimeout(() => {
      if (!isPWA() && !localStorage.getItem('pwa-install-dismissed')) {
        console.log('📲 Disparando evento PWA para iOS');
        window.dispatchEvent(new Event('pwa-installable'));
      }
    }, 3000); // Aguarda 3 segundos após carregar
    return;
  }

  // Para Android/Chrome/Edge
  let deferredPrompt: any = null;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 beforeinstallprompt capturado!');
    e.preventDefault();
    deferredPrompt = e;
    (window as any).deferredPrompt = e;
    
    // Dispara evento customizado para mostrar botão de instalação
    setTimeout(() => {
      if (!localStorage.getItem('pwa-install-dismissed')) {
        console.log('🎯 Disparando evento pwa-installable');
        window.dispatchEvent(new Event('pwa-installable'));
      }
    }, 2000);
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA instalado com sucesso');
    deferredPrompt = null;
    (window as any).deferredPrompt = null;
    localStorage.removeItem('pwa-install-dismissed');
  });
  
  // Fallback: se não receber beforeinstallprompt em 5 segundos, tenta mostrar anyway
  setTimeout(() => {
    if (!deferredPrompt && !isPWA() && isCompatible && !localStorage.getItem('pwa-install-dismissed')) {
      console.log('⚠️ Fallback: Mostrando prompt sem beforeinstallprompt');
      window.dispatchEvent(new Event('pwa-installable'));
    }
  }, 5000);
}

/**
 * Verifica se é um desktop compatível com PWA
 */
function isDesktopCompatible(): boolean {
  return /Chrome|Edge/.test(navigator.userAgent) && !isMobile();
}
