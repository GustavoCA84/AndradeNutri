import React, { useState, useEffect, useCallback } from 'react';
import { client } from '../lib/neon';
import Logo from './Logo';
import PatientFormModal from './PatientFormModal';
import PatientProfile from './PatientProfile';
import '../dashboard.css';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'pacientes'
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Dados do Dashboard
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [pacientesAtivosCount, setPacientesAtivosCount] = useState(0);
  const [consultasSemana, setConsultasSemana] = useState(0);
  const [pacientesSemRetorno, setPacientesSemRetorno] = useState([]);
  const [nutriaId, setNutriaId] = useState(null);

  // Lista de Pacientes & Filtros
  const [pacientesList, setPacientesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Ativo');
  const [sortBy, setSortBy] = useState('nome');
  const [pacientesUltimasConsultas, setPacientesUltimasConsultas] = useState({});

  // Modais
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [archiveConfirmation, setArchiveConfirmation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [savingLoading, setSavingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Obter Iniciais do Usuário para o Avatar
  const getInitials = (name) => {
    if (!name) return 'AN';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let currentNutriaId = null;

      const { data: nutriData } = await client
        .from('nutricionistas')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (nutriData?.id) {
        currentNutriaId = nutriData.id;
      } else {
        const { data: newNutri, error: createErr } = await client
          .from('nutricionistas')
          .insert([{ nome: user.name || 'Nutricionista', email: user.email }])
          .select('id')
          .single();

        if (createErr) console.error('Erro ao cadastrar nutricionista:', createErr);
        if (newNutri) currentNutriaId = newNutri.id;
      }

      if (!currentNutriaId) {
        setLoading(false);
        return;
      }

      setNutriaId(currentNutriaId);

      const { data: pacientes, error: pacErr } = await client
        .from('pacientes')
        .select('*')
        .eq('nutricionista_id', currentNutriaId);

      if (pacErr) throw pacErr;
      const pacList = pacientes || [];
      setPacientesList(pacList);
      setTotalPacientes(pacList.length);

      const ativos = pacList.filter((p) => (p.status || 'Ativo') === 'Ativo').length;
      setPacientesAtivosCount(ativos);

      const patientIds = pacList.map((p) => p.id);
      if (patientIds.length === 0) {
        setConsultasSemana(0);
        setPacientesSemRetorno([]);
        setLoading(false);
        return;
      }

      const { data: consultas, error: consErr } = await client
        .from('consultas')
        .select('*')
        .in('paciente_id', patientIds);

      if (consErr) throw consErr;
      const consultsList = consultas || [];

      const now = new Date();
      const dayOfWeek = now.getDay();
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

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const pacienteConsultasMap = {};
      consultsList.forEach((c) => {
        if (!pacienteConsultasMap[c.paciente_id]) {
          pacienteConsultasMap[c.paciente_id] = [];
        }
        pacienteConsultasMap[c.paciente_id].push(c);
      });

      const semRetorno = [];
      const ultimas = {};

      pacList.forEach((paciente) => {
        const userConsultas = pacienteConsultasMap[paciente.id] || [];
        if (userConsultas.length > 0) {
          userConsultas.sort((a, b) => new Date(b.data_consulta) - new Date(a.data_consulta));
          const ultimaConsulta = userConsultas[0];
          const dataUltima = new Date(ultimaConsulta.data_consulta);
          ultimas[paciente.id] = ultimaConsulta.data_consulta;

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
      setPacientesUltimasConsultas(ultimas);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setErrorMsg('Não foi possível carregar dados em tempo real.');
    } finally {
      setLoading(false);
    }
  }, [user.email, user.name]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSavePatient = async (formData) => {
    setSavingLoading(true);
    try {
      let successPatientId = null;

      if (editingPatient) {
        const { error } = await client
          .from('pacientes')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPatient.id)
          .eq('nutricionista_id', nutriaId);

        if (error) throw error;
        successPatientId = editingPatient.id;
      } else {
        const codigoAmigavel = 'PAC-' + Math.floor(100000 + Math.random() * 900000);
        const { data, error } = await client.from('pacientes').insert([
          {
            ...formData,
            nutricionista_id: nutriaId,
            codigo_amigavel: codigoAmigavel,
            status: 'Ativo',
          },
        ]).select('id').single();

        if (error) throw error;
        successPatientId = data.id;
      }

      setShowPatientModal(false);
      setEditingPatient(null);
      fetchDashboardData();
      
      // Mostrar mensagem de sucesso e redirecionar
      alert('Paciente cadastrado com sucesso!');
      if (successPatientId) {
        setSelectedPatientId(successPatientId);
        setActiveTab('pacientes');
      }
    } catch (err) {
      console.error('Erro ao salvar paciente:', err);
      alert('Ocorreu um erro ao salvar o paciente. Tente novamente.');
    } finally {
      setSavingLoading(false);
    }
  };

  const handleToggleArchive = async (paciente) => {
    try {
      const newStatus = paciente.status === 'Arquivado' ? 'Ativo' : 'Arquivado';
      const { error } = await client
        .from('pacientes')
        .update({ status: newStatus })
        .eq('id', paciente.id)
        .eq('nutricionista_id', nutriaId);

      if (error) throw error;
      setArchiveConfirmation(null);
      fetchDashboardData();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const filteredPatients = pacientesList
    .filter((p) => {
      if (statusFilter && statusFilter !== 'TODOS') {
        if ((p.status || 'Ativo') !== statusFilter) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nomeMatch = p.nome?.toLowerCase().includes(q);
        const phoneMatch = p.whatsapp?.includes(q);
        const emailMatch = p.email?.toLowerCase().includes(q);
        if (!nomeMatch && !phoneMatch && !emailMatch) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'nome') return a.nome.localeCompare(b.nome);
      if (sortBy === 'recentes') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'antigos') return new Date(a.created_at) - new Date(b.created_at);
      return 0;
    });

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
      {/* Sidebar Fixo SaaS */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <Logo className="sidebar-logo" />
            <span className="sidebar-brand-name">AndradeNutri</span>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeTab === 'dashboard' && !selectedPatientId ? 'active' : ''}`}
              onClick={() => {
                setSelectedPatientId(null);
                setActiveTab('dashboard');
              }}
            >
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'pacientes' && !selectedPatientId ? 'active' : ''}`}
              onClick={() => {
                setSelectedPatientId(null);
                setActiveTab('pacientes');
              }}
            >
              <span className="nav-icon">👥</span>
              <span>Pacientes</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <div className="user-avatar">{getInitials(user.name)}</div>
            <div className="user-profile-details">
              <span className="user-name-label">{user.name || 'Nutricionista'}</span>
              <span className="user-email-label">{user.email}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <span>🚪</span>
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="dashboard-main">
        {selectedPatientId ? (
          <PatientProfile
            patientId={selectedPatientId}
            nutriaId={nutriaId}
            onBack={() => setSelectedPatientId(null)}
          />
        ) : (
          <>
            <div className="dashboard-header-bar">
              <div>
                <h1 className="dashboard-heading">
                  {activeTab === 'dashboard' ? 'Visão Geral' : 'Gestão de Pacientes'}
                </h1>
                <p className="dashboard-subheading">
                  {activeTab === 'dashboard'
                    ? 'Acompanhamento dos indicadores do seu consultório em tempo real.'
                    : 'Gerenciamento completo da carteira de pacientes e prontuários.'}
                </p>
              </div>

              {activeTab === 'pacientes' && (
                <button
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => {
                    setEditingPatient(null);
                    setShowPatientModal(true);
                  }}
                >
                  + Novo Paciente
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '24px' }}>
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {activeTab === 'dashboard' ? (
              <div className="dashboard-cards-grid">
                <div className="metric-card">
                  <div className="metric-card-header">
                    <span className="metric-title">Total de Pacientes</span>
                    <div className="metric-badge-icon">👥</div>
                  </div>
                  <div className="metric-value">{loading ? '...' : totalPacientes}</div>
                  <div className="metric-description">
                    {pacientesAtivosCount} pacientes ativos em acompanhamento
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-header">
                    <span className="metric-title">Consultas da Semana</span>
                    <div className="metric-badge-icon">📅</div>
                  </div>
                  <div className="metric-value">{loading ? '...' : consultasSemana}</div>
                  <div className="metric-description">Agendamentos ou atendimentos nesta semana</div>
                </div>

                <div className="metric-card no-return-card full-width">
                  <div className="metric-card-header">
                    <span className="metric-title">Pacientes Sem Retorno (+30 dias)</span>
                    <div className="metric-badge-icon">⏳</div>
                  </div>

                  {loading ? (
                    <div className="metric-description">Carregando dados...</div>
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
                          onClick={() => setSelectedPatientId(p.id)}
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
              <div className="metric-card full-width">
                <div className="filters-bar">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="🔍 Buscar por nome, WhatsApp ou e-mail..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />

                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="Ativo">Status: Ativos</option>
                    <option value="Em acompanhamento">Em Acompanhamento</option>
                    <option value="Inativo">Inativos</option>
                    <option value="Arquivado">Arquivados</option>
                    <option value="TODOS">Todos os Status</option>
                  </select>

                  <select
                    className="filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="nome">Ordenar por Nome</option>
                    <option value="recentes">Mais Recentes</option>
                    <option value="antigos">Mais Antigos</option>
                  </select>
                </div>

                {loading ? (
                  <p style={{ color: 'var(--text-secondary)', padding: '16px' }}>Carregando pacientes...</p>
                ) : filteredPatients.length === 0 ? (
                  <div className="empty-patients-msg">
                    {searchQuery || statusFilter !== 'Ativo'
                      ? 'Nenhum paciente encontrado para os filtros selecionados.'
                      : 'Nenhum paciente cadastrado ainda.'}
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nome / Contato</th>
                        <th>Status</th>
                        <th>Objetivo</th>
                        <th>Última Consulta</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                                {getInitials(p.nome)}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{p.nome}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.whatsapp || p.email || 'Sem contato'}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${(p.status || 'Ativo').toLowerCase().replace(/\s+/g, '-')}`}>
                              {p.status || 'Ativo'}
                            </span>
                          </td>
                          <td>{p.objetivos?.join(', ') || 'Saúde Geral'}</td>
                          <td>{pacientesUltimasConsultas[p.id] ? new Date(pacientesUltimasConsultas[p.id]).toLocaleDateString('pt-BR') : 'Sem consultas'}</td>
                          <td>
                            <div className="actions-cell">
                              <button
                                className="action-btn-sm"
                                title="Ver Perfil"
                                onClick={() => setSelectedPatientId(p.id)}
                              >
                                👁️ Perfil
                              </button>
                              <button
                                className="action-btn-sm"
                                title="Editar"
                                onClick={() => {
                                  setEditingPatient(p);
                                  setShowPatientModal(true);
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                className="action-btn-sm"
                                title={p.status === 'Arquivado' ? 'Restaurar' : 'Arquivar'}
                                onClick={() => setArchiveConfirmation(p)}
                              >
                                {p.status === 'Arquivado' ? '♻️' : '📁'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal Cadastro/Edição */}
      {showPatientModal && (
        <PatientFormModal
          patient={editingPatient}
          loading={savingLoading}
          onClose={() => setShowPatientModal(false)}
          onSave={handleSavePatient}
        />
      )}

      {/* Modal Confirmação Arquivamento */}
      {archiveConfirmation && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
              {archiveConfirmation.status === 'Arquivado' ? 'Restaurar Paciente?' : 'Arquivar Paciente?'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {archiveConfirmation.status === 'Arquivado'
                ? `Deseja restaurar o paciente "${archiveConfirmation.nome}" para a lista de ativos?`
                : `Tem certeza que deseja arquivar "${archiveConfirmation.nome}"? O paciente não será excluído.`}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="action-btn-sm" onClick={() => setArchiveConfirmation(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                style={{ width: 'auto', backgroundColor: archiveConfirmation.status === 'Arquivado' ? 'var(--primary)' : 'var(--error)' }}
                onClick={() => handleToggleArchive(archiveConfirmation)}
              >
                {archiveConfirmation.status === 'Arquivado' ? 'Restaurar Paciente' : 'Arquivar Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
