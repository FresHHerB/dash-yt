// Environment configuration utilities
export const env = {
  // Supabase
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },

  // Webhook Configuration
  webhooks: {
    baseUrl: import.meta.env.VITE_WEBHOOK_BASE_URL || 'https://autodark-n8n.tmtibo.easypanel.host/',
    endpoints: {
      updatePrompts: import.meta.env.VITE_WEBHOOK_UPDATE_PROMPTS || '/webhook/updatePrompts',
      generateContent: import.meta.env.VITE_WEBHOOK_GENERATE_CONTENT || '/webhook/gerarConteudo',
      deleteScript: import.meta.env.VITE_WEBHOOK_DELETE_SCRIPT || '/webhook/excluirRoteiro',
      guideScript: import.meta.env.VITE_WEBHOOK_GUIDE_SCRIPT || '/webhook/guiaRoteiro',
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

// Helper functions to build complete URLs
export const buildWebhookUrl = (endpoint: keyof typeof env.webhooks.endpoints): string => {
  return `${env.webhooks.baseUrl}${env.webhooks.endpoints[endpoint]}`;
};

export const buildElevenLabsUrl = (path: string): string => {
  return `${env.apis.elevenlabs.baseUrl}${path}`;
};

export const buildFishAudioUrl = (path: string): string => {
  return `${env.apis.fishAudio.baseUrl}${path}`;
};