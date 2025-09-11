import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PageType } from '../App';
import {
  BookOpen,
  Edit,
  Mic,
  Settings,
  LogOut,
  Play,
  TrendingUp,
  FileText,
  Users,
  Loader2,
  MoreVertical
} from 'lucide-react';

interface MainDashboardProps {
  user: any;
  onLogout: () => void;
  onNavigate: (page: PageType) => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ user, onLogout, onNavigate }) => {
  console.log('📊 [DASHBOARD] Component renderizando...');
  
  const [statistics, setStatistics] = useState({
    roteiros: 0,
    canais: 0,
    vozes: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    console.log('📊 [DASHBOARD] useEffect - carregando estatísticas...');
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    console.log('📊 [DASHBOARD] Iniciando carregamento de estatísticas...');
    setIsLoadingStats(true);
    try {
      // Get count of roteiros
      const { count: roteirosCount } = await supabase
        .from('roteiros')
        .select('*', { count: 'exact', head: true });

      // Get count of canais
      const { count: canaisCount } = await supabase
        .from('canais')
        .select('*', { count: 'exact', head: true });

      // Get count of vozes
      const { count: vozesCount } = await supabase
        .from('vozes')
        .select('*', { count: 'exact', head: true });

      console.log('📊 [DASHBOARD] Estatísticas carregadas:', {
        roteiros: roteirosCount,
        canais: canaisCount,
        vozes: vozesCount
      });

      setStatistics({
        roteiros: roteirosCount || 0,
        canais: canaisCount || 0,
        vozes: vozesCount || 0
      });
    } catch (error) {
      console.error('❌ [DASHBOARD] Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const actionCards = [
    {
      id: 'training',
      title: 'Treinar Canal',
      description: 'Analise e replique a estrutura de canais existentes',
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    },
    {
      id: 'prompts',
      title: 'Editar Canais',
      description: 'Edite prompts e configurações dos canais',
      icon: Edit,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700'
    },
    {
      id: 'generate',
      title: 'Gerar Roteiro e Áudio',
      description: 'Crie narrações com vozes de IA',
      icon: Mic,
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700'
    },
    {
      id: 'scripts',
      title: 'Roteiros Gerados',
      description: 'Visualize e gerencie todos os roteiros criados',
      icon: FileText,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700'
    }
  ];

  const handleCardClick = (cardId: string) => {
    console.log('📊 [DASHBOARD] Card clicado:', cardId);
    switch (cardId) {
      case 'training':
        onNavigate('training');
        break;
      case 'prompts':
        onNavigate('prompts');
        break;
      case 'generate':
        onNavigate('generate');
        break;
      case 'scripts':
        onNavigate('scripts');
        break;
      case 'settings':
        onNavigate('settings');
        break;
      default:
        console.log('❓ [DASHBOARD] Card desconhecido:', cardId);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-xl border-b border-gray-800 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-black" />
              </div>
              <h1 className="text-xl font-light text-white">Video AI Studio</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigate('settings')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-white text-sm font-medium">{user?.email || 'Usuário'}</p>
                    <p className="text-gray-400 text-xs">Admin</p>
                  </div>
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('settings');
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Configurações</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 pt-32">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-light text-white mb-4">
            Bem-vindo, {user?.email?.split('@')[0] || 'Usuário'}
          </h2>
          <p className="text-xl text-gray-400 font-light">
            Escolha uma ação para começar a criar conteúdo automatizado
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {actionCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`
                  bg-gradient-to-br ${card.color} ${card.hoverColor}
                  rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl
                  animate-fade-in
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex flex-col h-full">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {card.title}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed flex-grow">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Card */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-light text-white">Configurações do Sistema</h3>
              <div className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center">
                <Settings className="w-7 h-7 text-gray-400" />
              </div>
            </div>
            <p className="text-gray-400 mb-6">
              Gerencie APIs, vozes e configurações gerais do sistema
            </p>
            <div className="space-y-3 mb-6">
              {[
                { label: 'Configurar APIs de IA', color: 'bg-blue-500' },
                { label: 'Gerenciar vozes treinadas', color: 'bg-purple-500' },
                { label: 'Configurações avançadas', color: 'bg-green-500' },
              ].map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 ${item.color} rounded-full`} />
                  <span className="text-gray-300 text-sm">{item.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105"
            >
              Acessar Configurações
            </button>
          </div>

          {/* Statistics */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <h3 className="text-2xl font-light text-white mb-6">Estatísticas</h3>
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {[
                  { icon: FileText, label: 'Roteiros Criados', value: statistics.roteiros, color: 'text-blue-400' },
                  { icon: Users, label: 'Canais Treinados', value: statistics.canais, color: 'text-green-400' },
                  { icon: Mic, label: 'Vozes Treinadas', value: statistics.vozes, color: 'text-purple-400' },
                ].map((stat, index) => {
                  const IconComponent = stat.icon;
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <IconComponent className={`w-6 h-6 ${stat.color}`} />
                        <span className="text-gray-300">{stat.label}</span>
                      </div>
                      <span className="text-3xl font-bold text-white">{stat.value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainDashboard;