import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface MinimaxVoiceResponse {
  voice_id: string;
  voice_name: string;
  description: string[];
  created_time: string;
}

interface MinimaxApiResponse {
  system_voice: MinimaxVoiceResponse[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('🚀 [Minimax] Iniciando list-minimax-voices');
    const { search = '', language = '' } = await req.json();
    console.log('📥 [Minimax] Parâmetros recebidos:', { 
      search,
      language
    });

    // Buscar API key do Minimax no banco de dados
    console.log('🔍 [Minimax] Buscando API key no banco...');
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: apiData, error: apiError } = await supabaseAdminClient
      .from('apis')
      .select('api_key')
      .eq('plataforma', 'Minimax')
      .single();

    if (apiError || !apiData) {
      console.error('❌ [Minimax] API key não encontrada:', apiError);
      return new Response(
        JSON.stringify({ error: "API key do Minimax não encontrada no banco de dados" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const api_key = apiData.api_key;
    console.log('✅ [Minimax] API key encontrada:', api_key ? '***PRESENTE***' : 'AUSENTE');

    // Log do curl equivalente
    console.log('📋 [Minimax] Curl equivalente:');
    console.log(`curl --location 'https://api.minimax.io/v1/get_voice' \\`);
    console.log(`--header 'content-type: application/json' \\`);
    console.log(`--header 'authorization: Bearer ${api_key.substring(0, 20)}...' \\`);
    console.log(`--data '{"voice_type":"all"}'`);
    
    console.log('📡 [Minimax] Fazendo requisição para API Minimax...');
    console.log('🔗 [Minimax] URL:', 'https://api.minimax.io/v1/get_voice');
    console.log('🔑 [Minimax] Headers:', {
      'content-type': 'application/json',
      'authorization': `Bearer ${api_key.substring(0, 20)}...`
    });
    console.log('📦 [Minimax] Body:', JSON.stringify({ voice_type: "all" }));

    // Buscar lista de vozes na API Minimax
    const response = await fetch('https://api.minimax.io/v1/get_voice', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${api_key}`
      },
      body: JSON.stringify({
        voice_type: "all"
      })
    });

    console.log('📡 [Minimax] Response status:', response.status);
    console.log('📡 [Minimax] Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📄 [Minimax] Response body (raw):', responseText.substring(0, 500) + '...');

    if (!response.ok) {
      console.error('❌ [Minimax] Erro na resposta da API:', {
        status: response.status,
        statusText: response.statusText,
        errorText: responseText
      });
      return new Response(
        JSON.stringify({ 
          error: `Erro ao buscar vozes Minimax: ${response.status}`,
          details: responseText
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let apiResponse: MinimaxApiResponse[];
    try {
      apiResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ [Minimax] Erro ao fazer parse do JSON:', parseError);
      console.log('📄 [Minimax] Response text completo:', responseText);
      throw new Error('Resposta da API não é um JSON válido');
    }
    
    console.log('📦 [Minimax] Resposta da API recebida:', {
      type: typeof apiResponse,
      isArray: Array.isArray(apiResponse),
      length: Array.isArray(apiResponse) ? apiResponse.length : 'N/A',
      firstItem: apiResponse[0] ? Object.keys(apiResponse[0]) : 'N/A',
      fullResponse: apiResponse
    });

    // Extrair todas as vozes de todos os response items
    let allVoices: MinimaxVoiceResponse[] = [];
    console.log('🔍 [Minimax] Extraindo vozes...');
    
    for (const responseItem of apiResponse) {
      console.log('🔍 [Minimax] Processando item:', {
        hasSystemVoice: !!responseItem.system_voice,
        systemVoiceLength: responseItem.system_voice ? responseItem.system_voice.length : 0
      });
      if (responseItem.system_voice) {
        allVoices = allVoices.concat(responseItem.system_voice);
      }
    }

    console.log('🔍 [Minimax] Total de vozes extraídas:', allVoices.length);
    console.log('🔍 [Minimax] Primeiras 3 vozes:', allVoices.slice(0, 3).map(v => ({
      voice_id: v.voice_id,
      voice_name: v.voice_name
    })));

    // Detectar idioma baseado no voice_id
    const detectLanguage = (voiceId: string): string => {
      if (voiceId.toLowerCase().includes('english')) return 'Inglês';
      if (voiceId.toLowerCase().includes('chinese') || voiceId.toLowerCase().includes('mandarin')) return 'Chinês';
      if (voiceId.toLowerCase().includes('spanish')) return 'Espanhol';
      if (voiceId.toLowerCase().includes('french')) return 'Francês';
      if (voiceId.toLowerCase().includes('german')) return 'Alemão';
      if (voiceId.toLowerCase().includes('portuguese')) return 'Português';
      return 'Não especificado';
    };

    // Detectar gênero baseado na descrição
    const detectGender = (description: string[]): string => {
      const fullDescription = description.join(' ').toLowerCase();
      if (fullDescription.includes('male') && !fullDescription.includes('female')) return 'Masculino';
      if (fullDescription.includes('female') && !fullDescription.includes('male')) return 'Feminino';
      if (fullDescription.includes('girl') || fullDescription.includes('woman')) return 'Feminino';
      if (fullDescription.includes('boy') || fullDescription.includes('man')) return 'Masculino';
      return 'Não especificado';
    };

    console.log('🔄 [Minimax] Processando dados das vozes...');
    // Processar dados para formato padronizado
    let processedVoices = allVoices.map(voice => ({
      voice_id: voice.voice_id,
      nome_voz: voice.voice_name,
      plataforma: 'Minimax',
      idioma: detectLanguage(voice.voice_id),
      genero: detectGender(voice.description),
      preview_url: '', // Minimax não fornece preview_url diretamente
      description: voice.description.join(' '),
      created_time: voice.created_time
    }));

    console.log('🔄 [Minimax] Vozes processadas:', processedVoices.length);

    // Aplicar filtros se fornecidos
    if (search) {
      console.log('🔍 [Minimax] Aplicando filtro de busca:', search);
      const searchLower = search.toLowerCase();
      processedVoices = processedVoices.filter(voice => 
        voice.nome_voz.toLowerCase().includes(searchLower) ||
        voice.voice_id.toLowerCase().includes(searchLower) ||
        voice.description.toLowerCase().includes(searchLower)
      );
      console.log('🔍 [Minimax] Vozes após filtro de busca:', processedVoices.length);
    }

    if (language) {
      console.log('🔍 [Minimax] Aplicando filtro de idioma:', language);
      processedVoices = processedVoices.filter(voice => 
        voice.idioma.toLowerCase().includes(language.toLowerCase())
      );
      console.log('🔍 [Minimax] Vozes após filtro de idioma:', processedVoices.length);
    }

    console.log('✅ [Minimax] Resultado final:', {
      totalVoices: processedVoices.length,
      firstVoice: processedVoices[0] ? {
        voice_id: processedVoices[0].voice_id,
        nome_voz: processedVoices[0].nome_voz,
        idioma: processedVoices[0].idioma,
        genero: processedVoices[0].genero
      } : null
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          voices: processedVoices,
          total: processedVoices.length
        },
        raw_data: apiResponse // Para debug/análise adicional
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 [Minimax] Erro ao processar requisição:', error);
    console.error('💥 [Minimax] Stack trace:', error.stack);
    
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