import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { audioApiService } from '../lib/audioApiService';
import { buildElevenLabsUrl, buildFishAudioUrl } from '../config/environment';
import { 
  Settings, 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  CheckCircle,
  Key,
  Mic,
  Play,
  Square,
  RefreshCw,
  Upload,
  Download,
  BookOpen,
  FileText,
  Volume2
} from 'lucide-react';
import PageHeader from './shared/PageHeader';

interface API {
  id: number;
  plataforma: string;
  api_key: string;
  created_at: string;
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
  audio_file_path?: string;
}

interface SettingsPageProps {
  user: any;
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onBack, onNavigate }) => {
  const [apis, setApis] = useState<API[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'ElevenLabs' | 'Fish-Audio' | 'Minimax'>('all');
  const [isLoadingApis, setIsLoadingApis] = useState(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const platforms = ['Fish-Audio', 'ElevenLabs', 'Minimax'];
  const allowedPlatforms = ['Fish-Audio', 'ElevenLabs', 'Minimax'];
  const [showApiModal, setShowApiModal] = useState(false);
  const [editingApi, setEditingApi] = useState<API | null>(null);
  const [apiForm, setApiForm] = useState({ plataforma: '', api_key: '' });
  const [isSavingApi, setIsSavingApi] = useState(false);
  
  // Voice Modal State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [editingVoice, setEditingVoice] = useState<Voice | null>(null);
  const [voiceForm, setVoiceForm] = useState({
    voice_id: '',
    plataforma: '',
  });
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [isCollectingVoiceData, setIsCollectingVoiceData] = useState(false);
  const [collectedVoiceData, setCollectedVoiceData] = useState<{
    nome_voz: string;
    idioma: string;
    genero: string;
  } | null>(null);
  const [autoCollectTimeout, setAutoCollectTimeout] = useState<NodeJS.Timeout | null>(null);
  const [canPlayPreview, setCanPlayPreview] = useState(false);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [manualEditReason, setManualEditReason] = useState<string>('');
  
  // Audio State
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());
  const [voiceTestError, setVoiceTestError] = useState<string>('');
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  useEffect(() => {
    loadApis();
    loadVoices();
  }, []);

  useEffect(() => {
    // Filter voices based on active filter
    if (activeFilter === 'all') {
      setFilteredVoices(voices);
    } else {
      setFilteredVoices(voices.filter(voice => voice.plataforma === activeFilter));
    }
  }, [voices, activeFilter]);

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
      setMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });

    audio.play().then(() => {
      setPlayingAudio({ id: audioId, audio });
    }).catch(() => {
      setMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      'Fish-Audio': 'bg-cyan-500',
      'ElevenLabs': 'bg-purple-500',
      'Minimax': 'bg-red-500'
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-500';
  };

  const pauseAudio = () => {
    if (playingAudio) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
      setPlayingAudio(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      'Fish-Audio': () => (
        <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">🐟</span>
        </div>
      ),
      'ElevenLabs': () => (
        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">11</span>
        </div>
      ),
      'Minimax': () => (
        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">M</span>
        </div>
      )
    };
    return icons[platform as keyof typeof icons] || (() => <Settings className="w-5 h-5" />);
  };

  const isAudioPlaying = (audioId: string) => {
    return playingAudio?.id === audioId;
  };

  const loadApis = async () => {
    setIsLoadingApis(true);
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar APIs.' });
      } else {
        setApis(data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoadingApis(false);
    }
  };

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const { data, error } = await supabase
        .from('vozes')
        .select('*')
        .in('plataforma', platforms)
        .order('nome_voz', { ascending: true });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar vozes.' });
      } else {
        setVoices(data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // Collect voice data automatically
  const collectVoiceData = async (voiceId: string, platform: string) => {
    console.log('🎯 [collectVoiceData] Iniciando coleta:', { voiceId, platform });
    
    if (!voiceId.trim() || !platform.trim()) {
      console.log('❌ [collectVoiceData] Campos vazios, limpando dados');
      setCollectedVoiceData(null);
      setCanPlayPreview(false);
      setShowManualEdit(false);
      setManualEditReason('');
      return;
    }

    console.log('🔄 [collectVoiceData] Iniciando coleta de dados...');
    setIsCollectingVoiceData(true);
    setCollectedVoiceData(null);
    setCanPlayPreview(false);
    setShowManualEdit(false);
    setManualEditReason('');
    
    try {
      if (platform === 'Minimax') {
        console.log('🔴 [collectVoiceData] Processando Minimax...');
        console.log('📞 [collectVoiceData] Chamando audioApiService.fetchVoiceDetails...');
        console.log('📦 [collectVoiceData] Parâmetros:', { platform, voiceId });
        
        try {
          // Para Minimax, usar o audioApiService que busca a API key internamente
          const voiceData = await audioApiService.fetchVoiceDetails(platform, voiceId);
          console.log('📦 [collectVoiceData] Dados Minimax recebidos:', voiceData);
          
          // Verificar se os dados estão completos
          const hasValidName = voiceData.nome_voz && voiceData.nome_voz.trim() && voiceData.nome_voz !== 'Nome não disponível';
          const hasValidLanguage = voiceData.idioma && voiceData.idioma.trim() && voiceData.idioma !== 'Não especificado';
          
          if (hasValidName && hasValidLanguage) {
            // Dados completos, usar automaticamente
            setCollectedVoiceData({
              nome_voz: voiceData.nome_voz,
              idioma: voiceData.idioma,
              genero: voiceData.genero || 'Não especificado'
            });
            setCanPlayPreview(false); // Minimax não tem preview ainda
            setShowManualEdit(false);
          } else {
            // Dados incompletos, habilitar edição manual
            console.log('⚠️ [collectVoiceData] Dados incompletos da Minimax, habilitando edição manual');
            setCollectedVoiceData({
              nome_voz: voiceData.nome_voz || '',
              idioma: voiceData.idioma || '',
              genero: voiceData.genero || 'Não especificado'
            });
            setShowManualEdit(true);
            setManualEditReason('Informações incompletas encontradas na API Minimax');
            setCanPlayPreview(false);
          }
        } catch (minimaxError) {
          console.log('❌ [collectVoiceData] Erro ou voz não encontrada na Minimax:', minimaxError);
          // Voz não encontrada, habilitar edição manual com campos vazios
          setCollectedVoiceData({
            nome_voz: '',
            idioma: '',
            genero: 'Não especificado'
          });
          setShowManualEdit(true);
          setManualEditReason('Voz não encontrada na lista da API Minimax');
          setCanPlayPreview(false);
        }
        
      } else {
        console.log('🔑 [collectVoiceData] Buscando API key para:', platform);
        const apiData = apis.find(api => api.plataforma === platform);
        if (!apiData) {
          throw new Error(`API key não encontrada para ${platform}`);
        }

        if (platform === 'ElevenLabs') {
          console.log('🎵 [collectVoiceData] Processando ElevenLabs...');
          const response = await fetch(buildElevenLabsUrl(`/voices/${voiceId}`), {
            method: 'GET',
            headers: {
              'xi-api-key': apiData.api_key
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ElevenLabs: ${response.status} - ${errorText}`);
          }

          const voiceData = await response.json();
          
          // Map language codes to names
          const languageMap: { [key: string]: string } = {
            'en': 'Inglês',
            'pt': 'Português',
            'es': 'Espanhol',
            'fr': 'Francês',
            'de': 'Alemão',
            'it': 'Italiano',
            'ja': 'Japonês',
            'ko': 'Coreano',
            'zh': 'Chinês'
          };

          // Map gender
          const genderMap: { [key: string]: string } = {
            'male': 'Masculino',
            'female': 'Feminino',
            'neutral': 'Neutro'
          };

          setCollectedVoiceData({
            nome_voz: voiceData.name || 'Nome não disponível',
            idioma: languageMap[voiceData.labels?.language || ''] || voiceData.labels?.language || 'Não especificado',
            genero: genderMap[voiceData.labels?.gender || ''] || voiceData.labels?.gender || 'Não especificado'
          });
          setCanPlayPreview(true);

        } else if (platform === 'Fish-Audio') {
          console.log('🐟 [collectVoiceData] Processando Fish-Audio...');
          const response = await fetch(buildFishAudioUrl(`/model/${voiceId}`), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiData.api_key}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro Fish-Audio: ${response.status} - ${errorText}`);
          }

          const modelData = await response.json();
          
          setCollectedVoiceData({
            nome_voz: modelData.title || 'Nome não disponível',
            idioma: modelData.languages?.join(', ') || 'Não especificado',
            genero: 'Não especificado' // Fish-Audio não fornece gênero diretamente
          });
          setCanPlayPreview(true);
        }
      }

      console.log('✅ [collectVoiceData] Coleta concluída com sucesso');
      
    } catch (error) {
      console.error('❌ [collectVoiceData] Erro ao coletar dados da voz:', error);
      // Não mostrar erro global no modal, apenas limpar dados
      setCollectedVoiceData(null);
      setCanPlayPreview(false);
      setShowManualEdit(false);
      setManualEditReason('');
    } finally {
      console.log('🏁 [collectVoiceData] Finalizando coleta');
      setIsCollectingVoiceData(false);
    }
  };

  // Auto-collect data when voice_id or platform changes
  const handleVoiceFormChange = (field: string, value: string) => {
    console.log('📝 [handleVoiceFormChange] Campo alterado:', { field, value });
    setVoiceForm(prev => ({ ...prev, [field]: value }));
    
    // Clear existing timeout
    if (autoCollectTimeout) {
      console.log('⏰ [handleVoiceFormChange] Limpando timeout anterior');
      clearTimeout(autoCollectTimeout);
    }
    
    // Set new timeout for auto-collection
    const newTimeout = setTimeout(() => {
      const updatedForm = { ...voiceForm, [field]: value };
      console.log('⏰ [handleVoiceFormChange] Timeout executado, form:', updatedForm);
      if (updatedForm.voice_id.trim() && updatedForm.plataforma.trim()) {
        console.log('✅ [handleVoiceFormChange] Condições atendidas, iniciando coleta');
        collectVoiceData(updatedForm.voice_id, updatedForm.plataforma);
      } else {
        console.log('❌ [handleVoiceFormChange] Condições não atendidas:', {
          voice_id: updatedForm.voice_id.trim(),
          plataforma: updatedForm.plataforma.trim()
        });
      }
    }, 800); // 800ms delay after user stops typing
    
    console.log('⏰ [handleVoiceFormChange] Novo timeout definido');
    setAutoCollectTimeout(newTimeout);
  };

  // Test voice preview in modal
  const testVoiceInModal = () => {
    if (!collectedVoiceData || !voiceForm.voice_id || !voiceForm.plataforma) return;
    
    const tempVoice: Voice = {
      id: 0,
      nome_voz: collectedVoiceData.nome_voz,
      voice_id: voiceForm.voice_id,
      plataforma: voiceForm.plataforma,
      idioma: collectedVoiceData.idioma,
      genero: collectedVoiceData.genero,
      created_at: new Date().toISOString()
    };
    
    const audioId = `modal-voice-preview`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(0)); // Use ID 0 for modal preview

    generateVoiceTest(tempVoice)
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
          newSet.delete(0);
          return newSet;
        });
      });
  };

  // API Functions
  const openApiModal = (api?: API) => {
    if (api) {
      setEditingApi(api);
      setApiForm({ plataforma: api.plataforma, api_key: api.api_key });
    } else {
      setEditingApi(null);
      setApiForm({ plataforma: '', api_key: '' });
    }
    setShowApiModal(true);
  };

  const closeApiModal = () => {
    setShowApiModal(false);
    setEditingApi(null);
    setApiForm({ plataforma: '', api_key: '' });
  };

  const saveApi = async () => {
    if (!apiForm.plataforma.trim() || !apiForm.api_key.trim()) {
      setMessage({ type: 'error', text: 'Preencha todos os campos.' });
      return;
    }

    setIsSavingApi(true);
    try {
      if (editingApi) {
        // Update existing API
        const { error } = await supabase
          .from('apis')
          .update({
            plataforma: apiForm.plataforma,
            api_key: apiForm.api_key
          })
          .eq('id', editingApi.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'API atualizada com sucesso!' });
      } else {
        // Create new API
        const { error } = await supabase
          .from('apis')
          .insert([{
            plataforma: apiForm.plataforma,
            api_key: apiForm.api_key
          }]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'API adicionada com sucesso!' });
      }

      closeApiModal();
      loadApis();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar API.' });
    } finally {
      setIsSavingApi(false);
    }
  };

  const deleteApi = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta API?')) return;

    try {
      const { error } = await supabase
        .from('apis')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'API excluída com sucesso!' });
      loadApis();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao excluir API.' });
    }
  };

  // Voice Functions
  const openVoiceModal = (voice?: Voice) => {
    if (voice) {
      setEditingVoice(voice);
      setVoiceForm({
        voice_id: voice.voice_id,
        plataforma: voice.plataforma
      });
      setCollectedVoiceData({
        nome_voz: voice.nome_voz,
        idioma: voice.idioma || '',
        genero: voice.genero || ''
      });
      setCanPlayPreview(true);
    } else {
      setEditingVoice(null);
      setVoiceForm({
        voice_id: '',
        plataforma: ''
      });
      setCollectedVoiceData(null);
      setCanPlayPreview(false);
    }
    
    // Clear any existing timeout
    if (autoCollectTimeout) {
      clearTimeout(autoCollectTimeout);
      setAutoCollectTimeout(null);
    }
    
    setShowVoiceModal(true);
  };

  const closeVoiceModal = () => {
    // Clear timeout on close
    if (autoCollectTimeout) {
      clearTimeout(autoCollectTimeout);
      setAutoCollectTimeout(null);
    }
    
    setShowVoiceModal(false);
    setEditingVoice(null);
    setVoiceForm({
      voice_id: '',
      plataforma: ''
    });
    setCollectedVoiceData(null);
    setCanPlayPreview(false);
    setShowManualEdit(false);
    setManualEditReason('');
  };

  const saveVoice = async () => {
    if (!voiceForm.voice_id.trim() || !voiceForm.plataforma.trim() || !collectedVoiceData) {
      setMessage({ type: 'error', text: 'Preencha o Voice ID, selecione a plataforma e colete os dados automaticamente.' });
      return;
    }

    setIsSavingVoice(true);
    try {
      if (editingVoice) {
        // Update existing voice
        const { error } = await supabase
          .from('vozes')
          .update({
            nome_voz: collectedVoiceData.nome_voz,
            voice_id: voiceForm.voice_id,
            plataforma: voiceForm.plataforma,
            idioma: collectedVoiceData.idioma || null,
            genero: collectedVoiceData.genero || null
          })
          .eq('id', editingVoice.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Voz atualizada com sucesso!' });
      } else {
        // Create new voice
        const { error } = await supabase
          .from('vozes')
          .insert([{
            nome_voz: collectedVoiceData.nome_voz,
            voice_id: voiceForm.voice_id,
            plataforma: voiceForm.plataforma,
            idioma: collectedVoiceData.idioma || null,
            genero: collectedVoiceData.genero || null
          }]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Voz adicionada com sucesso!' });
      }

      closeVoiceModal();
      loadVoices();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar voz.' });
    } finally {
      setIsSavingVoice(false);
    }
  };

  const deleteVoice = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta voz?')) return;

    try {
      const { error } = await supabase
        .from('vozes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Voz excluída com sucesso!' });
      loadVoices();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao excluir voz.' });
    }
  };

  // Generate voice test audio
  const generateVoiceTest = async (voice: Voice): Promise<string> => {
    try {
      if (voice.plataforma === 'ElevenLabs') {
        // Get API key for ElevenLabs
        const apiData = apis.find(api => api.plataforma === voice.plataforma);
        if (!apiData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        // Buscar dados da voz para obter o preview_url
        const response = await fetch(buildElevenLabsUrl(`/voices/${voice.voice_id}`), {
          method: 'GET',
          headers: {
            'xi-api-key': apiData.api_key
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
        const apiData = apis.find(api => api.plataforma === voice.plataforma);
        if (!apiData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        // Para Fish-Audio, buscamos os dados do modelo para obter o sample de áudio
        const response = await fetch(buildFishAudioUrl(`/model/${voice.voice_id}`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiData.api_key}`,
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

      // Minimax não tem teste de voz implementado ainda
      if (voice.plataforma === 'Minimax') {
        throw new Error('Teste de voz não disponível para Minimax');
      }

      throw new Error('Plataforma não suportada para teste');
    } catch (error) {
      console.error('Erro ao gerar teste de voz:', error);
      throw error;
    }
  };

  const testVoice = (voice: Voice) => {
    const audioId = `voice-test-${voice.id}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setIsTestingVoice(true);
    setVoiceTestError('');

    generateVoiceTest(voice)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setVoiceTestError(error instanceof Error ? error.message : 'Erro ao testar voz');
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setIsTestingVoice(false);
      });
  };

  const testVoicePreview = (voice: Voice) => {
    const audioId = `voice-preview-${voice.id}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(voice.id));
    setVoiceTestError('');

    generateVoiceTest(voice)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setVoiceTestError(error instanceof Error ? error.message : 'Erro ao testar voz');
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(voice.id);
          return newSet;
        });
      });
  };

  const elevenLabsCount = voices.filter(voice => voice.plataforma === 'ElevenLabs').length;
  const fishAudioCount = voices.filter(voice => voice.plataforma === 'Fish-Audio').length;
  const minimaxCount = voices.filter(voice => voice.plataforma === 'Minimax').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <PageHeader
        user={user}
        currentPage="settings"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* APIs Section */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">APIs</h2>
                  <p className="text-sm text-gray-400">Gerencie suas chaves de API</p>
                </div>
              </div>
              <button
                onClick={() => openApiModal()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {isLoadingApis ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando APIs...</span>
                </div>
              </div>
            ) : apis.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-light text-white mb-2">Nenhuma API configurada</h3>
                <p className="text-gray-400">Adicione suas chaves de API para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apis.map((api) => (
                  <ApiCard
                    key={api.id}
                    api={api}
                    onEdit={() => openApiModal(api)}
                    onDelete={() => deleteApi(api.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Voices Section */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">Vozes</h2>
                  <p className="text-sm text-gray-400">Gerencie suas vozes de IA</p>
                </div>
              </div>
              <button
                onClick={() => openVoiceModal()}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Voice Filters */}
            <div className="flex items-center space-x-3 mb-6">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'all'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span>Todas</span>
              </button>
              <button
                onClick={() => setActiveFilter('ElevenLabs')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'ElevenLabs'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">11</span>
                </div>
                <span>ElevenLabs</span>
              </button>
              <button
                onClick={() => setActiveFilter('Fish-Audio')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'Fish-Audio'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <div className="w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">🐟</span>
                </div>
                <span>Fish-Audio</span>
              </button>
              <button
                onClick={() => setActiveFilter('Minimax')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'Minimax'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">M</span>
                </div>
                <span>Minimax</span>
              </button>
            </div>

            {isLoadingVoices ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando vozes...</span>
                </div>
              </div>
            ) : filteredVoices.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-light text-white mb-2">Nenhuma voz encontrada</h3>
                <p className="text-gray-400">Adicione suas vozes de IA para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVoices.map((voice) => (
                  <VoiceCard
                    key={voice.id}
                    voice={voice}
                    onEdit={() => openVoiceModal(voice)}
                    onDelete={() => deleteVoice(voice.id)}
                    onTest={() => testVoicePreview(voice)}
                    isPlaying={isAudioPlaying(`voice-preview-${voice.id}`)}
                    isTesting={testingVoices.has(voice.id)}
                    getPlatformColor={getPlatformColor}
                    getPlatformIcon={getPlatformIcon}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* API Modal */}
        {showApiModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white">
                  {editingApi ? 'Editar API' : 'Adicionar API'}
                </h3>
                <button
                  onClick={closeApiModal}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Plataforma <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={apiForm.plataforma}
                    onChange={(e) => setApiForm(prev => ({ ...prev, plataforma: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma plataforma</option>
                    {allowedPlatforms.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={apiForm.api_key}
                    onChange={(e) => setApiForm(prev => ({ ...prev, api_key: e.target.value }))}
                    placeholder="Cole sua API key aqui"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 mt-8">
                <button
                  onClick={closeApiModal}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveApi}
                  disabled={isSavingApi}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-all duration-200"
                >
                  {isSavingApi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingApi ? 'Atualizar' : 'Adicionar'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Voice Modal */}
        {showVoiceModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white">
                  {editingVoice ? 'Editar Voz' : 'Adicionar Voz'}
                </h3>
                <button
                  onClick={closeVoiceModal}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Plataforma <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={voiceForm.plataforma}
                    onChange={(e) => handleVoiceFormChange('plataforma', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma plataforma</option>
                    {platforms.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Voice ID <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={voiceForm.voice_id}
                      onChange={(e) => handleVoiceFormChange('voice_id', e.target.value)}
                      placeholder="Cole o Voice ID da plataforma selecionada"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                    />
                    {isCollectingVoiceData && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Cole o Voice ID da plataforma selecionada
                  </p>
                </div>

                {/* Collected Voice Data Display */}
                {collectedVoiceData && (
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-white">
                          {showManualEdit ? 'Edição Manual' : 'Dados Coletados'}
                        </h4>
                        {showManualEdit && (
                          <div className="px-2 py-1 bg-yellow-900/30 text-yellow-400 border border-yellow-800 rounded text-xs">
                            Manual
                          </div>
                        )}
                      </div>
                      {canPlayPreview && (
                        <button
                          onClick={testVoiceInModal}
                          disabled={testingVoices.has(0)}
                          className="flex items-center space-x-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white text-xs rounded-lg transition-all duration-200"
                        >
                          {testingVoices.has(0) ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Testando...</span>
                            </>
                          ) : isAudioPlaying('modal-voice-preview') ? (
                            <>
                              <Square className="w-3 h-3" />
                              <span>Parar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              <span>Testar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Manual Edit Reason */}
                    {showManualEdit && manualEditReason && (
                      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div>
                            <p className="text-yellow-400 text-xs font-medium mb-1">Edição Manual Necessária</p>
                            <p className="text-yellow-300 text-xs">{manualEditReason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {/* Nome da Voz - Editável */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Nome da Voz {showManualEdit && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="text"
                          value={collectedVoiceData.nome_voz}
                          onChange={(e) => setCollectedVoiceData(prev => prev ? { ...prev, nome_voz: e.target.value } : null)}
                          className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 ${
                            showManualEdit ? 'border-yellow-600' : 'border-gray-600'
                          }`}
                          placeholder="Nome da voz"
                          required={showManualEdit}
                        />
                      </div>

                      {/* Idioma - Editável */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Idioma {showManualEdit && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="text"
                          value={collectedVoiceData.idioma}
                          onChange={(e) => setCollectedVoiceData(prev => prev ? { ...prev, idioma: e.target.value } : null)}
                          className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 ${
                            showManualEdit ? 'border-yellow-600' : 'border-gray-600'
                          }`}
                          placeholder="Ex: Inglês, Português, etc."
                          required={showManualEdit}
                        />
                      </div>

                      {/* Gênero - Select editável */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Gênero
                        </label>
                        <select
                          value={collectedVoiceData.genero}
                          onChange={(e) => setCollectedVoiceData(prev => prev ? { ...prev, genero: e.target.value } : null)}
                          className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 ${
                            showManualEdit ? 'border-yellow-600' : 'border-gray-600'
                          }`}
                        >
                          <option value="Não especificado">Não especificado</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Neutro">Neutro</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-4 mt-8">
                <button
                  onClick={closeVoiceModal}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveVoice}
                  disabled={isSavingVoice || !collectedVoiceData || (showManualEdit && (!collectedVoiceData.nome_voz.trim() || !collectedVoiceData.idioma.trim()))}
                  className="flex items-center space-x-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-all duration-200"
                >
                  {isSavingVoice ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingVoice ? 'Atualizar' : 'Adicionar'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// API Card Component
const ApiCard: React.FC<{
  api: API;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ api, onEdit, onDelete }) => {
  const getPlatformColor = (platform: string) => {
    const colors = {
      'Fish-Audio': 'bg-cyan-500',
      'ElevenLabs': 'bg-purple-500',
      'Minimax': 'bg-red-500'
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getPlatformColor(api.plataforma)}`} />
          <div>
            <h4 className="text-white font-medium">{api.plataforma}</h4>
            <p className="text-gray-400 text-sm">
              API Key: {api.api_key.substring(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all duration-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Voice Card Component
const VoiceCard: React.FC<{
  voice: Voice;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  isPlaying: boolean;
  isTesting: boolean;
  getPlatformColor: (platform: string) => string;
  getPlatformIcon: (platform: string) => () => JSX.Element;
}> = ({ voice, onEdit, onDelete, onTest, isPlaying, isTesting, getPlatformColor, getPlatformIcon }) => {
  const PlatformIcon = getPlatformIcon(voice.plataforma);

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getPlatformColor(voice.plataforma)}`}>
            <PlatformIcon />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium">{voice.nome_voz}</h4>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>{voice.plataforma}</span>
              {voice.idioma && <span>• {voice.idioma}</span>}
              {voice.genero && <span>• {voice.genero}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onTest}
            disabled={isTesting}
            className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-900/30 rounded-lg transition-all duration-200 disabled:opacity-50"
            title="Testar voz"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all duration-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;