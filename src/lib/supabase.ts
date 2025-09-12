import { createClient } from '@supabase/supabase-js';
import { env, validateEnvironment } from '../config/environment';

console.log('🔧 [SUPABASE] Inicializando cliente...');

// Validar variáveis de ambiente
const envValidation = validateEnvironment();
if (!envValidation.isValid) {
  console.error('❌ [SUPABASE] ERRO CRÍTICO: Variáveis de ambiente obrigatórias não configuradas!');
  console.error('❌ [SUPABASE] Variáveis ausentes:', envValidation.missingVars);
  throw new Error(`Configuração incompleta. Variáveis ausentes: ${envValidation.missingVars.join(', ')}`);
}

// Verificar variáveis de ambiente
const supabaseUrl = env.supabase.url;
const supabaseAnonKey = env.supabase.anonKey;

console.log('🔍 [SUPABASE] URL presente:', !!supabaseUrl);
console.log('🔍 [SUPABASE] Anon Key presente:', !!supabaseAnonKey);
console.log('🔍 [SUPABASE] Webhook Base URL presente:', !!env.webhooks.baseUrl);

// Criar cliente Supabase
console.log('✅ [SUPABASE] Criando cliente Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

console.log('✅ [SUPABASE] Cliente Supabase criado com sucesso!');

export { supabase };