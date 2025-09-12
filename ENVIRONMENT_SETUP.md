# Configuração de Variáveis de Ambiente

Este projeto foi refatorado para usar variáveis de ambiente para todos os webhooks e credenciais de API, tornando o código mais seguro e flexível.

## Arquivos de Configuração

### `.env` e `.env.example`
Arquivos contendo todas as variáveis de ambiente necessárias para o projeto.

### `src/config/environment.ts`
Utilitário central para gerenciar todas as configurações de ambiente com fallbacks.

## Variáveis de Ambiente Necessárias

### Supabase
```bash
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### Webhooks N8N
```bash
VITE_WEBHOOK_BASE_URL=https://n8n-n8n.h5wo9n.easypanel.host
VITE_WEBHOOK_UPDATE_PROMPTS=/webhook/updatePrompts
VITE_WEBHOOK_GENERATE_CONTENT=/webhook/gerarConteudo  
VITE_WEBHOOK_DELETE_SCRIPT=/webhook/excluirRoteiro
VITE_WEBHOOK_GUIDE_SCRIPT=/webhook/guiaRoteiro
```

### APIs Externas
```bash
VITE_ELEVENLABS_API_URL=https://api.elevenlabs.io/v1
VITE_FISH_AUDIO_API_URL=https://api.fish.audio
```

## Como Configurar

1. **Copie o arquivo de exemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Edite o arquivo `.env`** com suas credenciais reais:
   - Substitua `your_supabase_url_here` pela URL do seu projeto Supabase
   - Substitua `your_supabase_anon_key_here` pela chave anônima do Supabase
   - Ajuste as URLs dos webhooks conforme necessário

3. **Para desenvolvimento local:**
   ```bash
   npm run dev
   ```

4. **Para build de produção:**
   ```bash
   npm run build
   ```

## Estrutura de Refatoração

### Antes (hardcoded):
```javascript
const response = await fetch('https://n8n-n8n.h5wo9n.easypanel.host/webhook/gerarConteudo', {
  // ...
});
```

### Depois (usando variáveis de ambiente):
```javascript
import { buildWebhookUrl } from '../config/environment';

const response = await fetch(buildWebhookUrl('generateContent'), {
  // ...
});
```

## Arquivos Modificados

### Componentes Refatorados:
- `src/components/ScriptGenerationPage.tsx`
- `src/components/PromptManagementPage.tsx`  
- `src/components/GeneratedScriptsPage.tsx`
- `src/components/TrainingPage.tsx`
- `src/components/SettingsPage.tsx`

### Bibliotecas Refatoradas:
- `src/lib/supabase.ts`
- `src/lib/audioApiService.ts`

### Novos Arquivos:
- `src/config/environment.ts` - Configuração centralizada
- `.env.example` - Modelo de variáveis de ambiente
- `.env` - Arquivo de configuração local

## Funções Utilitárias

### `buildWebhookUrl(endpoint)`
Constrói URLs completas para webhooks N8N:
```javascript
buildWebhookUrl('generateContent') 
// → https://n8n-n8n.h5wo9n.easypanel.host/webhook/gerarConteudo
```

### `buildElevenLabsUrl(path)`
Constrói URLs para API ElevenLabs:
```javascript
buildElevenLabsUrl('/voices/abc123')
// → https://api.elevenlabs.io/v1/voices/abc123
```

### `buildFishAudioUrl(path)`
Constrói URLs para API Fish Audio:
```javascript
buildFishAudioUrl('/model/xyz789')
// → https://api.fish.audio/model/xyz789
```

## Segurança

- ✅ Webhooks removidos do código-fonte
- ✅ Credenciais Supabase centralizadas
- ✅ URLs de APIs configuráveis
- ✅ Fallbacks seguros implementados
- ✅ Arquivo `.env` deve ser adicionado ao `.gitignore`

## Deploy

### Easypanel (Recomendado)
Este projeto está otimizado para deploy no Easypanel. Consulte `EASYPANEL_DEPLOYMENT.md` para instruções detalhadas.

### Outras Plataformas
Para deploy em outras plataformas (Vercel, Netlify, Docker, etc.), configure as variáveis de ambiente usando os mesmos nomes das variáveis listadas acima.