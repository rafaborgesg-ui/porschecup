import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<'start' | 'middle' | 'end'>('start');
  const [showScrollHint, setShowScrollHint] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      
      if (scrollLeft === 0) {
        setScrollState('start');
      } else if (scrollLeft + clientWidth >= scrollWidth - 5) {
        setScrollState('end');
      } else {
        setScrollState('middle');
      }
      
      setShowScrollHint(false);
    };

    // Verifica se precisa scroll
    const needsScroll = container.scrollWidth > container.clientWidth;
    if (needsScroll) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
    } else {
      setShowScrollHint(false);
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollLeft = () => {
    containerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    containerRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Scroll Hint - Mobile */}
      {showScrollHint && (
        <div className="lg:hidden absolute top-4 right-4 z-20 bg-[#D50000] text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 animate-pulse shadow-lg">
          <ChevronRight size={14} />
          <span>Deslize</span>
        </div>
      )}

      {/* Scroll Buttons - Tablet/Desktop */}
      <div className="hidden md:flex lg:hidden absolute top-1/2 -translate-y-1/2 left-0 right-0 justify-between pointer-events-none z-20 px-2">
        {scrollState !== 'start' && (
          <button
            onClick={scrollLeft}
            className="pointer-events-auto w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
        )}
        <div className="flex-1" />
        {scrollState !== 'end' && (
          <button
            onClick={scrollRight}
            className="pointer-events-auto w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Rolar para direita"
          >
            <ChevronRight size={20} className="text-gray-700" />
          </button>
        )}
      </div>

      {/* Table Container */}
      <div
        ref={containerRef}
        className={`
          overflow-x-auto -webkit-overflow-scrolling-touch
          ${scrollState === 'start' ? 'scroll-start' : ''}
          ${scrollState === 'end' ? 'scroll-end' : ''}
          ${className}
        `}
      >
        {/* Gradientes laterais */}
        <div 
          className={`
            hidden md:block absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10
            bg-gradient-to-r from-white to-transparent
            transition-opacity duration-300
            ${scrollState === 'start' ? 'opacity-0' : 'opacity-100'}
          `}
        />
        <div 
          className={`
            hidden md:block absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10
            bg-gradient-to-l from-white to-transparent
            transition-opacity duration-300
            ${scrollState === 'end' ? 'opacity-0' : 'opacity-100'}
          `}
        />
        
        {children}
      </div>

      {/* Scroll Progress Indicator - Mobile */}
      <div className="md:hidden mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#D50000] transition-all duration-300 rounded-full"
          style={{
            width: containerRef.current 
              ? `${(containerRef.current.clientWidth / containerRef.current.scrollWidth) * 100}%`
              : '100%',
            marginLeft: containerRef.current
              ? `${(containerRef.current.scrollLeft / containerRef.current.scrollWidth) * 100}%`
              : '0'
          }}
        />
      </div>
    </div>
  );
}

// Componente de Card Mobile-Friendly
interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileCard({ children, className = '', onClick }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-200 p-4 shadow-sm
        ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Componente de Grid Responsivo
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  cols = { default: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 4,
  className = '' 
}: ResponsiveGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  const gridClass = `
    grid
    ${cols.default ? gridCols[cols.default as keyof typeof gridCols] : 'grid-cols-1'}
    ${cols.sm ? `sm:grid-cols-${cols.sm}` : ''}
    ${cols.md ? `md:grid-cols-${cols.md}` : ''}
    ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''}
    ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}
    gap-${gap}
    ${className}
  `;

  return (
    <div className={gridClass}>
      {children}
    </div>
  );
}
