import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { buildWebhookUrl } from '../config/environment';
import { 
  BookOpen, 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { PageType } from '../App';
import PageHeader from './shared/PageHeader';

interface ScriptData {
  title: string;
  thumbText: string;
  text: string;
  file: File | null;
  type: 'text' | 'file';
}

interface TrainingData {
  channelName: string;
  scripts: ScriptData[];
  model: 'GPT-5' | 'GPT-4.1-mini' | 'Sonnet-4' | 'Gemini-2.5-Pro';
}

interface TrainingPageProps {
  user: any;
  onBack: () => void;
  onNavigate?: (page: PageType) => void;
}

const TrainingPage: React.FC<TrainingPageProps> = ({ user, onBack, onNavigate }) => {
  const [trainingData, setTrainingData] = useState<TrainingData>({
    channelName: '',
    scripts: [
      { title: '', thumbText: '', text: '', file: null, type: 'text' }
    ],
    model: 'GPT-4.1-mini'
  });

  const [isTraining, setIsTraining] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const { data, error } = await supabase
        .from('canais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar canais:', error);
      } else {
        setChannels(data || []);
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const addScript = () => {
    setTrainingData(prev => ({
      ...prev,
      scripts: [
        ...prev.scripts,
        { title: '', thumbText: '', text: '', file: null, type: 'text' }
      ]
    }));
  };

  const removeScript = (index: number) => {
    if (trainingData.scripts.length <= 1) return;
    
    setTrainingData(prev => ({
      ...prev,
      scripts: prev.scripts.filter((_, i) => i !== index)
    }));
  };

  const updateScriptByIndex = (index: number, data: Partial<ScriptData>) => {
    setTrainingData(prev => ({
      ...prev,
      scripts: prev.scripts.map((script, i) => 
        i === index ? { ...script, ...data } : script
      )
    }));
  };

  const handleFileUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      updateScriptByIndex(index, {
        file,
        text: content,
        type: 'file'
      });
    };
    reader.readAsText(file);
  };

  const validateForm = () => {
    if (!trainingData.channelName.trim()) {
      setMessage({ type: 'error', text: 'Nome do canal é obrigatório.' });
      return false;
    }

    const hasValidScript = trainingData.scripts.some(script => 
      script.text.trim().length > 0
    );

    if (!hasValidScript) {
      setMessage({ type: 'error', text: 'Pelo menos um roteiro deve ter conteúdo.' });
      return false;
    }

    return true;
  };

  const handleTraining = async () => {
    if (!validateForm()) return;

    setIsTraining(true);
    setMessage(null);

    try {
      // Construir payload dinamicamente
      const payload: any = {
        nome_canal: trainingData.channelName,
        modelo: trainingData.model
      };

      // Adicionar roteiros dinamicamente
      trainingData.scripts.forEach((script, index) => {
        if (script.text.trim()) {
          payload[`titulo_${index + 1}`] = script.title || `Roteiro ${index + 1}`;
          payload[`text_thumb_${index + 1}`] = script.thumbText || '';
          payload[`roteiro_${index + 1}`] = script.text;
        }
      });

      console.log('📤 Enviando dados de treinamento:', payload);

      const response = await fetch(buildWebhookUrl('generateContent'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Treinamento concluído:', result);
        
        setMessage({ type: 'success', text: 'Canal treinado com sucesso!' });
        
        // Limpar formulário
        setTrainingData({
          channelName: '',
          scripts: [
            { title: '', thumbText: '', text: '', file: null, type: 'text' }
          ],
          model: 'GPT-4.1-mini'
        });
        
        // Recarregar lista de canais
        loadChannels();
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erro no treinamento:', error);
      setMessage({ type: 'error', text: 'Erro ao treinar canal. Tente novamente.' });
    } finally {
      setIsTraining(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChannelColor = (id: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500', 
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500',
      'bg-violet-500'
    ];
    return colors[id % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <PageHeader
        user={user}
        currentPage="training"
        onBack={onBack}
        onNavigate={onNavigate}
        onRefresh={loadChannels}
        isRefreshing={isLoadingChannels}
      />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-12">
        {message && (
          <div className={`max-w-md mx-auto mb-8 p-4 rounded-xl text-center border ${
            message.type === 'success' 
              ? 'bg-green-900/20 text-green-400 border-green-800' 
              : 'bg-red-900/20 text-red-400 border-red-800'
          }`}>
            <div className="flex items-center justify-center space-x-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Training Form */}
          <div className="space-y-8">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white">Treinar Novo Canal</h2>
                  <p className="text-gray-400">Configure um canal com roteiros de exemplo</p>
                </div>
              </div>

              {/* Channel Name */}
              <div className="space-y-2 mb-6">
                <label className="block text-sm font-medium text-gray-300">
                  Nome do Canal
                </label>
                <input
                  type="text"
                  value={trainingData.channelName}
                  onChange={(e) => setTrainingData(prev => ({ ...prev, channelName: e.target.value }))}
                  placeholder="Digite o nome do canal..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Model Selection */}
              <div className="space-y-2 mb-8">
                <label className="block text-sm font-medium text-gray-300">
                  Modelo de IA
                </label>
                <select
                  value={trainingData.model}
                  onChange={(e) => setTrainingData(prev => ({ ...prev, model: e.target.value as TrainingData['model'] }))}
                  className="w-full p-4 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                >
                  <option value="GPT-4.1-mini">GPT-4.1-mini</option>
                  <option value="GPT-5">GPT-5</option>
                  <option value="Sonnet-4">Sonnet-4</option>
                  <option value="Gemini-2.5-Pro">Gemini-2.5-Pro</option>
                </select>
              </div>

              {/* Scripts Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Roteiros de Exemplo</h3>
                  <span className="text-sm text-gray-400">{trainingData.scripts.length} roteiro(s)</span>
                </div>

                {/* Scripts List */}
                <div className="space-y-6">
                  {trainingData.scripts.map((script, index) => (
                    <div key={index} className="bg-black/50 border border-gray-700 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-medium">Roteiro {index + 1}</h4>
                        {trainingData.scripts.length > 1 && (
                          <button
                            onClick={() => removeScript(index)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-200"
                            title="Remover roteiro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Title */}
                      <div className="space-y-2 mb-4">
                        <label className="block text-sm font-medium text-gray-300">
                          Título
                        </label>
                        <input
                          type="text"
                          value={script.title}
                          onChange={(e) => updateScriptByIndex(index, { title: e.target.value })}
                          placeholder="Título do roteiro..."
                          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                        />
                      </div>

                      {/* Thumb Text */}
                      <div className="space-y-2 mb-4">
                        <label className="block text-sm font-medium text-gray-300">
                          Texto da Thumb
                        </label>
                        <input
                          type="text"
                          value={script.thumbText}
                          onChange={(e) => updateScriptByIndex(index, { thumbText: e.target.value })}
                          placeholder="Texto que aparece na thumbnail..."
                          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                        />
                      </div>

                      {/* Content Type Toggle */}
                      <div className="flex items-center space-x-4 mb-4">
                        <button
                          onClick={() => updateScriptByIndex(index, { type: 'text', file: null })}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                            script.type === 'text'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>Texto</span>
                        </button>
                        <button
                          onClick={() => updateScriptByIndex(index, { type: 'file' })}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                            script.type === 'file'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <Upload className="w-4 h-4" />
                          <span>Arquivo</span>
                        </button>
                      </div>

                      {/* Content Input */}
                      {script.type === 'text' ? (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Conteúdo do Roteiro
                          </label>
                          <textarea
                            value={script.text}
                            onChange={(e) => updateScriptByIndex(index, { text: e.target.value })}
                            rows={8}
                            placeholder="Cole ou digite o conteúdo do roteiro aqui..."
                            className="w-full p-4 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 resize-none"
                          />
                          <div className="text-xs text-gray-400">
                            {script.text.length.toLocaleString()} caracteres
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Upload de Arquivo
                          </label>
                          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                            <input
                              type="file"
                              accept=".txt,.md"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(index, file);
                              }}
                              className="hidden"
                              id={`file-upload-${index}`}
                            />
                            <label htmlFor={`file-upload-${index}`} className="cursor-pointer">
                              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-400">
                                {script.file ? script.file.name : 'Clique para selecionar um arquivo'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Formatos suportados: .txt, .md
                              </p>
                            </label>
                          </div>
                          {script.text && (
                            <div className="text-xs text-gray-400">
                              {script.text.length.toLocaleString()} caracteres carregados
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Script Button */}
                <button
                  onClick={addScript}
                  className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  <span>Adicionar Roteiro</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleTraining}
                disabled={isTraining}
                className={`
                  w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-xl font-medium transition-all duration-200 mt-8
                  ${isTraining
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                  }
                `}
              >
                {isTraining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Treinando Canal...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-5 h-5" />
                    <span>Treinar Canal</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Existing Channels */}
          <div className="space-y-8">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <h2 className="text-2xl font-light text-white mb-6">Canais Treinados</h2>
              
              {isLoadingChannels ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Carregando canais...</span>
                  </div>
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Nenhum canal treinado</h3>
                  <p className="text-gray-400">Treine seu primeiro canal para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="bg-black/50 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getChannelColor(channel.id)}`}>
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{channel.nome_canal}</h3>
                            <p className="text-sm text-gray-400">
                              Criado em {formatDate(channel.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {channel.id}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;