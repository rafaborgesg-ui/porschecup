import { useState } from 'react';
import { Home, Package, UserCircle, Trash2, Archive, FileText, Settings, LogOut, Smartphone, Monitor, Globe, MapPin, ChevronDown } from 'lucide-react';
import { Separator } from './ui/separator';
import porscheCarreraCupLogo from 'figma:asset/714dd59c6efd84795d4e42fadd6c600fd2c510ee.png';

interface MobileNavProps {
  currentModule: string;
  onModuleChange: (module: string) => void;
  onLogout: () => void;
  userRole: string;
}

export function MobileNav({ currentModule, onModuleChange, onLogout, userRole }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [expandedNacional, setExpandedNacional] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'tire-stock', label: 'Entrada de Estoque', icon: Package },
    { id: 'tire-consumption', label: 'Transferir para Piloto', icon: UserCircle },
    { id: 'tire-movement', label: 'Movimentação', icon: Archive },
    { id: 'tire-status-change', label: 'Mudar Status', icon: Settings },
    { id: 'tire-discard-entry', label: 'Descarte', icon: Trash2 },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  const freteNacionalItems = [
    { id: 'frete-smartphone', label: 'Smartphone', icon: Smartphone, externalUrl: 'https://sites.google.com/view/motoristacup/in%C3%ADcio' },
    { id: 'frete-web', label: 'Web', icon: Monitor, externalUrl: 'https://script.google.com/macros/s/AKfycbxG8e_GeG9vOLBtnkv06Su-XjNGl_a2xS0R9swdyjjQZo_dnmQkegBiV3l1Z-FnzEhL/exec' },
  ];

  const adminItems = userRole === 'admin' ? [
    { id: 'stock-adjustment', label: 'Ajuste de Estoque', icon: Settings },
    { id: 'tire-models', label: 'Modelos de Pneus', icon: Package },
    { id: 'tire-status', label: 'Status de Pneus', icon: Settings },
    { id: 'containers', label: 'Contêineres', icon: Archive },
    { id: 'data-import', label: 'Importação de Dados', icon: FileText },
    { id: 'users', label: 'Gerenciar Usuários', icon: Settings },
  ] : [];

  const handleItemClick = (moduleId: string, externalUrl?: string) => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
      setOpen(false);
    } else {
      onModuleChange(moduleId);
      setOpen(false);
    }
  };

  return (
    <>
      {/* Animated Hamburger Button - Premium Design */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed top-4 left-4 z-[60] mobile-nav-hamburger ${open ? 'open' : ''}`}
        aria-label={open ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
        aria-expanded={open}
      >
        <div className="mobile-nav-hamburger-lines">
          <span className="mobile-nav-hamburger-line"></span>
          <span className="mobile-nav-hamburger-line"></span>
          <span className="mobile-nav-hamburger-line"></span>
        </div>
      </button>

      {/* Backdrop Overlay */}
      {open && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menu Fullscreen Mobile - Premium Slide Animation */}
      <div 
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header com Glassmorphism Premium */}
          <div className="mobile-nav-header">
            <img 
              src={porscheCarreraCupLogo} 
              alt="Porsche Carrera Cup Brasil" 
              className="h-14 w-auto object-contain"
            />
          </div>

          {/* Conteúdo Scrollável com Scroll Indicators */}
          <div className="flex-1 overflow-y-auto mobile-nav-scroll">
            <nav className="px-4 py-4 space-y-1">
              {/* Solicitação de Frete */}
              <div className="mobile-nav-section-title">
                Solicitação de Frete
              </div>
              
              {/* Nacional (expansível) com Animação */}
              <button
                onClick={() => setExpandedNacional(!expandedNacional)}
                className="mobile-nav-item"
              >
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">Nacional</span>
                <ChevronDown 
                  className={`w-5 h-5 transition-transform duration-300 ${expandedNacional ? 'rotate-180' : ''}`}
                />
              </button>
              
              {/* Submenu com Collapse Animation */}
              <div 
                className={`mobile-nav-submenu ${expandedNacional ? 'open' : ''}`}
              >
                {freteNacionalItems.map((item) => {
                  const Icon = item.icon;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id, item.externalUrl)}
                      className="mobile-nav-subitem"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Internacional */}
              <button
                onClick={() => handleItemClick('frete-internacional', 'https://docs.google.com/spreadsheets/d/1-z_PLPueulEfPa7J3Owhg_mfjFKHF3nLDvRVVtyeUvQ/edit?usp=sharing')}
                className="mobile-nav-item"
              >
                <Globe className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">Internacional</span>
              </button>

              <Separator className="my-4 bg-gray-200" />

              {/* Menu Pneus */}
              <div className="mobile-nav-section-title">
                Pneus
              </div>
              
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentModule === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && (
                      <div className="mobile-nav-active-indicator" />
                    )}
                  </button>
                );
              })}

              {adminItems.length > 0 && (
                <>
                  <Separator className="my-4 bg-gray-200" />
                  
                  <div className="mobile-nav-section-title">
                    Administração
                  </div>
                  
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentModule === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isActive && (
                          <div className="mobile-nav-active-indicator" />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </nav>
          </div>

          {/* Footer - Logout com Shadow Premium */}
          <div className="mobile-nav-footer">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="mobile-nav-logout"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
