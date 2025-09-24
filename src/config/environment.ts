// Environment configuration utilities
export const env = {
  // Supabase
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },

  // Webhook Configuration
  webhooks: {
    baseUrl: import.meta.env.VITE_WEBHOOK_BASE_URL || '',
    endpoints: {
      updatePrompts: import.meta.env.VITE_WEBHOOK_UPDATE_PROMPTS || '/webhook/updatePrompts',
      trainChannel: import.meta.env.VITE_WEBHOOK_TRAIN_CHANNEL || '/webhook/guiaRoteiro',
      generateScript: import.meta.env.VITE_WEBHOOK_GENERATE_SCRIPT || '/webhook-test/gerarRoteiro',
      generateScriptAndAudio: import.meta.env.VITE_WEBHOOK_GENERATE_SCRIPT_AND_AUDIO || '/webhook/gerarRoteiroeAudio',
      generateAudio: import.meta.env.VITE_WEBHOOK_GENERATE_AUDIO || '/webhook/gerarAudio',
      deleteScript: import.meta.env.VITE_WEBHOOK_DELETE_SCRIPT || '/webhook/excluirRoteiro',
      guideScript: import.meta.env.VITE_WEBHOOK_GUIDE_SCRIPT || '/webhook/guiaRoteiro',
      updateContent: import.meta.env.VITE_WEBHOOK_UPDATE_CONTENT || '/webhook-test/atualizarConteudo',
      copyChannels: import.meta.env.VITE_WEBHOOK_COPY_CHANNELS || '/webhook/copiarCanal',
    }
  },

  // External APIs
  apis: {
    elevenlabs: {
      baseUrl: import.meta.env.VITE_ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1',
    },
    fishAudio: {
      baseUrl: import.meta.env.VITE_FISH_AUDIO_API_URL || 'https://api.fish.audio',
    }
  }
};

// Validation function to ensure all required environment variables are set
export const validateEnvironment = (): { isValid: boolean; missingVars: string[] } => {
  const requiredVars = [
    { key: 'VITE_SUPABASE_URL', value: env.supabase.url },
    { key: 'VITE_SUPABASE_ANON_KEY', value: env.supabase.anonKey },
    { key: 'VITE_WEBHOOK_BASE_URL', value: env.webhooks.baseUrl },
  ];

  const missingVars: string[] = [];

  requiredVars.forEach(({ key, value }) => {
    if (!value || value.trim() === '') {
      missingVars.push(key);
    } else if (key === 'VITE_SUPABASE_URL' || key === 'VITE_WEBHOOK_BASE_URL') {
      // Check if URL has proper protocol
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        missingVars.push(`${key} (missing protocol - must start with http:// or https://)`);
      }
    }
  });

  return {
    isValid: missingVars.length === 0,
    missingVars
  };
};

// Helper functions to build complete URLs
export const buildWebhookUrl = (endpoint: keyof typeof env.webhooks.endpoints): string => {
  if (!env.webhooks.baseUrl) {
    throw new Error('VITE_WEBHOOK_BASE_URL não está configurada no arquivo .env');
  }
  return `${env.webhooks.baseUrl}${env.webhooks.endpoints[endpoint]}`;
};

export const buildElevenLabsUrl = (path: string): string => {
  return `${env.apis.elevenlabs.baseUrl}${path}`;
};

export const buildFishAudioUrl = (path: string): string => {
  return `${env.apis.fishAudio.baseUrl}${path}`;
};