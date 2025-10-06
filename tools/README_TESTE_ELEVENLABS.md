# Teste de Voz ElevenLabs - Chamada Direta vs Edge Function

Este diretório contém scripts para testar a funcionalidade de preview de voz da ElevenLabs, comparando a chamada direta à API com a Edge Function (fallback).

## 📋 Pré-requisitos

- **curl** instalado no sistema
- **API Key da ElevenLabs** válida
- Acesso à internet

## 🎯 O que os testes verificam

1. **Chamada Direta**: Testa se a chamada direta à API ElevenLabs (`https://api.elevenlabs.io/v1/voices/{voice_id}`) funciona corretamente
2. **Edge Function (Fallback)**: Testa se a Edge Function do Supabase (`fetch-elevenlabs-voice`) funciona como fallback

## 🚀 Como executar

### No Windows:

```cmd
cd tools
test-elevenlabs-voice.bat
```

Quando solicitado, digite sua API Key da ElevenLabs.

### No Linux/Mac:

```bash
cd tools
chmod +x test-elevenlabs-voice.sh
./test-elevenlabs-voice.sh
```

Quando solicitado, digite sua API Key da ElevenLabs.

## 📊 Resultados esperados

### ✅ Sucesso (Status Code 200):

Ambos os testes devem retornar:
- Status Code: 200
- Preview URL da voz
- Nome da voz

**Exemplo de preview_url:**
```
https://storage.googleapis.com/eleven-public-prod/...
```

### ❌ Falha:

Se algum teste falhar, verifique:
- API Key válida
- Voice ID correto
- Conectividade com a internet
- Edge Functions do Supabase estão deployadas

## 🔧 Customização

Você pode alterar o `VOICE_ID` nos scripts para testar outras vozes:

**Vozes públicas da ElevenLabs:**
- Rachel: `21m00Tcm4TlvDq8ikWAM`
- Drew: `29vD33N1CtxCmqQRPOHJ`
- Clyde: `2EiwWnXFnvU5JabPnv8n`
- Paul: `5Q0t7uMcjvnagumLfvZi`

## 📝 Arquivos gerados (apenas Windows)

Os testes no Windows salvam as respostas em arquivos JSON:
- `direct-response.json` - Resposta da chamada direta
- `edge-response.json` - Resposta da Edge Function

## 🧪 Teste manual com curl

### Teste direto:
```bash
curl -X GET "https://api.elevenlabs.io/v1/voices/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: SUA_API_KEY" \
  -H "Content-Type: application/json"
```

### Teste Edge Function:
```bash
curl -X POST "http://kahgsejjathheszefbuk.supabase.co/functions/v1/fetch-elevenlabs-voice" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthaGdzZWpqYXRoaGVzemVmYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTIzNTgsImV4cCI6MjA3MjE2ODM1OH0.-Xsm6zoJx0l2zsnn8OREUzk_Ee1tiFBjRFbXUG4T6Bs" \
  -H "Content-Type: application/json" \
  -d '{"voice_id":"21m00Tcm4TlvDq8ikWAM","api_key":"SUA_API_KEY"}'
```

## 🔍 Análise dos resultados

### Chamada Direta - Estrutura da resposta:
```json
{
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "name": "Rachel",
  "description": "...",
  "preview_url": "https://storage.googleapis.com/...",
  "labels": {
    "language": "en",
    "gender": "female"
  },
  "settings": { ... }
}
```

### Edge Function - Estrutura da resposta:
```json
{
  "success": true,
  "data": {
    "voice_id": "21m00Tcm4TlvDq8ikWAM",
    "nome_voz": "Rachel",
    "plataforma": "ElevenLabs",
    "idioma": "Inglês",
    "genero": "Feminino",
    "preview_url": "https://storage.googleapis.com/...",
    "description": "...",
    ...
  },
  "raw_data": { ... }
}
```

## 🎵 Implementação no código

A implementação com fallback segue este padrão:

```typescript
try {
  // 1. Tentar chamada direta (mais rápida)
  const directResponse = await fetch(`${ELEVENLABS_API_URL}/voices/${voice_id}`, {
    headers: { 'xi-api-key': apiKey }
  });

  if (directResponse.ok) {
    const data = await directResponse.json();
    return data.preview_url;
  }
  throw new Error('Direct call failed');

} catch (error) {
  // 2. Fallback para Edge Function (contorna CORS)
  const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-elevenlabs-voice`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ voice_id, api_key: apiKey })
  });

  const result = await response.json();
  return result.data.preview_url;
}
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique se a API Key está correta
2. Verifique se as Edge Functions estão deployadas no Supabase
3. Verifique os logs do console no navegador
4. Consulte a documentação da ElevenLabs: https://elevenlabs.io/docs/api-reference
