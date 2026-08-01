import React from 'react';
import { client } from '../lib/neon';
import '../auth.css';

export default function Dashboard({ user, onLogout }) {
  const handleLogout = async () => {
    try {
      await client.auth.signOut();
      onLogout();
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1 className="dashboard-title">Olá, {user.name || 'Nutricionista'}</h1>
          <p className="dashboard-subtitle">Bem-vinda ao seu painel de controle AndradeNutri</p>
        </div>
        <button className="btn-secondary" onClick={handleLogout}>
          Sair do Sistema
        </button>
      </div>

      <div className="dashboard-content">
        <div className="info-card">
          <h3 className="info-title">Informações do Perfil</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Nome Completo</span>
              <span className="info-value">{user.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">E-mail de Contato</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">ID da Conta (Neon Auth)</span>
              <span className="info-value" style={{ fontSize: '12px', fontFamily: 'monospace' }}>{user.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
