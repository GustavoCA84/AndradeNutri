import React, { useState, useEffect, useCallback } from 'react';
import { client } from '../lib/neon';
import MealPlanView from './MealPlanView';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function PatientProfile({ patientId, nutriaId, initialTab = 'dados', onBack, onNavigateToConsultas }) {
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'dados'); // 'dados' | 'consultas' | 'planos'
  const [dadosTab, setDadosTab] = useState('pessoal'); // 'pessoal' | 'clinico' | 'habitos'
  
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingDados, setSavingDados] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Formulário Edição Paciente
  const [editPatient, setEditPatient] = useState(null);

  // Formulário Nova Consulta
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [consultaForm, setConsultaForm] = useState({
    data_consulta: new Date().toISOString().split('T')[0],
    peso: '',
    cintura: '',
    quadril: '',
    percentual_gordura: '',
    observacoes: '',
    proximo_retorno: '',
  });

  const loadPatientProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: pacData, error: pacErr } = await client
        .from('pacientes')
        .select('*')
        .eq('id', patientId)
        .eq('nutricionista_id', nutriaId)
        .single();

      if (pacErr) throw pacErr;
      setPatient(pacData);
      setEditPatient(pacData); // Inicializa form de edição com dados atuais

      const { data: consData } = await client
        .from('consultas')
        .select('*')
        .eq('paciente_id', patientId)
        .order('data_consulta', { ascending: false });
      setConsultas(consData || []);

    } catch (err) {
      console.error('Erro ao carregar perfil do paciente:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, nutriaId]);

  useEffect(() => {
    loadPatientProfileData();
  }, [loadPatientProfileData]);

  const handleSaveDados = async (e) => {
    e.preventDefault();
    setSavingDados(true);
    setSuccessMessage('');
    try {
      const { id, created_at, ...rawDados } = editPatient;
      const cleanData = {
        ...rawDados,
        peso_inicial: rawDados.peso_inicial !== '' && rawDados.peso_inicial !== null && !isNaN(Number(rawDados.peso_inicial)) ? Number(rawDados.peso_inicial) : null,
        altura: rawDados.altura !== '' && rawDados.altura !== null && !isNaN(Number(rawDados.altura)) ? Number(rawDados.altura) : null,
        refeicoes_por_dia: rawDados.refeicoes_por_dia !== '' && rawDados.refeicoes_por_dia !== null && !isNaN(Number(rawDados.refeicoes_por_dia)) ? Number(rawDados.refeicoes_por_dia) : null,
        litros_agua: rawDados.litros_agua !== '' && rawDados.litros_agua !== null && !isNaN(Number(rawDados.litros_agua)) ? Number(rawDados.litros_agua) : null,
        data_nascimento: rawDados.data_nascimento?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let { error } = await client
        .from('pacientes')
        .update(cleanData)
        .eq('id', patientId)
        .eq('nutricionista_id', nutriaId);
      
      if (error && error.message && error.message.includes('observacoes')) {
        delete cleanData.observacoes;
        const retry = await client
          .from('pacientes')
          .update(cleanData)
          .eq('id', patientId)
          .eq('nutricionista_id', nutriaId);
        error = retry.error;
      }

      if (error) throw error;
      
      setPatient((prev) => ({ ...prev, ...cleanData }));
      setSuccessMessage('Dados atualizados com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      alert('Erro ao salvar as alterações: ' + (error.message || 'Verifique os dados informados.'));
    } finally {
      setSavingDados(false);
    }
  };

  const handleSaveConsulta = async (e) => {
    e.preventDefault();
    try {
      const { error } = await client.from('consultas').insert([
        {
          paciente_id: patientId,
          nutricionista_id: nutriaId,
          data_consulta: consultaForm.data_consulta,
          peso: consultaForm.peso ? parseFloat(consultaForm.peso) : null,
          cintura: consultaForm.cintura ? parseFloat(consultaForm.cintura) : null,
          quadril: consultaForm.quadril ? parseFloat(consultaForm.quadril) : null,
          percentual_gordura: consultaForm.percentual_gordura ? parseFloat(consultaForm.percentual_gordura) : null,
          observacoes: consultaForm.observacoes || null,
          proximo_retorno: consultaForm.proximo_retorno || null,
        },
      ]);
      if (error) throw error;
      setShowConsultaModal(false);
      loadPatientProfileData();
      
      // Reset form
      setConsultaForm({
        data_consulta: new Date().toISOString().split('T')[0],
        peso: '', cintura: '', quadril: '', percentual_gordura: '', observacoes: '', proximo_retorno: '',
      });
    } catch (err) {
      console.error('Erro ao salvar consulta:', err);
      alert('Erro ao salvar a consulta: ' + (err.message || 'Tente novamente.'));
    }
  };

  const getInitials = (name) => {
    if (!name) return 'PC';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading || !patient || !editPatient) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <p style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px' }}>Carregando prontuário do paciente...</p>
      </div>
    );
  }

  // Dados para o gráfico (Evolução de Peso - cronológica)
  const chartData = [...consultas]
    .reverse()
    .filter(c => c.peso != null)
    .map(c => ({
      data: new Date(c.data_consulta).toLocaleDateString('pt-BR'),
      peso: Number(c.peso)
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <button className="action-btn-sm" onClick={onBack}>
          ← Voltar para lista de pacientes
        </button>
      </div>

      {/* Cartão de Cabeçalho do Perfil com Avatar e Badges */}
      <div className="profile-header-card">
        <div className="profile-main-info">
          <div className="profile-avatar">
            {getInitials(patient.nome)}
          </div>
          <div className="profile-details-col">
            <div className="profile-title-row">
              <h2 className="profile-patient-name">
                {patient.nome}
              </h2>
              <span className="patient-code-tag">
                {patient.codigo_amigavel || 'PAC-' + patient.id.slice(0, 6).toUpperCase()}
              </span>
              <span className={`status-badge ${(patient.status || 'Ativo').toLowerCase().replace(/\s+/g, '-')}`}>
                {patient.status || 'Ativo'}
              </span>
            </div>
            <div className="profile-contact-row">
              {patient.whatsapp && (
                <span className="contact-chip">
                  <span>📱</span> {patient.whatsapp}
                </span>
              )}
              {patient.email && (
                <span className="contact-chip">
                  <span>✉️</span> {patient.email}
                </span>
              )}
              {patient.data_nascimento && (
                <span className="contact-chip">
                  <span>🎂</span> {new Date(patient.data_nascimento).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 18px', fontSize: '13px' }}
          onClick={() => {
            setActiveTab('consultas');
            setShowConsultaModal(true);
          }}
        >
          + Nova Consulta
        </button>
      </div>

      {/* Menu Principal do Paciente (Abas Segmentadas) */}
      <div className="patient-tabs-header">
        <button
          className={`tab-btn ${activeTab === 'dados' ? 'active' : ''}`}
          onClick={() => setActiveTab('dados')}
        >
          👤 Dados do Paciente
        </button>
        <button
          className={`tab-btn ${activeTab === 'consultas' ? 'active' : ''}`}
          onClick={() => setActiveTab('consultas')}
        >
          📋 Consultas ({consultas.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'planos' ? 'active' : ''}`}
          onClick={() => setActiveTab('planos')}
        >
          🥗 Planos Alimentares
        </button>
      </div>

      {/* Seção 1: Dados do Paciente */}
      {activeTab === 'dados' && (
        <div className="metric-card full-width">
          {/* Sub-Abas */}
          <div className="sub-tabs-bar">
            <button className={`sub-tab-btn ${dadosTab === 'pessoal' ? 'active' : ''}`} onClick={() => setDadosTab('pessoal')}>
              Identificação & Pessoal
            </button>
            <button className={`sub-tab-btn ${dadosTab === 'clinico' ? 'active' : ''}`} onClick={() => setDadosTab('clinico')}>
              Histórico Clínico
            </button>
            <button className={`sub-tab-btn ${dadosTab === 'habitos' ? 'active' : ''}`} onClick={() => setDadosTab('habitos')}>
              Rotina & Hábitos
            </button>
          </div>
          
          <form onSubmit={handleSaveDados}>
            {dadosTab === 'pessoal' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Nome Completo *</label>
                  <input className="form-input" value={editPatient.nome || ''} onChange={e => setEditPatient({...editPatient, nome: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Data de Nascimento</label>
                  <input type="date" className="form-input" value={editPatient.data_nascimento || ''} onChange={e => setEditPatient({...editPatient, data_nascimento: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sexo</label>
                  <select className="filter-select form-input" value={editPatient.sexo || 'Feminino'} onChange={e => setEditPatient({...editPatient, sexo: e.target.value})}>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="form-input" placeholder="(11) 99999-9999" value={editPatient.telefone || ''} onChange={e => setEditPatient({...editPatient, telefone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp</label>
                  <input className="form-input" placeholder="(11) 99999-9999" value={editPatient.whatsapp || ''} onChange={e => setEditPatient({...editPatient, whatsapp: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input type="email" className="form-input" placeholder="paciente@email.com" value={editPatient.email || ''} onChange={e => setEditPatient({...editPatient, email: e.target.value})} />
                </div>
              </div>
            )}
            
            {dadosTab === 'clinico' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Peso Atual / Inicial (kg)</label>
                  <input type="number" step="0.1" className="form-input" placeholder="Ex: 70.5" value={editPatient.peso_inicial ?? ''} onChange={e => setEditPatient({...editPatient, peso_inicial: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Altura (cm)</label>
                  <input type="number" className="form-input" placeholder="Ex: 170" value={editPatient.altura ?? ''} onChange={e => setEditPatient({...editPatient, altura: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Objetivos Principais (separados por vírgula)</label>
                  <input className="form-input" placeholder="Ex: Emagrecimento, Ganho de massa muscular..." value={Array.isArray(editPatient.objetivos) ? editPatient.objetivos.join(', ') : editPatient.objetivos || ''} onChange={e => setEditPatient({...editPatient, objetivos: e.target.value.split(',').map(s=>s.trim())})} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Patologias (separadas por vírgula)</label>
                  <input className="form-input" placeholder="Ex: Diabetes, Hipertensão, Hipotireoidismo..." value={Array.isArray(editPatient.patologias) ? editPatient.patologias.join(', ') : editPatient.patologias || ''} onChange={e => setEditPatient({...editPatient, patologias: e.target.value.split(',').map(s=>s.trim())})} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Medicamentos Contínuos</label>
                  <input className="form-input" placeholder="Ex: Puran T4 50mcg, Metformina..." value={editPatient.medicamentos_continuos || ''} onChange={e => setEditPatient({...editPatient, medicamentos_continuos: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Restrições Alimentares (separadas por vírgula)</label>
                  <input className="form-input" placeholder="Ex: Lactose, Glúten..." value={Array.isArray(editPatient.restricoes_alimentares) ? editPatient.restricoes_alimentares.join(', ') : editPatient.restricoes_alimentares || ''} onChange={e => setEditPatient({...editPatient, restricoes_alimentares: e.target.value.split(',').map(s=>s.trim())})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Alergias Alimentares (separadas por vírgula)</label>
                  <input className="form-input" placeholder="Ex: Amendoim, Frutos do mar..." value={Array.isArray(editPatient.alergias) ? editPatient.alergias.join(', ') : editPatient.alergias || ''} onChange={e => setEditPatient({...editPatient, alergias: e.target.value.split(',').map(s=>s.trim())})} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Suplementos em Uso</label>
                  <input className="form-input" placeholder="Ex: Whey protein, Creatina, Vitamina D..." value={editPatient.suplementos_em_uso || ''} onChange={e => setEditPatient({...editPatient, suplementos_em_uso: e.target.value})} />
                </div>
              </div>
            )}
            
            {dadosTab === 'habitos' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Nível de Atividade Física</label>
                  <select className="filter-select form-input" value={editPatient.nivel_atividade || 'Sedentário'} onChange={e => setEditPatient({...editPatient, nivel_atividade: e.target.value})}>
                    <option value="Sedentário">Sedentário (pouco ou nenhum exercício)</option>
                    <option value="Levemente ativo">Levemente ativo (1 a 3 dias/semana)</option>
                    <option value="Moderadamente ativo">Moderadamente ativo (3 a 5 dias/semana)</option>
                    <option value="Muito ativo">Muito ativo (6 a 7 dias/semana)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Refeições por Dia</label>
                  <input type="number" min="1" max="10" className="form-input" placeholder="Ex: 5" value={editPatient.refeicoes_por_dia ?? ''} onChange={e => setEditPatient({...editPatient, refeicoes_por_dia: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Consumo de Água (Litros/dia)</label>
                  <input type="number" step="0.1" className="form-input" placeholder="Ex: 2.5" value={editPatient.litros_agua ?? ''} onChange={e => setEditPatient({...editPatient, litros_agua: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Horário que Acorda</label>
                  <input type="time" className="form-input" value={editPatient.horario_acorda || ''} onChange={e => setEditPatient({...editPatient, horario_acorda: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Horário que Dorme</label>
                  <input type="time" className="form-input" value={editPatient.horario_dorme || ''} onChange={e => setEditPatient({...editPatient, horario_dorme: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hábitos Intestinais</label>
                  <input className="form-input" placeholder="Ex: Diário e regular, Constipado (2x/semana)..." value={editPatient.habitos_intestinais || ''} onChange={e => setEditPatient({...editPatient, habitos_intestinais: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Qualidade do Sono</label>
                  <input className="form-input" placeholder="Ex: Boa (7-8h/noite), Acorda cansado..." value={editPatient.qualidade_sono || ''} onChange={e => setEditPatient({...editPatient, qualidade_sono: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Prática de Atividade Física (Detalhes e Frequência)</label>
                  <textarea className="form-input" rows={2} placeholder="Ex: Musculação 4x na semana (45 min) e corrida no fim de semana..." value={editPatient.atividade_fisica || ''} onChange={e => setEditPatient({...editPatient, atividade_fisica: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Observações Clínicas Gerais</label>
                  <textarea className="form-input" rows={2} placeholder="Outras informações relevantes sobre o paciente..." value={editPatient.observacoes || ''} onChange={e => setEditPatient({...editPatient, observacoes: e.target.value})} />
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button type="submit" className="btn-primary" disabled={savingDados}>
                {savingDados ? 'Salvando alterações...' : '💾 Salvar alterações'}
              </button>
              {successMessage && (
                <span style={{ color: 'var(--success)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✅ {successMessage}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Seção 2: Consultas */}
      {activeTab === 'consultas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="metric-card full-width">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 className="metric-title">Evolução de Peso</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Acompanhamento cronológico do peso nas consultas
                </p>
              </div>
              <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }} onClick={() => setShowConsultaModal(true)}>
                + Nova Consulta
              </button>
            </div>
            
            <div style={{ width: '100%', height: '300px', marginTop: '12px' }}>
              {chartData.length === 0 ? (
                <div className="empty-patients-msg" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Nenhuma consulta registrada ainda para gerar o gráfico de evolução
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis dataKey="data" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" domain={['auto', 'auto']} fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', color: 'var(--text-primary)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#000080" strokeWidth={3} dot={{ r: 5, fill: '#000080' }} activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="metric-card full-width">
            <h3 className="metric-title" style={{ marginBottom: '16px' }}>Histórico de Consultas</h3>
            {consultas.length === 0 ? (
              <div className="empty-patients-msg">Nenhuma consulta registrada ainda</div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Peso</th>
                      <th>Cintura</th>
                      <th>Quadril</th>
                      <th>% Gordura</th>
                      <th>Próx. Retorno</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultas.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '600' }}>{new Date(c.data_consulta).toLocaleDateString('pt-BR')}</td>
                        <td>{c.peso ? `${c.peso} kg` : '--'}</td>
                        <td>{c.cintura ? `${c.cintura} cm` : '--'}</td>
                        <td>{c.quadril ? `${c.quadril} cm` : '--'}</td>
                        <td>{c.percentual_gordura ? `${c.percentual_gordura}%` : '--'}</td>
                        <td>{c.proximo_retorno ? new Date(c.proximo_retorno).toLocaleDateString('pt-BR') : '--'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{c.observacoes || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seção 3: Planos Alimentares */}
      {activeTab === 'planos' && (
        <MealPlanView patient={patient} nutriaId={nutriaId} />
      )}

      {/* Modal: Nova Consulta */}
      {showConsultaModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>Registrar Nova Consulta</h3>
              <button
                type="button"
                onClick={() => setShowConsultaModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConsulta} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label">Data da Consulta *</label>
                <input type="date" className="form-input" value={consultaForm.data_consulta} onChange={e => setConsultaForm({...consultaForm, data_consulta: e.target.value})} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Peso (kg) *</label>
                  <input type="number" step="0.1" className="form-input" placeholder="Ex: 72.5" value={consultaForm.peso} onChange={e => setConsultaForm({...consultaForm, peso: e.target.value})} required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">% Gordura Corporal</label>
                  <input type="number" step="0.1" className="form-input" placeholder="Ex: 18.5" value={consultaForm.percentual_gordura} onChange={e => setConsultaForm({...consultaForm, percentual_gordura: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Circunferência Cintura (cm)</label>
                  <input type="number" step="0.1" className="form-input" placeholder="Ex: 80" value={consultaForm.cintura} onChange={e => setConsultaForm({...consultaForm, cintura: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Circunferência Quadril (cm)</label>
                  <input type="number" step="0.1" className="form-input" placeholder="Ex: 95" value={consultaForm.quadril} onChange={e => setConsultaForm({...consultaForm, quadril: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Data do Próximo Retorno</label>
                <input type="date" className="form-input" value={consultaForm.proximo_retorno} onChange={e => setConsultaForm({...consultaForm, proximo_retorno: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Observações da Consulta</label>
                <textarea className="form-input" rows={3} placeholder="Evolução, queixas, adaptações na dieta..." value={consultaForm.observacoes} onChange={e => setConsultaForm({...consultaForm, observacoes: e.target.value})} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="action-btn-sm" onClick={() => setShowConsultaModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                  Salvar Consulta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
