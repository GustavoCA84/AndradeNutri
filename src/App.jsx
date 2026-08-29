import React, { useState, useEffect } from 'react';
import { client } from './lib/neon';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ThemeToggle from './components/ThemeToggle';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('login'); // 'login' | 'register' | 'dashboard'
  const [initializing, setInitializing] = useState(true);

  // Gerenciamento de Tema (Light / Dark)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('andradenutri_theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('andradenutri_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Carregar a sessão ativa no carregamento inicial da página
  useEffect(() => {
    async function checkSession() {
      try {
        const { data, error } = await client.auth.getSession();
        if (data?.session?.user) {
          setUser(data.session.user);
          setScreen('dashboard');
        } else {
          setUser(null);
          setScreen('login');
        }
      } catch (err) {
        console.error('Erro ao buscar sessão inicial:', err);
      } finally {
        setInitializing(false);
      }
    }
    checkSession();
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setScreen('dashboard');
  };

  const handleRegisterSuccess = (registeredUser) => {
    setUser(registeredUser);
    setScreen('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setScreen('login');
  };

  if (initializing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', backgroundColor: 'var(--bg)' }}>
        <div style={{ 
          width: '44px', 
          height: '44px', 
          border: '4px solid var(--border)', 
          borderTopColor: 'var(--primary)', 
          borderRadius: '50%', 
          animation: 'spin 0.8s linear infinite',
          boxShadow: 'var(--shadow-glow)'
        }}></div>
        <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '-0.2px' }}>
          Carregando AndradeNutri...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {/* Botão de tema flutuante para telas de login e registro */}
      {screen !== 'dashboard' && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 999 }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} showLabel={false} />
        </div>
      )}

      {screen === 'login' && (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          navigateToRegister={() => setScreen('register')} 
        />
      )}
      {screen === 'register' && (
        <Register 
          onRegisterSuccess={handleRegisterSuccess} 
          navigateToLogin={() => setScreen('login')} 
        />
      )}
      {screen === 'dashboard' && user && (
        <Dashboard 
          user={user} 
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </>
  );
}
