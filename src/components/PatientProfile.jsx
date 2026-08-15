import React, { useState, useEffect, useCallback } from 'react';
import { client } from '../lib/neon';

export default function PatientProfile({ patientId, nutriaId, onBack, onNavigateToConsultas }) {
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('resumo'); // 'resumo' | 'consultas' | 'evolucao' | 'medidas' | 'anamnese' | 'documentos'
  const [consultas, setConsultas] = useState([]);
  const [evolucoes, setEvolucoes] = useState([]);
  const [medidas, setMedidas] = useState([]);
  const [anamnese, setAnamnese] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de modais rápidos
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [showEvolucaoModal, setShowEvolucaoModal] = useState(false);
  const [showMedidaModal, setShowMedidaModal] = useState(false);

  // Formulário Nova Consulta
  const [consultaForm, setConsultaForm] = useState({
    data_consulta: new Date().toISOString().split('T')[0],
    horario: '14:00',
    tipo: 'Presencial',
    status: 'Realizada',
    observacoes: '',
    proximo_retorno: '',
  });

  // Formulário Nova Evolução
  const [evolucaoForm, setEvolucaoForm] = useState({
    peso: '',
    altura: '',
    percentual_gordura: '',
    massa_muscular: '',
    observacoes: '',
  });

  // Formulário Nova Medida
  const [medidaForm, setMedidaForm] = useState({
    cintura: '',
    abdomen: '',
    quadril: '',
    braco: '',
    coxa: '',
    percentual_gordura: '',
    observacoes: '',
  });

  const loadPatientProfileData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Dados do paciente (validação estrita por nutriaId)
      const { data: pacData, error: pacErr } = await client
        .from('pacientes')
        .select('*')
        .eq('id', patientId)
        .eq('nutricionista_id', nutriaId)
        .single();

      if (pacErr) throw pacErr;
      setPatient(pacData);

      // 2. Consultas
      const { data: consData } = await client
        .from('consultas')
        .select('*')
        .eq('paciente_id', patientId)
        .order('data_consulta', { ascending: false });
      setConsultas(consData || []);

      // 3. Evoluções
      const { data: evoData } = await client
        .from('evolucoes')
        .select('*')
        .eq('paciente_id', patientId)
        .order('created_at', { ascending: false });
      setEvolucoes(evoData || []);

      // 4. Medidas
      const { data: medData } = await client
        .from('medidas')
        .select('*')
        .eq('paciente_id', patientId)
        .order('data', { ascending: false });
      setMedidas(medData || []);

      // 5. Anamnese
      const { data: anaData } = await client
        .from('anamneses')
        .select('*')
        .eq('paciente_id', patientId)
        .maybeSingle();
      setAnamnese(anaData);

      // 6. Documentos
      const { data: docData } = await client
        .from('documentos')
        .select('*')
        .eq('paciente_id', patientId)
        .order('created_at', { ascending: false });
      setDocumentos(docData || []);
    } catch (err) {
      console.error('Erro ao carregar perfil do paciente:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, nutriaId]);

  useEffect(() => {
    loadPatientProfileData();
  }, [loadPatientProfileData]);

  // Handlers para salvamento de registros
  const handleSaveConsulta = async (e) => {
    e.preventDefault();
    try {
      const { error } = await client.from('consultas').insert([
        {
          paciente_id: patientId,
          nutricionista_id: nutriaId,
          data_consulta: consultaForm.data_consulta,
          horario: consultaForm.horario,
          tipo: consultaForm.tipo,
          status: consultaForm.status,
          observacoes: consultaForm.observacoes,
          proximo_retorno: consultaForm.proximo_retorno || null,
        },
      ]);
      if (error) throw error;
      setShowConsultaModal(false);
      loadPatientProfileData();
    } catch (err) {
      console.error('Erro ao salvar consulta:', err);
    }
  };

  const handleSaveEvolucao = async (e) => {
    e.preventDefault();
    try {
      const pesoNum = parseFloat(evolucaoForm.peso);
      const altNum = parseFloat(evolucaoForm.altura || patient.altura);
      let imcVal = null;
      if (pesoNum && altNum) {
        imcVal = (pesoNum / Math.pow(altNum / 100, 2)).toFixed(1);
      }

      const { error } = await client.from('evolucoes').insert([
        {
          paciente_id: patientId,
          nutricionista_id: nutriaId,
          peso: pesoNum,
          altura: altNum,
          imc: imcVal,
          percentual_gordura: evolucaoForm.percentual_gordura || null,
          massa_muscular: evolucaoForm.massa_muscular || null,
          observacoes: evolucaoForm.observacoes,
        },
      ]);
      if (error) throw error;
      setShowEvolucaoModal(false);
      loadPatientProfileData();
    } catch (err) {
      console.error('Erro ao salvar evolução:', err);
    }
  };

  const handleSaveMedida = async (e) => {
    e.preventDefault();
    try {
      const { error } = await client.from('medidas').insert([
        {
          paciente_id: patientId,
          nutricionista_id: nutriaId,
          cintura: medidaForm.cintura || null,
          abdomen: medidaForm.abdomen || null,
          quadril: medidaForm.quadril || null,
          braco: medidaForm.braco || null,
          coxa: medidaForm.coxa || null,
          percentual_gordura: medidaForm.percentual_gordura || null,
          observacoes: medidaForm.observacoes,
        },
      ]);
      if (error) throw error;
      setShowMedidaModal(false);
      loadPatientProfileData();
    } catch (err) {
      console.error('Erro ao salvar medidas:', err);
    }
  };

  if (loading || !patient) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando prontuário do paciente...</p>
      </div>
    );
  }

  // Cálculos de indicadores para o cabeçalho
  const ultimaConsulta = consultas.find((c) => c.status === 'Realizada')?.data_consulta;
  const proximaConsulta = consultas.find((c) => new Date(c.data_consulta) >= new Date() && c.status !== 'Cancelada')?.data_consulta;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Botão de Retorno */}
      <div>
        <button className="action-btn-sm" onClick={onBack}>
          ← Voltar para lista de pacientes
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
            <span className={`status-badge ${patient.status?.toLowerCase().replace(/\s+/g, '-')}`}>
              {patient.status || 'Ativo'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <span>📱 {patient.whatsapp || 'Sem WhatsApp'}</span>
            <span>✉️ {patient.email || 'Sem e-mail'}</span>
            <span>📍 {patient.cidade ? `${patient.cidade}/${patient.estado}` : 'Sem endereço'}</span>
          </div>
        </div>

        {/* Botões de Ação do Perfil */}
        <div className="profile-actions">
          <button className="action-btn-sm" onClick={() => setShowConsultaModal(true)}>
            📅 Nova Consulta
          </button>
          <button className="action-btn-sm" onClick={() => setShowEvolucaoModal(true)}>
            📈 Registrar Evolução
          </button>
          <button className="action-btn-sm" onClick={() => setShowMedidaModal(true)}>
            📏 Nova Medida
          </button>
        </div>
      </div>

      {/* Menu Interno do Paciente */}
      <div className="patient-tabs-header">
        {['resumo', 'consultas', 'evolucao', 'medidas', 'anamnese', 'documentos'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Conteúdo da Aba 1: Resumo (Dashboard Individual) */}
      {activeTab === 'resumo' && (
        <div className="dashboard-cards-grid">
          <div className="metric-card">
            <span className="metric-title">Peso Atual / Inicial</span>
            <div className="metric-value">
              {evolucoes[0]?.peso || patient.peso_inicial || '--'} <span style={{ fontSize: '16px' }}>kg</span>
            </div>
            <span className="metric-description">
              Altura: {patient.altura ? `${patient.altura} cm` : 'N/I'}
            </span>
          </div>

          <div className="metric-card">
            <span className="metric-title">Última Consulta</span>
            <div className="metric-value" style={{ fontSize: '24px' }}>
              {ultimaConsulta ? new Date(ultimaConsulta).toLocaleDateString('pt-BR') : 'Nenhuma'}
            </div>
            <span className="metric-description">
              Próxima: {proximaConsulta ? new Date(proximaConsulta).toLocaleDateString('pt-BR') : 'Não agendada'}
            </span>
          </div>

          <div className="metric-card full-width">
            <h3 className="metric-title" style={{ fontSize: '16px', marginBottom: '12px' }}>
              Resumo Clínico & Restrições
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <strong>Objetivos:</strong>
                <p>{patient.objetivos?.join(', ') || 'Nenhum'}</p>
              </div>
              <div>
                <strong>Patologias:</strong>
                <p>{patient.patologias?.join(', ') || 'Nenhuma'}</p>
              </div>
              <div>
                <strong>Restrições Alimentares:</strong>
                <p>{patient.restricoes_alimentares?.join(', ') || 'Nenhuma'}</p>
              </div>
              <div>
                <strong>Medicamentos/Suplementos:</strong>
                <p>{patient.medicamentos_continuos || 'Nenhum'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 2: Consultas */}
      {activeTab === 'consultas' && (
        <div className="metric-card full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 className="metric-title">Histórico de Consultas</h3>
            <button className="action-btn-sm" onClick={() => setShowConsultaModal(true)}>
              + Agendar Consulta
            </button>
          </div>
          {consultas.length === 0 ? (
            <div className="empty-patients-msg">Nenhuma consulta registrada para este paciente.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data / Horário</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Próximo Retorno</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {consultas.map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.data_consulta).toLocaleDateString('pt-BR')} {c.horario ? `- ${c.horario}` : ''}</td>
                    <td>{c.tipo || 'Presencial'}</td>
                    <td><span className="status-badge ativo">{c.status}</span></td>
                    <td>{c.proximo_retorno ? new Date(c.proximo_retorno).toLocaleDateString('pt-BR') : '--'}</td>
                    <td>{c.observacoes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 3: Evolução Clínica */}
      {activeTab === 'evolucao' && (
        <div className="metric-card full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 className="metric-title">Histórico de Evolução Clínica & IMC</h3>
            <button className="action-btn-sm" onClick={() => setShowEvolucaoModal(true)}>
              + Registrar Evolução
            </button>
          </div>
          {evolucoes.length === 0 ? (
            <div className="empty-patients-msg">Ainda não existem registros de evolução.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Peso (kg)</th>
                  <th>IMC (kg/m²)</th>
                  <th>% Gordura</th>
                  <th>Massa Muscular</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {evolucoes.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>{e.peso} kg</td>
                    <td>{e.imc || '--'}</td>
                    <td>{e.percentual_gordura ? `${e.percentual_gordura}%` : '--'}</td>
                    <td>{e.massa_muscular ? `${e.massa_muscular} kg` : '--'}</td>
                    <td>{e.observacoes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modais de Formulários Rápidos */}
      {showConsultaModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <h3>Registrar Nova Consulta</h3>
            <form onSubmit={handleSaveConsulta} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label>Data da Consulta</label>
              <input
                type="date"
                className="form-input"
                value={consultaForm.data_consulta}
                onChange={(e) => setConsultaForm({ ...consultaForm, data_consulta: e.target.value })}
                required
              />
              <label>Horário</label>
              <input
                type="text"
                className="form-input"
                placeholder="14:00"
                value={consultaForm.horario}
                onChange={(e) => setConsultaForm({ ...consultaForm, horario: e.target.value })}
              />
              <label>Tipo</label>
              <select
                className="filter-select"
                value={consultaForm.tipo}
                onChange={(e) => setConsultaForm({ ...consultaForm, tipo: e.target.value })}
              >
                <option value="Presencial">Presencial</option>
                <option value="Online">Online</option>
              </select>
              <label>Observações</label>
              <textarea
                className="form-input"
                rows={3}
                value={consultaForm.observacoes}
                onChange={(e) => setConsultaForm({ ...consultaForm, observacoes: e.target.value })}
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
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

      {showEvolucaoModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <h3>Registrar Evolução Clínica</h3>
            <form onSubmit={handleSaveEvolucao} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label>Peso (kg) *</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={evolucaoForm.peso}
                onChange={(e) => setEvolucaoForm({ ...evolucaoForm, peso: e.target.value })}
                required
              />
              <label>% Gordura Corporável</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={evolucaoForm.percentual_gordura}
                onChange={(e) => setEvolucaoForm({ ...evolucaoForm, percentual_gordura: e.target.value })}
              />
              <label>Observações</label>
              <textarea
                className="form-input"
                rows={3}
                value={evolucaoForm.observacoes}
                onChange={(e) => setEvolucaoForm({ ...evolucaoForm, observacoes: e.target.value })}
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="action-btn-sm" onClick={() => setShowEvolucaoModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                  Salvar Evolução
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
