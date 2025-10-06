@echo off
REM Teste de Voz ElevenLabs - Chamada Direta vs Edge Function
REM ============================================================

echo === Teste de Voz ElevenLabs ===
echo.

REM Configuracoes
set SUPABASE_URL=http://kahgsejjathheszefbuk.supabase.co
set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthaGdzZWpqYXRoaGVzemVmYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTIzNTgsImV4cCI6MjA3MjE2ODM1OH0.-Xsm6zoJx0l2zsnn8OREUzk_Ee1tiFBjRFbXUG4T6Bs
set ELEVENLABS_API_URL=https://api.elevenlabs.io/v1

REM Voice ID de exemplo da ElevenLabs (Rachel - voz publica)
set VOICE_ID=21m00Tcm4TlvDq8ikWAM

REM Pedir API Key ao usuario
set /p API_KEY="Digite sua API Key da ElevenLabs: "

if "%API_KEY%"=="" (
    echo [ERRO] API Key nao fornecida. Encerrando.
    exit /b 1
)

echo.
echo =============================================================================
echo TESTE 1: Chamada Direta a API ElevenLabs
echo =============================================================================
echo URL: %ELEVENLABS_API_URL%/voices/%VOICE_ID%
echo.

curl -X GET "%ELEVENLABS_API_URL%/voices/%VOICE_ID%" ^
  -H "xi-api-key: %API_KEY%" ^
  -H "Content-Type: application/json" ^
  -o direct-response.json -w "\nStatus Code: %%{http_code}\n"

echo.
echo Resposta salva em: direct-response.json
echo.

echo =============================================================================
echo TESTE 2: Edge Function (Fallback)
echo =============================================================================
echo URL: %SUPABASE_URL%/functions/v1/fetch-elevenlabs-voice
echo.

curl -X POST "%SUPABASE_URL%/functions/v1/fetch-elevenlabs-voice" ^
  -H "Authorization: Bearer %SUPABASE_ANON_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"voice_id\":\"%VOICE_ID%\",\"api_key\":\"%API_KEY%\"}" ^
  -o edge-response.json -w "\nStatus Code: %%{http_code}\n"

echo.
echo Resposta salva em: edge-response.json
echo.

echo =============================================================================
echo RESUMO
echo =============================================================================
echo.
echo Teste 1 (Direto): Verifique direct-response.json
echo Teste 2 (Edge Function): Verifique edge-response.json
echo.
echo Testes concluidos!
echo.

pause
