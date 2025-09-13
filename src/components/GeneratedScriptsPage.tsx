import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { buildWebhookUrl } from '../config/environment';
import { 
  Play,
  Square,
  Download,
  FileText,
  Volume2,
  VolumeX,
  Calendar,
  Hash,
  Eye,
  X,
  Loader2,
  Video,
  Trash2,
  Edit3,
  CheckCircle
} from 'lucide-react';
import { PageType } from '../App';
import PageHeader from './shared/PageHeader';

interface Channel {
  id: number;
  nome_canal: string;
  created_at: string;
}

interface Script {
  id: number;
  roteiro: string;
  titulo: string;
  canal_id: number;
  created_at: string;
  audio_path?: string;
}

interface ChannelWithScripts extends Channel {
  scripts: Script[];
}

interface GeneratedScriptsPageProps {
  user: any;
  onBack: () => void;
  onNavigate?: (page: PageType) => void;
}

const GeneratedScriptsPage: React.FC<GeneratedScriptsPageProps> = ({ user, onBack, onNavigate }) => {
  const [channelsWithScripts, setChannelsWithScripts] = useState<ChannelWithScripts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [downloadingAudios, setDownloadingAudios] = useState<Set<number>>(new Set());
  const [deletingScripts, setDeletingScripts] = useState<Set<number>>(new Set());
  const [scriptToDelete, setScriptToDelete] = useState<{ script: Script; channel: Channel } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedScriptContent, setEditedScriptContent] = useState('');
  const [isUpdatingContent, setIsUpdatingContent] = useState(false);
  const [editModalMessage, setEditModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadChannelsWithScripts();
  }, []);

  const loadChannelsWithScripts = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      // Buscar canais que possuem roteiros
      const { data: channelsData, error: channelsError } = await supabase
        .from('canais')
        .select('id, nome_canal, created_at')
        .order('created_at', { ascending: false });

      if (channelsError) {
        throw channelsError;
      }

      if (!channelsData || channelsData.length === 0) {
        setMessage({ type: 'error', text: 'Nenhum canal encontrado.' });
        setChannelsWithScripts([]);
        return;
      }

      // Buscar roteiros para cada canal
      const { data: scriptsData, error: scriptsError } = await supabase
        .from('roteiros')
        .select('id, roteiro, titulo, canal_id, created_at, audio_path')
        .order('created_at', { ascending: false });

      if (scriptsError) {
        throw scriptsError;
      }

      // Agrupar roteiros por canal
      const channelsWithScriptsData: ChannelWithScripts[] = channelsData
        .map(channel => ({
          ...channel,
          scripts: scriptsData?.filter(script => script.canal_id === channel.id) || []
        }))
        .filter(channel => channel.scripts.length > 0); // Apenas canais com roteiros

      if (channelsWithScriptsData.length === 0) {
        setMessage({ type: 'error', text: 'Nenhum roteiro encontrado.' });
      }

      setChannelsWithScripts(channelsWithScriptsData);
    } catch (err) {
      console.error('Erro ao carregar roteiros:', err);
      setMessage({ type: 'error', text: 'Erro ao carregar roteiros.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Audio control functions
  const playAudio = (audioUrl: string, audioId: string) => {
    if (playingAudio) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    
    audio.addEventListener('ended', () => {
      setPlayingAudio(null);
    });

    audio.addEventListener('error', () => {
      setPlayingAudio(null);
      setMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });

    audio.play().then(() => {
      setPlayingAudio({ id: audioId, audio });
    }).catch(() => {
      setMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });
  };

  const pauseAudio = () => {
    if (playingAudio) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
      setPlayingAudio(null);
    }
  };

  const isAudioPlaying = (audioId: string) => {
    return playingAudio?.id === audioId;
  };

  const downloadAudio = async (script: Script) => {
    if (!script.audio_path) return;

    setDownloadingAudios(prev => new Set(prev).add(script.id));
    
    try {
      const response = await fetch(script.audio_path);
      if (!response.ok) throw new Error('Falha no download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${script.titulo || `roteiro-${script.id}`}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Áudio baixado com sucesso!' });
    } catch (error) {
      console.error('Erro no download:', error);
      setMessage({ type: 'error', text: 'Erro ao baixar áudio' });
    } finally {
      setDownloadingAudios(prev => {
        const newSet = new Set(prev);
        newSet.delete(script.id);
        return newSet;
      });
    }
  };

  const openDeleteConfirmation = (script: Script, channel: Channel) => {
    setScriptToDelete({ script, channel });
    setShowDeleteConfirmation(true);
  };

  const closeDeleteConfirmation = () => {
    setScriptToDelete(null);
    setShowDeleteConfirmation(false);
  };

  const deleteScript = async () => {
    if (!scriptToDelete) return;

    const { script } = scriptToDelete;
    setDeletingScripts(prev => new Set(prev).add(script.id));
    setMessage(null);

    try {
      const response = await fetch(buildWebhookUrl('deleteScript'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_roteiro: script.id
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Roteiro excluído com sucesso:', result);
      
      setMessage({ type: 'success', text: 'Roteiro excluído com sucesso!' });
      
      // Atualizar a lista de roteiros
      await loadChannelsWithScripts();
      
      // Fechar modal de confirmação
      closeDeleteConfirmation();
      
    } catch (error) {
      console.error('Erro ao excluir roteiro:', error);
      setMessage({ type: 'error', text: 'Erro ao excluir roteiro. Tente novamente.' });
    } finally {
      setDeletingScripts(prev => {
        const newSet = new Set(prev);
        newSet.delete(script.id);
        return newSet;
      });
    }
  };

  const openScriptModal = (script: Script, channel: Channel) => {
    setSelectedScript(script);
    setSelectedChannel(channel);
  };

  const openEditModal = (script: Script) => {
    setEditingScript(script);
    setEditedTitle(script.titulo || '');
    setEditedScriptContent(script.roteiro);
    setShowEditModal(true);
    setEditModalMessage(null);
  };

  const closeEditModal = () => {
    setEditingScript(null);
    setShowEditModal(false);
    setEditedTitle('');
    setEditedScriptContent('');
    setEditModalMessage(null);
  };

  const updateContent = async () => {
    if (!editingScript) return;

    setIsUpdatingContent(true);
    setEditModalMessage(null);

    try {
      const payload = {
        id_roteiro: editingScript.id,
        titulo_editado: editedTitle,
        roteiro_editado: editedScriptContent
      };

      console.log('📤 Enviando atualização de conteúdo:', payload);

      const response = await fetch(buildWebhookUrl('updateContent'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Conteúdo atualizado com sucesso:', result);
        
        // Atualizar o script na lista local
        setChannelsWithScripts(prev => prev.map(channel => ({
          ...channel,
          scripts: channel.scripts.map(script => 
            script.id === editingScript.id 
              ? { ...script, titulo: editedTitle, roteiro: editedScriptContent }
              : script
          )
        })));
        
        // Atualizar também o script selecionado se estiver aberto
        if (selectedScript && selectedScript.id === editingScript.id) {
          setSelectedScript({ ...selectedScript, titulo: editedTitle, roteiro: editedScriptContent });
        }
        
        setEditModalMessage({ type: 'success', text: 'Conteúdo atualizado com sucesso!' });
        
        // Fechar modal após 2 segundos
        setTimeout(() => {
          closeEditModal();
        }, 2000);
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar conteúdo:', error);
      setEditModalMessage({ type: 'error', text: 'Erro ao atualizar conteúdo. Tente novamente.' });
    } finally {
      setIsUpdatingContent(false);
    }
  };

  const closeModal = () => {
    setSelectedScript(null);
    setSelectedChannel(null);
    if (playingAudio) {
      pauseAudio();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChannelColor = (id: number) => {
    const colors = [
      { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-400', hover: 'hover:bg-blue-600' },
      { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-400', hover: 'hover:bg-purple-600' },
      { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-400', hover: 'hover:bg-pink-600' },
      { bg: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-400', hover: 'hover:bg-indigo-600' },
      { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-400', hover: 'hover:bg-cyan-600' },
      { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-400', hover: 'hover:bg-orange-600' },
      { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-400', hover: 'hover:bg-red-600' },
      { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-400', hover: 'hover:bg-yellow-600' },
      { bg: 'bg-teal-500', border: 'border-teal-500', text: 'text-teal-400', hover: 'hover:bg-teal-600' },
      { bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-400', hover: 'hover:bg-violet-600' }
    ];
    return colors[id % colors.length];
  };

  const getTotalScripts = () => {
    return channelsWithScripts.reduce((total, channel) => total + channel.scripts.length, 0);
  };

  const getTotalWithAudio = () => {
    return channelsWithScripts.reduce((total, channel) => 
      total + channel.scripts.filter(script => script.audio_path).length, 0
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <PageHeader
        user={user}
        currentPage="scripts"
        onBack={onBack}
        onNavigate={onNavigate}
        onRefresh={loadChannelsWithScripts}
        isRefreshing={isLoading}
      />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-12">
        {message && (
          <div className={`max-w-md mx-auto mb-8 p-4 rounded-xl text-center border ${
            message.type === 'success' 
              ? 'bg-green-900/20 text-green-400 border-green-800' 
              : 'bg-red-900/20 text-red-400 border-red-800'
          }`}>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Statistics */}
        {!isLoading && channelsWithScripts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{channelsWithScripts.length}</div>
                  <div className="text-sm text-gray-400">Canais com Roteiros</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{getTotalScripts()}</div>
                  <div className="text-sm text-gray-400">Total de Roteiros</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Volume2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{getTotalWithAudio()}</div>
                  <div className="text-sm text-gray-400">Com Áudio</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center space-x-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Carregando roteiros...</span>
            </div>
          </div>
        ) : channelsWithScripts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-light text-white mb-2">Nenhum roteiro encontrado</h3>
            <p className="text-gray-400">Gere alguns roteiros primeiro na página de geração</p>
          </div>
        ) : (
          <div className="space-y-12">
            {channelsWithScripts.map((channel) => (
              <ChannelSection
                key={channel.id}
                channel={channel}
                onScriptClick={(script) => openScriptModal(script, channel)}
                onPlayAudio={playAudio}
                onPauseAudio={pauseAudio}
                onDownloadAudio={downloadAudio}
                onDeleteScript={(script) => openDeleteConfirmation(script, channel)}
                onEditScript={openEditModal}
                isAudioPlaying={isAudioPlaying}
                downloadingAudios={downloadingAudios}
                deletingScripts={deletingScripts}
                getChannelColor={getChannelColor}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && scriptToDelete && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeDeleteConfirmation}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-red-700 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-red-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">Excluir Roteiro</h2>
                  <p className="text-sm text-red-400">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <button
                onClick={closeDeleteConfirmation}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Tem certeza que deseja excluir este roteiro?
                </p>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Título:</span>
                      <span className="text-white">{scriptToDelete.script.titulo || 'Sem título'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Canal:</span>
                      <span className="text-white">{scriptToDelete.channel.nome_canal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ID:</span>
                      <span className="text-white">#{scriptToDelete.script.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={closeDeleteConfirmation}
                  className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={deleteScript}
                  disabled={scriptToDelete ? deletingScripts.has(scriptToDelete.script.id) : false}
                  className={`
                    flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                    ${scriptToDelete && deletingScripts.has(scriptToDelete.script.id)
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                    }
                  `}
                >
                  {scriptToDelete && deletingScripts.has(scriptToDelete.script.id) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Script Modal */}
      {showEditModal && editingScript && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeEditModal}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">Editar Roteiro</h2>
                  <p className="text-sm text-gray-400">ID: #{editingScript.id}</p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Success/Error Message */}
              {editModalMessage && (
                <div className={`mb-6 p-4 rounded-xl text-center border ${
                  editModalMessage.type === 'success' 
                    ? 'bg-green-900/20 text-green-400 border-green-800' 
                    : 'bg-red-900/20 text-red-400 border-red-800'
                }`}>
                  <div className="flex items-center justify-center space-x-2">
                    {editModalMessage.type === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                    <span className="font-medium">{editModalMessage.text}</span>
                  </div>
                </div>
              )}

              {/* Title Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full p-4 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  placeholder="Digite o título do roteiro..."
                />
                <div className="text-xs text-gray-400 mt-1">
                  {editedTitle.length} caracteres
                </div>
              </div>

              {/* Script Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Roteiro
                </label>
                <textarea
                  value={editedScriptContent}
                  onChange={(e) => setEditedScriptContent(e.target.value)}
                  rows={12}
                  className="w-full p-4 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 resize-none"
                  placeholder="Digite o conteúdo do roteiro..."
                />
                <div className="text-xs text-gray-400 mt-1">
                  {editedScriptContent.length.toLocaleString()} caracteres
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700 flex-shrink-0">
              <button
                onClick={closeEditModal}
                disabled={isUpdatingContent}
                className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={updateContent}
                disabled={isUpdatingContent || !editedTitle.trim() || !editedScriptContent.trim()}
                className={`
                  flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                  ${isUpdatingContent || !editedTitle.trim() || !editedScriptContent.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                {isUpdatingContent ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Atualizando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Atualizar Conteúdo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Detail Modal */}
      {selectedScript && selectedChannel && (
        <ScriptDetailModal
          script={selectedScript}
          channel={selectedChannel}
          onClose={closeModal}
          onPlayAudio={playAudio}
          onPauseAudio={pauseAudio}
          onDownloadAudio={downloadAudio}
          isAudioPlaying={isAudioPlaying}
          downloadingAudios={downloadingAudios}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

// Channel Section Component
interface ChannelSectionProps {
  channel: ChannelWithScripts;
  onScriptClick: (script: Script) => void;
  onPlayAudio: (audioUrl: string, audioId: string) => void;
  onPauseAudio: () => void;
  onDownloadAudio: (script: Script) => void;
  onDeleteScript: (script: Script) => void;
  onEditScript: (script: Script) => void;
  isAudioPlaying: (audioId: string) => boolean;
  downloadingAudios: Set<number>;
  deletingScripts: Set<number>;
  getChannelColor: (id: number) => any;
  formatDate: (dateString: string) => string;
}

const ChannelSection: React.FC<ChannelSectionProps> = ({
  channel,
  onScriptClick,
  onPlayAudio,
  onPauseAudio,
  onDownloadAudio,
  onDeleteScript,
  onEditScript,
  isAudioPlaying,
  downloadingAudios,
  deletingScripts,
  getChannelColor,
  formatDate
}) => {
  const channelColor = getChannelColor(channel.id);
  const scriptsWithAudio = channel.scripts.filter(script => script.audio_path).length;

  return (
    <div className="space-y-6">
      {/* Channel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 ${channelColor.bg} rounded-xl flex items-center justify-center`}>
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-white">{channel.nome_canal}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>{channel.scripts.length} roteiros</span>
              <span>•</span>
              <span>{scriptsWithAudio} com áudio</span>
              <span>•</span>
              <span>Criado em {formatDate(channel.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channel.scripts.map((script) => (
          <ScriptCard
            key={script.id}
            script={script}
            channelColor={channelColor}
            onClick={() => onScriptClick(script)}
            onPlayAudio={onPlayAudio}
            onPauseAudio={onPauseAudio}
            onDownloadAudio={onDownloadAudio}
            onDeleteScript={onDeleteScript}
            onEditScript={onEditScript}
            isAudioPlaying={isAudioPlaying}
            downloadingAudios={downloadingAudios}
            deletingScripts={deletingScripts}
            formatDate={formatDate}
          />
        ))}
      </div>
    </div>
  );
};

// Script Card Component
interface ScriptCardProps {
  script: Script;
  channelColor: any;
  onClick: () => void;
  onPlayAudio: (audioUrl: string, audioId: string) => void;
  onPauseAudio: () => void;
  onDownloadAudio: (script: Script) => void;
  onDeleteScript: (script: Script) => void;
  onEditScript: (script: Script) => void;
  isAudioPlaying: (audioId: string) => boolean;
  downloadingAudios: Set<number>;
  deletingScripts: Set<number>;
  formatDate: (dateString: string) => string;
}

const ScriptCard: React.FC<ScriptCardProps> = ({
  script,
  channelColor,
  onClick,
  onPlayAudio,
  onPauseAudio,
  onDownloadAudio,
  onDeleteScript,
  onEditScript,
  isAudioPlaying,
  downloadingAudios,
  deletingScripts,
  formatDate
}) => {
  const audioId = `script-audio-${script.id}`;
  const hasAudio = !!script.audio_path;
  const isPlaying = isAudioPlaying(audioId);
  const isDownloading = downloadingAudios.has(script.id);
  const isDeleting = deletingScripts.has(script.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!script.audio_path) return;
    
    if (isPlaying) {
      onPauseAudio();
    } else {
      onPlayAudio(script.audio_path, audioId);
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownloadAudio(script);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteScript(script);
  };
  return (
    <div 
      className={`bg-gray-900/50 backdrop-blur-xl rounded-2xl border-2 ${channelColor.border} hover:border-opacity-100 border-opacity-50 transition-all duration-300 transform hover:scale-105 cursor-pointer group`}
      onClick={onClick}
    >
      <div className="p-6">
        {/* Card Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${channelColor.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs text-gray-400">#{script.id}</span>
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  hasAudio 
                    ? 'bg-green-900/30 text-green-400 border border-green-800' 
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                }`}>
                  {hasAudio ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  <span>{hasAudio ? 'Com Áudio' : 'Sem Áudio'}</span>
                </div>
              </div>
            </div>
          </div>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white">
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <h3 className={`font-medium text-white mb-3 line-clamp-2 group-hover:${channelColor.text} transition-colors`}>
          {script.titulo || 'Sem título'}
        </h3>

        {/* Script Preview */}
        <p className="text-gray-400 text-sm mb-4 line-clamp-3">
          {script.roteiro.substring(0, 150)}...
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Hash className="w-3 h-3" />
              <span>{script.roteiro.length} chars</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(script.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEditScript(script)}
              className={`flex items-center space-x-2 px-3 py-2 ${channelColor.bg} ${channelColor.hover} text-white rounded-lg text-sm font-medium transition-all duration-200`}
              title="Editar roteiro"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar</span>
            </button>
            
            <button
              onClick={onClick}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-all duration-200"
              title="Ver detalhes"
            >
              <Eye className="w-4 h-4" />
              <span>Detalhes</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasAudio && (
              <>
                <button
                  onClick={handlePlayClick}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isPlaying
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownloadClick}
                  disabled={isDownloading}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
              </>
            )}
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isDeleting 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title="Excluir roteiro"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Script Detail Modal Component
interface ScriptDetailModalProps {
  script: Script;
  channel: Channel;
  onClose: () => void;
  onPlayAudio: (audioUrl: string, audioId: string) => void;
  onPauseAudio: () => void;
  onDownloadAudio: (script: Script) => void;
  isAudioPlaying: (audioId: string) => boolean;
  downloadingAudios: Set<number>;
  formatDate: (dateString: string) => string;
}

const ScriptDetailModal: React.FC<ScriptDetailModalProps> = ({
  script,
  channel,
  onClose,
  onPlayAudio,
  onPauseAudio,
  onDownloadAudio,
  isAudioPlaying,
  downloadingAudios,
  formatDate
}) => {
  const audioId = `modal-script-audio-${script.id}`;
  const hasAudio = !!script.audio_path;
  const isPlaying = isAudioPlaying(audioId);
  const isDownloading = downloadingAudios.has(script.id);

  const handlePlayClick = () => {
    if (!script.audio_path) return;
    
    if (isPlaying) {
      onPauseAudio();
    } else {
      onPlayAudio(script.audio_path, audioId);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Detalhes do Roteiro</h2>
              <p className="text-sm text-gray-400">{channel.nome_canal} • #{script.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Title Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-300">Título</h3>
              <button
                onClick={() => copyToClipboard(script.titulo || '')}
                className="text-gray-400 hover:text-white text-sm"
              >
                Copiar
              </button>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <p className="text-white">{script.titulo || 'Sem título'}</p>
            </div>
          </div>

          {/* Script Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-300">Roteiro</h3>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-400">{script.roteiro.length} caracteres</span>
                <button
                  onClick={() => copyToClipboard(script.roteiro)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Copiar
                </button>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
              <p className="text-white whitespace-pre-wrap leading-relaxed">{script.roteiro}</p>
            </div>
          </div>

          {/* Audio Section */}
          {hasAudio && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-300 mb-2">Áudio</h3>
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Volume2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Áudio do Roteiro</p>
                      <p className="text-sm text-gray-400">Clique para reproduzir</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handlePlayClick}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        isPlaying
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-4 h-4" />
                          <span>Parar</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Reproduzir</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onDownloadAudio(script)}
                      disabled={isDownloading}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Baixando...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Informações</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">ID do Roteiro:</span>
                  <span className="text-white">#{script.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Canal:</span>
                  <span className="text-white">{channel.nome_canal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Caracteres:</span>
                  <span className="text-white">{script.roteiro.length.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Criado em:</span>
                  <span className="text-white">{formatDate(script.created_at)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Status</h4>
              <div className="space-y-2">
                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                  hasAudio 
                    ? 'bg-green-900/30 text-green-400 border border-green-800' 
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                }`}>
                  {hasAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{hasAudio ? 'Com Áudio' : 'Sem Áudio'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneratedScriptsPage;