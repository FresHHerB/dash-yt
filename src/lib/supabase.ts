import { createClient } from '@supabase/supabase-js';
import { env } from '../config/environment';

console.log('🔧 [SUPABASE] Inicializando cliente...');

// Verificar variáveis de ambiente
const supabaseUrl = env.supabase.url;
const supabaseAnonKey = env.supabase.anonKey;

console.log('🔍 [SUPABASE] URL presente:', !!supabaseUrl);
console.log('🔍 [SUPABASE] Anon Key presente:', !!supabaseAnonKey);

// Criar cliente mock para desenvolvimento
const createMockClient = () => {
  console.log('🔧 [SUPABASE] Criando cliente mock...');
  return {
    auth: {
      getSession: () => {
        console.log('🔍 [SUPABASE MOCK] getSession chamado');
        return Promise.resolve({ 
          data: { session: null }, 
          error: null 
        });
      },
      signInWithPassword: (credentials: any) => {
        console.log('🔑 [SUPABASE MOCK] signInWithPassword chamado:', credentials.email);
        return Promise.resolve({ 
          data: { user: null }, 
          error: { message: 'Supabase não configurado - usando modo mock' } 
        });
      },
      signOut: () => {
        console.log('👋 [SUPABASE MOCK] signOut chamado');
        return Promise.resolve({ error: null });
      },
      onAuthStateChange: (callback: any) => {
        console.log('👂 [SUPABASE MOCK] onAuthStateChange configurado');
        return { 
          data: { 
            subscription: { 
              unsubscribe: () => {
                console.log('🧹 [SUPABASE MOCK] Subscription cancelada');
              } 
            } 
          } 
        };
      }
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        count: 'exact',
        head: true,
        eq: () => Promise.resolve({ data: [], error: null, count: 0 }),
        single: () => Promise.resolve({ data: null, error: null }),
        order: () => Promise.resolve({ data: [], error: null })
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null })
    })
  };
};

// Criar cliente real ou mock
let supabase: any;

if (supabaseUrl && supabaseAnonKey) {
  try {
    console.log('✅ [SUPABASE] Criando cliente real...');
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ [SUPABASE] Cliente real criado com sucesso!');
  } catch (error) {
    console.error('❌ [SUPABASE] Erro ao criar cliente real:', error);
    supabase = createMockClient();
  }
} else {
  console.warn('⚠️ [SUPABASE] Variáveis de ambiente não encontradas, usando cliente mock');
  supabase = createMockClient();
}

export { supabase };