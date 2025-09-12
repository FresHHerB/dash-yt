# 🚀 Deploy no Easypanel

Este guia explica como fazer o deploy deste projeto no Easypanel usando GitHub como fonte.

## 📋 Pré-requisitos

1. Conta no Easypanel
2. Repositório no GitHub com este projeto
3. Credenciais do Supabase
4. URLs dos webhooks N8N configurados

## 🔧 Configuração no Easypanel

### 1. Criar Nova Aplicação
- Acesse seu painel do Easypanel
- Clique em "New App" → "GitHub"
- Selecione o repositório deste projeto
- Escolha o branch (geralmente `main`)

### 2. Configurar Build Settings
```
Framework: Vite
Build Command: npm run build
Output Directory: dist
Node Version: 18 ou superior
```

### 3. **IMPORTANTE: Configurar Environment Variables**

No Easypanel, vá em **Settings → Environment** e adicione as seguintes variáveis:

#### Supabase (OBRIGATÓRIAS)
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

#### Webhooks N8N (OBRIGATÓRIAS)
```
VITE_WEBHOOK_BASE_URL=https://seu-n8n.easypanel.host
VITE_WEBHOOK_UPDATE_PROMPTS=/webhook/updatePrompts
VITE_WEBHOOK_GENERATE_CONTENT=/webhook/gerarConteudo
VITE_WEBHOOK_DELETE_SCRIPT=/webhook/excluirRoteiro
VITE_WEBHOOK_GUIDE_SCRIPT=/webhook/guiaRoteiro
```

#### APIs Externas (OPCIONAIS - têm fallbacks)
```
VITE_ELEVENLABS_API_URL=https://api.elevenlabs.io/v1
VITE_FISH_AUDIO_API_URL=https://api.fish.audio
```

## 🔍 Exemplo de Configuração Completa

### Environment Variables no Easypanel:
```bash
# Supabase
VITE_SUPABASE_URL=https://bdifayjtmuqhdralavdo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# N8N Webhooks
VITE_WEBHOOK_BASE_URL=https://autodark-n8n.tmtibo.easypanel.host
VITE_WEBHOOK_UPDATE_PROMPTS=/webhook/updatePrompts
VITE_WEBHOOK_GENERATE_CONTENT=/webhook/gerarConteudo
VITE_WEBHOOK_DELETE_SCRIPT=/webhook/excluirRoteiro
VITE_WEBHOOK_GUIDE_SCRIPT=/webhook/guiaRoteiro

# APIs Externas (opcionais)
VITE_ELEVENLABS_API_URL=https://api.elevenlabs.io/v1
VITE_FISH_AUDIO_API_URL=https://api.fish.audio
```

## 🚨 Pontos Importantes

### ⚠️ NÃO commitar o arquivo `.env`
- O arquivo `.env` está no `.gitignore`
- As variáveis devem ser configuradas diretamente no Easypanel
- Nunca exponha credenciais no código fonte

### ✅ Verificação de Deploy
Após o deploy, verifique no console do navegador se as URLs estão corretas:
1. Abra F12 → Console
2. Acesse a aplicação
3. Ao fazer login ou usar funcionalidades, verifique se os webhooks estão sendo chamados para as URLs corretas

### 🔄 Atualizações
- Qualquer push no branch configurado fará redeploy automático
- Para alterar variáveis, use o painel do Easypanel (não precisa redeploy)
- Para alterações no código, basta fazer commit/push

## 🐛 Solução de Problemas

### Problema: Webhooks ainda apontam para URLs antigas
**Solução:**
1. Verifique se as variáveis estão configuradas no Easypanel
2. Force um novo deploy (rebuild)
3. Limpe o cache do navegador

### Problema: Erro de autenticação Supabase
**Solução:**
1. Verifique se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretas
2. Confirme se as credenciais são do projeto correto

### Problema: Build falha
**Solução:**
1. Verifique se todas as variáveis OBRIGATÓRIAS estão definidas
2. Use Node 18 ou superior
3. Verifique os logs de build no Easypanel

## 📁 Estrutura do Projeto

```
├── src/
│   ├── config/
│   │   └── environment.ts     # Configuração centralizada
│   ├── components/           # Componentes refatorados
│   └── lib/                 # Bibliotecas (supabase, etc)
├── .env.example             # Modelo de variáveis
├── .gitignore              # .env está excluído
└── EASYPANEL_DEPLOYMENT.md # Este arquivo
```

## ✅ Checklist de Deploy

- [ ] Repositório no GitHub atualizado
- [ ] App criada no Easypanel
- [ ] Build settings configurados
- [ ] Todas as environment variables definidas
- [ ] Deploy executado com sucesso
- [ ] Aplicação funcionando (URLs corretas nos webhooks)
- [ ] Supabase conectado corretamente