export interface User {
  id: number;
  user: string;
  password?: string;
  created_at: string;
  audio_file_path?: string;
}

export interface ScriptData {
  text: string;
  file: File | null;
  type: 'text' | 'file';
  title: string;
}

export interface TrainingData {
  channelName: string;
  scripts: {
    script1: ScriptData;
    script2: ScriptData;
    script3: ScriptData;
  };
  model: 'GPT-5' | 'GPT-4.1-mini' | 'Sonnet-4' | 'Gemini-2.5-Pro';
}