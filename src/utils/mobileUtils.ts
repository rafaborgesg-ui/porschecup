/**
 * Utilidades para otimização mobile
 * Garante experiência sem scroll horizontal e touch-friendly
 */

// Classes base para containers principais
export const MOBILE_CONTAINER_CLASSES = 'flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden';

// Classes para wrapper interno
export const MOBILE_WRAPPER_CLASSES = 'max-w-7xl mx-auto w-full';

// Classes para header de página
export const MOBILE_HEADER_CLASSES = 'mb-4 sm:mb-6 lg:mb-8 px-1';

// Classes para cards
export const MOBILE_CARD_CLASSES = 'bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm w-full max-w-full';

// Classes para grids responsivos
export const MOBILE_GRID_CLASSES = {
  1: 'grid grid-cols-1 gap-4 sm:gap-6 w-full',
  2: 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full',
  3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full',
  4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full',
};

// Classes para tabelas responsivas
export const MOBILE_TABLE_WRAPPER_CLASSES = 'overflow-x-auto w-full';
export const MOBILE_TABLE_CLASSES = 'w-full min-w-[600px]';

// Função para detectar mobile
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 1024;
  
  return isMobileUA || (isTouchDevice && isSmallScreen);
}

// Função para prevenir zoom em inputs (iOS)
export function preventInputZoom() {
  if (typeof document === 'undefined') return;
  
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const fontSize = window.getComputedStyle(input).fontSize;
    const currentSize = parseFloat(fontSize);
    
    // iOS zoomará se font-size < 16px
    if (currentSize < 16 && window.innerWidth < 768) {
      (input as HTMLElement).style.fontSize = '16px';
    }
  });
}

// Função para adicionar safe area insets
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
  
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
    right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
  };
}

// Função para detectar orientação
export function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'portrait';
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

// Função para calcular altura disponível (considerando bottom nav)
export function getAvailableHeight(): number {
  if (typeof window === 'undefined') return 0;
  
  const viewportHeight = window.innerHeight;
  const safeAreaBottom = getSafeAreaInsets().bottom;
  const bottomNavHeight = window.innerWidth < 1024 ? 64 : 0;
  
  return viewportHeight - bottomNavHeight - safeAreaBottom;
}

// Utilitário para combinar classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
