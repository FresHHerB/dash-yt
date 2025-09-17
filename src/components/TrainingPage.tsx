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
  model: 'GPT-5' | 'GPT-4.1-mini' | 'Sonnet-4' | 'Gemini-2.5-Pro' | 'Gemini-2.5-Flash';
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
  const [draggedOver, setDraggedOver] = useState<number | null>(null);

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
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      updateScriptByIndex(index, {
        file,
        text: content,
        type: 'text', // Always set to text so content is editable
        title: fileName // Auto-fill title with filename
      });
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedOver(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedOver(null);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        handleFileUpload(index, file);
      } else {
        setMessage({ type: 'error', text: 'Apenas arquivos .txt e .md são suportados.' });
      }
    }
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
      // Verificar se as variáveis de ambiente estão configuradas
      const webhookUrl = buildWebhookUrl('trainChannel');
      console.log('🔗 [TRAINING] URL do webhook:', webhookUrl);
      
      if (!webhookUrl || webhookUrl.includes('undefined')) {
        throw new Error('URL do webhook não está configurada corretamente. Verifique as variáveis de ambiente VITE_WEBHOOK_BASE_URL e VITE_WEBHOOK_GENERATE_CONTENT no arquivo .env');
      }

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

      let response;
      try {
        response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          // Adicionar timeout para evitar travamento
          signal: AbortSignal.timeout(30000) // 30 segundos
        });
      } catch (fetchError) {
        console.error('❌ [TRAINING] Erro de conectividade:', fetchError);
        
        if (fetchError.name === 'TimeoutError') {
          throw new Error('Timeout: O serviço N8N não respondeu em 30 segundos. Verifique se o serviço está rodando.');
        } else if (fetchError.message.includes('Failed to fetch')) {
          throw new Error(`Não foi possível conectar ao serviço N8N. Verifique se:\n• O serviço N8N está rodando\n• A URL está correta: ${webhookUrl}\n• Não há bloqueios de firewall ou proxy`);
        } else {
          throw new Error(`Erro de rede: ${fetchError.message}`);
        }
      }

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
      } else {
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.text();
          if (errorData) {
            errorMessage += `\nDetalhes: ${errorData}`;
          }
        } catch (e) {
          // Ignorar erro ao ler resposta
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Erro no treinamento:', error);
      
      let errorMessage = 'Erro ao treinar canal. Tente novamente.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <PageHeader
        user={user}
        currentPage="training"
        onBack={onBack}
        onNavigate={onNavigate}
      />

      <div className="max-w-4xl mx-auto px-6 pt-32 pb-12">
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
              <div className="text-left">
                <div className="font-medium whitespace-pre-line">{message.text}</div>
                {message.type === 'error' && (
                  <div className="text-xs mt-2 opacity-75">
                    Verifique o console do navegador (F12) para mais detalhes técnicos.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Training Form */}
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
              <option value="Gemini-2.5-Flash">Gemini-2.5-Flash</option>
            </select>
          </div>

          {/* Scripts Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Roteiros de Exemplo</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">{trainingData.scripts.length} roteiro(s)</span>
                <button
                  onClick={addScript}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Scripts List */}
            <div className="space-y-6">
              {trainingData.scripts.map((script, index) => (
                <div key={index} className="bg-black/50 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                        {index + 1}
                      </div>
                      <span>Roteiro {index + 1}</span>
                    </h4>
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
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Conteúdo do Roteiro
                    </label>
                    <div 
                      className={`relative ${
                        draggedOver === index 
                          ? 'ring-2 ring-blue-500 ring-opacity-50' 
                          : ''
                      }`}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <textarea
                        value={script.text}
                        onChange={(e) => updateScriptByIndex(index, { text: e.target.value })}
                        rows={8}
                        placeholder="Cole, digite o conteúdo ou arraste um arquivo .txt/.md aqui..."
                        className={`w-full p-4 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 resize-none ${
                          draggedOver === index 
                            ? 'border-blue-500 bg-blue-900/10' 
                            : ''
                        }`}
                      />
                      {draggedOver === index && (
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg pointer-events-none">
                          <div className="text-blue-400 text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <p className="font-medium">Solte o arquivo aqui</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        {script.text.length.toLocaleString()} caracteres
                      </span>
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500">
                          Arraste arquivos .txt/.md aqui
                        </span>
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
                        <label 
                          htmlFor={`file-upload-${index}`} 
                          className="cursor-pointer text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>ou clique aqui</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  );
};

export default TrainingPage;