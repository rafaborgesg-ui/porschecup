import { useState, useEffect, useRef } from 'react';
import { Toaster } from './components/ui/sonner';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { TireStockEntry } from './components/TireStockEntry';
import { TireDiscard } from './components/TireDiscard';
import { DiscardReports } from './components/DiscardReports';
import { TireModelRegistration } from './components/TireModelRegistration';
import { ContainerRegistration } from './components/ContainerRegistration';
import { TireMovement } from './components/TireMovement';
import { TireConsumption } from './components/TireConsumption';
import { TireStatusChange } from './components/TireStatusChange';
import { StatusRegistration } from './components/StatusRegistration';
import { Reports } from './components/Reports';
import { DataImport } from './components/DataImport';
import { StockAdjustment } from './components/StockAdjustment';
import { UserManagement } from './components/UserManagement';
import { Login } from './components/Login';
import { SignUp } from './components/SignUp';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Onboarding } from './components/Onboarding';
import { OnboardingChecklist } from './components/OnboardingChecklist';
import { QuickTips } from './components/QuickTips';
import { ZoomPrevention } from './components/ZoomPrevention';
import { useSupabaseSync } from './utils/useSupabaseSync';
import { registerServiceWorker, setupInstallPrompt } from './utils/pwa';
import { createClient, getCurrentUser } from './utils/supabase/client';

export default function App() {
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [userRole, setUserRole] = useState<string>('operator');
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Sincronização com Supabase ATIVADA
  // A aplicação sincroniza automaticamente com o banco de dados em nuvem
  const { isOnline, syncStatus } = useSupabaseSync();

  // Estados para controle do indicador de sincronização
  // IMPORTANTE: Todos os hooks devem estar no topo, antes de qualquer return condicional
  const [showSynced, setShowSynced] = useState(false);
  const prevSyncStatus = useRef(syncStatus);

  // Verifica autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      // 🧹 LIMPEZA DE DADOS CORROMPIDOS - Executa ANTES de qualquer verificação
      try {
        const authData = localStorage.getItem('porsche-cup-auth');
        // Se encontrar a string 'authenticated' corrompida, remove tudo relacionado
        if (authData === 'authenticated') {
          console.warn('🧹 Detectado localStorage corrompido, limpando...');
          localStorage.removeItem('porsche-cup-auth');
          localStorage.removeItem('sb-auth-token');
        }
        
        // Também limpa a nova chave do Supabase se estiver corrompida
        const sbAuthToken = localStorage.getItem('sb-auth-token');
        if (sbAuthToken === 'authenticated') {
          console.warn('🧹 Detectado sb-auth-token corrompido, limpando...');
          localStorage.removeItem('sb-auth-token');
        }
      } catch (e) {
        console.error('Erro ao limpar localStorage:', e);
      }
      
      try {
        // Tenta obter usuário do Supabase Auth
        const user = await getCurrentUser();
        
        if (user) {
          // Usuário autenticado via Supabase Auth
          setUserRole(user.role);
          setIsAuthenticated(true);
          
          // Salva dados do usuário separadamente (não conflita com Supabase session)
          localStorage.setItem('porsche-cup-user', JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }));
          
          // Verifica se é primeira vez do usuário
          const onboardingCompleted = localStorage.getItem('onboarding-completed');
          if (!onboardingCompleted) {
            setShowOnboarding(true);
          }
        } else {
          // Fallback: verifica localStorage (compatibilidade com sistema antigo)
          const userData = localStorage.getItem('porsche-cup-user');
          
          if (userData) {
            try {
              const localUser = JSON.parse(userData);
              if (localUser && localUser.role) {
                setUserRole(localUser.role);
                setIsAuthenticated(true);
                
                // Verifica onboarding
                const onboardingCompleted = localStorage.getItem('onboarding-completed');
                if (!onboardingCompleted) {
                  setShowOnboarding(true);
                }
              }
            } catch (e) {
              // Se JSON inválido, limpa dados corrompidos
              console.warn('Dados de usuário corrompidos, limpando...');
              localStorage.removeItem('porsche-cup-user');
            }
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Em caso de erro, limpa dados para evitar loops
        localStorage.removeItem('porsche-cup-user');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Inicializa PWA
    registerServiceWorker();
    setupInstallPrompt();
    
    // Log de inicialização
    console.log('%c🏁 Porsche Cup Brasil - Sistema de Gestão de Pneus', 'color: #D50000; font-size: 14px; font-weight: bold;');
    console.log('%c🔐 Autenticação: Supabase Auth + Row-Level Security', 'color: #00A86B; font-size: 12px;');
    
    // Expõe função global para reativar onboarding (silencioso)
    (window as any).resetOnboarding = () => {
      localStorage.removeItem('onboarding-completed');
      localStorage.removeItem('onboarding-checklist-dismissed');
      localStorage.removeItem('quick-tips-disabled');
      localStorage.removeItem('dismissed-tips');
      window.location.reload();
    };
  }, []);

  // Controla exibição do indicador "Sincronizado"
  useEffect(() => {
    // Só mostra "Sincronizado" quando muda de 'syncing' para 'synced'
    if (prevSyncStatus.current === 'syncing' && syncStatus === 'synced') {
      setShowSynced(true);
      setTimeout(() => setShowSynced(false), 3000);
    }
    prevSyncStatus.current = syncStatus;
  }, [syncStatus]);

  const handleModuleChange = (module: string) => {
    setCurrentModule(module);
  };

  const handleLogin = (role: string) => {
    setUserRole(role);
    setIsAuthenticated(true);
    setAuthView('login'); // Reset auth view
  };

  const handleSignUpSuccess = () => {
    setAuthView('login'); // Volta para login após cadastro
  };

  const handleLogout = async () => {
    try {
      // Logout do Supabase Auth
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Limpa dados do usuário (Supabase Auth já limpa sua própria sessão)
      localStorage.removeItem('porsche-cup-user');
      setIsAuthenticated(false);
      setUserRole('operator');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D50000] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Auth screens (Login & SignUp)
  if (!isAuthenticated) {
    return (
      <>
        {authView === 'login' ? (
          <Login 
            onLogin={handleLogin} 
            onSignUp={() => setAuthView('signup')}
          />
        ) : (
          <SignUp 
            onSignUpSuccess={handleSignUpSuccess}
            onBackToLogin={() => setAuthView('login')}
          />
        )}
        <Toaster />
      </>
    );
  }

  // Main application
  return (
    <div className="min-h-screen bg-gray-50 flex tap-highlight-none">
      {/* Componente de Prevenção de Zoom */}
      <ZoomPrevention />
      
      {/* Indicadores de Sincronização - Glassmorphism Premium */}
      {syncStatus === 'syncing' && (
        <div className="fixed top-6 right-6 z-50 glass-morphism px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in-out">
          {/* Ícone animado com ping effect */}
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75" />
            <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-5 h-5 flex items-center justify-center shadow-md">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          {/* Texto com gradiente */}
          <span className="text-sm font-medium bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Sincronizando...
          </span>
        </div>
      )}
      
      {showSynced && isOnline && (
        <div className="fixed top-6 right-6 z-50 glass-morphism px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in-out">
          {/* Ícone de sucesso */}
          <div className="w-5 h-5 bg-gradient-to-br from-[#00A86B] to-[#008F5A] rounded-full flex items-center justify-center shadow-md">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {/* Texto com gradiente verde */}
          <span className="text-sm font-medium bg-gradient-to-r from-[#00A86B] to-[#008F5A] bg-clip-text text-transparent">
            Sincronizado
          </span>
        </div>
      )}
      
      {!isOnline && syncStatus === 'error' && (
        <div className="fixed top-6 right-6 z-50 glass-morphism px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
          {/* Ícone de aviso com pulse */}
          <div className="w-5 h-5 bg-gradient-to-br from-[#FFB800] to-[#FF9500] rounded-full flex items-center justify-center shadow-md animate-pulse-slow">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          {/* Texto com gradiente amarelo */}
          <span className="text-sm font-medium bg-gradient-to-r from-[#FFB800] to-[#FF9500] bg-clip-text text-transparent">
            Modo Offline
          </span>
        </div>
      )}
      
      {/* Desktop Sidebar */}
      <Sidebar 
        currentModule={currentModule} 
        onModuleChange={handleModuleChange}
        onLogout={handleLogout}
        userRole={userRole}
      />
      
      {/* Mobile Navigation */}
      <MobileNav
        currentModule={currentModule}
        onModuleChange={handleModuleChange}
        onLogout={handleLogout}
        userRole={userRole}
      />
      
      {/* Bottom Navigation Mobile */}
      <BottomNav
        currentModule={currentModule}
        onModuleChange={handleModuleChange}
      />
      
      <main className="flex-1 lg:ml-72 min-h-screen mobile-with-bottom-nav pb-safe no-overscroll">
        {currentModule === 'dashboard' && <Dashboard />}
        {currentModule === 'tire-stock' && <TireStockEntry />}
        {currentModule === 'tire-movement' && <TireMovement />}
        {currentModule === 'tire-consumption' && <TireConsumption />}
        {currentModule === 'tire-status-change' && <TireStatusChange />}
        {currentModule === 'tire-discard-entry' && <TireDiscard />}
        {currentModule === 'tire-discard-reports' && <DiscardReports />}
        {currentModule === 'tire-models' && (
          userRole === 'admin' ? (
            <TireModelRegistration />
          ) : (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center p-8">
                <h2 className="text-gray-900 mb-2">Acesso Negado</h2>
                <p className="text-gray-500">Esta área é restrita para administradores.</p>
              </div>
            </div>
          )
        )}
        {currentModule === 'tire-status' && (
          userRole === 'admin' ? (
            <StatusRegistration />
          ) : (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center p-8">
                <h2 className="text-gray-900 mb-2">Acesso Negado</h2>
                <p className="text-gray-500">Esta área é restrita para administradores.</p>
              </div>
            </div>
          )
        )}
        {currentModule === 'containers' && (
          userRole === 'admin' ? (
            <ContainerRegistration />
          ) : (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center p-8">
                <h2 className="text-gray-900 mb-2">Acesso Negado</h2>
                <p className="text-gray-500">Esta área é restrita para administradores.</p>
              </div>
            </div>
          )
        )}
        {currentModule === 'reports' && <Reports />}
        {currentModule === 'data-import' && (
          userRole === 'admin' ? (
            <DataImport />
          ) : (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center p-8">
                <h2 className="text-gray-900 mb-2">Acesso Negado</h2>
                <p className="text-gray-500">Esta área é restrita para administradores.</p>
              </div>
            </div>
          )
        )}
        {currentModule === 'stock-adjustment' && (
          userRole === 'admin' ? (
            <StockAdjustment />
          ) : (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center p-8">
                <h2 className="text-gray-900 mb-2">Acesso Negado</h2>
                <p className="text-gray-500">Esta área é restrita para administradores.</p>
              </div>
            </div>
          )
        )}
        {currentModule === 'users' && (
          userRole === 'admin' ? (
            <UserManagement />
          ) : (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center p-8">
                <h2 className="text-gray-900 mb-2">Acesso Negado</h2>
                <p className="text-gray-500">Esta área é restrita para administradores.</p>
              </div>
            </div>
          )
        )}
      </main>
      
      {/* Onboarding System */}
      {isAuthenticated && showOnboarding && (
        <Onboarding
          userRole={userRole}
          onComplete={() => setShowOnboarding(false)}
          onModuleChange={handleModuleChange}
        />
      )}
      
      {/* Onboarding Checklist */}
      {isAuthenticated && (
        <OnboardingChecklist onModuleChange={handleModuleChange} />
      )}
      
      {/* Quick Tips por módulo */}
      {isAuthenticated && (
        <QuickTips module={currentModule} />
      )}
      
      {/* PWA Install Prompt */}
      {isAuthenticated && <PWAInstallPrompt />}
      
      {/* Botão PWA sempre visível em mobile para debug/fallback */}
      {isAuthenticated && (
        <div className="lg:hidden fixed bottom-2 right-2 z-40">
          <button
            onClick={() => {
              // Força o evento pwa-installable para mostrar o prompt
              window.dispatchEvent(new Event('pwa-installable'));
            }}
            className="bg-[#D50000] text-white p-2 rounded-full shadow-lg text-xs opacity-20 hover:opacity-100 transition-opacity"
            title="Instalar App"
          >
            📱
          </button>
        </div>
      )}
      
      <Toaster />
    </div>
  );
}
