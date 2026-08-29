import React, { useState, useEffect, useCallback } from 'react';
import { client } from '../lib/neon';
import Logo from './Logo';
import PatientFormView from './PatientFormView';
import PatientProfile from './PatientProfile';
import ThemeToggle from './ThemeToggle';
import '../dashboard.css';

export default function Dashboard({ user, onLogout, theme, onToggleTheme }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'pacientes'
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Dados do Dashboard
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [pacientesAtivosCount, setPacientesAtivosCount] = useState(0);
  const [consultasSemana, setConsultasSemana] = useState(0);
  const [totalPlanosCount, setTotalPlanosCount] = useState(0);
  const [allPlanosList, setAllPlanosList] = useState([]);
  const [pacientesSemRetorno, setPacientesSemRetorno] = useState([]);
  const [nutriaId, setNutriaId] = useState(null);

  // Lista de Pacientes & Filtros
  const [pacientesList, setPacientesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Ativo');
  const [sortBy, setSortBy] = useState('nome');
  const [pacientesUltimasConsultas, setPacientesUltimasConsultas] = useState({});
  const [initialPatientTab, setInitialPatientTab] = useState('dados');

  // Modais
  const [showPatientForm, setShowPatientForm] = useState(false);
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

      // Carregar planos alimentares
      try {
        const { data: planosData } = await client
          .from('planos_alimentares')
          .select('*')
          .order('created_at', { ascending: false });

        setAllPlanosList(planosData || []);
        setTotalPlanosCount((planosData || []).length);
      } catch (planErr) {
        console.warn('Tabela planos_alimentares ainda não possui dados:', planErr);
      }
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

  const sanitizePatientData = (raw) => {
    const {
      patologia_texto,
      restricao_texto,
      alergia_texto,
      id,
      created_at,
      ...clean
    } = raw;

    return {
      ...clean,
      nome: clean.nome?.trim() || '',
      email: clean.email?.trim() || null,
      telefone: clean.telefone?.trim() || null,
      whatsapp: clean.whatsapp?.trim() || null,
      data_nascimento: clean.data_nascimento?.trim() || null,
      sexo: clean.sexo || 'Feminino',
      cidade: clean.cidade?.trim() || null,
      estado: clean.estado?.trim() || null,
      peso_inicial: clean.peso_inicial !== '' && clean.peso_inicial !== null && !isNaN(Number(clean.peso_inicial)) ? Number(clean.peso_inicial) : null,
      altura: clean.altura !== '' && clean.altura !== null && !isNaN(Number(clean.altura)) ? Number(clean.altura) : null,
      refeicoes_por_dia: clean.refeicoes_por_dia !== '' && clean.refeicoes_por_dia !== null && !isNaN(Number(clean.refeicoes_por_dia)) ? Number(clean.refeicoes_por_dia) : null,
      litros_agua: clean.litros_agua !== '' && clean.litros_agua !== null && !isNaN(Number(clean.litros_agua)) ? Number(clean.litros_agua) : null,
      objetivos: Array.isArray(clean.objetivos) ? clean.objetivos : [],
      objetivo_texto: clean.objetivo_texto?.trim() || null,
      nivel_atividade: clean.nivel_atividade || 'Sedentário',
      patologias: Array.isArray(clean.patologias) ? clean.patologias : [],
      medicamentos_continuos: clean.medicamentos_continuos?.trim() || null,
      restricoes_alimentares: Array.isArray(clean.restricoes_alimentares) ? clean.restricoes_alimentares : [],
      alergias: Array.isArray(clean.alergias) ? clean.alergias : [],
      suplementos_em_uso: clean.suplementos_em_uso?.trim() || null,
      habitos_intestinais: clean.habitos_intestinais?.trim() || null,
      qualidade_sono: clean.qualidade_sono?.trim() || null,
      atividade_fisica: typeof clean.atividade_fisica === 'boolean'
        ? (clean.atividade_fisica ? 'Sim' : 'Não')
        : (clean.atividade_fisica || 'Não'),
      atividade_fisica_descricao: clean.atividade_fisica_descricao?.trim() || null,
      horario_acorda: clean.horario_acorda?.trim() || null,
      horario_dorme: clean.horario_dorme?.trim() || null,
      observacoes: clean.observacoes?.trim() || null,
    };
  };

  const handleSavePatient = async (formData) => {
    setSavingLoading(true);
    try {
      let successPatientId = null;
      let targetNutriaId = nutriaId;

      if (!targetNutriaId && user?.email) {
        const { data: nutriData } = await client
          .from('nutricionistas')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (nutriData?.id) {
          targetNutriaId = nutriData.id;
          setNutriaId(targetNutriaId);
        } else {
          const { data: newNutri, error: createErr } = await client
            .from('nutricionistas')
            .insert([{ nome: user.name || 'Nutricionista', email: user.email }])
            .select('id')
            .single();

          if (createErr) throw createErr;
          if (newNutri) {
            targetNutriaId = newNutri.id;
            setNutriaId(targetNutriaId);
          }
        }
      }

      if (!targetNutriaId) {
        throw new Error('Identificação da nutricionista não encontrada. Por favor, recarregue a página.');
      }

      const cleanData = sanitizePatientData(formData);

      if (editingPatient) {
        let updatePayload = {
          ...cleanData,
          updated_at: new Date().toISOString(),
        };

        let { error } = await client
          .from('pacientes')
          .update(updatePayload)
          .eq('id', editingPatient.id)
          .eq('nutricionista_id', targetNutriaId);

        if (error && error.message && error.message.includes('observacoes')) {
          delete updatePayload.observacoes;
          const retry = await client
            .from('pacientes')
            .update(updatePayload)
            .eq('id', editingPatient.id)
            .eq('nutricionista_id', targetNutriaId);
          error = retry.error;
        }

        if (error) throw error;
        successPatientId = editingPatient.id;
      } else {
        const codigoAmigavel = 'PAC-' + Math.floor(100000 + Math.random() * 900000);
        let insertPayload = {
          ...cleanData,
          nutricionista_id: targetNutriaId,
          codigo_amigavel: codigoAmigavel,
          status: 'Ativo',
        };

        let res = await client.from('pacientes').insert([insertPayload]).select('id').single();

        if (res.error && res.error.message && res.error.message.includes('observacoes')) {
          delete insertPayload.observacoes;
          res = await client.from('pacientes').insert([insertPayload]).select('id').single();
        }

        if (res.error) throw res.error;
        successPatientId = res.data.id;
      }

      setShowPatientForm(false);
      setEditingPatient(null);
      await fetchDashboardData();
      
      // Mostrar mensagem de sucesso e redirecionar
      alert('Paciente salvo com sucesso!');
      if (successPatientId) {
        setSelectedPatientId(successPatientId);
        setActiveTab('pacientes');
      }
    } catch (err) {
      console.error('Erro ao salvar paciente:', err);
      alert('Ocorreu um erro ao salvar o paciente: ' + (err.message || 'Verifique os dados e tente novamente.'));
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
            <div className="sidebar-brand-name">
              Andrade<span>Nutri</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeTab === 'dashboard' && !selectedPatientId && !showPatientForm ? 'active' : ''}`}
              onClick={() => {
                setSelectedPatientId(null);
                setShowPatientForm(false);
                setActiveTab('dashboard');
              }}
            >
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'pacientes' && !selectedPatientId && !showPatientForm ? 'active' : ''}`}
              onClick={() => {
                setSelectedPatientId(null);
                setShowPatientForm(false);
                setActiveTab('pacientes');
              }}
            >
              <span className="nav-icon">👥</span>
              <span>Pacientes</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'planos' && !selectedPatientId && !showPatientForm ? 'active' : ''}`}
              onClick={() => {
                setSelectedPatientId(null);
                setShowPatientForm(false);
                setActiveTab('planos');
              }}
            >
              <span className="nav-icon">🥗</span>
              <span>Planos Alimentares</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

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
        {showPatientForm ? (
          <PatientFormView
            patient={editingPatient}
            loading={savingLoading}
            onBack={() => setShowPatientForm(false)}
            onSave={handleSavePatient}
          />
        ) : selectedPatientId ? (
          <PatientProfile
            patientId={selectedPatientId}
            nutriaId={nutriaId}
            initialTab={initialPatientTab}
            onBack={() => {
              setSelectedPatientId(null);
              setInitialPatientTab('dados');
            }}
          />
        ) : (
          <>
            <div className="dashboard-header-bar">
              <div>
                <h1 className="dashboard-heading">
                  {activeTab === 'dashboard'
                    ? 'Visão Geral'
                    : activeTab === 'pacientes'
                    ? 'Gestão de Pacientes'
                    : 'Planos Alimentares'}
                </h1>
                <p className="dashboard-subheading">
                  {activeTab === 'dashboard'
                    ? 'Acompanhamento dos indicadores do seu consultório em tempo real.'
                    : activeTab === 'pacientes'
                    ? 'Gerenciamento completo da carteira de pacientes e prontuários.'
                    : 'Acompanhamento e prescrição de dietas e cardápios semanais com IA.'}
                </p>
              </div>

              {activeTab === 'pacientes' && (
                <button
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => {
                    setEditingPatient(null);
                    setShowPatientForm(true);
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
                <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('pacientes')}>
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

                <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('planos')}>
                  <div className="metric-card-header">
                    <span className="metric-title">Planos Alimentares</span>
                    <div className="metric-badge-icon">🥗</div>
                  </div>
                  <div className="metric-value">{loading ? '...' : totalPlanosCount}</div>
                  <div className="metric-description">Planos alimentares cadastrados no sistema</div>
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
            ) : activeTab === 'planos' ? (
              <div className="metric-card full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 className="metric-title" style={{ fontSize: '18px', textTransform: 'none', color: 'var(--text-primary)' }}>
                      🥗 Todos os Planos Alimentares ({allPlanosList.length})
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Selecione um plano para abrir o prontuário ou escolha um paciente para gerar um novo plano.
                    </p>
                  </div>
                </div>

                {loading ? (
                  <p style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>Carregando planos alimentares...</p>
                ) : allPlanosList.length === 0 ? (
                  <div className="empty-patients-msg" style={{ padding: '48px 20px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🥗</div>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      Nenhum plano alimentar gerado ainda
                    </h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 20px auto' }}>
                      Abra o perfil de qualquer paciente e acesse a aba <strong>"Planos Alimentares"</strong> para gerar dietas inteligentes via IA.
                    </p>
                    <button className="btn-primary" onClick={() => setActiveTab('pacientes')}>
                      👥 Ver Lista de Pacientes
                    </button>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Título do Plano</th>
                        <th>Paciente</th>
                        <th>Data de Criação</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPlanosList.map((plano) => {
                        const paciente = pacientesList.find((p) => p.id === plano.paciente_id) || {
                          nome: plano.conteudo?.paciente_nome || 'Paciente',
                        };

                        return (
                          <tr key={plano.id}>
                            <td>
                              <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                {plano.titulo || 'Plano Alimentar Semanal'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                                  {getInitials(paciente.nome)}
                                </div>
                                <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                  {paciente.nome}
                                </span>
                              </div>
                            </td>
                            <td>
                              {new Date(plano.created_at).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(plano.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td>
                              <button
                                className="btn-primary"
                                style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
                                onClick={() => {
                                  setSelectedPatientId(plano.paciente_id);
                                  setInitialPatientTab('planos');
                                }}
                              >
                                🥗 Abrir no Prontuário →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
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
                                  setShowPatientForm(true);
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
