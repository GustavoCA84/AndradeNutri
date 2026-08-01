import React, { useState } from 'react';
import { client } from '../lib/neon';
import Logo from './Logo';
import '../auth.css';

export default function Register({ onRegisterSuccess, navigateToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Criar usuário no Neon Auth (Managed Better Auth)
      const signUpResult = await client.auth.signUp.email({
        email,
        password,
        name,
      });

      if (signUpResult.error) {
        setError(signUpResult.error.message || 'Erro ao registrar usuário.');
        setLoading(false);
        return;
      }

      const user = signUpResult.data?.user;
      if (!user) {
        setError('Ocorreu um erro ao recuperar dados da sessão criada.');
        setLoading(false);
        return;
      }

      setSuccess('Conta criada com sucesso! Redirecionando...');
      setTimeout(() => {
        onRegisterSuccess(user);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('Erro ao tentar criar conta. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="brand-header">
        <Logo />
        <h1 className="brand-title">AndradeNutri</h1>
        <p className="brand-subtitle">Crie sua conta de nutricionista</p>
      </div>

      {error && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert-success">
          <span>✅</span>
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">Nome Completo</label>
          <input
            id="name"
            type="text"
            className="form-input"
            placeholder="Seu nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

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
          <label className="form-label" htmlFor="password">Senha (mínimo 6 caracteres)</label>
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

        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password">Confirmar Senha</label>
          <input
            id="confirm-password"
            type="password"
            className="form-input"
            placeholder="Repita sua senha secreta"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading}
        >
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <div className="auth-footer">
        Já tem uma conta?{' '}
        <a 
          href="#login" 
          className="auth-link" 
          onClick={(e) => {
            e.preventDefault();
            navigateToLogin();
          }}
        >
          Faça login
        </a>
      </div>
    </div>
  );
}
