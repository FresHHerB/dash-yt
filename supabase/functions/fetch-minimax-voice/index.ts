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

interface ProcessedVoiceData {
  voice_id: string;
  nome_voz: string;
  plataforma: string;
  idioma: string;
  genero: string;
  preview_url: string;
  description: string;
  created_time: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('🚀 [Minimax] Iniciando fetch-minimax-voice');
    const { voice_id } = await req.json();
    console.log('📥 [Minimax] Parâmetros recebidos:', { 
      voice_id,
      voice_id_type: typeof voice_id,
      voice_id_length: voice_id ? voice_id.length : 0
    });

    if (!voice_id) {
      console.error('❌ [Minimax] voice_id é obrigatório');
      return new Response(
        JSON.stringify({ error: "voice_id é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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
    
    let responseText: string;
    try {
      responseText = await response.text();
      console.log('📄 [Minimax] Response body length:', responseText.length);
      console.log('📄 [Minimax] Response body (primeiros 1000 chars):', responseText.substring(0, 1000));
    } catch (textError) {
      console.error('❌ [Minimax] Erro ao ler response text:', textError);
      throw new Error('Erro ao ler resposta da API Minimax');
    }

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
      console.log('✅ [Minimax] JSON parse bem-sucedido, tipo:', typeof apiResponse, 'isArray:', Array.isArray(apiResponse));
    } catch (parseError) {
      console.error('❌ [Minimax] Erro ao fazer parse do JSON:', parseError);
      console.log('📄 [Minimax] Response text que falhou no parse (primeiros 2000 chars):', responseText.substring(0, 2000));
      throw new Error('Resposta da API não é um JSON válido');
    }
    
    // Verificar se é um array ou objeto único
    let responseArray: MinimaxApiResponse[];
    if (Array.isArray(apiResponse)) {
      responseArray = apiResponse;
    } else if (apiResponse && typeof apiResponse === 'object') {
      // Se for um objeto único, transformar em array
      responseArray = [apiResponse as MinimaxApiResponse];
    } else {
      console.error('❌ [Minimax] Formato de resposta inesperado:', typeof apiResponse);
      throw new Error('Formato de resposta da API inesperado');
    }
    
    console.log('📦 [Minimax] Resposta processada:', {
      originalType: typeof apiResponse,
      isOriginalArray: Array.isArray(apiResponse),
      processedLength: responseArray.length,
      firstItemKeys: responseArray[0] ? Object.keys(responseArray[0]) : 'N/A'
    });
    
    // Procurar a voz específica pelo voice_id
    let foundVoice: MinimaxVoiceResponse | null = null;
    console.log('🔍 [Minimax] Procurando voz com ID:', voice_id);
    
    let totalVoicesFound = 0;
    let allVoiceIds: string[] = [];
    
    for (const responseItem of responseArray) {
      console.log('🔍 [Minimax] Verificando item:', {
        hasSystemVoice: !!responseItem.system_voice,
        systemVoiceLength: responseItem.system_voice ? responseItem.system_voice.length : 0
      });
      if (responseItem.system_voice) {
        totalVoicesFound += responseItem.system_voice.length;
        
        // Log das primeiras 5 vozes para debug
        console.log('🔍 [Minimax] Primeiras 5 vozes neste item:', 
          responseItem.system_voice.slice(0, 5).map(v => ({ 
            voice_id: v.voice_id, 
            voice_name: v.voice_name 
          }))
        );
        
        // Coletar todos os voice_ids para debug
        allVoiceIds.push(...responseItem.system_voice.map(v => v.voice_id));
        
        // Buscar a voz específica
        foundVoice = responseItem.system_voice.find(voice => voice.voice_id === voice_id) || null;
        console.log('🔍 [Minimax] Voz encontrada neste item:', !!foundVoice);
        if (foundVoice) break;
      }
    }

    console.log('📊 [Minimax] Estatísticas da busca:', {
      totalVoicesInResponse: totalVoicesFound,
      searchingFor: voice_id,
      found: !!foundVoice,
      totalUniqueVoiceIds: allVoiceIds.length
    });

    if (!foundVoice) {
      console.error('❌ [Minimax] Voz não encontrada:', voice_id);
      console.log('📋 [Minimax] Vozes disponíveis (primeiras 20):', allVoiceIds.slice(0, 20));
      console.log('🔍 [Minimax] Procurando por voice_ids que contenham "English_Captivating":', 
        allVoiceIds.filter(id => id.toLowerCase().includes('english_captivating') || id.toLowerCase().includes('captivating'))
      );
      return new Response(
        JSON.stringify({ 
          error: `Voz com ID '${voice_id}' não encontrada na plataforma Minimax`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('🔍 [Minimax] Voz encontrada:', {
      voice_id: foundVoice.voice_id,
      voice_name: foundVoice.voice_name,
      description: foundVoice.description
    });

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

    const detectedLanguage = detectLanguage(foundVoice.voice_id);
    const detectedGender = detectGender(foundVoice.description);
    
    console.log('🔍 [Minimax] Detecções:', {
      language: detectedLanguage,
      gender: detectedGender
    });

    // Processar dados para formato padronizado
    const processedData: ProcessedVoiceData = {
      voice_id: foundVoice.voice_id,
      nome_voz: foundVoice.voice_name,
      plataforma: 'Minimax',
      idioma: detectedLanguage,
      genero: detectedGender,
      preview_url: '', // Minimax não fornece preview_url diretamente
      description: foundVoice.description.join(' '),
      created_time: foundVoice.created_time
    };

    console.log('✅ [Minimax] Dados processados:', processedData);

    return new Response(
      JSON.stringify({
        success: true,
        data: processedData,
        raw_data: foundVoice // Para debug/análise adicional
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