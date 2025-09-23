import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { buildWebhookUrl, buildElevenLabsUrl, buildFishAudioUrl } from '../config/environment';
import {
  ArrowLeft,
  Wand2,
  Loader2,
  Play,
  Square,
  Download,
  Mic,
  Bot,
  Sparkles,
  RefreshCw,
  Volume2,
  BookOpen,
  Edit3,
  Settings,
  X,
  FileText,
  Plus,
  Video,
  Trash2,
  Eye,
  Zap,
  Music,
  CheckCircle
} from 'lucide-react';
import { PageType } from '../App';
import { env } from '../config/environment';
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

interface ScriptGenerationPageProps {
  user: any;
  onBack: () => void;
  onNavigate?: (page: PageType) => void;
}


type WebhookMode = 'script' | 'script-audio' | 'audio';

interface WebhookOption {
  id: WebhookMode;
  title: string;
  description: string;
  icon: any;
  endpoint: keyof typeof env.webhooks.endpoints;
  color: string;
  requiresVoice: boolean;
}

interface SavedScript {
  id: number;
  roteiro: string;
  canal_id: number;
  created_at: string;
  titulo?: string;
}

interface GeneratedScript {
  titulo: string;
  roteiro: string;
  id_roteiro: string;
  text_thumb?: string;
  audio_path: string;
  ideia_base?: string;
}

interface GeneratedAudioScript {
  id_roteiro: number;
  roteiro: string;
  canal_id: number;
  titulo: string;
  text_thumb?: string;
  audio_path: string;
  ideia_base?: string;
}

interface SavedScriptForAudio {
  id: number;
  roteiro: string;
  titulo: string;
  created_at: string;
}

interface ChannelWithScripts {
  id: number;
  nome_canal: string;
  scripts: SavedScript[];
}

const ScriptGenerationPage: React.FC<ScriptGenerationPageProps> = ({ user, onBack, onNavigate }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
  const [scriptIdeas, setScriptIdeas] = useState<string[]>(['']);
  const [language, setLanguage] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [selectedWebhookMode, setSelectedWebhookMode] = useState<WebhookMode>('script-audio');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Estados para roteiros gerados (lista)
  const [generatedScripts, setGeneratedScripts] = useState<GeneratedScript[]>([]);
  const [generatedAudioScripts, setGeneratedAudioScripts] = useState<GeneratedAudioScript[]>([]);
  const [selectedScriptModal, setSelectedScriptModal] = useState<GeneratedScript | null>(null);
  
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [channelsWithScripts, setChannelsWithScripts] = useState<ChannelWithScripts[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [isDeletingScript, setIsDeletingScript] = useState<number | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);

  // Estados específicos para "Gerar Áudio"
  const [selectedScriptsForAudio, setSelectedScriptsForAudio] = useState<SavedScriptForAudio[]>([]);
  const [showLoadScriptsModal, setShowLoadScriptsModal] = useState(false);
  const [availableScriptsForChannel, setAvailableScriptsForChannel] = useState<SavedScriptForAudio[]>([]);
  const [isLoadingChannelScripts, setIsLoadingChannelScripts] = useState(false);

  // Estados para edição no modal
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedScript, setEditedScript] = useState('');
  const [isUpdatingContent, setIsUpdatingContent] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get selected channel
  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  // Webhook options configuration
  const webhookOptions: WebhookOption[] = [
    {
      id: 'script',
      title: 'Gerar Roteiro',
      description: 'Gera apenas o roteiro de texto',
      icon: FileText,
      endpoint: 'generateScript',
      color: 'from-blue-500 to-blue-600',
      requiresVoice: false
    },
    {
      id: 'script-audio',
      title: 'Gerar Roteiro e Áudio',
      description: 'Gera roteiro completo com narração',
      icon: Mic,
      endpoint: 'generateScriptAndAudio',
      color: 'from-orange-500 to-orange-600',
      requiresVoice: true
    },
    {
      id: 'audio',
      title: 'Gerar Áudio',
      description: 'Gera áudio para roteiros existentes',
      icon: Music,
      endpoint: 'generateAudio',
      color: 'from-purple-500 to-purple-600',
      requiresVoice: true
    }
  ];

  const selectedWebhookOption = webhookOptions.find(option => option.id === selectedWebhookMode)!;

  // Funções para gerenciar ideias
  const addScriptIdea = () => {
    setScriptIdeas(prev => [...prev, '']);
  };

  const removeScriptIdea = (index: number) => {
    if (scriptIdeas.length > 1) {
      setScriptIdeas(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateScriptIdea = (index: number, value: string) => {
    setScriptIdeas(prev => prev.map((idea, i) => i === index ? value : idea));
  };

  useEffect(() => {
    loadChannels();
    loadVoices();
  }, []);

  // Effect para atualizar voz quando canal é alterado
  useEffect(() => {
    if (selectedChannelId && channels.length > 0 && voices.length > 0) {
      const selectedChannel = channels.find(c => c.id === selectedChannelId);
      if (selectedChannel?.voz_prefereida) {
        // Verificar se a voz preferida existe na lista de vozes
        const preferredVoice = voices.find(v => v.id === selectedChannel.voz_prefereida);
        if (preferredVoice) {
          setSelectedVoiceId(selectedChannel.voz_prefereida);
        } else {
          // Se voz preferida não existe, selecionar primeira voz disponível
          setSelectedVoiceId(voices.length > 0 ? voices[0].id : null);
        }
      } else {
        // Se canal não tem voz preferida, selecionar primeira voz disponível
        setSelectedVoiceId(voices.length > 0 ? voices[0].id : null);
      }
      
      // Limpar roteiros selecionados quando canal muda
      if (selectedWebhookMode === 'audio') {
        setSelectedScriptsForAudio([]);
      }
    } else if (voices.length > 0 && !selectedVoiceId) {
      // Se não há canal selecionado mas há vozes, selecionar primeira voz
      setSelectedVoiceId(voices[0].id);
    }
  }, [selectedChannelId, channels, voices]);

  // Effect para limpar roteiros selecionados quando modo webhook muda
  useEffect(() => {
    setSelectedScriptsForAudio([]);
  }, [selectedWebhookMode]);

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
        // Auto-select channel's preferred voice if available
        if (selectedChannel?.voz_prefereida && data) {
          const preferredVoice = data.find(v => v.id === selectedChannel.voz_prefereida);
          if (preferredVoice) {
            setSelectedVoiceId(preferredVoice.id);
          }
        }
        // Otherwise select first voice if available
        else if (data && data.length > 0 && !selectedVoiceId) {
          setSelectedVoiceId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Erro de conexão ao carregar vozes:', err);
    } finally {
      setIsLoadingVoices(false);
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

  // Generate voice test audio
  const generateVoiceTest = async (voiceId: number): Promise<string> => {
    try {
      const voice = voices.find(v => v.id === voiceId);
      if (!voice) {
        throw new Error('Voz não encontrada');
      }

      if (voice.plataforma === 'ElevenLabs') {
        const { data: apisData } = await supabase
          .from('apis')
          .select('*')
          .eq('plataforma', voice.plataforma)
          .single();

        if (!apisData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

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
        
        if (!voiceData.preview_url) {
          throw new Error('Nenhum preview de áudio disponível para esta voz ElevenLabs');
        }
        
        return voiceData.preview_url;

      } else if (voice.plataforma === 'Fish-Audio') {
        const { data: apisData } = await supabase
          .from('apis')
          .select('*')
          .eq('plataforma', voice.plataforma)
          .single();

        if (!apisData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        // Usar Edge Function para buscar dados do Fish-Audio (evita problemas de CORS)
        const response = await fetch(`${env.supabase.url}/functions/v1/fetch-fish-audio-voice`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.supabase.anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            voice_id: voice.voice_id,
            api_key: apisData.api_key
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Erro Fish-Audio: ${response.status} - ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        const voiceData = result.data;

        console.log('🐟 Fish Audio dados obtidos via Edge Function:', {
          voice_id: voiceData.voice_id,
          nome_voz: voiceData.nome_voz,
          preview_url: voiceData.preview_url,
          temSamples: !!voiceData.raw_data?.samples,
          quantidadeSamples: voiceData.raw_data?.samples?.length || 0
        });

        // Verifica se há preview_url disponível
        if (!voiceData.preview_url) {
          throw new Error('Nenhum preview de áudio disponível para esta voz Fish-Audio');
        }

        return voiceData.preview_url;
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

    generateVoiceTest(selectedVoiceId)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedVoiceId);
          return newSet;
        });
      });
  };

  // Funções específicas para "Gerar Áudio"
  const loadChannelScripts = async () => {
    if (!selectedChannelId) return;
    
    setIsLoadingChannelScripts(true);
    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('id, roteiro, titulo, created_at')
        .eq('canal_id', selectedChannelId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar roteiros do canal:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar roteiros do canal.' });
        return;
      }

      setAvailableScriptsForChannel(data || []);
    } catch (err) {
      console.error('Erro ao carregar roteiros do canal:', err);
      setMessage({ type: 'error', text: 'Erro de conexão ao carregar roteiros.' });
    } finally {
      setIsLoadingChannelScripts(false);
    }
  };

  const openLoadScriptsModal = () => {
    if (!selectedChannelId) {
      setMessage({ type: 'error', text: 'Selecione um canal primeiro.' });
      return;
    }
    setShowLoadScriptsModal(true);
    loadChannelScripts();
  };

  const closeLoadScriptsModal = () => {
    setShowLoadScriptsModal(false);
    setAvailableScriptsForChannel([]);
  };

  const addScriptForAudio = (script: SavedScriptForAudio) => {
    // Verificar se o roteiro já foi adicionado
    const isAlreadyAdded = selectedScriptsForAudio.some(s => s.id === script.id);
    if (isAlreadyAdded) {
      setMessage({ type: 'error', text: 'Este roteiro já foi adicionado.' });
      return;
    }

    setSelectedScriptsForAudio(prev => [...prev, script]);
    setMessage({ type: 'success', text: 'Roteiro adicionado com sucesso!' });
  };

  const removeScriptForAudio = (scriptId: number) => {
    setSelectedScriptsForAudio(prev => prev.filter(s => s.id !== scriptId));
  };

  const clearAllScriptsForAudio = () => {
    setSelectedScriptsForAudio([]);
  };

  // Fim das funções específicas para "Gerar Áudio"

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const { data, error } = await supabase
        .from('canais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar canais.' });
      } else {
        setChannels(data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const testVoice = (voiceId: number) => {
    const audioId = `voice-test-${voiceId}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(voiceId));

    generateVoiceTest(voiceId)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(voiceId);
          return newSet;
        });
      });
  };

  const generateContent = async () => {
    // Filtrar ideias não vazias
    const validIdeas = selectedWebhookMode !== 'audio' ? scriptIdeas.filter(idea => idea.trim()) : [];
    
    // Validação básica
    if (selectedWebhookMode !== 'audio' && (!selectedChannelId || validIdeas.length === 0 || !language.trim() || !selectedModel.trim())) {
      setMessage({ type: 'error', text: 'Selecione um canal, digite pelo menos uma ideia para o roteiro, especifique o idioma e escolha um modelo.' });
      return;
    }

    // Validação específica para "Gerar Áudio"
    if (selectedWebhookMode === 'audio') {
      if (selectedScriptsForAudio.length === 0) {
        setMessage({ type: 'error', text: 'Selecione pelo menos um roteiro para gerar áudio.' });
        return;
      }
      // Para áudio, não precisamos validar ideias, idioma e modelo
    }

    // Validação específica para webhooks que requerem voz
    if (selectedWebhookOption.requiresVoice && !selectedVoiceId) {
      setMessage({ type: 'error', text: 'Para esta opção, é necessário selecionar uma voz.' });
      return;
    }

    const selectedChannel = channels.find(c => c.id === selectedChannelId);
    const selectedVoice = selectedVoiceId ? voices.find(v => v.id === selectedVoiceId) : null;
    
    if (!selectedChannel && selectedWebhookMode !== 'audio') {
      setMessage({ type: 'error', text: 'Canal selecionado não encontrado.' });
      return;
    }
    
    if (selectedWebhookOption.requiresVoice && !selectedVoice) {
      setMessage({ type: 'error', text: 'Voz selecionada não encontrada.' });
      return;
    }

    setIsGeneratingContent(true);
    setMessage(null);
    setGeneratedScripts([]); // Limpar roteiros anteriores
    setGeneratedAudioScripts([]); // Limpar áudios anteriores
    
    try {
      console.log('🚀 Iniciando geração de conteúdo...');
      
      let payload: any;

      if (selectedWebhookMode === 'audio') {
        // Payload específico para "Gerar Áudio"
        payload = {
         id_canal: selectedChannelId,
          id_roteiros: selectedScriptsForAudio.map(script => script.id),
          voice_id: selectedVoice!.voice_id,
          velocidade: audioSpeed,
          plataforma: selectedVoice!.plataforma
        };
      } else {
        // Payload base para outros webhooks
        const basePayload = {
          id_canal: selectedChannelId,
          nome_canal: selectedChannel.nome_canal,
          nova_ideia: validIdeas,
          idioma: language,
          modelo: selectedModel
        };

        // Adicionar dados de voz apenas se necessário
        payload = selectedWebhookOption.requiresVoice && selectedVoice 
          ? {
              ...basePayload,
              voiceId: selectedVoice.voice_id,
              plataforma: selectedVoice.plataforma,
              velocidade: audioSpeed
            }
          : basePayload;
      }

      console.log('📤 Payload enviado:', selectedWebhookMode === 'audio' ? {
        ...payload,
        id_roteiros_count: payload.id_roteiros?.length || 0
      } : {
        ...payload,
        nova_ideia_count: payload.nova_ideia?.length || 0,
        nova_ideia_preview: payload.nova_ideia?.slice(0, 2) || []
      });
      console.log('🎯 Webhook selecionado:', selectedWebhookOption.title);
      console.log('🔗 Endpoint:', selectedWebhookOption.endpoint);

      const response = await fetch(buildWebhookUrl(selectedWebhookOption.endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📥 Resposta recebida:', result);
        
        // Garantir que temos um array para processar
        let responseArray: any[] = [];
        if (Array.isArray(result)) {
          responseArray = result;
        } else if (result && typeof result === 'object') {
          // Se for um objeto único, transformar em array
          responseArray = [result];
        } else {
          throw new Error('Formato de resposta inesperado');
        }

        console.log('📦 Array para processar:', responseArray);
        console.log('📊 Quantidade total de itens:', responseArray.length);
        
        // Tratamento específico para "Gerar Áudio"
        if (selectedWebhookMode === 'audio') {
          const processedAudioScripts: GeneratedAudioScript[] = responseArray.map((item: any, index: number) => {
            console.log(`🔍 Processando áudio ${index + 1}/${responseArray.length}:`, {
              id_roteiro: item.id_roteiro,
              titulo: item.titulo ? item.titulo.substring(0, 50) + '...' : 'Sem título',
              roteiro_length: item.roteiro ? item.roteiro.length : 0,
              canal_id: item.canal_id,
              audio_path: item.audio_path ? 'Presente' : 'Ausente'
            });
            
            return {
              id_roteiro: item.id_roteiro || 0,
              roteiro: item.roteiro || '',
              canal_id: item.canal_id || selectedChannelId || 0,
              titulo: item.titulo || 'Título não disponível',
              text_thumb: item.text_thumb || '',
              audio_path: item.audio_path || ''
            };
          });

          console.log('✅ Áudios processados:', processedAudioScripts.length);
          
          const count = processedAudioScripts.length;
          const successMessage = count === 1 ? 'Áudio gerado com sucesso!' : `${count} áudios gerados com sucesso!`;

          if (processedAudioScripts.length > 0) {
            setGeneratedAudioScripts(processedAudioScripts);
            setMessage({ type: 'success', text: successMessage });
            console.log('✅ Estado de áudios atualizado com', processedAudioScripts.length, 'áudios');
          } else {
            console.log('❌ Nenhum áudio foi processado');
            setMessage({ type: 'error', text: 'Nenhum áudio foi gerado.' });
          }
          
          // Limpar roteiros selecionados para próxima geração
          setSelectedScriptsForAudio([]);
          return; // Sair da função para não processar como roteiros normais
        }
        
        // Processar todos os scripts recebidos
        const processedScripts: GeneratedScript[] = responseArray.map((item: any, index: number) => {
          console.log(`🔍 Processando item ${index + 1}/${responseArray.length}:`, {
            titulo: item.titulo ? item.titulo.substring(0, 50) + '...' : 'Sem título',
            roteiro_length: item.roteiro ? item.roteiro.length : 0,
            id_roteiro: item.id_roteiro,
            audio_path: item.audio_path ? 'Presente' : 'Ausente'
          });
          
          return {
            titulo: item.titulo || 'Título não disponível',
            roteiro: item.roteiro || '',
            id_roteiro: item.id_roteiro?.toString() || `temp-${index}`,
            text_thumb: item.text_thumb || '',
            audio_path: item.audio_path || ''
          };
        });

        console.log('✅ Scripts processados:', processedScripts.length);
        
        // Definir mensagem de sucesso baseada na quantidade e tipo
        const generationType = selectedWebhookMode;
        const count = processedScripts.length;
        let successMessage = '';
        
        if (generationType === 'script') {
          successMessage = count === 1 ? 'Roteiro gerado com sucesso!' : `${count} roteiros gerados com sucesso!`;
        } else if (generationType === 'script-audio') {
          successMessage = count === 1 ? 'Roteiro e áudio gerados com sucesso!' : `${count} roteiros e áudios gerados com sucesso!`;
        } else if (generationType === 'audio') {
          successMessage = count === 1 ? 'Áudio gerado com sucesso!' : `${count} áudios gerados com sucesso!`;
        }

        if (processedScripts.length > 0) {
          setGeneratedScripts(processedScripts);
          setMessage({ type: 'success', text: successMessage });
          console.log('✅ Estado atualizado com', processedScripts.length, 'scripts');
        } else {
          console.log('❌ Nenhum script foi processado');
          setMessage({ type: 'error', text: 'Nenhum roteiro foi gerado.' });
        }
        
        // Limpar ideias para próxima geração
        if (selectedWebhookMode === 'audio') {
          setSelectedScriptsForAudio([]);
        } else {
          setScriptIdeas(['']);
        }
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erro na geração:', error);
      setMessage({ type: 'error', text: 'Erro ao gerar conteúdo. Tente novamente.' });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Validação para botão de gerar
  const isGenerateDisabled = () => {
    if (selectedWebhookMode === 'audio') {
      return !selectedChannelId || selectedScriptsForAudio.length === 0 || !selectedVoiceId || isGeneratingContent;
    }
    return !selectedChannelId || 
           scriptIdeas.filter(idea => idea.trim()).length === 0 || 
           !language.trim() || 
           !selectedModel.trim() || 
           (selectedWebhookOption.requiresVoice && !selectedVoiceId) ||
           isGeneratingContent;
  };

  const loadSavedScripts = async () => {
    setIsLoadingScripts(true);
    try {
      const { data: scriptsData, error } = await supabase
        .from('roteiros')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar roteiros:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar roteiros salvos.' });
        return;
      }

      console.log('Scripts carregados:', scriptsData);
      setSavedScripts(scriptsData || []);
      
      // Agrupar roteiros por canal
      const channelGroups: { [key: number]: ChannelWithScripts } = {};
      
      (scriptsData || []).forEach((script: SavedScript) => {
        if (!channelGroups[script.canal_id]) {
          const channel = channels.find(c => c.id === script.canal_id);
          channelGroups[script.canal_id] = {
            id: script.canal_id,
            nome_canal: channel?.nome_canal || `Canal ${script.canal_id}`,
            scripts: []
          };
        }
        channelGroups[script.canal_id].scripts.push(script);
      });
      
      console.log('Grupos de canais:', channelGroups);
      setChannelsWithScripts(Object.values(channelGroups));
    } catch (err) {
      console.error('Erro ao carregar roteiros:', err);
      setMessage({ type: 'error', text: 'Erro de conexão ao carregar roteiros.' });
    } finally {
      setIsLoadingScripts(false);
    }
  };

  const openLoadModal = () => {
    setShowLoadModal(true);
    loadSavedScripts();
  };

  const closeLoadModal = () => {
    setShowLoadModal(false);
    setSavedScripts([]);
    setChannelsWithScripts([]);
  };

  const loadScript = (script: SavedScript) => {
    // Criar um objeto GeneratedScript a partir do SavedScript
    const generatedScript: GeneratedScript = {
      titulo: script.titulo || 'Título não disponível',
      roteiro: script.roteiro,
      id_roteiro: script.id.toString(),
      audio_path: '' // Scripts salvos não têm áudio
    };
    
    setSelectedScriptModal(generatedScript);
    closeLoadModal();
  };

  const deleteScript = async (scriptId: number) => {
    if (!confirm('Tem certeza que deseja excluir este roteiro?')) return;

    setIsDeletingScript(scriptId);
    try {
      const { error } = await supabase
        .from('roteiros')
        .delete()
        .eq('id', scriptId);

      if (error) {
        console.error('Erro ao excluir roteiro:', error);
        setMessage({ type: 'error', text: 'Erro ao excluir roteiro.' });
        return;
      }

      // Recarregar a lista
      loadSavedScripts();
      setMessage({ type: 'success', text: 'Roteiro excluído com sucesso!' });
    } catch (err) {
      console.error('Erro ao excluir roteiro:', err);
      setMessage({ type: 'error', text: 'Erro de conexão ao excluir roteiro.' });
    } finally {
      setIsDeletingScript(null);
    }
  };

  const closeScriptModal = () => {
    setSelectedScriptModal(null);
    setIsEditMode(false);
    setEditedTitle('');
    setEditedScript('');
    setModalMessage(null);
  };

  const openEditMode = () => {
    if (selectedScriptModal) {
      setEditedTitle(selectedScriptModal.titulo);
      setEditedScript(selectedScriptModal.roteiro);
      setIsEditMode(true);
      setModalMessage(null);
    }
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditedTitle('');
    setEditedScript('');
    setModalMessage(null);
  };

  const updateContent = async () => {
    if (!selectedScriptModal) return;

    setIsUpdatingContent(true);
    setModalMessage(null);

    try {
      const payload = {
        id_roteiro: selectedScriptModal.id_roteiro,
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
          script.id_roteiro === selectedScriptModal.id_roteiro 
            ? { ...script, titulo: editedTitle, roteiro: editedScript }
            : script
        ));

        // Atualizar o script selecionado no modal
        setSelectedScriptModal(prev => prev ? {
          ...prev,
          titulo: editedTitle,
          roteiro: editedScript
        } : null);
        
        setModalMessage({ type: 'success', text: 'Conteúdo atualizado com sucesso!' });
        
        // Sair do modo de edição após 2 segundos
        setTimeout(() => {
          setIsEditMode(false);
          setModalMessage(null);
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

  const playScriptAudio = (script: GeneratedScript) => {
    if (!script.audio_path) return;
    
    const audioId = `script-audio-${script.id_roteiro}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
    } else {
      playAudio(script.audio_path, audioId);
    }
  };

  const downloadScriptAudio = (script: GeneratedScript) => {
    if (!script.audio_path) return;
    
    const a = document.createElement('a');
    a.href = script.audio_path;
    a.download = `roteiro-${script.id_roteiro}-audio.mp3`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getCardColor = (index: number) => {
    const colors = [
      { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-400' },
      { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-400' },
      { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-pink-400' },
      { bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-indigo-400' },
      { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-cyan-400' },
      { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-400' },
      { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-400' },
      { bg: 'bg-yellow-500', border: 'border-yellow-400', text: 'text-yellow-400' },
      { bg: 'bg-teal-500', border: 'border-teal-400', text: 'text-teal-400' },
      { bg: 'bg-violet-500', border: 'border-violet-400', text: 'text-violet-400' }
    ];
    return colors[index % colors.length];
  };

  const modelOptions = [
    { value: 'GPT-5', label: 'GPT-5', icon: Bot },
    { value: 'GPT-4.1-mini', label: 'GPT-4.1-mini', icon: Bot },
    { value: 'Sonnet-4', label: 'Sonnet-4', icon: Sparkles },
    { value: 'Gemini-2.5-Pro', label: 'Gemini-2.5-Pro', icon: Wand2 }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <PageHeader
        user={user}
        currentPage="generate"
        onBack={onBack}
        onNavigate={onNavigate}
      />

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-12">
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

        <div className="space-y-8">
          {/* Channel Selection */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Selecionar Canal</h2>
              <p className="text-gray-400 text-sm">Escolha o canal para usar o prompt de roteiro</p>
            </div>
            
            {isLoadingChannels ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando canais...</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <select
                  value={selectedChannelId || ''}
                  onChange={(e) => setSelectedChannelId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full max-w-md p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white text-center"
                >
                  <option value="">Selecione um canal</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.nome_canal}
                      {channel.media_chars && ` (${channel.media_chars} chars)`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Script Generation */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Configuração de Geração</h2>
              <p className="text-gray-400 text-sm">Configure o tipo de geração, ideias, idioma e modelo</p>
            </div>
            
            <div className="space-y-6">
              {/* Webhook Mode Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Tipo de Geração
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {webhookOptions.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = selectedWebhookMode === option.id;
                    const isDisabled = false;
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => !isDisabled && setSelectedWebhookMode(option.id)}
                        disabled={isDisabled}
                        className={`
                          relative p-4 rounded-xl border-2 transition-all duration-300 text-left
                          ${isSelected 
                            ? `bg-gradient-to-r ${option.color} border-transparent text-white shadow-lg scale-105` 
                            : isDisabled
                            ? 'bg-gray-800/30 border-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                            : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800/70'
                          }
                        `}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                            ${isSelected ? 'bg-white/20' : 'bg-gray-700'}
                          `}>
                            <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium mb-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                              {option.title}
                            </h3>
                            <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                              {option.description}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Campos condicionais baseados no tipo de geração */}
              {selectedWebhookMode === 'audio' ? (
                // Campos específicos para "Gerar Áudio"
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-300">
                        Roteiros Selecionados
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={openLoadScriptsModal}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-all duration-200"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Carregar Roteiro</span>
                        </button>
                        {selectedScriptsForAudio.length > 0 && (
                          <button
                            onClick={clearAllScriptsForAudio}
                            className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-all duration-200"
                          >
                            <X className="w-4 h-4" />
                            <span>Limpar Todos</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {selectedScriptsForAudio.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-600 rounded-xl">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Nenhum roteiro selecionado</p>
                        <p className="text-gray-500 text-xs">Clique em "Carregar Roteiro" para adicionar</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedScriptsForAudio.map((script, index) => {
                          const color = getCardColor(index);
                          return (
                            <div 
                              key={script.id}
                              className={`border-l-4 ${color.border} bg-gray-800/30 rounded-r-xl p-4 group`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className={`w-3 h-3 ${color.bg} rounded-full`}></div>
                                    <span className="text-xs text-gray-400">Roteiro #{script.id}</span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(script.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                  <h4 className="text-white font-medium mb-2 line-clamp-1">
                                    {script.titulo || 'Sem título'}
                                  </h4>
                                  <p className="text-gray-300 text-sm line-clamp-2">
                                    {script.roteiro.substring(0, 150)}
                                    {script.roteiro.length > 150 && '...'}
                                  </p>
                                  <div className="text-xs text-gray-500 mt-2">
                                    {script.roteiro.length} caracteres
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeScriptForAudio(script.id)}
                                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <div className="text-center text-sm text-gray-400">
                          {selectedScriptsForAudio.length} roteiro{selectedScriptsForAudio.length !== 1 ? 's' : ''} selecionado{selectedScriptsForAudio.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Campos para outros tipos de geração
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Idioma
                    </label>
                    <input
                      type="text"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="Ex: Português, Inglês, Espanhol..."
                      className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-300">
                      Ideias dos Roteiros
                    </label>
                    
                    <div className="space-y-3">
                      {scriptIdeas.map((idea, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm text-gray-400">Ideia {index + 1}</span>
                              {scriptIdeas.length > 1 && (
                                <button
                                  onClick={() => removeScriptIdea(index)}
                                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-all duration-200"
                                  title="Remover ideia"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <textarea
                              value={idea}
                              onChange={(e) => updateScriptIdea(index, e.target.value)}
                              placeholder={`Descreva sua ${index === 0 ? 'primeira' : index === 1 ? 'segunda' : index === 2 ? 'terceira' : `${index + 1}ª`} ideia para o roteiro...`}
                              className="w-full h-24 p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 resize-none text-sm"
                            />
                            <div className="text-xs text-gray-400 text-right mt-1">
                              {idea.length} caracteres
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Botão para adicionar nova ideia */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {scriptIdeas.filter(idea => idea.trim() !== '').length} de {scriptIdeas.length} ideias
                        </span>
                        <button
                          onClick={addScriptIdea}
                          disabled={scriptIdeas.length >= 10}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                            scriptIdeas.length >= 10 
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>{scriptIdeas.length >= 10 ? 'Máximo atingido' : 'Adicionar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Modelo de IA
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white"
                    >
                      <option value="">Selecione um modelo</option>
                      <option value="GPT-5">GPT-5</option>
                      <option value="GPT-4.1-mini">GPT-4.1-mini</option>
                      <option value="Sonnet-4">Sonnet-4</option>
                      <option value="Gemini-2.5-Pro">Gemini-2.5-Pro</option>
                      <option value="Gemini-2.5-Flash">Gemini-2.5-Flash</option>
                    </select>
                  </div>
                </>
              )}

              {/* Voice Selection */}
              {selectedWebhookOption.requiresVoice && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Voz para Áudio
                  </label>
                  {isLoadingVoices ? (
                    <div className="flex items-center space-x-2 p-4 bg-gray-800 border border-gray-600 rounded-xl">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-gray-400 text-sm">Carregando vozes...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={selectedVoiceId || ''}
                        onChange={(e) => setSelectedVoiceId(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white"
                      >
                        <option value="">Selecione uma voz</option>
                        {voices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.nome_voz} - {voice.plataforma}
                            {voice.idioma && ` (${voice.idioma})`}
                          </option>
                        ))}
                      </select>
                      
                      {/* Voice Preview Button */}
                      {selectedVoiceId && (
                        <button
                          onClick={playSelectedVoicePreview}
                          disabled={selectedVoiceId ? testingVoices.has(selectedVoiceId) : false}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
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
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Speed */}
              {selectedWebhookOption.requiresVoice && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Velocidade do Áudio: {audioSpeed}x
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.2"
                    step="0.1"
                    value={audioSpeed}
                    onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0.8x (Lento)</span>
                    <span>1.0x (Normal)</span>
                    <span>1.2x (Rápido)</span>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={generateContent}
                  disabled={isGenerateDisabled()}
                  className={`
                    flex items-center space-x-3 px-8 py-4 rounded-xl font-medium transition-all duration-300 transform
                    ${isGenerateDisabled()
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                      : `bg-gradient-to-r ${selectedWebhookOption.color} text-white hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl`
                    }
                  `}
                >
                  {isGeneratingContent ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      {React.createElement(selectedWebhookOption.icon, { className: "w-5 h-5" })}
                      <span>{selectedWebhookOption.title}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Generated Scripts Display */}
          {generatedAudioScripts.length > 0 && (
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-light text-white mb-2">Áudios Gerados</h2>
                  <p className="text-gray-400 text-sm">
                    {generatedAudioScripts.length} áudio{generatedAudioScripts.length > 1 ? 's' : ''} criado{generatedAudioScripts.length > 1 ? 's' : ''} com sucesso
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {generatedAudioScripts.map((audioScript, index) => {
                  const color = getCardColor(index);
                  const audioId = `generated-audio-${audioScript.id_roteiro}`;
                  
                  return (
                    <div 
                      key={audioScript.id_roteiro}
                      className={`border-l-4 ${color.border} bg-gray-800/30 rounded-r-xl p-4 hover:bg-gray-800/50 transition-all duration-200 group`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 ${color.bg} rounded-full`}></div>
                          <span className="text-xs text-gray-400">Roteiro #{audioScript.id_roteiro}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {audioScript.audio_path && (
                            <>
                              <button
                                onClick={() => {
                                  if (isAudioPlaying(audioId)) {
                                    pauseAudio();
                                  } else {
                                    playAudio(audioScript.audio_path, audioId);
                                  }
                                }}
                                className={`p-1.5 rounded-md transition-all duration-200 ${
                                  isAudioPlaying(audioId)
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                              >
                                {isAudioPlaying(audioId) ? (
                                  <Square className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = audioScript.audio_path;
                                  a.download = `roteiro-${audioScript.id_roteiro}-audio.mp3`;
                                  a.target = '_blank';
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }}
                                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              // Converter GeneratedAudioScript para GeneratedScript para o modal
                              const scriptForModal: GeneratedScript = {
                                titulo: audioScript.titulo,
                                roteiro: audioScript.roteiro,
                                id_roteiro: audioScript.id_roteiro.toString(),
                                text_thumb: audioScript.text_thumb,
                                audio_path: audioScript.audio_path,
                                ideia_base: audioScript.ideia_base
                              };
                              setSelectedScriptModal(scriptForModal);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all duration-200"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <h3 className="text-white font-medium mb-2 line-clamp-2 text-sm">
                        {audioScript.titulo}
                      </h3>
                      
                      {audioScript.text_thumb && (
                        <div className="mb-2 px-2 py-1 bg-orange-900/20 border border-orange-800 rounded text-xs text-orange-400">
                          <span className="font-medium">Thumb:</span> {audioScript.text_thumb}
                        </div>
                      )}
                      
                      <p className="text-gray-300 text-sm line-clamp-3 mb-3">
                        {audioScript.roteiro.substring(0, 150)}
                        {audioScript.roteiro.length > 150 && '...'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {audioScript.roteiro.length} caracteres
                        </span>
                        <div className="flex items-center space-x-1 text-xs text-green-400">
                          <Volume2 className="w-3 h-3" />
                          <span>Com áudio</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {generatedScripts.length > 0 && (
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-light text-white mb-2">Roteiros Gerados</h2>
                  <p className="text-gray-400 text-sm">
                    {generatedScripts.length} roteiro{generatedScripts.length > 1 ? 's' : ''} criado{generatedScripts.length > 1 ? 's' : ''} com sucesso
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={openLoadModal}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-all duration-200"
                  >
                    <Download className="w-4 h-4 rotate-180" />
                    <span>Carregar Salvos</span>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {generatedScripts.map((script, index) => {
                  const color = getCardColor(index);
                  return (
                    <div 
                      key={script.id_roteiro}
                      className={`border-l-4 ${color.border} bg-gray-800/30 rounded-r-xl p-4 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer group`}
                      onClick={() => setSelectedScriptModal(script)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 ${color.bg} rounded-full`}></div>
                          <span className="text-xs text-gray-400">Roteiro #{script.id_roteiro}</span>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {script.audio_path && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playScriptAudio(script);
                              }}
                              className={`p-1.5 rounded-md transition-all duration-200 ${
                                isAudioPlaying(`script-audio-${script.id_roteiro}`)
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {isAudioPlaying(`script-audio-${script.id_roteiro}`) ? (
                                <Square className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedScriptModal(script);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all duration-200"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <h3 className="text-white font-medium mb-2 line-clamp-2 text-sm">
                        {script.titulo}
                      </h3>
                      
                      {script.text_thumb && (
                        <div className="mb-2 px-2 py-1 bg-orange-900/20 border border-orange-800 rounded text-xs text-orange-400">
                          <span className="font-medium">Thumb:</span> {script.text_thumb}
                        </div>
                      )}
                      
                      <p className="text-gray-300 text-sm line-clamp-3 mb-3">
                        {script.roteiro.substring(0, 150)}
                        {script.roteiro.length > 150 && '...'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {script.roteiro.length} caracteres
                        </span>
                        {script.audio_path && (
                          <div className="flex items-center space-x-1 text-xs text-green-400">
                            <Volume2 className="w-3 h-3" />
                            <span>Com áudio</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Load Script Modal */}
      {showLoadModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeLoadModal}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-white rotate-180" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white">Carregar Roteiro</h2>
                  <p className="text-gray-400 text-sm">Selecione um roteiro salvo para carregar</p>
                </div>
              </div>
              <button
                onClick={closeLoadModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingScripts ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex items-center space-x-3 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Carregando roteiros...</span>
                  </div>
                </div>
              ) : channelsWithScripts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Download className="w-8 h-8 text-gray-400 rotate-180" />
                  </div>
                  <h3 className="text-xl font-light text-white mb-2">Nenhum roteiro encontrado</h3>
                  <p className="text-gray-400">Salve alguns roteiros primeiro para poder carregá-los</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {channelsWithScripts.map((channelGroup, index) => {
                    const borderColors = [
                      'border-blue-500',
                      'border-purple-500',
                      'border-pink-500',
                      'border-indigo-500',
                      'border-cyan-500',
                      'border-orange-500',
                      'border-red-500',
                      'border-yellow-500',
                      'border-teal-500',
                      'border-violet-500'
                    ];
                    const borderColor = borderColors[index % borderColors.length];
                    
                    return (
                      <div key={channelGroup.id} className={`border-l-4 ${borderColor} bg-gray-800/30 rounded-r-xl p-4`}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-white flex items-center space-x-2">
                            <Video className="w-5 h-5" />
                            <span>{channelGroup.nome_canal}</span>
                          </h3>
                          <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full">
                            {channelGroup.scripts.length} roteiro{channelGroup.scripts.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {channelGroup.scripts.map((script) => (
                            <div 
                              key={script.id} 
                              className="bg-gray-700/40 rounded-lg p-3 hover:bg-gray-700/60 transition-all duration-200 cursor-pointer border border-gray-600/30 hover:border-gray-500/50 group relative"
                              onClick={() => loadScript(script)}
                            >
                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteScript(script.id);
                                }}
                                disabled={isDeletingScript === script.id}
                                className={`absolute top-2 right-2 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 ${
                                  isDeletingScript === script.id
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-red-400 hover:bg-red-900/30'
                                }`}
                              >
                                {isDeletingScript === script.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>

                              {/* Script Content */}
                              <div className="pr-8">
                                {/* Date and Stats */}
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-400">
                                    {new Date(script.created_at).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  <span className="text-xs text-gray-500 bg-gray-600/50 px-2 py-0.5 rounded">
                                    {script.roteiro.length} chars
                                  </span>
                                </div>
                                
                                {/* Title Preview */}
                                {script.titulo && (
                                  <h4 className="text-white text-sm font-medium mb-2 line-clamp-1">
                                    {script.titulo}
                                  </h4>
                                )}
                                
                                {/* Script Preview */}
                                <p className="text-gray-300 text-sm line-clamp-3 hover:text-white transition-colors">
                                  {script.roteiro.substring(0, 150)}
                                  {script.roteiro.length > 150 && '...'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Load Scripts Modal (específico para "Gerar Áudio") */}
      {showLoadScriptsModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeLoadScriptsModal}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white">Selecionar Roteiros</h2>
                  <p className="text-gray-400 text-sm">
                    {selectedChannel?.nome_canal} • {availableScriptsForChannel.length} roteiro{availableScriptsForChannel.length !== 1 ? 's' : ''} disponível{availableScriptsForChannel.length !== 1 ? 'is' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={closeLoadScriptsModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingChannelScripts ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex items-center space-x-3 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Carregando roteiros do canal...</span>
                  </div>
                </div>
              ) : availableScriptsForChannel.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-light text-white mb-2">Nenhum roteiro encontrado</h3>
                  <p className="text-gray-400">Este canal ainda não possui roteiros salvos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableScriptsForChannel.map((script, index) => {
                    const color = getCardColor(index);
                    const isAlreadySelected = selectedScriptsForAudio.some(s => s.id === script.id);
                    
                    return (
                      <div 
                        key={script.id}
                        onClick={() => !isAlreadySelected && addScriptForAudio(script)}
                        className={`border-l-4 ${color.border} bg-gray-800/30 rounded-r-xl p-4 transition-all duration-200 cursor-pointer group ${
                          isAlreadySelected 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 ${color.bg} rounded-full`}></div>
                            <span className="text-xs text-gray-400">#{script.id}</span>
                            {isAlreadySelected && (
                              <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                                Selecionado
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(script.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        
                        <h4 className="text-white font-medium mb-2 line-clamp-2">
                          {script.titulo || 'Sem título'}
                        </h4>
                        
                        <p className="text-gray-300 text-sm line-clamp-3 mb-3">
                          {script.roteiro.substring(0, 150)}
                          {script.roteiro.length > 150 && '...'}
                        </p>
                        
                        <div className="text-xs text-gray-500">
                          {script.roteiro.length} caracteres
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Script Detail Modal with Edit Functionality */}
      {selectedScriptModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeScriptModal}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isEditMode ? 'bg-blue-500' : 'bg-orange-500'
                }`}>
                  {isEditMode ? <Edit3 className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">
                    {isEditMode ? 'Editar Roteiro' : 'Detalhes do Roteiro'}
                  </h2>
                  <p className="text-gray-400 text-sm">ID: {selectedScriptModal.id_roteiro}</p>
                </div>
              </div>
              <button
                onClick={closeScriptModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
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

              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Título
                  </label>
                  {isEditMode ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="w-full p-4 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                        placeholder="Digite o título do roteiro..."
                      />
                      <div className="text-xs text-gray-400">
                        {editedTitle.length} caracteres
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-black/50 border border-gray-700 rounded-xl">
                      <h3 className="text-white text-lg font-medium">{selectedScriptModal.titulo}</h3>
                    </div>
                  )}
                </div>

                {/* Ideia Base Section */}
                {selectedScriptModal.ideia_base && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Ideia Base</h3>
                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                      <p className="text-blue-400">{selectedScriptModal.ideia_base}</p>
                    </div>
                  </div>
                )}

                {/* Thumb Text Section */}
                {selectedScriptModal.text_thumb && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Texto da Thumb
                    </label>
                    <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
                      <p className="text-orange-400 font-medium">{selectedScriptModal.text_thumb}</p>
                    </div>
                  </div>
                )}

                {/* Script Content */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Roteiro Completo
                  </label>
                  {isEditMode ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedScript}
                        onChange={(e) => setEditedScript(e.target.value)}
                        rows={12}
                        className="w-full p-4 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 resize-none"
                        placeholder="Digite o conteúdo do roteiro..."
                      />
                      <div className="text-xs text-gray-400">
                        {editedScript.length.toLocaleString()} caracteres
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-black/50 border border-gray-700 rounded-xl max-h-96 overflow-y-auto">
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {selectedScriptModal.roteiro}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400 text-right">
                        {selectedScriptModal.roteiro.length.toLocaleString()} caracteres
                      </div>
                    </>
                  )}
                </div>

                {/* Audio Section */}
                {selectedScriptModal.audio_path && !isEditMode && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Áudio do Roteiro
                    </label>
                    <div className="bg-black/50 rounded-xl border border-gray-700 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-medium">Reprodução de Áudio</h4>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => playScriptAudio(selectedScriptModal)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                              isAudioPlaying(`script-audio-${selectedScriptModal.id_roteiro}`)
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {isAudioPlaying(`script-audio-${selectedScriptModal.id_roteiro}`) ? (
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
                            onClick={() => downloadScriptAudio(selectedScriptModal)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Native Audio Player */}
                      <audio
                        controls
                        src={selectedScriptModal.audio_path}
                        className="w-full"
                        style={{ filter: 'invert(1) hue-rotate(180deg)' }}
                      >
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                    </div>
                  </div>
                )}

                {/* Script Info Section */}
                {!isEditMode && (
                  <div className="bg-gray-800/30 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-3">Informações do Roteiro</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Título:</span>
                        <span className="text-white">{selectedScriptModal.titulo || 'Sem título'}</span>
                      </div>
                      {selectedScriptModal.ideia_base && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Ideia Base:</span>
                          <span className="text-white">{selectedScriptModal.ideia_base}</span>
                        </div>
                      )}
                      {selectedScriptModal.text_thumb && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Texto da Thumb:</span>
                          <span className="text-white">{selectedScriptModal.text_thumb}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Caracteres:</span>
                        <span className="text-white">{selectedScriptModal.roteiro.length.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Áudio:</span>
                        <span className={selectedScriptModal.audio_path ? 'text-green-400' : 'text-gray-400'}>
                          {selectedScriptModal.audio_path ? 'Disponível' : 'Não disponível'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700 flex-shrink-0">
              {isEditMode ? (
                <>
                  <button
                    onClick={cancelEdit}
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
                </>
              ) : (
                <>
                  <button
                    onClick={openEditMode}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={closeScriptModal}
                    className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptGenerationPage;