import { createClient } from '@supabase/supabase-js';
import { env } from '../config/environment';

console.log('🔧 [SUPABASE] Inicializando cliente...');

// Verificar variáveis de ambiente
const supabaseUrl = env.supabase.url;
const supabaseAnonKey = env.supabase.anonKey;

console.log('🔍 [SUPABASE] URL presente:', !!supabaseUrl);
console.log('🔍 [SUPABASE] Anon Key presente:', !!supabaseAnonKey);

// Validar variáveis de ambiente obrigatórias
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ [SUPABASE] ERRO CRÍTICO: Variáveis de ambiente do Supabase não configuradas!');
  console.error('❌ [SUPABASE] Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas');
  throw new Error('Configuração do Supabase não encontrada. Verifique as variáveis de ambiente.');
}

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