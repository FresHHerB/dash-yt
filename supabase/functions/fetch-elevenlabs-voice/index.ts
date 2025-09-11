import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface ElevenLabsVoiceResponse {
  voice_id: string;
  name: string;
  description: string;
  preview_url: string;
  labels: {
    language?: string;
    gender?: string;
    age?: string;
    accent?: string;
    descriptive?: string;
    use_case?: string;
  };
  category: string;
  sharing?: {
    liked_by_count?: number;
    cloned_by_count?: number;
  };
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

interface ProcessedVoiceData {
  voice_id: string;
  nome_voz: string;
  plataforma: string;
  idioma: string;
  genero: string;
  preview_url: string;
  description: string;
  category: string;
  popularity: number;
  settings: object;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { voice_id, api_key } = await req.json();

    if (!voice_id || !api_key) {
      return new Response(
        JSON.stringify({ error: "voice_id e api_key são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Buscar dados da voz na API ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voice_id}`, {
      method: 'GET',
      headers: {
        'xi-api-key': api_key,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ 
          error: `Erro ao buscar voz ElevenLabs: ${response.status}`,
          details: errorText
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const voiceData: ElevenLabsVoiceResponse = await response.json();

    // Mapear idioma do código para nome
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

    // Mapear gênero
    const genderMap: { [key: string]: string } = {
      'male': 'Masculino',
      'female': 'Feminino',
      'neutral': 'Neutro'
    };

    // Processar dados para formato padronizado
    const processedData: ProcessedVoiceData = {
      voice_id: voiceData.voice_id,
      nome_voz: voiceData.name,
      plataforma: 'ElevenLabs',
      idioma: languageMap[voiceData.labels?.language || ''] || voiceData.labels?.language || 'Não especificado',
      genero: genderMap[voiceData.labels?.gender || ''] || voiceData.labels?.gender || 'Não especificado',
      preview_url: voiceData.preview_url || '',
      description: voiceData.description || '',
      category: voiceData.category || 'Não especificado',
      popularity: (voiceData.sharing?.liked_by_count || 0) + (voiceData.sharing?.cloned_by_count || 0),
      settings: voiceData.settings
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: processedData,
        raw_data: voiceData // Para debug/análise adicional
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro ao processar requisição ElevenLabs:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});