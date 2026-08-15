import React, { useState, useEffect, useCallback } from 'react';
import { client } from '../lib/neon';
import Logo from './Logo';
import '../dashboard.css';

export default function Dashboard({ user, onLogout, onSelectPatient }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'pacientes'
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [consultasSemana, setConsultasSemana] = useState(0);
  const [pacientesSemRetorno, setPacientesSemRetorno] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Obter o ID da nutricionista vinculada ao e-mail/user do Neon Auth
      let nutriaId = null;

      // Buscar se a nutricionista já existe no banco
      const { data: nutriData } = await client
        .from('nutricionistas')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (nutriData?.id) {
        nutriaId = nutriData.id;
      } else {
        // Se ainda não existir registro na tabela nutricionistas, cria um novo
        const { data: newNutri, error: createErr } = await client
          .from('nutricionistas')
          .insert([{ nome: user.name || 'Nutricionista', email: user.email }])
          .select('id')
          .single();

        if (createErr) {
          console.error('Erro ao cadastrar nutricionista no banco:', createErr);
        } else if (newNutri) {
          nutriaId = newNutri.id;
        }
      }

      if (!nutriaId) {
        setLoading(false);
        return;
      }

      // 2. Card 1 — Total de pacientes ativos
      const { data: pacientes, error: pacErr } = await client
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('nutricionista_id', nutriaId);

      if (pacErr) throw pacErr;
      const pacList = pacientes || [];
      setTotalPacientes(pacList.length);

      // 3. Obter todas as consultas dos pacientes da nutricionista
      const patientIds = pacList.map((p) => p.id);

      if (patientIds.length === 0) {
        setConsultasSemana(0);
        setPacientesSemRetorno([]);
        setLoading(false);
        return;
      }

      const { data: consultas, error: consErr } = await client
        .from('consultas')
        .select('id, paciente_id, data_consulta, proximo_retorno')
        .in('paciente_id', patientIds);

      if (consErr) throw consErr;
      const consultsList = consultas || [];

      // Card 2 — Consultas da semana
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Domingo
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const countSemana = consultsList.filter((c) => {
        if (!c.data_consulta) return false;
        const d = new Date(c.data_consulta);
        return d >= startOfWeek && d <= endOfWeek;
      }).length;

      setConsultasSemana(countSemana);

      // Card 3 — Pacientes sem retorno
      // Regra: última consulta há mais de 30 dias E sem próximo retorno agendado
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Mapear consultas por paciente
      const pacienteConsultasMap = {};
      consultsList.forEach((c) => {
        if (!pacienteConsultasMap[c.paciente_id]) {
          pacienteConsultasMap[c.paciente_id] = [];
        }
        pacienteConsultasMap[c.paciente_id].push(c);
      });

      const semRetorno = [];

      pacList.forEach((paciente) => {
        const userConsultas = pacienteConsultasMap[paciente.id] || [];
        if (userConsultas.length > 0) {
          // Ordenar por data mais recente
          userConsultas.sort((a, b) => new Date(b.data_consulta) - new Date(a.data_consulta));
          const ultimaConsulta = userConsultas[0];
          const dataUltima = new Date(ultimaConsulta.data_consulta);

          // Verifica se possui algum proximo_retorno futuro em qualquer consulta
          const temRetornoAgendado = userConsultas.some((c) => {
            if (!c.proximo_retorno) return false;
            return new Date(c.proximo_retorno) >= now;
          });

          if (dataUltima < thirtyDaysAgo && !temRetornoAgendado) {
            semRetorno.push({
              id: paciente.id,
              nome: paciente.nome,
              dataUltimaConsulta: ultimaConsulta.data_consulta,
            });
          }
        }
      });

      setPacientesSemRetorno(semRetorno);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setErrorMsg('Não foi possível carregar os dados em tempo real do banco de dados.');
    } finally {
      setLoading(false);
    }
  }, [user.email, user.name]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    try {
      await client.auth.signOut();
      onLogout();
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Menu Lateral Fixo */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <Logo className="sidebar-logo" />
            <span className="sidebar-brand-name">AndradeNutri</span>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'pacientes' ? 'active' : ''}`}
              onClick={() => setActiveTab('pacientes')}
            >
              <span className="nav-icon">👥</span>
              <span>Pacientes</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <span className="user-name-label">{user.name || 'Nutricionista'}</span>
            <span className="user-email-label">{user.email}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <span>🚪</span>
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="dashboard-main">
        <div className="dashboard-header-bar">
          <h1 className="dashboard-heading">
            {activeTab === 'dashboard' ? `Visão Geral` : 'Gestão de Pacientes'}
          </h1>
          <p className="dashboard-subheading">
            {activeTab === 'dashboard'
              ? `Acompanhamento dos indicadores do seu consultório em tempo real.`
              : `Gerencie a lista de pacientes e históricos de atendimento.`}
          </p>
        </div>

        {errorMsg && (
          <div className="alert-error" style={{ marginBottom: '24px' }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {activeTab === 'dashboard' ? (
          <div className="dashboard-cards-grid">
            {/* Card 1 — Total de pacientes ativos */}
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-title">Total de Pacientes Ativos</span>
                <div className="metric-badge-icon">👥</div>
              </div>
              <div className="metric-value">
                {loading ? '...' : totalPacientes}
              </div>
              <div className="metric-description">Pacientes cadastrados em sua base</div>
            </div>

            {/* Card 2 — Consultas da semana */}
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-title">Consultas da Semana</span>
                <div className="metric-badge-icon">📅</div>
              </div>
              <div className="metric-value">
                {loading ? '...' : consultasSemana}
              </div>
              <div className="metric-description">Atendimentos agendados ou realizados nesta semana</div>
            </div>

            {/* Card 3 — Pacientes sem retorno */}
            <div className="metric-card no-return-card full-width">
              <div className="metric-card-header">
                <span className="metric-title">Pacientes Sem Retorno (+30 dias)</span>
                <div className="metric-badge-icon">⏳</div>
              </div>

              {loading ? (
                <div className="metric-description">Carregando pacientes...</div>
              ) : pacientesSemRetorno.length === 0 ? (
                <div className="empty-patients-msg">
                  ✨ Nenhum paciente sem retorno no momento
                </div>
              ) : (
                <div className="patient-list">
                  {pacientesSemRetorno.map((p) => (
                    <div
                      key={p.id}
                      className="patient-item"
                      onClick={() => {
                        if (onSelectPatient) {
                          onSelectPatient(p.id);
                        } else {
                          setActiveTab('pacientes');
                        }
                      }}
                    >
                      <div className="patient-info">
                        <span className="patient-name">{p.nome}</span>
                        <span className="patient-last-date">
                          Última consulta:{' '}
                          {new Date(p.dataUltimaConsulta).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <span className="patient-arrow">Ver Perfil →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Aba Pacientes (Placeholder/Lista) */
          <div className="metric-card full-width">
            <h3 className="metric-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
              Lista de Pacientes Cadastrados
            </h3>
            <p className="metric-description" style={{ marginBottom: '16px' }}>
              Módulo de gestão completa de pacientes.
            </p>
            {loading ? (
              <p>Carregando pacientes...</p>
            ) : totalPacientes === 0 ? (
              <div className="empty-patients-msg">Nenhum paciente cadastrado ainda.</div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>
                Você tem <strong>{totalPacientes}</strong> pacientes cadastrados.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
