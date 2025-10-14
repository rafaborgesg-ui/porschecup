import { useState, useEffect } from 'react';
import { Package, Activity, Trash2, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar, ChevronDown, ChevronUp, Box, MapPin } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { getStockEntries, getContainers, getTireModels } from '../utils/storage';
import { SupabaseSyncMonitor } from './SupabaseSyncMonitor';
// import { ResponsiveTable, ResponsiveGrid } from './ResponsiveTable';

interface StatCard {
  title: string;
  value: number;
  change: number;
  changeLabel: string;
  icon: any;
  gradient: string;
  iconBg: string;
  accentColor: string;
  containers?: number;
  type: 'total' | 'active' | 'new' | 'discard';
}

export function Dashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<'total' | 'active' | 'new' | 'discard' | null>(null);

  useEffect(() => {
    loadDashboardData();

    // Atualiza quando houver mudanças
    const handleUpdate = () => loadDashboardData();
    window.addEventListener('stock-entries-updated', handleUpdate);
    
    return () => window.removeEventListener('stock-entries-updated', handleUpdate);
  }, []);

  const loadDashboardData = () => {
    const allEntries = getStockEntries(true);
    const activeEntries = getStockEntries(false);
    // const containers = getContainers();

    // Total de pneus EXCLUINDO os descartados
    const totalPneus = activeEntries.length;
    const pneusAtivos = activeEntries.filter(e => e.status === 'Ativo' || !e.status).length;
    const pneusNovos = activeEntries.filter(e => e.status === 'Novo').length;
    const pneusDescartados = allEntries.filter(e => e.status === 'Descarte').length;
    // const totalContainers = containers.length;

    // Calcula containers únicos por status
    // Containers com pneus ativos (Ativo + Novo, excluindo Descartados)
    const containersWithActiveTires = new Set(
      activeEntries.map(e => e.containerId)
    ).size;

    const containersWithAtivos = new Set(
      activeEntries
        .filter(e => e.status === 'Ativo' || !e.status)
        .map(e => e.containerId)
    ).size;

    const containersWithNovos = new Set(
      activeEntries
        .filter(e => e.status === 'Novo')
        .map(e => e.containerId)
    ).size;

    const containersWithDescarte = new Set(
      allEntries
        .filter(e => e.status === 'Descarte')
        .map(e => e.containerId)
    ).size;

    // Simula mudanças percentuais (em produção viria do histórico)
    const statsData: StatCard[] = [
      {
        title: 'Total de Pneus em estoque',
        value: totalPneus,
        change: 12,
        changeLabel: 'em estoque ativo',
        icon: Package,
        gradient: 'from-blue-50 to-blue-100',
        iconBg: 'from-blue-500 to-blue-600',
        accentColor: 'blue',
        containers: containersWithActiveTires,
        type: 'total',
      },
      {
        title: 'Pneus Novos',
        value: pneusNovos,
        change: 15,
        changeLabel: 'estoque disponível',
        icon: TrendingUp,
        gradient: 'from-purple-50 to-purple-100',
        iconBg: 'from-purple-500 to-purple-600',
        accentColor: 'purple',
        containers: containersWithNovos,
        type: 'new',
      },
      {
        title: 'Pneus Ativos',
        value: pneusAtivos,
        change: 8,
        changeLabel: 'em uso',
        icon: Activity,
        gradient: 'from-green-50 to-green-100',
        iconBg: 'from-[#00A86B] to-[#008F5A]',
        accentColor: 'green',
        containers: containersWithAtivos,
        type: 'active',
      },
      {
        title: 'Descartados',
        value: pneusDescartados,
        change: -5,
        changeLabel: 'vs. mês anterior',
        icon: Trash2,
        gradient: 'from-red-50 to-red-100',
        iconBg: 'from-[#D50000] to-[#A80000]',
        accentColor: 'red',
        containers: containersWithDescarte,
        type: 'discard',
      },
    ];

    setStats(statsData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="px-2 py-2 sm:p-2 lg:p-3 space-y-4 lg:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-24 bg-gray-200 rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-2 sm:p-4 md:p-6 lg:p-8 space-y-4 lg:space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold gradient-text-porsche">
          Dashboard
        </h1>
        <p className="text-gray-600">
          Visão geral do estoque de pneus Porsche Cup Brasil
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;
          const isSelected = selectedCard === stat.type;
          
          return (
            <Card 
              key={index}
              onClick={() => setSelectedCard(isSelected ? null : stat.type)}
              className={`
                relative overflow-hidden
                bg-gradient-to-br ${stat.gradient}
                border-${stat.accentColor}-200
                transition-all duration-300
                hover:shadow-xl hover:scale-105
                cursor-pointer
                group
                ${isSelected ? 'ring-4 ring-' + stat.accentColor + '-400 scale-105' : ''}
              `}
            >
              {/* Background decoration */}
              <div className={`
                absolute top-0 right-0 w-32 h-32 
                bg-${stat.accentColor}-500/10 
                rounded-full -mr-16 -mt-16
                transition-transform duration-500
                group-hover:scale-150
              `} />
              
              {/* Content */}
              <div className="relative p-6 space-y-4">
                {/* Header com ícone */}
                <div className="flex items-center justify-between">
                  <div className={`
                    p-3 rounded-xl shadow-md
                    bg-gradient-to-br ${stat.iconBg}
                    transition-transform duration-300
                    group-hover:rotate-6 group-hover:scale-110
                  `}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Badge de mudança */}
                  <div className={`
                    flex items-center gap-1 px-2 py-1 rounded-full
                    text-xs font-medium
                    ${isPositive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                    }
                  `}>
                    {isPositive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(stat.change)}%
                  </div>
                </div>

                {/* Título */}
                <div>
                  <p className={`text-sm font-medium text-${stat.accentColor}-600 mb-1`}>
                    {stat.title}
                  </p>
                  <p className={`text-4xl font-bold text-${stat.accentColor}-900`}>
                    {stat.value.toLocaleString('pt-BR')}
                  </p>
                </div>

                {/* Label de mudança e containers */}
                <div className="space-y-1">
                  <p className={`text-xs text-${stat.accentColor}-600 flex items-center gap-1`}>
                    <Calendar className="w-3 h-3" />
                    {stat.changeLabel}
                  </p>
                  {stat.containers !== undefined && (
                    <p className={`text-xs text-${stat.accentColor}-500 font-medium flex items-center gap-1`}>
                      <Package className="w-3 h-3" />
                      {stat.containers} {stat.containers === 1 ? 'container' : 'containers'}
                    </p>
                  )}
                </div>

                {/* Indicador de clique */}
                <div className={`absolute bottom-2 right-2 text-${stat.accentColor}-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}>
                  {isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Shine effect on hover */}
              <div className="
                absolute inset-0 
                bg-gradient-to-r from-transparent via-white/20 to-transparent
                translate-x-[-200%] 
                group-hover:translate-x-[200%]
                transition-transform duration-1000
              " />
            </Card>
          );
        })}
      </div>

      {/* Tabela Detalhada */}
      {selectedCard && (
        <Card className="p-0 bg-white border border-gray-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          {(() => {
            const allEntries = getStockEntries(true);
            const activeEntries = getStockEntries(false);
            const containers = getContainers();
            const tireModels = getTireModels();

            let filteredEntries: any[] = [];
            let title = '';
            let description = '';
            let headerColor = '';

            if (selectedCard === 'total') {
              filteredEntries = activeEntries;
              title = 'Total de Pneus em Estoque';
              description = 'Pneus ativos no sistema (excluindo descartados)';
              headerColor = 'bg-gradient-to-r from-blue-500 to-blue-600';
            } else if (selectedCard === 'active') {
              filteredEntries = activeEntries.filter(e => e.status === 'Ativo' || !e.status);
              title = 'Pneus Ativos';
              description = 'Pneus atualmente em uso';
              headerColor = 'bg-gradient-to-r from-[#00A86B] to-[#008F5A]';
            } else if (selectedCard === 'new') {
              filteredEntries = activeEntries.filter(e => e.status === 'Novo');
              title = 'Pneus Novos';
              description = 'Estoque disponível para uso';
              headerColor = 'bg-gradient-to-r from-purple-500 to-purple-600';
            } else if (selectedCard === 'discard') {
              filteredEntries = allEntries.filter(e => e.status === 'Descarte');
              title = 'Pneus Descartados';
              description = 'Pneus removidos do estoque ativo';
              headerColor = 'bg-gradient-to-r from-[#D50000] to-[#A80000]';
            }

            // Limita a 20 itens mais recentes
            const displayEntries = filteredEntries.slice(0, 20);

            return (
              <>
                {/* Header */}
                <div className={`${headerColor} px-6 py-4 text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{title}</h3>
                      <p className="text-sm text-white/80">{description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{filteredEntries.length}</div>
                      <div className="text-sm text-white/80">
                        {displayEntries.length < filteredEntries.length && `Exibindo ${displayEntries.length}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                  {displayEntries.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum pneu encontrado nesta categoria</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Modelo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Container
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Localização
                          </th>
                          {selectedCard === 'active' && (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Piloto
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Data Consumo
                              </th>
                            </>
                          )}
                          {selectedCard === 'discard' && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Motivo
                            </th>
                          )}
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {displayEntries.map((entry) => {
                          const container = containers.find(c => c.id === entry.containerId);
                          const model = tireModels.find(m => m.id === entry.tireModelId);

                          return (
                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-mono font-medium text-gray-900">
                                  {entry.barcode}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {model?.type || 'N/A'}
                                  </Badge>
                                  <span className="text-sm text-gray-900">{model?.name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Box className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-900">{container?.name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{container?.location || 'N/A'}</span>
                                </div>
                              </td>
                              {selectedCard === 'active' && (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-900">{entry.pilotName || '-'}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-600">
                                      {entry.consumptionDate 
                                        ? new Date(entry.consumptionDate).toLocaleDateString('pt-BR')
                                        : '-'}
                                    </span>
                                  </td>
                                </>
                              )}
                              {selectedCard === 'discard' && (
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-600">{entry.discardReason || '-'}</span>
                                </td>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <Badge
                                  variant="secondary"
                                  className={`
                                    ${entry.status === 'Novo' 
                                      ? 'bg-blue-100 text-blue-700 border-blue-200' 
                                      : entry.status === 'Ativo' 
                                      ? 'bg-green-100 text-green-700 border-green-200'
                                      : entry.status === 'Descarte'
                                      ? 'bg-red-100 text-red-700 border-red-200'
                                      : 'bg-gray-100 text-gray-700 border-gray-200'}
                                  `}
                                >
                                  {entry.status || 'Ativo'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer */}
                {filteredEntries.length > 20 && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-600">
                      Exibindo os 20 registros mais recentes de {filteredEntries.length} total.
                      Para ver todos, acesse o módulo <strong>Relatórios & Histórico</strong>.
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </Card>
      )}

      {/* Monitor de Sincronização Supabase */}
      <SupabaseSyncMonitor />

      {/* Informação adicional */}
      <Card className="p-6 bg-gradient-to-br from-gray-50 to-white border-gray-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-xl shadow-md">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Sistema Integrado
            </h3>

          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Online
          </div>
        </div>
      </Card>
    </div>
  );
}
