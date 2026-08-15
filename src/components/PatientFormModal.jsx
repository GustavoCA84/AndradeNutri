import React, { useState } from 'react';

export default function PatientFormModal({ patient, onClose, onSave, loading }) {
  const [step, setStep] = useState(1); // 1: Pessoal, 2: Clínica, 3: Hábitos, 4: Anamnese, 5: Resumo
  const [formData, setFormData] = useState({
    nome: patient?.nome || '',
    data_nascimento: patient?.data_nascimento || '',
    sexo: patient?.sexo || 'Feminino',
    whatsapp: patient?.whatsapp || '',
    email: patient?.email || '',
    profissao: patient?.profissao || '',
    cidade: patient?.cidade || '',
    estado: patient?.estado || '',
    peso_inicial: patient?.peso_inicial || '',
    altura: patient?.altura || '',
    objetivos: patient?.objetivos || [],
    objetivo_texto: patient?.objetivo_texto || '',
    nivel_atividade: patient?.nivel_atividade || 'Levemente ativo',
    patologias: patient?.patologias || ['Nenhum'],
    restricoes_alimentares: patient?.restricoes_alimentares || ['Nenhum'],
    alergias: patient?.alergias || ['Nenhum'],
    medicamentos_continuos: patient?.medicamentos_continuos || '',
    suplementos_em_uso: patient?.suplementos_em_uso || '',
    refeicoes_por_dia: patient?.refeicoes_por_dia || 3,
    horario_acorda: patient?.horario_acorda || '',
    horario_dorme: patient?.horario_dorme || '',
    litros_agua: patient?.litros_agua || '',
    atividade_fisica: patient?.atividade_fisica ?? true,
    atividade_fisica_descricao: patient?.atividade_fisica_descricao || '',
    observacoes: patient?.observacoes || '',
    motivo_consulta: patient?.motivo_consulta || '',
    historico_dietas: patient?.historico_dietas || '',
    tentativas_anteriores: patient?.tentativas_anteriores || '',
    historico_familiar: patient?.historico_familiar || '',
    cirurgias: patient?.cirurgias || '',
    nivel_estresse: patient?.nivel_estresse || 'Médio',
    qualidade_sono: patient?.qualidade_sono || 'Boa',
    preferencias_alimentares: patient?.preferencias_alimentares || '',
    alimentos_detesta: patient?.alimentos_detesta || '',
    frequencia_refeicoes_fora: patient?.frequencia_refeicoes_fora || '',
    consumo_ultraprocessados: patient?.consumo_ultraprocessados || '',
    consumo_refrigerantes: patient?.consumo_refrigerantes || '',
    consumo_cafe: patient?.consumo_cafe || '',
    consumo_alcool: patient?.consumo_alcool || '',
  });

  const [errors, setErrors] = useState({});

  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return null;
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    return idade >= 0 ? idade : null;
  };

  const calcularIMC = (peso, altura) => {
    if (!peso || !altura) return null;
    const p = parseFloat(peso);
    const a = parseFloat(altura) / 100;
    if (isNaN(p) || isNaN(a) || a <= 0) return null;
    const imc = p / (a * a);
    return imc.toFixed(1);
  };

  const classificarIMC = (imc) => {
    if (!imc) return '';
    const val = parseFloat(imc);
    if (val < 18.5) return 'Abaixo do peso';
    if (val < 25.0) return 'Peso normal (Eutrofia)';
    if (val < 30.0) return 'Sobrepeso';
    if (val < 35.0) return 'Obesidade Grau I';
    if (val < 40.0) return 'Obesidade Grau II';
    return 'Obesidade Grau III (Mórbida)';
  };

  const formatarWhatsapp = (val) => {
    const numbers = val.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').slice(0, 15);
  };

  const formatarHorario = (val) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) return '';
    if (clean.length === 1) return `0${clean}:00`;
    if (clean.length === 2) return `${clean}:00`;
    if (clean.length === 3) return `0${clean[0]}:${clean.slice(1)}`;
    if (clean.length === 4) return `${clean.slice(0, 2)}:${clean.slice(2)}`;
    return val;
  };

  const handleCheckboxGroup = (field, item) => {
    setFormData((prev) => {
      const currentList = prev[field] || [];
      if (item === 'Nenhum') {
        return { ...prev, [field]: ['Nenhum'] };
      }
      const filtered = currentList.filter((i) => i !== 'Nenhum');
      if (filtered.includes(item)) {
        const next = filtered.filter((i) => i !== item);
        return { ...prev, [field]: next.length === 0 ? ['Nenhum'] : next };
      }
      return { ...prev, [field]: [...filtered, item] };
    });
  };

  const handleNextStep = () => {
    const errs = {};
    if (step === 1) {
      const nomeLimpo = formData.nome.trim().replace(/\s+/g, ' ');
      if (!nomeLimpo) {
        errs.nome = 'O nome completo é obrigatório.';
      } else if (nomeLimpo.split(' ').length < 2) {
        errs.nome = 'Por favor, informe ao menos nome e sobrenome.';
      }

      if (formData.data_nascimento && new Date(formData.data_nascimento) > new Date()) {
        errs.data_nascimento = 'A data de nascimento não pode ser futura.';
      }

      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        errs.email = 'E-mail em formato inválido.';
      }

      setFormData((prev) => ({ ...prev, nome: nomeLimpo }));
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const imcCalculado = calcularIMC(formData.peso_inicial, formData.altura);
  const idadeCalculada = calcularIdade(formData.data_nascimento);

  const stepsList = [
    { num: 1, label: 'Pessoal' },
    { num: 2, label: 'Clínica' },
    { num: 3, label: 'Hábitos' },
    { num: 4, label: 'Anamnese' },
    { num: 5, label: 'Resumo' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>
            {patient ? 'Editar Paciente' : 'Novo Cadastro de Paciente'}
          </h2>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✖
          </button>
        </div>

        {/* Stepper Visual SaaS */}
        <div className="stepper-bar">
          {stepsList.map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => setStep(s.num)}
                style={{ cursor: 'pointer' }}
              >
                <div className="stepper-number">{isCompleted ? '✓' : s.num}</div>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Etapa 1: Pessoal */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Maria das Dores Silva"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
              {errors.nome && <span style={{ color: 'var(--error)', fontSize: '12px' }}>{errors.nome}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Data de Nascimento</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                />
                {idadeCalculada !== null && (
                  <span style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px', fontWeight: '600' }}>
                    Idade calculada: {idadeCalculada} anos
                  </span>
                )}
                {errors.data_nascimento && (
                  <span style={{ color: 'var(--error)', fontSize: '12px' }}>{errors.data_nascimento}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Sexo</label>
                <select
                  className="filter-select"
                  value={formData.sexo}
                  onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                >
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="(11) 99999-9999"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: formatarWhatsapp(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="paciente@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                {errors.email && <span style={{ color: 'var(--error)', fontSize: '12px' }}>{errors.email}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Profissão</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Engenheira"
                  value={formData.profissao}
                  onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="São Paulo"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estado (UF)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="SP"
                  maxLength={2}
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Etapa 2: Clínica */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Peso Inicial (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="70.5"
                  value={formData.peso_inicial}
                  onChange={(e) => setFormData({ ...formData, peso_inicial: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Altura (cm)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="170"
                  value={formData.altura}
                  onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">IMC Calculado (Automático)</label>
                <input
                  type="text"
                  className="form-input"
                  value={imcCalculado ? `${imcCalculado} kg/m²` : '--'}
                  disabled
                  style={{ backgroundColor: 'var(--bg)', fontWeight: 'bold', color: 'var(--primary)' }}
                />
                {imcCalculado && (
                  <span style={{ fontSize: '11px', color: 'var(--primary-hover)', fontWeight: '600' }}>
                    {classificarIMC(imcCalculado)}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Objetivos Principais</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  'Emagrecer',
                  'Ganhar massa',
                  'Controlar diabetes',
                  'Saúde geral',
                  'Performance esportiva',
                  'Reeducação alimentar',
                ].map((obj) => (
                  <label key={obj} style={{ fontSize: '14px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.objetivos.includes(obj)}
                      onChange={() => handleCheckboxGroup('objetivos', obj)}
                    />
                    {obj}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Patologias / Condições de Saúde</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  'Nenhum',
                  'Diabetes',
                  'Hipertensão',
                  'Hipotireoidismo',
                  'Hipertireoidismo',
                  'SOPA / PCOS',
                  'Doença celíaca',
                  'Colesterol alto',
                ].map((pat) => (
                  <label key={pat} style={{ fontSize: '14px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.patologias.includes(pat)}
                      onChange={() => handleCheckboxGroup('patologias', pat)}
                    />
                    {pat}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Restrições Alimentares</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {['Nenhum', 'Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'].map((rest) => (
                  <label key={rest} style={{ fontSize: '14px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.restricoes_alimentares.includes(rest)}
                      onChange={() => handleCheckboxGroup('restricoes_alimentares', rest)}
                    />
                    {rest}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Medicamentos Contínuos & Suplementos</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Papanicolau, Whey Protein, Multivitamínico"
                value={formData.medicamentos_continuos}
                onChange={(e) => setFormData({ ...formData, medicamentos_continuos: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Etapa 3: Hábitos */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Refeições / dia</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.refeicoes_por_dia}
                  onChange={(e) => setFormData({ ...formData, refeicoes_por_dia: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Consumo Diário de Água (litros)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  placeholder="2.5"
                  value={formData.litros_agua}
                  onChange={(e) => setFormData({ ...formData, litros_agua: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Horário que Acorda (ex: 630 → 06:30)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="06:30"
                  value={formData.horario_acorda}
                  onBlur={(e) => setFormData({ ...formData, horario_acorda: formatarHorario(e.target.value) })}
                  onChange={(e) => setFormData({ ...formData, horario_acorda: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Horário que Dorme (ex: 2230 → 22:30)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="22:30"
                  value={formData.horario_dorme}
                  onBlur={(e) => setFormData({ ...formData, horario_dorme: formatarHorario(e.target.value) })}
                  onChange={(e) => setFormData({ ...formData, horario_dorme: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nível de Atividade Física Habitual</label>
              <select
                className="filter-select"
                value={formData.nivel_atividade}
                onChange={(e) => setFormData({ ...formData, nivel_atividade: e.target.value })}
              >
                <option value="Sedentário">Sedentário</option>
                <option value="Levemente ativo">Levemente ativo</option>
                <option value="Moderadamente ativo">Moderadamente ativo</option>
                <option value="Muito ativo">Muito ativo</option>
                <option value="Extremamente ativo">Extremamente ativo</option>
              </select>
            </div>
          </div>
        )}

        {/* Etapa 4: Anamnese */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Motivo Principal da Consulta</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Ex: Queixa de fadiga e desejo de reeducação para hipertrofia"
                value={formData.motivo_consulta}
                onChange={(e) => setFormData({ ...formData, motivo_consulta: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Qualidade do Sono</label>
                <select
                  className="filter-select"
                  value={formData.qualidade_sono}
                  onChange={(e) => setFormData({ ...formData, qualidade_sono: e.target.value })}
                >
                  <option value="Excelente">Excelente</option>
                  <option value="Boa">Boa</option>
                  <option value="Regular">Regular</option>
                  <option value="Insônia / Ruim">Insônia / Ruim</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nível de Estresse</label>
                <select
                  className="filter-select"
                  value={formData.nivel_estresse}
                  onChange={(e) => setFormData({ ...formData, nivel_estresse: e.target.value })}
                >
                  <option value="Baixo">Baixo</option>
                  <option value="Médio">Médio</option>
                  <option value="Alto">Alto</option>
                  <option value="Muito Alto">Muito Alto</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 5: Resumo */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)' }}>
              Confirmação dos Dados do Paciente
            </h3>
            <div
              style={{
                backgroundColor: 'var(--bg)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              <div><strong>Nome:</strong> {formData.nome}</div>
              <div><strong>Sexo / Idade:</strong> {formData.sexo} {idadeCalculada !== null ? `(${idadeCalculada} anos)` : ''}</div>
              <div><strong>Contato:</strong> WhatsApp {formData.whatsapp || 'N/I'} | E-mail: {formData.email || 'N/I'}</div>
              <div><strong>Antropometria:</strong> {formData.peso_inicial || '--'} kg | {formData.altura || '--'} cm | IMC: {imcCalculado ? `${imcCalculado} (${classificarIMC(imcCalculado)})` : 'N/I'}</div>
              <div><strong>Objetivos:</strong> {formData.objetivos.join(', ')}</div>
            </div>
          </div>
        )}

        {/* Botões do Stepper */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          {step > 1 ? (
            <button className="action-btn-sm" onClick={() => setStep((prev) => prev - 1)}>
              ← Voltar
            </button>
          ) : (
            <div></div>
          )}

          {step < 5 ? (
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleNextStep}>
              Avançar →
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 24px' }}
              disabled={loading}
              onClick={() => onSave(formData)}
            >
              {loading ? 'Salvando...' : 'Salvar Paciente'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
