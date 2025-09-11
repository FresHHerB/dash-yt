import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface ElevenLabsListResponse {
  voices: Array<{
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
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { api_key, show_legacy = false } = await req.json();

    if (!api_key) {
      return new Response(
        JSON.stringify({ error: "api_key é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Buscar lista de vozes na API ElevenLabs
    const params = new URLSearchParams({
      show_legacy: show_legacy.toString()
    });

    const response = await fetch(`https://api.elevenlabs.io/v1/voices?${params}`, {
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
          error: `Erro ao buscar vozes ElevenLabs: ${response.status}`,
          details: errorText
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const listData: ElevenLabsListResponse = await response.json();

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
    const processedVoices = listData.voices.map(voice => ({
      voice_id: voice.voice_id,
      nome_voz: voice.name,
      plataforma: 'ElevenLabs',
      idioma: languageMap[voice.labels?.language || ''] || voice.labels?.language || 'Não especificado',
      genero: genderMap[voice.labels?.gender || ''] || voice.labels?.gender || 'Não especificado',
      preview_url: voice.preview_url || '',
      description: voice.description || '',
      category: voice.category || 'Não especificado',
      popularity: (voice.sharing?.liked_by_count || 0) + (voice.sharing?.cloned_by_count || 0),
      age: voice.labels?.age || 'Não especificado',
      accent: voice.labels?.accent || 'Não especificado',
      use_case: voice.labels?.use_case || 'Não especificado'
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          voices: processedVoices,
          total: listData.voices.length
        },
        raw_data: listData // Para debug/análise adicional
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