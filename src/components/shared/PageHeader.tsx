import React, { useState } from 'react';
import { PageType } from '../../App';
import {
  ArrowLeft,
  BookOpen,
  Edit,
  Mic,
  Settings,
  FileText,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

interface PageHeaderProps {
  user: any;
  currentPage: PageType;
  onBack: () => void;
  onNavigate?: (page: PageType) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  customActions?: React.ReactNode;
}

const pageConfig = {
  training: {
    icon: BookOpen,
    title: 'Treinar Canal',
    description: 'Analise e replique a estrutura de canais existentes',
    color: '#2196f3'
  },
  prompts: {
    icon: Edit,
    title: 'Editar Canais',
    description: 'Edite prompts e configurações dos canais',
    color: '#9c27b0'
  },
  generate: {
    icon: Mic,
    title: 'Gerar Roteiro e Áudio',
    description: 'Crie narrações com vozes de IA',
    color: '#ff9800'
  },
  scripts: {
    icon: FileText,
    title: 'Roteiros Gerados',
    description: 'Visualize e gerencie todos os roteiros criados',
    color: '#4caf50'
  },
  settings: {
    icon: Settings,
    title: 'Configurações Gerais',
    description: 'Gerencie APIs, vozes e configurações do sistema',
    color: '#9e9e9e'
  },
  dashboard: {
    icon: Settings,
    title: 'Dashboard',
    description: 'Painel principal',
    color: '#2196f3'
  }
};

const PageHeader: React.FC<PageHeaderProps> = ({
  user,
  currentPage,
  onBack,
  onNavigate,
  onRefresh,
  isRefreshing = false,
  customActions
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const config = pageConfig[currentPage];
  const IconComponent = config.icon;

  const getNavigationButtonStyle = (page: PageType, pageColor: string) => {
    const isActive = currentPage === page;
    
    return isActive 
      ? `text-white hover:text-white` 
      : `text-white/70 hover:text-white hover:bg-white/10`;
  };

  const getNavigationIconStyle = (page: PageType) => {
    const isActive = currentPage === page;
    const pageColor = pageConfig[page].color;
    
    return isActive 
      ? { color: pageColor }
      : {};
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between px-6 py-4 min-h-[80px]">
        {/* Left Section: Back button + Page title */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={onBack}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: config.color }}
          >
            <IconComponent size={24} />
          </div>
          
          <div>
            <h1 className="text-white font-medium text-lg">{config.title}</h1>
            <p className="text-white/70 text-sm">{config.description}</p>
          </div>
        </div>
        
        {/* Center Section: Navigation Icons */}
        <div className="flex items-center gap-2 flex-1 justify-center max-w-md mx-auto">
          {[
            { page: 'training' as PageType, tooltip: 'Treinar Canal' },
            { page: 'prompts' as PageType, tooltip: 'Editar Canais' },
            { page: 'generate' as PageType, tooltip: 'Gerar Roteiro e Áudio' },
            { page: 'scripts' as PageType, tooltip: 'Roteiros Gerados' },
            { page: 'settings' as PageType, tooltip: 'Configurações Gerais' },
          ].map(({ page, tooltip }) => {
            const PageIcon = pageConfig[page].icon;
            const pageColor = pageConfig[page].color;
            return (
              <button
                key={page}
                title={tooltip}
                onClick={() => onNavigate && onNavigate(page)}
                className={`p-3 rounded-lg transition-all ${getNavigationButtonStyle(page, pageColor)}`}
              >
                <PageIcon 
                  size={20} 
                  style={getNavigationIconStyle(page)}
                />
              </button>
            );
          })}
        </div>
        
        {/* Right Section: Custom Actions + Refresh + User info */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Custom Actions */}
          {customActions}
          
          {/* Refresh Button */}
          {onRefresh && (
            <button
              title="Atualizar"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw 
                size={20} 
                className={isRefreshing ? 'animate-spin' : ''} 
              />
            </button>
          )}
          
          {/* Settings Button */}
          <button
            title="Configurações"
            onClick={() => onNavigate && onNavigate('settings')}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Settings size={20} />
          </button>
          
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium"
            >
              {user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            
            <div className="hidden md:block relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{user?.email || 'Usuário'}</div>
                  <div className="text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-full inline-block">
                    Admin
                  </div>
                </div>
                <ChevronDown size={16} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate && onNavigate('settings');
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Configurações
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;