import React, { useState } from 'react';
import { client } from '../lib/neon';
import Logo from './Logo';
import '../auth.css';

export default function Login({ onLoginSuccess, navigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setError('Não foi possível conectar ao servidor. Tente novamente.');
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
    return msg || 'Falha na autenticação. Verifique os dados informados.';
  };

  return (
    <div className="login-split-page">
      {/* 1. LADO ESQUERDO — Área Institucional (50% Desktop) */}
      <div className="login-left-panel">
        <div className="bg-glow-circle-1"></div>
        <div className="bg-glow-circle-2"></div>

        <div className="left-panel-content">
          {/* Logo NutriMi no Topo */}
          <div className="left-brand">
            <div className="left-logo-wrapper">
              <Logo className="left-logo-svg" />
            </div>
            <span className="left-brand-name">NutriMi</span>
          </div>

          {/* Título & Subtítulo */}
          <div className="left-text-group">
            <h1 className="left-main-title">
              Nutrição inteligente,<br />cuidado personalizado
            </h1>
            <p className="left-subtitle">
              Tudo que você precisa para gerenciar seus pacientes em um só lugar.
            </p>
          </div>

          {/* Lista de Benefícios com ícones translúcidos */}
          <div className="benefits-list">
            <div className="benefit-item">
              <div className="benefit-icon-box">✓</div>
              <span>Gestão completa de pacientes</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon-box">✓</div>
              <span>Acompanhamento da evolução</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon-box">✓</div>
              <span>Agendamento de consultas</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon-box">✓</div>
              <span>Planos alimentares personalizados</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon-box">✓</div>
              <span>Relatórios nutricionais</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LADO DIREITO — Formulário de Autenticação (50% Desktop) */}
      <div className="login-right-panel">
        <div className="login-form-wrapper">
          {/* Cabeçalho do Login */}
          <div className="login-form-header">
            <div className="form-brand-row">
              <Logo className="right-logo-svg" />
              <span className="right-brand-name">NutriMi</span>
            </div>
            <h2 className="form-welcome-title">Bem-vindo de volta!</h2>
            <p className="form-welcome-subtitle">Acesse sua conta para continuar</p>
          </div>

          {/* Alerta de Erro */}
          {error && (
            <div className="alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password">Senha</label>
                <a 
                  href="#esqueci-senha" 
                  className="forgot-password-link"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Instruções de recuperação de senha serão enviadas para seu e-mail.');
                  }}
                >
                  Esqueci minha senha
                </a>
              </div>

              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary-large" 
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Link para Cadastro */}
          <div className="register-callout">
            Ainda não tem uma conta?{' '}
            <a 
              href="#register" 
              className="auth-link-bold" 
              onClick={(e) => {
                e.preventDefault();
                navigateToRegister();
              }}
            >
              Cadastre-se gratuitamente
            </a>
          </div>

          {/* Rodapé Discreto */}
          <footer className="login-footer">
            <span>© 2026 NutriMi</span>
            <span>•</span>
            <a href="#termos" onClick={(e) => e.preventDefault()}>Termos de uso</a>
            <span>•</span>
            <a href="#privacidade" onClick={(e) => e.preventDefault()}>Política de privacidade</a>
          </footer>
        </div>
      </div>
    </div>
  );
}
