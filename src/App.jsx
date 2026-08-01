import React, { useState, useEffect } from 'react';
import { client } from './lib/neon';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('login'); // 'login' | 'register' | 'dashboard'
  const [initializing, setInitializing] = useState(true);

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #e5e7eb', 
          borderTopColor: '#10b981', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <span style={{ fontSize: '15px', color: '#4b5563', fontWeight: '500' }}>Carregando AndradeNutri...</span>
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
        />
      )}
    </>
  );
}
