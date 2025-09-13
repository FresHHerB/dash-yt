import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { buildWebhookUrl } from '../config/environment';
import { 
  Mic, 
  Wand2, 
  Loader2, 
  FileText, 
  Play, 
  Square, 
  Download,
  Eye,
  X,
  Volume2,
  VolumeX,
  Calendar,
  Hash,
  Trash2,
  Edit3,
  CheckCircle
} from 'lucide-react';
import { PageType } from '../App';
import PageHeader from './shared/PageHeader';

interface Voice {
  id: number;
  nome_voz: string;
  voice_id: string;
  plataforma: string;
  idioma?: string;
  genero?: string;
  preview_url?: string;
  created_at: string;
}

interface GeneratedScript {
  id: string;
  titulo: string;
  roteiro: string;
  audio_path?: string;
  created_at: string;
  canal_id: number;
  nome_canal: string;
  voice_id?: string;
  plataforma?: string;
}

interface ScriptListPageProps {
  user: any;
  onBack: () => void;
  onNavigate?: (page: PageType) => void;
}

const ScriptListPage: React.FC<ScriptListPageProps> = ({ user, onBack, onNavigate }) => {
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [downloadingAudios, setDownloadingAudios] = useState<Set<string>>(new Set());
  const [deletingScripts, setDeletingScripts] = useState<Set<string>>(new Set());
  const [selectedScript, setSelectedScript] = useState<GeneratedScript | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedScript, setEditedScript] = useState('');
  const [isUpdatingContent, setIsUpdatingContent] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadVoices();
    loadScripts();
  }, []);

  const loadVoices = async () => {
    try {
      const { data, error } = await supabase
        .from('vozes')
        .select('*')
        .order('nome_voz', { ascending: true });

      if (error) {
        console.error('Erro ao carregar vozes:', error);
      } else {
        setVoices(data || []);
      }
    } catch (err) {
      console.error('Erro de conexão ao carregar vozes:', err);
    }
  };

  const loadScripts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('roteiros_gerados')
        .select(`
          *,
          canais (
            nome_canal
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar roteiros:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar roteiros.' });
      } else {
        const formattedScripts = (data || []).map(script => ({
          ...script,
          nome_canal: script.canais?.nome_canal || 'Canal não encontrado'
        }));
        setScripts(formattedScripts);
      }
    } catch (err) {
      console.error('Erro de conexão ao carregar roteiros:', err);
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoading(false);
    }
  };

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

  const downloadAudio = async (script: GeneratedScript) => {
    if (!script.audio_path) return;
    
    const audioId = script.id;
    setDownloadingAudios(prev => new Set(prev).add(audioId));
    
    try {
      const response = await fetch(script.audio_path);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roteiro-${script.id}-audio.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Áudio baixado com sucesso!' });
    } catch (error) {
      console.error('Erro ao baixar áudio:', error);
      setMessage({ type: 'error', text: 'Erro ao baixar áudio.' });
    } finally {
      setDownloadingAudios(prev => {
        const newSet = new Set(prev);
        newSet.delete(audioId);
        return newSet;
      });
    }
  };

  const deleteScript = async (scriptId: string) => {
    if (!confirm('Tem certeza que deseja excluir este roteiro?')) return;

    setDeletingScripts(prev => new Set(prev).add(scriptId));
    
    try {
      const { error } = await supabase
        .from('roteiros_gerados')
        .delete()
        .eq('id', scriptId);

      if (error) {
        console.error('Erro ao excluir roteiro:', error);
        setMessage({ type: 'error', text: 'Erro ao excluir roteiro.' });
        return;
      }

      setScripts(prev => prev.filter(script => script.id !== scriptId));
      setMessage({ type: 'success', text: 'Roteiro excluído com sucesso!' });
    } catch (err) {
      console.error('Erro ao excluir roteiro:', err);
      setMessage({ type: 'error', text: 'Erro de conexão ao excluir roteiro.' });
    } finally {
      setDeletingScripts(prev => {
        const newSet = new Set(prev);
        newSet.delete(scriptId);
        return newSet;
      });
    }
  };

  const openEditModal = (script: GeneratedScript) => {
    setSelectedScript(script);
    setEditedTitle(script.titulo);
    setEditedScript(script.roteiro);
    setShowEditModal(true);
    setModalMessage(null);
  };

  const closeEditModal = () => {
    setSelectedScript(null);
    setShowEditModal(false);
    setEditedTitle('');
    setEditedScript('');
    setModalMessage(null);
  };

  const updateContent = async () => {
    if (!selectedScript) return;

    setIsUpdatingContent(true);
    setModalMessage(null);

    try {
      const payload = {
        id_roteiro: selectedScript.id,
        titulo_editado: editedTitle,
        roteiro_editado: editedScript
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
        setGeneratedScripts(prev => prev.map(script => 
          script.id === selectedScript.id 
            ? { ...script, titulo: editedTitle, roteiro: editedScript }
            : script
        ));
        
        setModalMessage({ type: 'success', text: 'Conteúdo atualizado com sucesso!' });
        
        // Fechar modal após 2 segundos
        setTimeout(() => {
          closeEditModal();
        }, 2000);
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar conteúdo:', error);
      setModalMessage({ type: 'error', text: 'Erro ao atualizar conteúdo. Tente novamente.' });
    } finally {
      setIsUpdatingContent(false);
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

  const getVoiceName = (voiceId?: string) => {
    if (!voiceId) return 'Voz não especificada';
    const voice = voices.find(v => v.voice_id === voiceId);
    return voice ? `${voice.nome_voz} (${voice.plataforma})` : 'Voz não encontrada';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <PageHeader
        user={user}
        currentPage="scripts"
        onBack={onBack}
        onNavigate={onNavigate}
      />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-12">
        {/* Message Display */}
        {message && (
          <div className={`mb-8 p-4 rounded-xl text-center border ${
            message.type === 'success' 
              ? 'bg-green-900/20 text-green-400 border-green-800' 
              : 'bg-red-900/20 text-red-400 border-red-800'
          }`}>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-white mb-2">Roteiros Gerados</h1>
          <p className="text-gray-400">Visualize e gerencie todos os roteiros criados</p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center space-x-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Carregando roteiros...</span>
            </div>
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-light text-white mb-2">Nenhum roteiro encontrado</h3>
            <p className="text-gray-400 mb-6">Gere alguns roteiros primeiro para vê-los aqui</p>
            <button
              onClick={() => onNavigate?.('generate')}
              className="flex items-center space-x-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-all duration-200 mx-auto"
            >
              <Wand2 className="w-5 h-5" />
              <span>Gerar Roteiros</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {scripts.map((script) => (
              <GeneratedScriptCard
                key={script.id}
                script={script}
                onDeleteScript={deleteScript}
                onPlayAudio={playAudio}
                onPauseAudio={pauseAudio}
                onDownloadAudio={downloadAudio}
                onEditScript={openEditModal}
                isAudioPlaying={isAudioPlaying}
                downloadingAudios={downloadingAudios}
                deletingScripts={deletingScripts}
                getVoiceName={getVoiceName}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Script Modal */}
      {showEditModal && selectedScript && (
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
                  <p className="text-sm text-gray-400">ID: #{selectedScript.id}</p>
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
              {modalMessage && (
                <div className={`mb-6 p-4 rounded-xl text-center border ${
                  modalMessage.type === 'success' 
                    ? 'bg-green-900/20 text-green-400 border-green-800' 
                    : 'bg-red-900/20 text-red-400 border-red-800'
                }`}>
                  <div className="flex items-center justify-center space-x-2">
                    {modalMessage.type === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                    <span className="font-medium">{modalMessage.text}</span>
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
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  rows={12}
                  className="w-full p-4 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 resize-none"
                  placeholder="Digite o conteúdo do roteiro..."
                />
                <div className="text-xs text-gray-400 mt-1">
                  {editedScript.length.toLocaleString()} caracteres
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
                disabled={isUpdatingContent || !editedTitle.trim() || !editedScript.trim()}
                className={`
                  flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                  ${isUpdatingContent || !editedTitle.trim() || !editedScript.trim()
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
    </div>
  );
};

interface GeneratedScriptCardProps {
  script: GeneratedScript;
  onDeleteScript: (scriptId: string) => void;
  onPlayAudio: (audioUrl: string, audioId: string) => void;
  onPauseAudio: () => void;
  onDownloadAudio: (script: GeneratedScript) => void;
  onEditScript: (script: GeneratedScript) => void;
  isAudioPlaying: (audioId: string) => boolean;
  downloadingAudios: Set<string>;
  deletingScripts: Set<string>;
  getVoiceName: (voiceId?: string) => string;
  formatDate: (dateString: string) => string;
}

const GeneratedScriptCard: React.FC<GeneratedScriptCardProps> = ({
  script,
  onDeleteScript,
  onPlayAudio,
  onPauseAudio,
  onDownloadAudio,
  onEditScript,
  isAudioPlaying,
  downloadingAudios,
  deletingScripts,
  getVoiceName,
  formatDate
}) => {
  const [showFullScript, setShowFullScript] = useState(false);
  const audioId = `script-audio-${script.id}`;
  const isPlaying = isAudioPlaying(audioId);
  const isDownloading = downloadingAudios.has(script.id);
  const isDeleting = deletingScripts.has(script.id);

  const handlePlayPause = () => {
    if (!script.audio_path) return;
    
    if (isPlaying) {
      onPauseAudio();
    } else {
      onPlayAudio(script.audio_path, audioId);
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 hover:border-gray-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-white mb-1 line-clamp-2">
            {script.titulo}
          </h3>
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(script.created_at)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Hash className="w-4 h-4" />
              <span>{script.id}</span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2 ml-4">
          {/* Audio Controls */}
          {script.audio_path && (
            <>
              <button
                onClick={handlePlayPause}
                disabled={isDownloading}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isPlaying
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
              >
                {isPlaying ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              
              <button
                onClick={() => onDownloadAudio(script)}
                disabled={isDownloading || isPlaying}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Baixar áudio"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </>
          )}
          
          {/* Edit Button */}
          <button
            onClick={() => onEditScript(script)}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
            title="Editar roteiro"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          
          {/* Delete Button */}
          <button
            onClick={() => onDeleteScript(script.id)}
            disabled={isDeleting}
            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Channel and Voice Info */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-400">Canal:</span>
          <span className="text-white font-medium">{script.nome_canal}</span>
        </div>
        {script.voice_id && (
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-400">Voz:</span>
            <span className="text-white">{getVoiceName(script.voice_id)}</span>
          </div>
        )}
      </div>

      {/* Script Preview */}
      <div className="mb-4">
        <div className="bg-black/30 rounded-lg p-4 border border-gray-700">
          <p className={`text-gray-300 text-sm leading-relaxed ${
            showFullScript ? '' : 'line-clamp-4'
          }`}>
            {script.roteiro}
          </p>
          {script.roteiro.length > 200 && (
            <button
              onClick={() => setShowFullScript(!showFullScript)}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              {showFullScript ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{script.roteiro.length.toLocaleString()} caracteres</span>
          {script.audio_path && (
            <div className="flex items-center space-x-1 text-green-400">
              <Volume2 className="w-3 h-3" />
              <span>Com áudio</span>
            </div>
          )}
        </div>
        
        {/* View Details Button */}
        <button
          onClick={() => setShowFullScript(!showFullScript)}
          className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
        >
          <Eye className="w-3 h-3" />
          <span>Detalhes</span>
        </button>
      </div>
    </div>
  );
};

export default ScriptListPage;