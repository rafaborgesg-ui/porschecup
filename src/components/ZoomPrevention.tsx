import { useEffect } from 'react';

/**
 * Componente de Prevenção de Zoom Ultra-Robusta
 * 
 * Este componente adiciona camadas extras de proteção contra zoom
 * que funcionam em conjunto com as configurações HTML/CSS.
 * 
 * Funciona em:
 * - iOS Safari 10+
 * - Chrome Mobile 80+
 * - Firefox Mobile 68+
 * - Samsung Internet 10+
 * - Edge Mobile 80+
 */
export function ZoomPrevention() {
  useEffect(() => {
    // Força atualização do viewport
    const updateViewport = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute(
          'content',
          'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover, shrink-to-fit=no'
        );
      }
    };

    // Atualiza viewport ao montar
    updateViewport();

    // Previne zoom em focus de elementos específicos (silencioso)
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // Força font-size mínimo de 16px para prevenir zoom iOS
        const computedStyle = window.getComputedStyle(target);
        const fontSize = parseFloat(computedStyle.fontSize);

        if (fontSize < 16) {
          (target as HTMLElement).style.fontSize = '16px';
          // Ajuste silencioso - CSS já garante 16px por padrão
        }
      }
    };

    // Monitora mudanças de escala do viewport (silencioso)
    let lastScale = 1;
    const handleViewportResize = () => {
      if (window.visualViewport) {
        const currentScale = window.visualViewport.scale;

        if (Math.abs(currentScale - 1) > 0.01) {
          // Tenta reverter silenciosamente
          updateViewport();
          
          // Força scroll para top para "resetar" visualização
          window.scrollTo(0, window.scrollY);
        }

        lastScale = currentScale;
      }
    };

    // Event listeners
    document.addEventListener('focus', handleFocus, true);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    // Cleanup
    return () => {
      document.removeEventListener('focus', handleFocus, true);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  // Este componente não renderiza nada visível
  return null;
}
