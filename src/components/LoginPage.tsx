import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Eye,
  EyeOff,
  User,
  LogIn,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  console.log('🔐 [LOGIN] Component renderizando...');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔑 [LOGIN] Tentando fazer login com:', email);
    
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('📡 [LOGIN] Chamando signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      console.log('📋 [LOGIN] Resposta do login:', { 
        hasUser: !!data.user, 
        userEmail: data.user?.email,
        error: error?.message 
      });

      if (error) {
        console.error('❌ [LOGIN] Erro no login:', error);
        setError(error.message || 'Credenciais inválidas');
        return;
      }

      if (data.user) {
        console.log('✅ [LOGIN] Login bem-sucedido:', data.user.email);
        onLogin(data.user);
      } else {
        console.error('❌ [LOGIN] Login sem usuário retornado');
        setError('Erro no login - usuário não retornado');
      }
    } catch (err) {
      console.error('💥 [LOGIN] Erro no login:', err);
      setError('Erro interno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Função de teste para pular login
  const handleTestLogin = () => {
    console.log('🧪 [LOGIN] Login de teste ativado');
    onLogin({ 
      email: 'test@example.com', 
      id: 'test-user-id',
      user_metadata: {}
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">
            Dashboard de Roteiros
          </h1>
          <p className="text-gray-400">
            Acesse sua conta para continuar
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="Digite seu email"
                className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Digite sua senha"
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className={`
                w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium transition-all duration-200
                ${isLoading || !email.trim() || !password.trim()
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-100 hover:scale-105 active:scale-95'
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Entrar</span>
                </>
              )}
            </button>

            {/* Test Login Button */}
            <button
              type="button"
              onClick={handleTestLogin}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl font-medium transition-all duration-200 bg-yellow-600 text-white hover:bg-yellow-700 text-sm"
            >
              🧪 Login de Teste (Pular Autenticação)
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            Sistema de criação de roteiros automatizados
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;