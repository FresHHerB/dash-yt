import { supabase } from './supabase';

export interface VoiceData {
  voice_id: string;
  nome_voz: string;
  plataforma: string;
  idioma: string;
  genero: string;
  preview_url: string;
  description: string;
  [key: string]: any; // Para campos específicos de cada plataforma
}

export interface VoiceListResponse {
  voices: VoiceData[];
  pagination?: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  total?: number;
}

class AudioApiService {
  private getSupabaseUrl() {
    return import.meta.env.VITE_SUPABASE_URL;
  }

  private getSupabaseAnonKey() {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  /**
   * Busca detalhes de uma voz específica do Fish-Audio
   */
  async fetchFishAudioVoice(voiceId: string, apiKey: string): Promise<VoiceData> {
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/fetch-fish-audio-voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: voiceId,
        api_key: apiKey
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao buscar voz Fish-Audio');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Busca detalhes de uma voz específica do ElevenLabs
   */
  async fetchElevenLabsVoice(voiceId: string, apiKey: string): Promise<VoiceData> {
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/fetch-elevenlabs-voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: voiceId,
        api_key: apiKey
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao buscar voz ElevenLabs');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Busca detalhes de uma voz específica do Minimax
   */
  async fetchMinimaxVoice(voiceId: string): Promise<VoiceData> {
    console.log('🚀 [AudioApiService] Iniciando fetchMinimaxVoice:', { voiceId });
    console.log('🔗 [AudioApiService] URL da edge function:', `${this.getSupabaseUrl()}/functions/v1/fetch-minimax-voice`);
    console.log('🔑 [AudioApiService] Anon key presente:', !!this.getSupabaseAnonKey());
    
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/fetch-minimax-voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: voiceId
      })
    });

    console.log('📡 [AudioApiService] Response status:', response.status);
    console.log('📡 [AudioApiService] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [AudioApiService] Erro na resposta:', errorText);
      const error = await response.json();
      console.error('❌ [AudioApiService] Erro na resposta:', error);
      throw new Error(error.error || 'Erro ao buscar voz Minimax');
    }

    const result = await response.json();
    console.log('✅ [AudioApiService] Resultado recebido:', result);
    return result.data;
  }

  /**
   * Lista vozes disponíveis do Fish-Audio
   */
  async listFishAudioVoices(
    apiKey: string, 
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      language?: string;
    } = {}
  ): Promise<VoiceListResponse> {
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/list-fish-audio-voices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        page: options.page || 1,
        page_size: options.pageSize || 20,
        search: options.search || '',
        language: options.language || ''
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao listar vozes Fish-Audio');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Lista vozes disponíveis do ElevenLabs
   */
  async listElevenLabsVoices(
    apiKey: string,
    options: {
      showLegacy?: boolean;
    } = {}
  ): Promise<VoiceListResponse> {
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/list-elevenlabs-voices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        show_legacy: options.showLegacy || false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao listar vozes ElevenLabs');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Lista vozes disponíveis do Minimax
   */
  async listMinimaxVoices(
    options: {
      search?: string;
      language?: string;
    } = {}
  ): Promise<VoiceListResponse> {
    console.log('🚀 [AudioApiService] Iniciando listMinimaxVoices:', { 
      options 
    });
    
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/list-minimax-voices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        search: options.search || '',
        language: options.language || ''
      })
    });

    console.log('📡 [AudioApiService] Response status:', response.status);
    console.log('📡 [AudioApiService] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [AudioApiService] Erro na resposta:', errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: errorText };
      }
      console.error('❌ [AudioApiService] Erro na resposta:', error);
      throw new Error(error.error || 'Erro ao listar vozes Minimax');
    }

    const result = await response.json();
    console.log('✅ [AudioApiService] Resultado recebido:', {
      success: result.success,
      totalVoices: result.data?.total || 0,
      firstVoice: result.data?.voices?.[0]?.nome_voz || 'N/A'
    });
    return result.data;
  }

  /**
   * Busca detalhes de uma voz baseado na plataforma
   */
  async fetchVoiceDetails(platform: string, voiceId: string, apiKey?: string): Promise<VoiceData> {
    console.log('🚀 [AudioApiService] fetchVoiceDetails:', { platform, voiceId, hasApiKey: !!apiKey });
    
    switch (platform.toLowerCase()) {
      case 'fish-audio':
        console.log('🐟 [AudioApiService] Usando Fish-Audio');
        return this.fetchFishAudioVoice(voiceId, apiKey!);
      case 'elevenlabs':
        console.log('🎵 [AudioApiService] Usando ElevenLabs');
        return this.fetchElevenLabsVoice(voiceId, apiKey!);
      case 'minimax':
        console.log('🔴 [AudioApiService] Usando Minimax');
        return this.fetchMinimaxVoice(voiceId);
      default:
        console.error('❌ [AudioApiService] Plataforma não suportada:', platform);
        throw new Error(`Plataforma não suportada: ${platform}`);
    }
  }

  /**
   * Lista vozes baseado na plataforma
   */
  async listVoices(platform: string, apiKey?: string, options: any = {}): Promise<VoiceListResponse> {
    console.log('🚀 [AudioApiService] listVoices:', { platform, hasApiKey: !!apiKey, options });
    
    switch (platform.toLowerCase()) {
      case 'fish-audio':
        console.log('🐟 [AudioApiService] Listando Fish-Audio');
        return this.listFishAudioVoices(apiKey!, options);
      case 'elevenlabs':
        console.log('🎵 [AudioApiService] Listando ElevenLabs');
        return this.listElevenLabsVoices(apiKey!, options);
      case 'minimax':
        console.log('🔴 [AudioApiService] Listando Minimax');
        return this.listMinimaxVoices(options);
      default:
        console.error('❌ [AudioApiService] Plataforma não suportada:', platform);
        throw new Error(`Plataforma não suportada: ${platform}`);
    }
  }

  /**
   * Salva uma voz no banco de dados local
   */
  async saveVoiceToDatabase(voiceData: VoiceData): Promise<void> {
    console.log('💾 [AudioApiService] Salvando voz no banco:', {
      nome_voz: voiceData.nome_voz,
      voice_id: voiceData.voice_id,
      plataforma: voiceData.plataforma
    });
    
    const { error } = await supabase
      .from('vozes')
      .insert([{
        nome_voz: voiceData.nome_voz,
        voice_id: voiceData.voice_id,
        plataforma: voiceData.plataforma,
        idioma: voiceData.idioma,
        genero: voiceData.genero,
        preview_url: voiceData.preview_url
      }]);

    if (error) {
      console.error('❌ [AudioApiService] Erro ao salvar voz:', error);
      throw new Error(`Erro ao salvar voz: ${error.message}`);
    }
    
    console.log('✅ [AudioApiService] Voz salva com sucesso');
  }

  /**
   * Busca e salva uma voz automaticamente
   */
  async fetchAndSaveVoice(platform: string, voiceId: string, apiKey?: string): Promise<VoiceData> {
    console.log('🔄 [AudioApiService] fetchAndSaveVoice:', { platform, voiceId, hasApiKey: !!apiKey });
    
    const voiceData = await this.fetchVoiceDetails(platform, voiceId, apiKey);
    console.log('📦 [AudioApiService] Dados da voz obtidos:', voiceData);
    
    await this.saveVoiceToDatabase(voiceData);
    console.log('✅ [AudioApiService] Processo completo');
    
    return voiceData;
  }
}

export const audioApiService = new AudioApiService();