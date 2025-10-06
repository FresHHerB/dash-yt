#!/bin/bash

# Teste de Voz ElevenLabs - Chamada Direta vs Edge Function
# ============================================================

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Teste de Voz ElevenLabs ===${NC}\n"

# Configurações
SUPABASE_URL="http://kahgsejjathheszefbuk.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthaGdzZWpqYXRoaGVzemVmYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTIzNTgsImV4cCI6MjA3MjE2ODM1OH0.-Xsm6zoJx0l2zsnn8OREUzk_Ee1tiFBjRFbXUG4T6Bs"
ELEVENLABS_API_URL="https://api.elevenlabs.io/v1"

# Voice ID de exemplo da ElevenLabs (Rachel - voz pública)
VOICE_ID="21m00Tcm4TlvDq8ikWAM"

# Pedir API Key ao usuário
echo -e "${YELLOW}Digite sua API Key da ElevenLabs:${NC}"
read -s API_KEY
echo ""

if [ -z "$API_KEY" ]; then
  echo -e "${RED}❌ API Key não fornecida. Encerrando.${NC}"
  exit 1
fi

# =============================================================================
# TESTE 1: Chamada Direta à API ElevenLabs
# =============================================================================
echo -e "\n${YELLOW}📞 TESTE 1: Chamada Direta à API ElevenLabs${NC}"
echo -e "URL: ${ELEVENLABS_API_URL}/voices/${VOICE_ID}\n"

DIRECT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET "${ELEVENLABS_API_URL}/voices/${VOICE_ID}" \
  -H "xi-api-key: ${API_KEY}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$DIRECT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$DIRECT_RESPONSE" | sed '$d')

echo -e "Status Code: ${HTTP_CODE}"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Chamada direta SUCESSO${NC}"

  # Extrair preview_url usando grep/sed
  PREVIEW_URL=$(echo "$RESPONSE_BODY" | grep -o '"preview_url":"[^"]*"' | sed 's/"preview_url":"\([^"]*\)"/\1/')

  if [ -n "$PREVIEW_URL" ]; then
    echo -e "${GREEN}✅ Preview URL encontrada:${NC}"
    echo "$PREVIEW_URL"
  else
    echo -e "${RED}❌ Preview URL não encontrada${NC}"
  fi

  # Mostrar nome da voz
  VOICE_NAME=$(echo "$RESPONSE_BODY" | grep -o '"name":"[^"]*"' | head -n1 | sed 's/"name":"\([^"]*\)"/\1/')
  if [ -n "$VOICE_NAME" ]; then
    echo -e "${GREEN}Nome da voz: ${VOICE_NAME}${NC}"
  fi
else
  echo -e "${RED}❌ Chamada direta FALHOU${NC}"
  echo "Resposta:"
  echo "$RESPONSE_BODY" | head -c 500
fi

# =============================================================================
# TESTE 2: Edge Function (Fallback)
# =============================================================================
echo -e "\n${YELLOW}📡 TESTE 2: Edge Function (Fallback)${NC}"
echo -e "URL: ${SUPABASE_URL}/functions/v1/fetch-elevenlabs-voice\n"

EDGE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${SUPABASE_URL}/functions/v1/fetch-elevenlabs-voice" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"voice_id\":\"${VOICE_ID}\",\"api_key\":\"${API_KEY}\"}")

HTTP_CODE=$(echo "$EDGE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$EDGE_RESPONSE" | sed '$d')

echo -e "Status Code: ${HTTP_CODE}"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Edge Function SUCESSO${NC}"

  # Extrair preview_url do formato { success: true, data: { ... } }
  PREVIEW_URL=$(echo "$RESPONSE_BODY" | grep -o '"preview_url":"[^"]*"' | sed 's/"preview_url":"\([^"]*\)"/\1/')

  if [ -n "$PREVIEW_URL" ]; then
    echo -e "${GREEN}✅ Preview URL encontrada:${NC}"
    echo "$PREVIEW_URL"
  else
    echo -e "${RED}❌ Preview URL não encontrada${NC}"
  fi

  # Mostrar nome da voz
  VOICE_NAME=$(echo "$RESPONSE_BODY" | grep -o '"nome_voz":"[^"]*"' | sed 's/"nome_voz":"\([^"]*\)"/\1/')
  if [ -n "$VOICE_NAME" ]; then
    echo -e "${GREEN}Nome da voz: ${VOICE_NAME}${NC}"
  fi
else
  echo -e "${RED}❌ Edge Function FALHOU${NC}"
  echo "Resposta:"
  echo "$RESPONSE_BODY" | head -c 500
fi

# =============================================================================
# COMPARAÇÃO
# =============================================================================
echo -e "\n${YELLOW}=== RESUMO ===${NC}"
echo -e "Teste 1 (Direto): ${HTTP_CODE}"
echo -e "Teste 2 (Edge Function): ${HTTP_CODE}"
echo -e "\n${GREEN}Testes concluídos!${NC}\n"
