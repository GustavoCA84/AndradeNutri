import React, { useState } from 'react';
import { client } from '../lib/neon';
import Logo from './Logo';
import '../auth.css';

export default function Login({ onLoginSuccess, navigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await client.auth.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(translateError(result.error.message));
      } else {
        onLoginSuccess(result.data.user);
      }
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao tentar entrar. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const translateError = (msg) => {
    if (msg.includes('invalid credentials') || msg.includes('Invalid credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (msg.includes('user not found') || msg.includes('User not found')) {
      return 'Nenhuma conta encontrada com este e-mail.';
    }
    return msg || 'Falha na autenticação.';
  };

  return (
    <div className="auth-container">
      <div className="brand-header">
        <Logo />
        <h1 className="brand-title">AndradeNutri</h1>
        <p className="brand-subtitle">Faça login para gerenciar seus pacientes</p>
      </div>

      {error && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            className="form-input"
            placeholder="exemplo@andradenutri.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            className="form-input"
            placeholder="Sua senha secreta"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="auth-footer">
        Não tem uma conta?{' '}
        <a 
          href="#register" 
          className="auth-link" 
          onClick={(e) => {
            e.preventDefault();
            navigateToRegister();
          }}
        >
          Cadastre-se
        </a>
      </div>
    </div>
  );
}
