import React, { useState } from 'react';

export default function PatientFormModal({ patient, onClose, onSave, loading }) {
  const [step, setStep] = useState(1); // 1: Pessoal, 2: Clínico, 3: Hábitos
  const [formData, setFormData] = useState({
    nome: patient?.nome || '',
    data_nascimento: patient?.data_nascimento || '',
    sexo: patient?.sexo || 'Feminino',
    telefone: patient?.telefone || '',
    whatsapp: patient?.whatsapp || '',
    email: patient?.email || '',

    peso_inicial: patient?.peso_inicial || '',
    altura: patient?.altura || '',
    objetivos: patient?.objetivos || [],
    objetivo_texto: patient?.objetivo_texto || '',
    nivel_atividade: patient?.nivel_atividade || 'Sedentário',
    patologias: patient?.patologias || [],
    patologia_texto: '',
    restricoes_alimentares: patient?.restricoes_alimentares || [],
    restricao_texto: '',
    alergias: patient?.alergias || [],
    alergia_texto: '',
    medicamentos_continuos: patient?.medicamentos_continuos || '',
    suplementos_em_uso: patient?.suplementos_em_uso || '',

    refeicoes_por_dia: patient?.refeicoes_por_dia || '',
    horario_acorda: patient?.horario_acorda || '',
    horario_dorme: patient?.horario_dorme || '',
    litros_agua: patient?.litros_agua || '',
    atividade_fisica: patient?.atividade_fisica ?? false,
    atividade_fisica_descricao: patient?.atividade_fisica_descricao || '',
    observacoes: patient?.observacoes || '',
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
    return (p / (a * a)).toFixed(1);
  };

  const formatarTelefone = (val) => {
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
        return { ...prev, [field]: next.length === 0 ? [] : next };
      }
      return { ...prev, [field]: [...filtered, item] };
    });
  };

  const addCustomItem = (field, textStateField) => {
    const text = formData[textStateField].trim();
    if (text) {
      setFormData(prev => {
        const currentList = prev[field] || [];
        const filtered = currentList.filter((i) => i !== 'Nenhum');
        if (!filtered.includes(text)) {
          return { ...prev, [field]: [...filtered, text], [textStateField]: '' };
        }
        return { ...prev, [textStateField]: '' };
      });
    }
  };

  const handleNextStep = () => {
    const errs = {};
    if (step === 1) {
      const nomeLimpo = formData.nome.trim().replace(/\s+/g, ' ');
      if (!nomeLimpo) {
        errs.nome = 'O nome completo é obrigatório.';
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
    if (step < 3) setStep((prev) => prev + 1);
    else onSave(formData);
  };

  const idadeCalculada = calcularIdade(formData.data_nascimento);
  const imcCalculado = calcularIMC(formData.peso_inicial, formData.altura);

  const stepsList = [
    { num: 1, label: 'Pessoal' },
    { num: 2, label: 'Clínico' },
    { num: 3, label: 'Hábitos' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>
            {patient ? 'Editar Paciente' : 'Novo Paciente'}
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>
            ✖
          </button>
        </div>

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
              <input type="text" className="form-input" placeholder="Ex: Maria das Dores Silva" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
              {errors.nome && <span style={{ color: 'var(--error)', fontSize: '12px' }}>{errors.nome}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Data de Nascimento</label>
                <input type="date" className="form-input" value={formData.data_nascimento} onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })} />
                {idadeCalculada !== null && (
                  <span style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px', fontWeight: '600' }}>
                    Idade: {idadeCalculada} anos
                  </span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Sexo</label>
                <select className="filter-select" value={formData.sexo} onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input type="text" className="form-input" placeholder="(11) 99999-9999" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: formatarTelefone(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input type="text" className="form-input" placeholder="(11) 99999-9999" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: formatarTelefone(e.target.value) })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input type="email" className="form-input" placeholder="paciente@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              {errors.email && <span style={{ color: 'var(--error)', fontSize: '12px' }}>{errors.email}</span>}
            </div>
          </div>
        )}

        {/* Etapa 2: Clínico */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Peso Atual (kg)</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" step="0.1" className="form-input" value={formData.peso_inicial} onChange={(e) => setFormData({ ...formData, peso_inicial: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Altura (cm)</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" className="form-input" value={formData.altura} onChange={(e) => setFormData({ ...formData, altura: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">IMC Calculado</label>
                <input type="text" className="form-input" value={imcCalculado || '--'} disabled style={{ backgroundColor: 'var(--bg)', fontWeight: 'bold' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Objetivos Principais</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance esportiva', 'Reeducação alimentar'].map((obj) => (
                  <label key={obj} style={{ fontSize: '14px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.objetivos.includes(obj)} onChange={() => handleCheckboxGroup('objetivos', obj)} />
                    {obj}
                  </label>
                ))}
              </div>
              <input type="text" className="form-input" placeholder="Outro objetivo..." value={formData.objetivo_texto} onChange={(e) => setFormData({ ...formData, objetivo_texto: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Nível de Atividade Física</label>
              <select className="filter-select" value={formData.nivel_atividade} onChange={(e) => setFormData({ ...formData, nivel_atividade: e.target.value })}>
                <option value="Sedentário">Sedentário</option>
                <option value="Levemente ativo">Levemente ativo</option>
                <option value="Moderadamente ativo">Moderadamente ativo</option>
                <option value="Muito ativo">Muito ativo</option>
                <option value="Extremamente ativo">Extremamente ativo</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Patologias / Condições de Saúde</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {['Nenhum', 'Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'].map((pat) => (
                  <label key={pat} style={{ fontSize: '14px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.patologias.includes(pat)} onChange={() => handleCheckboxGroup('patologias', pat)} />
                    {pat}
                  </label>
                ))}
                {formData.patologias.filter(p => !['Nenhum', 'Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'].includes(p)).map(customPat => (
                   <label key={customPat} style={{ fontSize: '14px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                     <input type="checkbox" checked={true} onChange={() => handleCheckboxGroup('patologias', customPat)} />
                     {customPat}
                   </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="form-input" placeholder="Adicionar patologia..." value={formData.patologia_texto} onChange={(e) => setFormData({ ...formData, patologia_texto: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomItem('patologias', 'patologia_texto'))} />
                <button type="button" className="action-btn-sm" onClick={() => addCustomItem('patologias', 'patologia_texto')}>+</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Restrições Alimentares</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {['Nenhum', 'Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'].map((rest) => (
                  <label key={rest} style={{ fontSize: '14px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.restricoes_alimentares.includes(rest)} onChange={() => handleCheckboxGroup('restricoes_alimentares', rest)} />
                    {rest}
                  </label>
                ))}
                {formData.restricoes_alimentares.filter(r => !['Nenhum', 'Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'].includes(r)).map(customRest => (
                   <label key={customRest} style={{ fontSize: '14px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                     <input type="checkbox" checked={true} onChange={() => handleCheckboxGroup('restricoes_alimentares', customRest)} />
                     {customRest}
                   </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="form-input" placeholder="Adicionar restrição..." value={formData.restricao_texto} onChange={(e) => setFormData({ ...formData, restricao_texto: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomItem('restricoes_alimentares', 'restricao_texto'))} />
                <button type="button" className="action-btn-sm" onClick={() => addCustomItem('restricoes_alimentares', 'restricao_texto')}>+</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Alergias Alimentares</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {['Nenhum', 'Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'].map((alerg) => (
                  <label key={alerg} style={{ fontSize: '14px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.alergias.includes(alerg)} onChange={() => handleCheckboxGroup('alergias', alerg)} />
                    {alerg}
                  </label>
                ))}
                {formData.alergias.filter(a => !['Nenhum', 'Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'].includes(a)).map(customAlerg => (
                   <label key={customAlerg} style={{ fontSize: '14px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                     <input type="checkbox" checked={true} onChange={() => handleCheckboxGroup('alergias', customAlerg)} />
                     {customAlerg}
                   </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="form-input" placeholder="Adicionar alergia..." value={formData.alergia_texto} onChange={(e) => setFormData({ ...formData, alergia_texto: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomItem('alergias', 'alergia_texto'))} />
                <button type="button" className="action-btn-sm" onClick={() => addCustomItem('alergias', 'alergia_texto')}>+</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Medicamentos Contínuos</label>
              <input type="text" className="form-input" value={formData.medicamentos_continuos} onChange={(e) => setFormData({ ...formData, medicamentos_continuos: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Suplementos em Uso</label>
              <input type="text" className="form-input" value={formData.suplementos_em_uso} onChange={(e) => setFormData({ ...formData, suplementos_em_uso: e.target.value })} />
            </div>
          </div>
        )}

        {/* Etapa 3: Hábitos */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto' }}>
            <div className="form-group">
              <label className="form-label">Quantas refeições faz por dia?</label>
              <input type="number" className="form-input" value={formData.refeicoes_por_dia} onChange={(e) => setFormData({ ...formData, refeicoes_por_dia: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Horário que acorda</label>
                <input type="text" className="form-input" placeholder="06:30" value={formData.horario_acorda} onBlur={(e) => setFormData({ ...formData, horario_acorda: formatarHorario(e.target.value) })} onChange={(e) => setFormData({ ...formData, horario_acorda: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Horário que dorme</label>
                <input type="text" className="form-input" placeholder="23:00" value={formData.horario_dorme} onBlur={(e) => setFormData({ ...formData, horario_dorme: formatarHorario(e.target.value) })} onChange={(e) => setFormData({ ...formData, horario_dorme: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantidade de água por dia (litros)</label>
              <input type="number" step="0.1" className="form-input" value={formData.litros_agua} onChange={(e) => setFormData({ ...formData, litros_agua: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Pratica atividade física?</label>
              <select className="filter-select" value={formData.atividade_fisica ? "Sim" : "Não"} onChange={(e) => setFormData({ ...formData, atividade_fisica: e.target.value === 'Sim' })}>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            {formData.atividade_fisica && (
              <div className="form-group">
                <label className="form-label">Qual atividade e frequência semanal?</label>
                <input type="text" className="form-input" placeholder="Ex: Musculação 4x na semana" value={formData.atividade_fisica_descricao} onChange={(e) => setFormData({ ...formData, atividade_fisica_descricao: e.target.value })} />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Observações Gerais</label>
              <textarea className="form-input" rows={3} value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          {step > 1 ? (
            <button className="action-btn-sm" onClick={() => setStep((prev) => prev - 1)}>
              ← Voltar
            </button>
          ) : (
            <div></div>
          )}

          <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} disabled={loading} onClick={handleNextStep}>
            {step < 3 ? 'Avançar →' : (loading ? 'Salvando...' : 'Salvar Paciente')}
          </button>
        </div>
      </div>
    </div>
  );
}
