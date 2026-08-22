import React, { useState, useEffect, useCallback } from 'react';
import { client } from '../lib/neon';
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

export default function PatientProfile({ patientId, nutriaId, onBack, onNavigateToConsultas }) {
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('dados'); // 'dados' | 'consultas' | 'planos'
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
      const { error } = await client
        .from('pacientes')
        .update(editPatient)
        .eq('id', patientId)
        .eq('nutricionista_id', nutriaId);
      
      if (error) throw error;
      
      setPatient(editPatient);
      setSuccessMessage('Dados atualizados com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      alert('Erro ao salvar as alterações.');
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
          observacoes: consultaForm.observacoes,
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
      alert('Erro ao salvar a consulta.');
    }
  };

  if (loading || !patient || !editPatient) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando prontuário do paciente...</p>
      </div>
    );
  }

  // Dados para o gráfico (Evolução de Peso - cronológica)
  const chartData = [...consultas]
    .reverse()
    .filter(c => c.peso != null)
    .map(c => ({
      data: new Date(c.data_consulta).toLocaleDateString('pt-BR'),
      peso: c.peso
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <button className="action-btn-sm" onClick={onBack}>
          ← Voltar para lista
        </button>
      </div>

      {/* Cartão de Cabeçalho do Perfil */}
      <div className="profile-header-card">
        <div className="profile-main-info">
          <div className="profile-title-row">
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {patient.nome}
            </h2>
            <span className="patient-code-tag">{patient.codigo_amigavel || 'PAC-' + patient.id.slice(0, 6).toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <span>📱 {patient.whatsapp || 'Sem WhatsApp'}</span>
            <span>✉️ {patient.email || 'Sem e-mail'}</span>
          </div>
        </div>
      </div>

      {/* Menu Principal do Paciente */}
      <div className="patient-tabs-header">
        {['dados', 'consultas', 'planos'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'dados' ? 'Dados do Paciente' : tab === 'consultas' ? 'Consultas' : 'Planos Alimentares'}
          </button>
        ))}
      </div>

      {/* Seção 1: Dados do Paciente */}
      {activeTab === 'dados' && (
        <div className="metric-card full-width">
          <div style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', gap: '12px' }}>
            <button className={`tab-btn ${dadosTab === 'pessoal' ? 'active' : ''}`} onClick={() => setDadosTab('pessoal')}>Pessoal</button>
            <button className={`tab-btn ${dadosTab === 'clinico' ? 'active' : ''}`} onClick={() => setDadosTab('clinico')}>Clínico</button>
            <button className={`tab-btn ${dadosTab === 'habitos' ? 'active' : ''}`} onClick={() => setDadosTab('habitos')}>Hábitos</button>
          </div>
          
          <form onSubmit={handleSaveDados}>
            {dadosTab === 'pessoal' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Nome Completo</label>
                  <input className="form-input" value={editPatient.nome || ''} onChange={e => setEditPatient({...editPatient, nome: e.target.value})} required />
                </div>
                <div>
                  <label className="form-label">Data de Nascimento</label>
                  <input type="date" className="form-input" value={editPatient.data_nascimento || ''} onChange={e => setEditPatient({...editPatient, data_nascimento: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">WhatsApp</label>
                  <input className="form-input" value={editPatient.whatsapp || ''} onChange={e => setEditPatient({...editPatient, whatsapp: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">E-mail</label>
                  <input type="email" className="form-input" value={editPatient.email || ''} onChange={e => setEditPatient({...editPatient, email: e.target.value})} />
                </div>
              </div>
            )}
            
            {dadosTab === 'clinico' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Patologias (separadas por vírgula)</label>
                  <input className="form-input" value={editPatient.patologias?.join(', ') || ''} onChange={e => setEditPatient({...editPatient, patologias: e.target.value.split(',').map(s=>s.trim())})} />
                </div>
                <div>
                  <label className="form-label">Medicamentos Contínuos</label>
                  <input className="form-input" value={editPatient.medicamentos_continuos || ''} onChange={e => setEditPatient({...editPatient, medicamentos_continuos: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Restrições Alimentares (separadas por vírgula)</label>
                  <input className="form-input" value={editPatient.restricoes_alimentares?.join(', ') || ''} onChange={e => setEditPatient({...editPatient, restricoes_alimentares: e.target.value.split(',').map(s=>s.trim())})} />
                </div>
              </div>
            )}
            
            {dadosTab === 'habitos' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Hábitos Intestinais</label>
                  <input className="form-input" value={editPatient.habitos_intestinais || ''} onChange={e => setEditPatient({...editPatient, habitos_intestinais: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Qualidade do Sono</label>
                  <input className="form-input" value={editPatient.qualidade_sono || ''} onChange={e => setEditPatient({...editPatient, qualidade_sono: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Prática de Atividade Física</label>
                  <textarea className="form-input" value={editPatient.atividade_fisica || ''} onChange={e => setEditPatient({...editPatient, atividade_fisica: e.target.value})} />
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button type="submit" className="btn-primary" disabled={savingDados}>
                {savingDados ? 'Salvando...' : 'Salvar alterações'}
              </button>
              {successMessage && <span style={{ color: 'green', fontWeight: '500' }}>✅ {successMessage}</span>}
            </div>
          </form>
        </div>
      )}

      {/* Seção 2: Consultas */}
      {activeTab === 'consultas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="metric-card full-width">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 className="metric-title">Evolução de Peso</h3>
              <button className="action-btn-sm" onClick={() => setShowConsultaModal(true)}>
                + Nova Consulta
              </button>
            </div>
            
            <div style={{ width: '100%', height: '300px' }}>
              {chartData.length === 0 ? (
                <div className="empty-patients-msg" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Nenhuma consulta registrada ainda
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="data" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#4A6CF7" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
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
                      <td>{new Date(c.data_consulta).toLocaleDateString('pt-BR')}</td>
                      <td>{c.peso ? `${c.peso} kg` : '--'}</td>
                      <td>{c.cintura ? `${c.cintura} cm` : '--'}</td>
                      <td>{c.quadril ? `${c.quadril} cm` : '--'}</td>
                      <td>{c.percentual_gordura ? `${c.percentual_gordura}%` : '--'}</td>
                      <td>{c.proximo_retorno ? new Date(c.proximo_retorno).toLocaleDateString('pt-BR') : '--'}</td>
                      <td>{c.observacoes || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Seção 3: Planos Alimentares */}
      {activeTab === 'planos' && (
        <div className="metric-card full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 className="metric-title">Planos Alimentares</h3>
            <button className="action-btn-sm" onClick={() => alert('Geração de plano alimentar será implementada em breve!')}>
              + Gerar Plano Alimentar
            </button>
          </div>
          
          <div className="empty-patients-msg" style={{ padding: '40px 20px' }}>
            Nenhum plano alimentar gerado ainda
          </div>
        </div>
      )}

      {/* Modal: Nova Consulta */}
      {showConsultaModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <h3>Nova Consulta</h3>
            <form onSubmit={handleSaveConsulta} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Data da Consulta</label>
                <input type="date" className="form-input" value={consultaForm.data_consulta} onChange={e => setConsultaForm({...consultaForm, data_consulta: e.target.value})} required />
              </div>
              
              <div>
                <label className="form-label">Peso (kg) *</label>
                <input type="number" step="0.1" className="form-input" value={consultaForm.peso} onChange={e => setConsultaForm({...consultaForm, peso: e.target.value})} required />
              </div>
              
              <div>
                <label className="form-label">% Gordura</label>
                <input type="number" step="0.1" className="form-input" value={consultaForm.percentual_gordura} onChange={e => setConsultaForm({...consultaForm, percentual_gordura: e.target.value})} />
              </div>

              <div>
                <label className="form-label">Cintura (cm)</label>
                <input type="number" step="0.1" className="form-input" value={consultaForm.cintura} onChange={e => setConsultaForm({...consultaForm, cintura: e.target.value})} />
              </div>
              
              <div>
                <label className="form-label">Quadril (cm)</label>
                <input type="number" step="0.1" className="form-input" value={consultaForm.quadril} onChange={e => setConsultaForm({...consultaForm, quadril: e.target.value})} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Próximo Retorno</label>
                <input type="date" className="form-input" value={consultaForm.proximo_retorno} onChange={e => setConsultaForm({...consultaForm, proximo_retorno: e.target.value})} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Observações</label>
                <textarea className="form-input" rows={3} value={consultaForm.observacoes} onChange={e => setConsultaForm({...consultaForm, observacoes: e.target.value})} />
              </div>
              
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="action-btn-sm" onClick={() => setShowConsultaModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Salvar consulta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
