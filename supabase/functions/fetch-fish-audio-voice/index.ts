import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface FishAudioVoiceResponse {
  _id: string;
  title: string;
  description: string;
  languages: string[];
  samples: Array<{
    title: string;
    text: string;
    audio: string;
  }>;
  author: {
    nickname: string;
  };
  like_count: number;
  task_count: number;
}

interface ProcessedVoiceData {
  voice_id: string;
  nome_voz: string;
  plataforma: string;
  idioma: string;
  genero: string;
  preview_url: string;
  description: string;
  author: string;
  popularity: number;
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

    // Buscar dados da voz na API Fish-Audio
    const response = await fetch(`https://api.fish.audio/model/${voice_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ 
          error: `Erro ao buscar voz Fish-Audio: ${response.status}`,
          details: errorText
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const voiceData: FishAudioVoiceResponse = await response.json();

    // Processar dados para formato padronizado
    const processedData: ProcessedVoiceData = {
      voice_id: voiceData._id,
      nome_voz: voiceData.title,
      plataforma: 'Fish-Audio',
      idioma: voiceData.languages.join(', ') || 'Não especificado',
      genero: 'Não especificado', // Fish-Audio não fornece gênero diretamente
      preview_url: voiceData.samples?.[0]?.audio || '',
      description: voiceData.description || '',
      author: voiceData.author?.nickname || 'Desconhecido',
      popularity: voiceData.like_count || 0
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
    console.error('Erro ao processar requisição Fish-Audio:', error);
    
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