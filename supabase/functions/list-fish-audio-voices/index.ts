import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface FishAudioListResponse {
  items: Array<{
    _id: string;
    title: string;
    description: string;
    languages: string[];
    samples: Array<{
      audio: string;
    }>;
    author: {
      nickname: string;
    };
    like_count: number;
    task_count: number;
    tags: string[];
  }>;
  total: number;
  page: number;
  page_size: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { api_key, page = 1, page_size = 20, search = '', language = '' } = await req.json();

    if (!api_key) {
      return new Response(
        JSON.stringify({ error: "api_key é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Construir URL com parâmetros de busca
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString(),
      ...(search && { search }),
      ...(language && { language })
    });

    // Buscar lista de vozes na API Fish-Audio
    const response = await fetch(`https://api.fish.audio/model?${params}`, {
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
          error: `Erro ao buscar vozes Fish-Audio: ${response.status}`,
          details: errorText
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const listData: FishAudioListResponse = await response.json();

    // Processar dados para formato padronizado
    const processedVoices = listData.items.map(voice => ({
      voice_id: voice._id,
      nome_voz: voice.title,
      plataforma: 'Fish-Audio',
      idioma: voice.languages.join(', ') || 'Não especificado',
      genero: 'Não especificado',
      preview_url: voice.samples?.[0]?.audio || '',
      description: voice.description || '',
      author: voice.author?.nickname || 'Desconhecido',
      popularity: voice.like_count || 0,
      usage_count: voice.task_count || 0,
      tags: voice.tags || []
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          voices: processedVoices,
          pagination: {
            total: listData.total,
            page: listData.page,
            page_size: listData.page_size,
            total_pages: Math.ceil(listData.total / listData.page_size)
          }
        },
        raw_data: listData // Para debug/análise adicional
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