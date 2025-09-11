import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Debug logs
console.log('🚀 [MAIN] Iniciando aplicação React...');
console.log('🔍 [MAIN] Verificando elemento root...');

const rootElement = document.getElementById('root');
console.log('📍 [MAIN] Root element encontrado:', !!rootElement);

if (!rootElement) {
  console.error('❌ [MAIN] ERRO CRÍTICO: Elemento root não encontrado!');
  document.body.innerHTML = `
    <div style="
      position: fixed; 
      top: 0; 
      left: 0; 
      width: 100vw; 
      height: 100vh; 
      background: #000; 
      color: #fff; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-family: Arial, sans-serif;
      flex-direction: column;
      gap: 20px;
    ">
      <h1>❌ ERRO CRÍTICO</h1>
      <p>Elemento root não encontrado no DOM</p>
      <button onclick="window.location.reload()" style="
        padding: 10px 20px; 
        background: #3b82f6; 
        color: white; 
        border: none; 
        border-radius: 5px; 
        cursor: pointer;
      ">
        Recarregar Página
      </button>
    </div>
  `;
} else {
  try {
    console.log('✅ [MAIN] Criando root React...');
    const root = createRoot(rootElement);
    
    console.log('🎨 [MAIN] Renderizando App component...');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    
    console.log('✅ [MAIN] App renderizado com sucesso!');
    
    // Remover loading após renderização
    setTimeout(() => {
      const loading = document.getElementById('app-loading');
      if (loading) {
        console.log('🧹 [MAIN] Removendo loading inicial...');
        loading.style.display = 'none';
      }
    }, 1000);
    
  } catch (error) {
    console.error('💥 [MAIN] ERRO ao renderizar App:', error);
    document.body.innerHTML = `
      <div style="
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100vw; 
        height: 100vh; 
        background: #000; 
        color: #fff; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-family: Arial, sans-serif;
        flex-direction: column;
        gap: 20px;
        padding: 20px;
        text-align: center;
      ">
        <h1>💥 ERRO DE RENDERIZAÇÃO</h1>
        <p>Erro ao inicializar a aplicação React</p>
        <pre style="background: #333; padding: 10px; border-radius: 5px; max-width: 80vw; overflow: auto;">
          ${error instanceof Error ? error.message : String(error)}
        </pre>
        <button onclick="window.location.reload()" style="
          padding: 10px 20px; 
          background: #3b82f6; 
          color: white; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
        ">
          Recarregar Página
        </button>
      </div>
    `;
  }
}