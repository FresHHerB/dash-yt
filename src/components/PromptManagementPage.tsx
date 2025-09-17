import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { buildWebhookUrl, buildElevenLabsUrl, buildFishAudioUrl } from '../config/environment';
import { 
  Edit3, 
  X, 
  Loader2, 
  CheckCircle,
  Copy,
  Download,
  Video,
  Play,
  Square,
} from 'lucide-react';
import { PageType } from '../App';
import PageHeader from './shared/PageHeader';

interface Channel {
  id: number;
  nome_canal: string;
  prompt_roteiro: string;
  prompt_titulo: string;
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

interface PromptManagementPageProps {
  user: any;
  onBack: () => void;
  onNavigate?: (page: PageType) => void;
}

const PromptManagementPage: React.FC<PromptManagementPageProps> = ({ user, onBack, onNavigate }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [editedTitlePrompt, setEditedTitlePrompt] = useState('');
  const [editedScriptPrompt, setEditedScriptPrompt] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
  const [mediaChars, setMediaChars] = useState<string>('');
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [deletingChannels, setDeletingChannels] = useState<Set<number>>(new Set());
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Voice test state
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());
  const [voiceTestError, setVoiceTestError] = useState<string>('');

  useEffect(() => {
    loadChannels();
    loadVoices();
  }, []);

  // Audio control functions
  const playAudio = (audioUrl: string, audioId: string) => {
    // Stop any currently playing audio
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
      setModalMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });

    audio.play().then(() => {
      setPlayingAudio({ id: audioId, audio });
    }).catch(() => {
      setModalMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
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

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('canais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar canais.' });
      } else {
        setChannels(data || []);
        if (!data || data.length === 0) {
          setMessage({ type: 'error', text: 'Nenhum canal encontrado.' });
        }
      }
    } catch (err) {
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

  const openChannelModal = (channel: Channel) => {
    setSelectedChannel(channel);
    setEditedTitlePrompt(channel.prompt_titulo || '');
    setEditedScriptPrompt(channel.prompt_roteiro || '');
    setSelectedVoiceId(channel.voz_prefereida || null);
    setMediaChars(channel.media_chars?.toString() || '');
    setModalMessage(null);
  };

  const closeModal = () => {
    setSelectedChannel(null);
    setEditedTitlePrompt('');
    setEditedScriptPrompt('');
    setSelectedVoiceId(null);
    setMediaChars('');
    setModalMessage(null);
  };

  const updatePromptDirectly = async () => {
    if (!selectedChannel) return;

    setIsUpdatingPrompt(true);
    setModalMessage(null);
    try {
      console.log('🚀 Iniciando atualização de prompt...');
      
      const payload = {
        id_canal: selectedChannel.id,
        prompt_titulo: editedTitlePrompt,
        prompt_roteiro: editedScriptPrompt,
        id_voz: selectedVoiceId,
        media_chars: mediaChars ? parseFloat(mediaChars) : null
      };

      console.log('📤 Payload enviado:', payload);

      const response = await fetch(buildWebhookUrl('updatePrompts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Prompt atualizado com sucesso:', result);
        
        // Processar resposta do webhook
        if (result && result.length > 0) {
          const updatedData = result[0];
          
          // Atualizar os prompts com os dados retornados
          if (updatedData.prompt_titulo) {
            setEditedTitlePrompt(updatedData.prompt_titulo);
          }
          if (updatedData.prompt_roteiro) {
            setEditedScriptPrompt(updatedData.prompt_roteiro);
          }
          if (updatedData.voz_prefereida) {
            setSelectedVoiceId(updatedData.voz_prefereida);
          }
          if (updatedData.media_chars) {
            setMediaChars(updatedData.media_chars.toString());
          }
          
          setModalMessage({ type: 'success', text: 'Prompt atualizado com sucesso! Dados sincronizados.' });
        } else {
          setModalMessage({ type: 'success', text: 'Prompt atualizado com sucesso!' });
        }
        
        loadChannels(); // Refresh the channels list
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('❌ Erro na atualização:', err);
      setModalMessage({ type: 'error', text: 'Erro ao atualizar prompt. Tente novamente.' });
    } finally {
      setIsUpdatingPrompt(false);
    }
  };

  const getSelectedVoiceName = () => {
    if (!selectedVoiceId) return '';
    const voice = voices.find(v => v.id === selectedVoiceId);
    return voice ? `${voice.nome_voz} - ${voice.plataforma}` : '';
  };

  const getSelectedVoicePreviewUrl = () => {
    if (!selectedVoiceId) return null;
    const voice = voices.find(v => v.id === selectedVoiceId);
    return voice?.preview_url || null;
  };

  // Generate voice test audio
  const generateVoiceTest = async (voiceId: number): Promise<string> => {
    try {
      // Get voice data
      const voice = voices.find(v => v.id === voiceId);
      if (!voice) {
        throw new Error('Voz não encontrada');
      }

      if (voice.plataforma === 'ElevenLabs') {
        // Get API key for ElevenLabs
        const { data: apisData } = await supabase
          .from('apis')
          .select('*')
          .eq('plataforma', voice.plataforma)
          .single();

        if (!apisData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        // Buscar dados da voz para obter o preview_url
        const response = await fetch(buildElevenLabsUrl(`/voices/${voice.voice_id}`), {
          method: 'GET',
          headers: {
            'xi-api-key': apisData.api_key
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ElevenLabs: ${response.status} - ${errorText}`);
        }

        const voiceData = await response.json();
        
        // Verifica se há preview_url disponível
        if (!voiceData.preview_url) {
          throw new Error('Nenhum preview de áudio disponível para esta voz ElevenLabs');
        }
        
        return voiceData.preview_url;

      } else if (voice.plataforma === 'Fish-Audio') {
        // Get API key for Fish-Audio
        const { data: apisData } = await supabase
          .from('apis')
          .select('*')
          .eq('plataforma', voice.plataforma)
          .single();

        if (!apisData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        // Para Fish-Audio, buscamos os dados do modelo para obter o sample de áudio
        const response = await fetch(buildFishAudioUrl(`/model/${voice.voice_id}`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apisData.api_key}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro Fish-Audio: ${response.status} - ${errorText}`);
        }

        const modelData = await response.json();
        
        // Verifica se há samples disponíveis
        if (!modelData.samples || modelData.samples.length === 0) {
          throw new Error('Nenhum sample de áudio disponível para esta voz Fish-Audio');
        }
        
        // Usa o primeiro sample disponível
        const sampleAudioUrl = modelData.samples[0].audio;
        if (!sampleAudioUrl) {
          throw new Error('URL de áudio do sample não encontrada');
        }
        
        return sampleAudioUrl;
      }

      throw new Error('Plataforma não suportada para teste');
    } catch (error) {
      console.error('Erro ao gerar teste de voz:', error);
      throw error;
    }
  };

  const playSelectedVoicePreview = () => {
    if (!selectedVoiceId) return;

    const audioId = `voice-preview-${selectedVoiceId}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(selectedVoiceId));
    setVoiceTestError('');

    generateVoiceTest(selectedVoiceId)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setVoiceTestError(error instanceof Error ? error.message : 'Erro ao testar voz');
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedVoiceId);
          return newSet;
        });
      });
  };

  const copyToClipboard = async () => {
    const combinedPrompts = `=== PROMPT DE TÍTULO ===\n${editedTitlePrompt}\n\n=== PROMPT DE ROTEIRO ===\n${editedScriptPrompt}`;
    if (combinedPrompts) {
      try {
        await navigator.clipboard.writeText(combinedPrompts);
        setModalMessage({ type: 'success', text: 'Prompts copiados para a área de transferência!' });
      } catch (err) {
        setModalMessage({ type: 'error', text: 'Erro ao copiar prompts.' });
      }
    }
  };

  const downloadPrompt = () => {
    const combinedPrompts = `=== PROMPT DE TÍTULO ===\n${editedTitlePrompt}\n\n=== PROMPT DE ROTEIRO ===\n${editedScriptPrompt}`;
    if (combinedPrompts && selectedChannel) {
      const blob = new Blob([combinedPrompts], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts-${selectedChannel.nome_canal}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <PageHeader
        user={user}
        currentPage="prompts"
        onBack={onBack}
        onNavigate={onNavigate}
        onRefresh={loadChannels}
        isRefreshing={isLoadingChannels}
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

        {/* Channels Grid */}
        {isLoadingChannels ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center space-x-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Carregando canais...</span>
            </div>
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Edit3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-light text-white mb-2">Nenhum canal encontrado</h3>
            <p className="text-gray-400">Crie um canal primeiro na página de treinamento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onEdit={() => openChannelModal(channel)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Prompt Modal */}
      {selectedChannel && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeModal}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">Editar prompt do canal "{selectedChannel.nome_canal}"</h2>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              {/* Success Message */}
              {modalMessage && (
                <div className={`p-4 rounded-xl text-center border ${
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

              {/* Channel Name (Read-only) */}
              <div className="space-y-1 mb-4">
                <label className="block text-sm font-medium text-gray-300">
                  Nome do Canal
                </label>
                <input
                  type="text"
                  value={selectedChannel.nome_canal}
                  readOnly
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white cursor-not-allowed opacity-75"
                />
              </div>

              {/* Editable Prompt Content */}
              {/* Split Layout for Both Prompts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Title Prompt */}
                <div className="space-y-2 flex flex-col">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <label className="block text-sm font-medium text-gray-300">
                      Prompt de Título
                    </label>
                  </div>
                  <textarea
                    value={editedTitlePrompt}
                    onChange={(e) => setEditedTitlePrompt(e.target.value)}
                    className="w-full flex-1 p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 text-sm font-mono resize-none"
                    placeholder="Prompt para geração de títulos..."
                  />
                  <div className="text-xs text-gray-400">
                    {editedTitlePrompt.length.toLocaleString()} caracteres
                  </div>
                </div>

                {/* Script Prompt */}
                <div className="space-y-2 flex flex-col">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <label className="block text-sm font-medium text-gray-300">
                      Prompt de Roteiro
                    </label>
                  </div>
                  <textarea
                    value={editedScriptPrompt}
                    onChange={(e) => setEditedScriptPrompt(e.target.value)}
                    className="w-full flex-1 p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 text-sm font-mono resize-none"
                    placeholder="Prompt para geração de roteiros..."
                  />
                  <div className="text-xs text-gray-400">
                    {editedScriptPrompt.length.toLocaleString()} caracteres
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Preference and Media Characters - Footer Section */}
            <div className="p-5 border-t border-gray-700 bg-gray-900/50">
              {/* Voice Preference and Media Characters - Same Line */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Voice Preference */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">
                    Voz Preferida
                  </label>
                  {isLoadingVoices ? (
                    <div className="flex items-center space-x-2 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-gray-400 text-sm">Carregando vozes...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedVoiceId || ''}
                      onChange={(e) => setSelectedVoiceId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                    >
                      <option value="">Selecione uma voz</option>
                      {voices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.nome_voz} - {voice.plataforma}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="text-xs text-gray-400">
                    Voz que será usada para gerar áudios deste canal
                  </div>
                  
                  {/* Voice Preview Button */}
                  {selectedVoiceId && (
                    <div className="mt-2">
                      {voiceTestError && (
                        <p className="text-xs text-red-400 mb-2">
                          {voiceTestError}
                        </p>
                      )}
                      <button
                        onClick={playSelectedVoicePreview}
                        disabled={selectedVoiceId ? testingVoices.has(selectedVoiceId) : false}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          selectedVoiceId && testingVoices.has(selectedVoiceId)
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : isAudioPlaying(`voice-preview-${selectedVoiceId}`)
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {selectedVoiceId && testingVoices.has(selectedVoiceId) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Carregando...</span>
                          </>
                        ) : isAudioPlaying(`voice-preview-${selectedVoiceId}`) ? (
                          <>
                            <Square className="w-4 h-4" />
                            <span>Parar</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Testar Voz</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Media Characters */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">
                    Média de Caracteres
                  </label>
                  <input
                    type="number"
                    value={mediaChars}
                    onChange={(e) => setMediaChars(e.target.value)}
                    placeholder="Ex: 1500"
                    min="0"
                    step="1"
                    maxLength={8}
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                  <div className="text-xs text-gray-400">
                    Número médio de caracteres dos roteiros deste canal
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-5 border-t border-gray-700 flex-shrink-0 bg-gray-900">
              <div className="flex items-center space-x-3">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </button>
                <button
                  onClick={downloadPrompt}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={updatePromptDirectly}
                  disabled={isUpdatingPrompt}
                  className={`
                    flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                    ${isUpdatingPrompt
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                  `}
                >
                  {isUpdatingPrompt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Atualizar Prompts</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Channel Card Component
interface ChannelCardProps {
  channel: Channel;
  onEdit: () => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ channel, onEdit }) => {
  const getChannelColor = (id: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500', 
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500',
      'bg-violet-500',
      'bg-rose-500',
      'bg-amber-500'
    ];
    return colors[id % colors.length];
  };

  const iconColor = getChannelColor(channel.id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasPrompt = channel.prompt_roteiro && channel.prompt_roteiro.trim().length > 0;

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 hover:border-gray-700 transition-all duration-300 transform hover:scale-105 cursor-pointer group"
         onClick={onEdit}>
      <div className="p-6">
        {/* Channel Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}>
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors">
                {channel.nome_canal}
              </h3>
              <p className="text-xs text-gray-400">
                ID: {channel.id}
              </p>
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit3 className="w-5 h-5 text-purple-400" />
          </div>
        </div>

        {/* Prompt Status */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
              hasPrompt 
                ? 'bg-green-900/30 text-green-400 border border-green-800' 
                : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${hasPrompt ? 'bg-green-400' : 'bg-yellow-400'}`} />
              <span>{hasPrompt ? 'Prompt Configurado' : 'Prompt Pendente'}</span>
            </div>
            
            {/* Media Characters Indicator */}
            {channel.media_chars && (
              <div className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-900/30 text-blue-400 border border-blue-800 rounded-full text-xs font-medium">
                <span>{channel.media_chars.toLocaleString()}</span>
                <span className="text-blue-300">chars</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end text-xs text-gray-500">
          <span>Criado em {formatDate(channel.created_at)}</span>
        </div>
      </div>
    </div>
  );
};

export default PromptManagementPage;