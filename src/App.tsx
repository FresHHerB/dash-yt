import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import LoginPage from './components/LoginPage';
import MainDashboard from './components/MainDashboard';
import TrainingPage from './components/TrainingPage';
import PromptManagementPage from './components/PromptManagementPage';
import SettingsPage from './components/SettingsPage';
import ScriptGenerationPage from './components/ScriptGenerationPage';
import GeneratedScriptsPage from './components/GeneratedScriptsPage';

export type PageType = 'dashboard' | 'training' | 'prompts' | 'settings' | 'generate' | 'scripts';

function App() {
  console.log('🎯 [APP] Component renderizando...');
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 [APP] useEffect executando - verificando sessão...');
    
    const checkSession = async () => {
      console.log('📡 [APP] Iniciando verificação de sessão...');
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 [APP] Chamando supabase.auth.getSession()...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📋 [APP] Resposta da sessão:', { 
          hasSession: !!session, 
          userEmail: session?.user?.email || 'Nenhuma sessão',
          error: error?.message || 'Sem erro'
        });
        
        if (error) {
          console.log('⚠️ [APP] Erro na sessão:', error.message);
          setError(`Erro de autenticação: ${error.message}`);
          setUser(null);
        } else if (session?.user) {
          console.log('✅ [APP] Usuário logado:', session.user.email);
          setUser(session.user);
        } else {
          console.log('❌ [APP] Nenhum usuário logado');
          setUser(null);
        }
      } catch (error) {
        console.error('💥 [APP] Erro ao verificar sessão:', error);
        setError(`Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        setUser(null);
      }
      
      console.log('🏁 [APP] Finalizando verificação de sessão...');
      setIsLoading(false);
    };

    checkSession();

    // Listen for auth changes
    console.log('👂 [APP] Configurando listener de auth...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 [APP] Auth state changed:', event, session?.user?.email);
        if (session?.user) {
          setUser(session.user);
          setError(null);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      console.log('🧹 [APP] Limpando subscription...');
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (userData: any) => {
    console.log('✅ [APP] Login realizado:', userData?.email);
    setUser(userData);
    setError(null);
  };

  const handleLogout = async () => {
    console.log('👋 [APP] Fazendo logout...');
    try {
      await supabase.auth.signOut();
      setCurrentPage('dashboard');
      setError(null);
    } catch (error) {
      console.error('❌ [APP] Erro no logout:', error);
    }
  };

  const navigateToPage = (page: PageType) => {
    console.log('🧭 [APP] Navegando para:', page);
    setCurrentPage(page);
  };

  // Loading state
  if (isLoading) {
    console.log('⏳ [APP] Mostrando loading...');
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white text-xl font-medium">Verificando autenticação...</div>
          {error && (
            <div className="text-red-400 text-sm max-w-md text-center bg-red-900/20 border border-red-800 rounded-lg p-4">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !user) {
    console.log('❌ [APP] Mostrando erro:', error);
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6 max-w-md text-center">
          <div className="text-red-400 text-3xl">⚠️</div>
          <div className="text-white text-xl font-medium">Erro na Aplicação</div>
          <div className="text-gray-300 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  // Login page
  if (!user) {
    console.log('🔐 [APP] Mostrando página de login...');
    return <LoginPage onLogin={handleLogin} />;
  }

  // Main app
  console.log('🏠 [APP] Mostrando página:', currentPage);
  
  const renderCurrentPage = () => {
    try {
      switch (currentPage) {
        case 'dashboard':
          console.log('📊 [APP] Renderizando Dashboard...');
          return (
            <MainDashboard 
              user={user} 
              onLogout={handleLogout}
              onNavigate={navigateToPage}
            />
          );
        case 'training':
          console.log('📚 [APP] Renderizando Training...');
          return (
            <TrainingPage 
              user={user} 
              onBack={() => setCurrentPage('dashboard')}
              onNavigate={navigateToPage}
            />
          );
        case 'prompts':
          console.log('✏️ [APP] Renderizando Prompts...');
          return (
            <PromptManagementPage 
              user={user} 
              onBack={() => setCurrentPage('dashboard')}
              onNavigate={navigateToPage}
            />
          );
        case 'settings':
          console.log('⚙️ [APP] Renderizando Settings...');
          return (
            <SettingsPage 
              user={user} 
              onBack={() => setCurrentPage('dashboard')}
              onNavigate={navigateToPage}
            />
          );
        case 'generate':
          console.log('🎤 [APP] Renderizando Generate...');
          return (
            <ScriptGenerationPage 
              user={user} 
              onBack={() => setCurrentPage('dashboard')}
              onNavigate={navigateToPage}
            />
          );
        case 'scripts':
          console.log('📄 [APP] Renderizando Scripts...');
          return (
            <GeneratedScriptsPage 
              user={user} 
              onBack={() => setCurrentPage('dashboard')}
              onNavigate={navigateToPage}
            />
          );
        default:
          console.log('🔄 [APP] Página desconhecida, voltando para dashboard');
          return (
            <MainDashboard 
              user={user} 
              onLogout={handleLogout}
              onNavigate={navigateToPage}
            />
          );
      }
    } catch (error) {
      console.error('💥 [APP] Erro ao renderizar página:', error);
      return (
        <div className="min-h-screen w-full bg-black flex items-center justify-center">
          <div className="flex flex-col items-center space-y-6 max-w-md text-center">
            <div className="text-red-400 text-3xl">💥</div>
            <div className="text-white text-xl font-medium">Erro de Renderização</div>
            <div className="text-gray-300 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              Erro ao carregar a página: {error instanceof Error ? error.message : 'Erro desconhecido'}
            </div>
            <button 
              onClick={() => setCurrentPage('dashboard')} 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen w-full bg-black">
      {renderCurrentPage()}
    </div>
  );
}

export default App;