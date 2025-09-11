import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Função para criar timeout com AbortController
function createTimeoutController(timeoutMs: number = 30000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)
  
  return { controller, timeoutId }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    console.log('🚀 Edge Function iniciada')
    
    const requestBody = await req.json()
    console.log('📥 Request body recebido:', requestBody)
    
    const { audioUrl, fileName, platformApiKey, platform } = requestBody
    
    if (!audioUrl || !fileName) {
      console.error('❌ Parâmetros obrigatórios ausentes')
      return new Response(
        JSON.stringify({ error: "audioUrl e fileName são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    console.log('🔄 Iniciando download de:', audioUrl)
    console.log('🎯 Plataforma:', platform)
    console.log('🔑 API Key presente:', !!platformApiKey)
    
    // Configura headers para download baseado na plataforma
    const downloadHeaders: HeadersInit = {
      'Accept': 'audio/mpeg, audio/mp3, audio/wav, audio/*',
      'User-Agent': 'Mozilla/5.0 (compatible; SupabaseEdgeFunction/1.0)'
    }
    
    if (platformApiKey && platform) {
      if (platform === 'ElevenLabs') {
        downloadHeaders['xi-api-key'] = platformApiKey
      } else if (platform === 'Fish-Audio') {
        downloadHeaders['Authorization'] = `Bearer ${platformApiKey}`
      }
    }

    console.log('📡 Headers configurados para', platform)

    // Criar timeout controller para o download
    const { controller, timeoutId } = createTimeoutController(30000) // 30 segundos

    try {
      // 1. Backend baixa o áudio da URL original com timeout
      console.log('📡 Iniciando fetch com timeout de 30s...')
      const response = await fetch(audioUrl, { 
        method: 'GET',
        headers: downloadHeaders,
        signal: controller.signal
      })
      
      // Limpar timeout se fetch foi bem-sucedido
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.error('❌ Falha no download:', response.status, response.statusText)
        return new Response(
          JSON.stringify({ 
            error: `Falha ao baixar o áudio: ${response.status} ${response.statusText}`,
            details: `URL: ${audioUrl}, Status: ${response.status}`
          }),
          {
            status: response.status >= 400 && response.status < 500 ? response.status : 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }
      
      console.log('✅ Download response OK, convertendo para ArrayBuffer...')
      const audioBlob = await response.arrayBuffer()
      console.log('📁 Download concluído, tamanho:', audioBlob.byteLength, 'bytes')
      
      if (audioBlob.byteLength === 0) {
        throw new Error('Arquivo de áudio vazio recebido')
      }
      
      // 2. Backend faz upload para o Supabase Storage
      console.log('☁️ Iniciando upload para Supabase Storage...')
      const supabaseAdminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { data, error } = await supabaseAdminClient.storage
        .from('audios')
        .upload(fileName, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: false,
        })

      if (error) {
        console.error('❌ Erro no upload:', error)
        throw new Error(`Erro no upload: ${error.message}`)
      }

      console.log('✅ Upload para bucket bem-sucedido:', data.path)

      // 3. Obtém a URL pública do arquivo no bucket
      const { data: { publicUrl } } = supabaseAdminClient.storage
        .from('audios')
        .getPublicUrl(data.path)

      console.log('🔗 URL pública gerada:', publicUrl)

      // 4. Retorna a nova URL para o frontend
      return new Response(
        JSON.stringify({ 
          success: true,
          publicUrl: publicUrl, 
          filePath: data.path,
          originalSize: audioBlob.byteLength
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
      
    } catch (fetchError) {
      // Limpar timeout em caso de erro
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('⏰ Timeout no download do áudio')
        return new Response(
          JSON.stringify({ 
            error: "Timeout ao baixar o áudio - a requisição demorou mais de 30 segundos",
            code: "DOWNLOAD_TIMEOUT"
          }),
          {
            status: 408, // Request Timeout
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }
      
      throw fetchError // Re-throw outros erros
    }
    
  } catch (error) {
    console.error('💥 Erro geral no proxy:', error)
    
    let errorMessage = 'Erro interno do servidor'
    let statusCode = 500
    
    if (error.message) {
      errorMessage = error.message
    }
    
    // Tratar diferentes tipos de erro
    if (error.message?.includes('Timeout')) {
      statusCode = 408
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      statusCode = 502
      errorMessage = 'Erro de rede ao acessar o áudio'
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})