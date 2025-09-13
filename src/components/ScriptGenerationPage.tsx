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
  CheckCircle,
  Bot,
  Sparkles
} from 'lucide-react';
import { PageType } from '../App';
import PageHeader from './shared/PageHeader';

interface Channel {
  id: number;
  nome_canal: string;
  prompt_titulo: string;
  prompt_roteiro: string;
  created_at: string;
  voz_prefereida?: number;
  media_chars?: number;
}

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

interface ScriptGenerationPageProps {
  user: any;
  onBack: () => void;
  onNavigate?: (page: PageType) => void;
}

const ScriptGenerationPage: React.FC<ScriptGenerationPageProps> = ({ user, onBack, onNavigate }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<number | null>(null);
  const [generationType, setGenerationType] = useState<'script' | 'script-audio' | 'audio'>('script');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generatedScripts, setGeneratedScripts] = useState<GeneratedScript[]>([]);
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
    loadChannels();
    loadVoices();
    loadGeneratedScripts();
  }, []);

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const { data, error } = await supabase
        .from('canais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar canais:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar canais.' });
      } else {
        setChannels(data || []);
        if (data && data.length > 0 && !selectedChannel) {
          setSelectedChannel(data[0].id);
          setSelectedVoice(data[0].voz_prefereida || null);
        }
      }
    } catch (err) {
      console.error('Erro de conexão ao carregar canais:', err);
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const loadVoices = async () => {
    setIsLoadingVoices(true);
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
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const loadGeneratedScripts = async () => {
    try {
      const { data, error } = await supabase
        .from('roteiros_gerados')
        .select(`
          *,
          canais (
            nome_canal
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao carregar roteiros gerados:', error);
      } else {
        const formattedScripts = (data || []).map(script => ({
          ...script,
          nome_canal: script.canais?.nome_canal || 'Canal não encontrado'
        }));
        setGeneratedScripts(formattedScripts);
      }
    } catch (err) {
      console.error('Erro de conexão ao carregar roteiros gerados:', err);
    }
  };

  const handleChannelChange = (channelId: number) => {
    setSelectedChannel(channelId);
    const channel = channels.find(c => c.id === channelId);
    if (channel?.voz_prefereida) {
      setSelectedVoice(channel.voz_prefereida);
    }
  };

  const generateContent = async () => {
    if (!selectedChannel) {
      setMessage({ type: 'error', text: 'Por favor, selecione um canal.' });
      return;
    }

    if ((generationType === 'script-audio' || generationType === 'audio') && !selectedVoice) {
      setMessage({ type: 'error', text: 'Por favor, selecione uma voz para gerar áudio.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const selectedChannelData = channels.find(c => c.id === selectedChannel);
      const selectedVoiceData = voices.find(v => v.id === selectedVoice);

      let webhookEndpoint: string;
      let payload: any = {
        id_canal: selectedChannel,
        nome_canal: selectedChannelData?.nome_canal || '',
      };

      switch (generationType) {
        case 'script':
          webhookEndpoint = buildWebhookUrl('generateScript');
          break;
        case 'script-audio':
          webhookEndpoint = buildWebhookUrl('generateScriptAndAudio');
          payload.id_voz = selectedVoice;
          payload.voice_id = selectedVoiceData?.voice_id || '';
          payload.plataforma = selectedVoiceData?.plataforma || '';
          break;
        case 'audio':
          webhookEndpoint = buildWebhookUrl('generateAudio');
          payload.id_voz = selectedVoice;
          payload.voice_id = selectedVoiceData?.voice_id || '';
          payload.plataforma = selectedVoiceData?.plataforma || '';
          break;
        default:
          throw new Error('Tipo de geração inválido');
      }

      console.log('📤 Enviando requisição:', { webhookEndpoint, payload });

      const response = await fetch(webhookEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Conteúdo gerado com sucesso:', result);
        
        let successMessage = '';
        switch (generationType) {
          case 'script':
            successMessage = 'Roteiro gerado com sucesso!';
            break;
          case 'script-audio':
            successMessage = 'Roteiro e áudio gerados com sucesso!';
            break;
          case 'audio':
            successMessage = 'Áudio gerado com sucesso!';
            break;
        }
        
        setMessage({ type: 'success', text: successMessage });
        
        // Recarregar lista de roteiros gerados
        await loadGeneratedScripts();
      } else {
        const errorText = await response.text();
        console.error('❌ Erro na resposta:', errorText);
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erro ao gerar conteúdo:', error);
      setMessage({ type: 'error', text: 'Erro ao gerar conteúdo. Tente novamente.' });
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
      const response = await fetch(buildWebhookUrl('deleteScript'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_roteiro: scriptId
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Roteiro excluído com sucesso:', result);
      
      setGeneratedScripts(prev => prev.filter(script => script.id !== scriptId));
      setMessage({ type: 'success', text: 'Roteiro excluído com sucesso!' });
    } catch (err) {
      console.error('Erro ao excluir roteiro:', err);
      setMessage({ type: 'error', text: 'Erro ao excluir roteiro.' });
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

  const generationOptions = [
    {
      id: 'script',
      title: 'Apenas Roteiro',
      description: 'Gera apenas o texto do roteiro',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      requiresVoice: false
    },
    {
      id: 'script-audio',
      title: 'Roteiro + Áudio',
      description: 'Gera roteiro e converte em áudio',
      icon: Mic,
      color: 'from-purple-500 to-purple-600',
      requiresVoice: true
    },
    {
      id: 'audio',
      title: 'Apenas Áudio',
      description: 'Gera áudio de roteiro existente',
      icon: Volume2,
      color: 'from-green-500 to-green-600',
      requiresVoice: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <PageHeader
        user={user}
        currentPage="generate"
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Generation Panel */}
          <div className="xl:col-span-2 space-y-8">
            {/* Generation Type Selection */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-white mb-2">Tipo de Geração</h2>
                <p className="text-gray-400 text-sm">Escolha o que deseja gerar</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {generationOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setGenerationType(option.id as any)}
                      className={`p-6 rounded-xl border transition-all duration-300 transform hover:scale-105 ${
                        generationType === option.id
                          ? 'bg-gradient-to-br ' + option.color + ' border-transparent text-white'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <IconComponent className="w-8 h-8" />
                        <div className="text-center">
                          <div className="font-medium">{option.title}</div>
                          <div className="text-sm opacity-80 mt-1">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Channel Selection */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-white mb-2">Canal</h2>
                <p className="text-gray-400 text-sm">Selecione o canal para gerar conteúdo</p>
              </div>
              
              {isLoadingChannels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-400">Carregando canais...</span>
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Nenhum canal encontrado. Crie um canal primeiro.</p>
                </div>
              ) : (
                <select
                  value={selectedChannel || ''}
                  onChange={(e) => handleChannelChange(parseInt(e.target.value))}
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                >
                  <option value="">Selecione um canal</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.nome_canal}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Voice Selection */}
            {(generationType === 'script-audio' || generationType === 'audio') && (
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-light text-white mb-2">Voz</h2>
                  <p className="text-gray-400 text-sm">Selecione a voz para gerar o áudio</p>
                </div>
                
                {isLoadingVoices ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-400">Carregando vozes...</span>
                  </div>
                ) : voices.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Nenhuma voz encontrada. Configure vozes primeiro.</p>
                  </div>
                ) : (
                  <select
                    value={selectedVoice || ''}
                    onChange={(e) => setSelectedVoice(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                  >
                    <option value="">Selecione uma voz</option>
                    {voices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.nome_voz} - {voice.plataforma}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-center">
              <button
                onClick={generateContent}
                disabled={!selectedChannel || isLoading || ((generationType === 'script-audio' || generationType === 'audio') && !selectedVoice)}
                className={`
                  flex items-center space-x-3 px-12 py-4 rounded-xl font-medium transition-all duration-300 transform
                  ${!selectedChannel || isLoading || ((generationType === 'script-audio' || generationType === 'audio') && !selectedVoice)
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                    : 'bg-white text-black hover:bg-gray-100 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>Gerar Conteúdo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Scripts Panel */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Roteiros Recentes</h2>
              <p className="text-gray-400 text-sm">Últimos roteiros gerados</p>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {generatedScripts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhum roteiro gerado ainda</p>
                </div>
              ) : (
                generatedScripts.map((script) => (
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
                ))
              )}
            </div>
          </div>
        </div>
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
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm line-clamp-1 mb-1">
            {script.titulo}
          </h4>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>{script.nome_canal}</span>
            <span>•</span>
            <span>#{script.id}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          {script.audio_path && (
            <button
              onClick={handlePlayPause}
              disabled={isDownloading}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
            >
              {isPlaying ? (
                <Square className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </button>
          )}
          
          <button
            onClick={() => onEditScript(script)}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
            title="Editar roteiro"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => onDeleteScript(script.id)}
            disabled={isDeleting}
            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Excluir roteiro"
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Content Preview */}
      <p className="text-gray-300 text-xs line-clamp-2 mb-3">
        {script.roteiro}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <span>{script.roteiro.length} chars</span>
          {script.audio_path && (
            <>
              <span>•</span>
              <div className="flex items-center space-x-1 text-green-400">
                <Volume2 className="w-3 h-3" />
                <span>Áudio</span>
              </div>
            </>
          )}
        </div>
        <span>{formatDate(script.created_at)}</span>
      </div>
    </div>
  );
};

export default ScriptGenerationPage;