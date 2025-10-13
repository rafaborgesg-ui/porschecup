import { Home, Package, UserCircle, FileText } from 'lucide-react';

interface BottomNavProps {
  currentModule: string;
  onModuleChange: (module: string) => void;
}

export function BottomNav({ currentModule, onModuleChange }: BottomNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'tire-stock', label: 'Estoque', icon: Package },
    { id: 'tire-consumption', label: 'Piloto', icon: UserCircle },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onModuleChange(item.id)}
              className={`
                flex flex-col items-center justify-center gap-1
                transition-all duration-200
                ${isActive ? 'text-[#D50000]' : 'text-gray-500'}
                active:bg-gray-100
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
