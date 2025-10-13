import { LayoutDashboard, Package, CircleDot, Box, BarChart3, Menu, X, LogOut, Shield, Settings, Database, ArrowRightLeft, Trash2, ChevronDown, ChevronRight, FileText, UserCircle, Truck, Smartphone, Monitor, Globe, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import porscheCupLogo from 'figma:asset/3ae08ff326060d9638298673cda23da363101b9f.png';

interface SidebarProps {
  currentModule: string;
  onModuleChange: (module: string) => void;
}

export function Sidebar({ currentModule, onModuleChange, onLogout, userRole = 'operator' }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['pneus']); // "Pneus" expandido por padrão
  
  // Expande automaticamente os menus se qualquer submenu estiver ativo
  useEffect(() => {
    const pneusModules = [
      'dashboard', 'tire-stock',
      'tire-movement', 'tire-consumption', 'reports', 'tire-discard', 
      'tire-discard-entry', 'tire-discard-reports',
      'data-import', 'stock-adjustment'
    ];
    
    const cadastroModules = ['tire-models', 'containers'];
    
    const freteModules = ['frete-smartphone', 'frete-web', 'frete-internacional'];
    
    if (pneusModules.includes(currentModule)) {
      setExpandedMenus(prev => {
        if (!prev.includes('pneus')) {
          return [...prev, 'pneus'];
        }
        return prev;
      });
    }
    
    if (cadastroModules.includes(currentModule)) {
      setExpandedMenus(prev => {
        if (!prev.includes('cadastro')) {
          return [...prev, 'cadastro'];
        }
        return prev;
      });
    }
    
    if (freteModules.includes(currentModule)) {
      setExpandedMenus(prev => {
        const newExpanded = [...prev];
        if (!newExpanded.includes('solicitacao-frete')) newExpanded.push('solicitacao-frete');
        if (currentModule === 'frete-smartphone' || currentModule === 'frete-web') {
          if (!newExpanded.includes('frete-nacional')) newExpanded.push('frete-nacional');
        }
        return newExpanded;
      });
    }
    
    // Expande submenu de descarte se necessário
    if (currentModule === 'tire-discard-entry' || currentModule === 'tire-discard-reports') {
      setExpandedMenus(prev => {
        const newExpanded = [...prev];
        if (!newExpanded.includes('pneus')) newExpanded.push('pneus');
        if (!newExpanded.includes('tire-discard')) newExpanded.push('tire-discard');
        return newExpanded;
      });
    }
  }, [currentModule]);

  const menuItems = [
    { 
      id: 'solicitacao-frete', 
      label: 'Solicitação de frete', 
      icon: Truck, 
      isMain: true,
      subItems: [
        { 
          id: 'frete-nacional', 
          label: 'Nacional', 
          icon: MapPin,
          subItems: [
            { id: 'frete-smartphone', label: 'Smartphone', icon: Smartphone, externalUrl: 'https://sites.google.com/view/motoristacup/in%C3%ADcio' },
            { id: 'frete-web', label: 'Web', icon: Monitor, externalUrl: 'https://script.google.com/macros/s/AKfycbxG8e_GeG9vOLBtnkv06Su-XjNGl_a2xS0R9swdyjjQZo_dnmQkegBiV3l1Z-FnzEhL/exec' },
          ]
        },
        { id: 'frete-internacional', label: 'Internacional', icon: Globe, externalUrl: 'https://docs.google.com/spreadsheets/d/1-z_PLPueulEfPa7J3Owhg_mfjFKHF3nLDvRVVtyeUvQ/edit?usp=sharing' },
      ]
    },
    { 
      id: 'pneus', 
      label: 'Pneus', 
      icon: Package, 
      isMain: true,
      subItems: [
        { id: 'tire-stock', label: 'Entrada de Estoque', icon: Package },
        { id: 'tire-movement', label: 'Movimentação de Pneus', icon: ArrowRightLeft },
        { id: 'tire-consumption', label: 'Transferir para Piloto', icon: UserCircle },
        { id: 'tire-status-change', label: 'Mudar Status', icon: CircleDot },
        { 
          id: 'tire-discard', 
          label: 'Saída de Estoque (Descarte)', 
          icon: Trash2,
          subItems: [
            { id: 'tire-discard-entry', label: 'Registro de Descarte', icon: Trash2 },
            { id: 'tire-discard-reports', label: 'Relatórios & Histórico', icon: FileText },
          ]
        },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'reports', label: 'Relatórios & Histórico', icon: BarChart3 },
        { id: 'data-import', label: 'Importação de Dados', icon: Database, adminOnly: true },
        { id: 'stock-adjustment', label: 'Ajuste de Estoque', icon: Settings, adminOnly: true },
      ]
    },
    { 
      id: 'cadastro', 
      label: 'Cadastro', 
      icon: Settings, 
      isMain: true,
      adminOnly: true,
      subItems: [
        { id: 'tire-models', label: 'Cadastro de Modelos', icon: CircleDot },
        { id: 'tire-status', label: 'Cadastro de Status', icon: CircleDot },
        { id: 'containers', label: 'Cadastro de Contêineres', icon: Box },
      ]
    },
    { id: 'users', label: 'Gerenciar Usuários', icon: Shield, isMain: true, adminOnly: true },
  ];

  const toggleSubmenu = (itemId: string) => {
    setExpandedMenus(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Função recursiva para verificar se um item está ativo
  const isItemActive = (item: any): boolean => {
    if (currentModule === item.id) return true;
    if (item.subItems) {
      return item.subItems.some((sub: any) => isItemActive(sub));
    }
    return false;
  };

  // Função recursiva para renderizar itens de menu
  const renderMenuItem = (item: any, level: number = 0) => {
    const Icon = item.icon;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = isItemActive(item);
    const isDirectlyActive = currentModule === item.id;
    const isExternalLink = item.externalUrl;
    
    // Esconde itens adminOnly se não for admin
    if (item.adminOnly && userRole !== 'admin') {
      return null;
    }

    return (
      <li key={item.id}>
        {/* Botão do menu */}
        <button
          onClick={() => {
            if (isExternalLink) {
              // Abre link externo em nova aba
              window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
            } else if (hasSubItems) {
              toggleSubmenu(item.id);
            } else {
              onModuleChange(item.id);
              setIsOpen(false);
            }
          }}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-lg
            transition-all duration-200
            ${isDirectlyActive && !hasSubItems
              ? 'bg-[#D50000] text-white shadow-lg' 
              : isActive && hasSubItems
              ? 'bg-gray-900 text-white'
              : 'text-gray-300 hover:bg-gray-900 hover:text-white'
            }
            ${level > 0 ? `ml-${level * 4} text-sm` : ''}
          `}
          style={{ paddingLeft: `${(level * 16) + 16}px` }}
        >
          <Icon size={level > 0 ? 18 : 20} strokeWidth={1.5} />
          <span className="flex-1 text-left">{item.label}</span>
          {hasSubItems && (
            <div className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
              <ChevronDown size={16} />
            </div>
          )}
        </button>

        {/* Subitens recursivos */}
        {hasSubItems && isExpanded && (
          <ul className="mt-1 space-y-1">
            {item.subItems.map((subItem: any) => renderMenuItem(subItem, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-black text-white w-72 z-40 
          transition-transform duration-300 ease-in-out flex-col
          hidden lg:flex
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-800 flex justify-center">
          <img
            src={porscheCupLogo}
            alt="Porsche Cup Brasil"
            className="h-16 w-auto object-contain"
          />
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => renderMenuItem(item, 0))}
          </ul>
        </nav>

        {/* Logout Button */}
        {onLogout && (
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-900 hover:text-[#D50000] transition-all duration-200"
            >
              <LogOut size={20} />
              <span>Sair do Sistema</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <p className="text-gray-500 text-xs text-center">
            © 2025 Porsche Cup Brasil
          </p>
        </div>
      </aside>

      {/* Overlay removido - Sidebar não é usada em mobile (MobileNav é usado) */}
    </>
  );
}
