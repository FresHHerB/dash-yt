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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSignUpMode, setIsSignUpMode] = useState(false);

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
        // Traduzir mensagens de erro comuns
        let errorMessage = 'Credenciais inválidas';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Muitas tentativas. Tente novamente em alguns minutos.';
        }
        setError(errorMessage);
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

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos para criar uma conta');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('📡 [LOGIN] Criando nova conta...');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('❌ [LOGIN] Erro ao criar conta:', error);
        let errorMessage = 'Erro ao criar conta';
        if (error.message.includes('User already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'A senha deve ter pelo menos 6 caracteres';
        }
        setError(errorMessage);
        return;
      }

      if (data.user) {
        console.log('✅ [LOGIN] Conta criada:', data.user.email);
        setError('');
        setMessage({ type: 'success', text: 'Conta criada com sucesso! Você pode fazer login agora.' });
      }
    } catch (err) {
      console.error('💥 [LOGIN] Erro ao criar conta:', err);
      setError('Erro interno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
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
            {isSignUpMode ? 'Crie sua conta para começar' : 'Acesse sua conta para continuar'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
          <form onSubmit={isSignUpMode ? handleSignUp : handleLogin} className="space-y-6">
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
              {isSignUpMode && (
                <div className="text-xs text-gray-400">
                  A senha deve ter pelo menos 6 caracteres
                </div>
              )}
            </div>

            {/* Success Message */}
            {message && (
              <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-900/20 border border-green-800 text-green-400' 
                  : 'bg-red-900/20 border border-red-800 text-red-400'
              }`}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{message.text}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
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
                  <span>{isSignUpMode ? 'Criando conta...' : 'Entrando...'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>{isSignUpMode ? 'Criar Conta' : 'Entrar'}</span>
                </>
              )}
            </button>

            {/* Toggle Mode Button */}
            <button
              type="button"
              onClick={() => {
                setIsSignUpMode(!isSignUpMode);
                setError('');
                setMessage(null);
              }}
              disabled={isLoading}
              className="w-full text-center py-2 px-4 text-gray-400 hover:text-white transition-colors text-sm"
            >
              {isSignUpMode 
                ? 'Já tem uma conta? Fazer login' 
                : 'Não tem uma conta? Criar conta'
              }
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            Sistema de criação de roteiros automatizados
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Autenticação segura via Supabase
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;