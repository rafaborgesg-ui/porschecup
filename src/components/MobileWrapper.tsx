import { ReactNode } from 'react';
import { 
  MOBILE_CONTAINER_CLASSES, 
  MOBILE_WRAPPER_CLASSES, 
  MOBILE_HEADER_CLASSES,
  MOBILE_CARD_CLASSES,
  MOBILE_GRID_CLASSES,
  cn
} from '../utils/mobileUtils';

interface MobileWrapperProps {
  children: ReactNode;
  title: string;
  description?: string;
  className?: string;
  showHeader?: boolean;
}

export function MobileWrapper({ 
  children, 
  title, 
  description, 
  className = '',
  showHeader = true 
}: MobileWrapperProps) {
  return (
    <div className={cn(MOBILE_CONTAINER_CLASSES, className)}>
      <div className={MOBILE_WRAPPER_CLASSES}>
        {/* Header */}
        {showHeader && (
          <div className={MOBILE_HEADER_CLASSES}>
            <h1 className="text-gray-900 mb-1 sm:mb-2">{title}</h1>
            {description && (
              <p className="text-gray-500 text-sm sm:text-base">{description}</p>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="w-full max-w-full">
          {children}
        </div>
      </div>
    </div>
  );
}

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function MobileCard({ children, className = '', noPadding = false }: MobileCardProps) {
  const baseClasses = noPadding 
    ? 'bg-white rounded-xl border border-gray-200 shadow-sm w-full max-w-full'
    : MOBILE_CARD_CLASSES;
    
  return (
    <div className={cn(baseClasses, className)}>
      {children}
    </div>
  );
}

interface MobileGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function MobileGrid({ children, cols = 1, className = '' }: MobileGridProps) {
  return (
    <div className={cn(MOBILE_GRID_CLASSES[cols], className)}>
      {children}
    </div>
  );
}

// Componente para seções com título
interface MobileSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  headerAction?: ReactNode;
}

export function MobileSection({ 
  children, 
  title, 
  description, 
  className = '',
  headerAction 
}: MobileSectionProps) {
  return (
    <div className={cn('w-full max-w-full', className)}>
      {(title || description) && (
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-gray-900 mb-1">{title}</h2>}
            {description && <p className="text-gray-500 text-sm sm:text-base">{description}</p>}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      )}
      <div className="w-full max-w-full">
        {children}
      </div>
    </div>
  );
}
