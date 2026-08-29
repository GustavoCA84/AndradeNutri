import React, { useState, useEffect, useCallback } from 'react';
import { client } from '../lib/neon';

// Dias da semana padrão
const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

// Refeições padrão com ícones e rótulos
const REFEICOES = [
  { key: 'cafe_da_manha', label: 'Café da Manhã', icon: '☕' },
  { key: 'lanche_manha', label: 'Lanche da Manhã', icon: '🍎' },
  { key: 'almoco', label: 'Almoço', icon: '🍲' },
  { key: 'lanche_tarde', label: 'Lanche da Tarde', icon: '🥪' },
  { key: 'jantar', label: 'Jantar', icon: '🥗' },
];

// Mensagens dinâmicas de loading para a IA
const LOADING_MESSAGES = [
  'Buscando dados metabólicos e objetivos do paciente...',
  'Analisando histórico clínico, alergias e restrições...',
  'IA calculando cardápio semanal com 3 opções por refeição...',
  'Calculando valores nutricionais (Calorias, Proteínas, Carbos e Gorduras)...',
  'Finalizando detalhes e porções do plano alimentar...',
];

// Criação de template vazio com 3 opções nutricionais por refeição
const criarOpcaoVazia = (num) => ({
  nome_opcao: `Opção ${num}`,
  descricao: '',
  calorias_kcal: 0,
  proteinas_g: 0,
  carboidratos_g: 0,
  gorduras_g: 0,
});

const criarPlanoVazio = () => {
  return DIAS_SEMANA.map((dia) => ({
    dia,
    refeicoes: {
      cafe_da_manha: [criarOpcaoVazia(1), criarOpcaoVazia(2), criarOpcaoVazia(3)],
      lanche_manha: [criarOpcaoVazia(1), criarOpcaoVazia(2), criarOpcaoVazia(3)],
      almoco: [criarOpcaoVazia(1), criarOpcaoVazia(2), criarOpcaoVazia(3)],
      lanche_tarde: [criarOpcaoVazia(1), criarOpcaoVazia(2), criarOpcaoVazia(3)],
      jantar: [criarOpcaoVazia(1), criarOpcaoVazia(2), criarOpcaoVazia(3)],
    },
  }));
};

/**
 * Normaliza o plano semanal retornado da IA ou do banco (garantindo compatibilidade reversa)
 */
const normalizarPlanoSemanal = (planoCru) => {
  if (!Array.isArray(planoCru)) return criarPlanoVazio();

  return DIAS_SEMANA.map((diaNome) => {
    const foundDay = planoCru.find(
      (d) => d.dia && d.dia.toLowerCase().includes(diaNome.toLowerCase().split('-')[0])
    ) || { refeicoes: {} };

    const refeicoesNormalizadas = {};

    REFEICOES.forEach((ref) => {
      const rawOpcoes = foundDay.refeicoes?.[ref.key];

      if (Array.isArray(rawOpcoes) && rawOpcoes.length > 0) {
        // Se já for array de objetos estruturados
        if (typeof rawOpcoes[0] === 'object' && rawOpcoes[0] !== null) {
          const opcoes = rawOpcoes.slice(0, 3).map((op, idx) => ({
            nome_opcao: op.nome_opcao || `Opção ${idx + 1}`,
            descricao: op.descricao || '',
            calorias_kcal: Number(op.calorias_kcal) || 0,
            proteinas_g: Number(op.proteinas_g) || 0,
            carboidratos_g: Number(op.carboidratos_g) || 0,
            gorduras_g: Number(op.gorduras_g) || 0,
          }));

          while (opcoes.length < 3) {
            opcoes.push(criarOpcaoVazia(opcoes.length + 1));
          }
          refeicoesNormalizadas[ref.key] = opcoes;
        } else {
          // Compatibilidade com planos antigos salvos como array de strings simples
          const opcoes = [
            {
              nome_opcao: 'Opção 1 — Principal',
              descricao: rawOpcoes.filter(Boolean).join(' + ') || '',
              calorias_kcal: 350,
              proteinas_g: 20,
              carboidratos_g: 40,
              gorduras_g: 10,
            },
            criarOpcaoVazia(2),
            criarOpcaoVazia(3),
          ];
          refeicoesNormalizadas[ref.key] = opcoes;
        }
      } else {
        refeicoesNormalizadas[ref.key] = [criarOpcaoVazia(1), criarOpcaoVazia(2), criarOpcaoVazia(3)];
      }
    });

    return {
      dia: diaNome,
      refeicoes: refeicoesNormalizadas,
    };
  });
};

export default function MealPlanView({ patient, nutriaId }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Estados de visualização e edição
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'edit'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Formulário do Plano Atual
  const [planTitle, setPlanTitle] = useState('Plano Alimentar Semanal');
  const [weeklyPlan, setWeeklyPlan] = useState(criarPlanoVazio());

  // Estados da IA & Salvamento
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Carregar histórico de planos do paciente no Neon
  const loadPlanHistory = useCallback(async () => {
    if (!patient?.id) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await client
        .from('planos_alimentares')
        .select('*')
        .eq('paciente_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de planos:', error);
      } else {
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado ao carregar planos:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    loadPlanHistory();
  }, [loadPlanHistory]);

  // Mensagens rotativas durante o loading da IA
  useEffect(() => {
    let interval;
    if (isGenerating) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2400);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const showToast = (text, type = 'info', duration = 4000) => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), duration);
  };

  // Gerar Plano com IA chamando o backend /api/gerar-plano
  const handleGenerateAIPlan = async () => {
    setIsGenerating(true);
    try {
      const dadosPaciente = {
        nome: patient.nome,
        idade: patient.data_nascimento
          ? new Date().getFullYear() - new Date(patient.data_nascimento).getFullYear()
          : null,
        sexo: patient.sexo || 'Não informado',
        peso_atual_kg: patient.peso_inicial || null,
        altura_cm: patient.altura || null,
        objetivos: patient.objetivos || [],
        objetivo_complementar: patient.objetivo_texto || '',
        nivel_atividade_fisica: patient.nivel_atividade || 'Sedentário',
        patologias: patient.patologias || [],
        medicamentos_continuos: patient.medicamentos_continuos || 'Nenhum',
        restricoes_alimentares: patient.restricoes_alimentares || [],
        alergias: patient.alergias || [],
        suplementos_em_uso: patient.suplementos_em_uso || 'Nenhum',
        rotina_refeicoes_por_dia: patient.refeicoes_por_dia || 5,
        horario_acorda: patient.horario_acorda || '07:00',
        horario_dorme: patient.horario_dorme || '23:00',
        consumo_agua_litros: patient.litros_agua || 2.0,
        observacoes_adicionais: patient.observacoes || '',
      };

      const response = await fetch('/api/gerar-plano', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dadosPaciente }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || errorBody.details || `Erro HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.plano_semanal || !Array.isArray(result.plano_semanal)) {
        throw new Error('Formato de plano retornado pela IA é inválido.');
      }

      const normalizedPlan = normalizarPlanoSemanal(result.plano_semanal);

      setWeeklyPlan(normalizedPlan);
      setPlanTitle(`Plano Nutricional — ${patient.nome.split(' ')[0]} (${new Date().toLocaleDateString('pt-BR')})`);
      setSelectedPlan(null);
      setViewMode('edit');
      setActiveDayIndex(0);
      showToast('✨ Plano alimentar com 3 opções e valores nutricionais gerado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro na geração via IA:', err);
      showToast(
        'Não foi possível gerar o plano com IA no momento. Deseja tentar novamente ou criar um Plano Manual?',
        'error',
        6000
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Iniciar criação manual
  const handleStartManualPlan = () => {
    setWeeklyPlan(criarPlanoVazio());
    setPlanTitle(`Plano Personalizado — ${patient.nome.split(' ')[0]} (${new Date().toLocaleDateString('pt-BR')})`);
    setSelectedPlan(null);
    setViewMode('edit');
    setActiveDayIndex(0);
  };

  // Atualizar campo de opção específico
  const handleOptionFieldChange = (dayIndex, mealKey, optionIndex, field, value) => {
    setWeeklyPlan((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[dayIndex].refeicoes[mealKey][optionIndex][field] = value;
      return next;
    });
  };

  // Salvar plano no banco Neon
  const handleSavePlan = async () => {
    if (!planTitle.trim()) {
      showToast('Por favor, informe um título para o plano.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        paciente_id: patient.id,
        nutricionista_id: nutriaId || 'nutri-default',
        titulo: planTitle.trim(),
        conteudo: {
          plano_semanal: weeklyPlan,
          gerado_em: new Date().toISOString(),
          paciente_nome: patient.nome,
        },
        updated_at: new Date().toISOString(),
      };

      let error = null;

      if (selectedPlan?.id) {
        const res = await client
          .from('planos_alimentares')
          .update(payload)
          .eq('id', selectedPlan.id)
          .eq('paciente_id', patient.id);
        error = res.error;
      } else {
        const res = await client.from('planos_alimentares').insert([payload]);
        error = res.error;
      }

      if (error) throw error;

      showToast('✅ Plano alimentar salvo com sucesso no prontuário!', 'success');
      await loadPlanHistory();
      setViewMode('list');
    } catch (err) {
      console.error('Erro ao salvar plano alimentar:', err);
      showToast('Erro ao salvar o plano alimentar: ' + (err.message || 'Tente novamente.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Visualizar / Editar plano do histórico
  const handleOpenHistoricalPlan = (plan) => {
    setSelectedPlan(plan);
    setPlanTitle(plan.titulo || 'Plano Alimentar Semanal');
    if (plan.conteudo?.plano_semanal) {
      setWeeklyPlan(normalizarPlanoSemanal(plan.conteudo.plano_semanal));
    } else {
      setWeeklyPlan(criarPlanoVazio());
    }
    setViewMode('edit');
    setActiveDayIndex(0);
  };

  // Excluir plano do histórico
  const handleDeletePlan = async (planId, e) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja remover este plano alimentar do histórico?')) {
      return;
    }

    try {
      const { error } = await client
        .from('planos_alimentares')
        .delete()
        .eq('id', planId)
        .eq('paciente_id', patient.id);

      if (error) throw error;

      showToast('Plano alimentar removido com sucesso.', 'info');
      if (selectedPlan?.id === planId) {
        setViewMode('list');
        setSelectedPlan(null);
      }
      loadPlanHistory();
    } catch (err) {
      console.error('Erro ao excluir plano:', err);
      showToast('Erro ao remover o plano: ' + (err.message || ''), 'error');
    }
  };

  // Cálculos do Resumo Nutricional do Dia Ativo (baseado na Opção 1 Principal)
  const calcularTotaisDoDia = () => {
    const diaAtual = weeklyPlan[activeDayIndex];
    if (!diaAtual?.refeicoes) return { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 };

    let cal = 0, prot = 0, carb = 0, gord = 0;

    REFEICOES.forEach((ref) => {
      const op1 = diaAtual.refeicoes[ref.key]?.[0] || {};
      cal += Number(op1.calorias_kcal) || 0;
      prot += Number(op1.proteinas_g) || 0;
      carb += Number(op1.carboidratos_g) || 0;
      gord += Number(op1.gorduras_g) || 0;
    });

    return { calorias: cal, proteinas: prot, carboidratos: carb, gorduras: gord };
  };

  const totaisDia = calcularTotaisDoDia();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Notificação Toast */}
      {toastMessage && (
        <div
          className={`alert-${toastMessage.type === 'error' ? 'error' : 'success'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* MODAL / OVERLAY DE CARREGAMENTO DINÂMICO DA IA */}
      {isGenerating && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-card"
            style={{
              maxWidth: '500px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px 30px',
              gap: '20px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                boxShadow: 'var(--shadow-glow)',
                animation: 'pulse 1.8s infinite ease-in-out',
              }}
            >
              ✨
            </div>

            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Gerando 3 Opções por Refeição com IA
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--primary)',
                  fontWeight: '600',
                  minHeight: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'fadeIn 0.4s ease',
                }}
              >
                {LOADING_MESSAGES[loadingStep]}
              </p>
            </div>

            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'var(--accent-gradient)',
                  width: `${((loadingStep + 1) / LOADING_MESSAGES.length) * 100}%`,
                  transition: 'width 0.4s ease',
                  borderRadius: '999px',
                }}
              ></div>
            </div>

            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Calculando calorias (kcal) e macronutrientes (P/C/G) para cada preparação...
            </span>
          </div>
        </div>
      )}

      {/* CABEÇALHO DO MÓDULO DE PLANOS */}
      <div className="metric-card full-width">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 className="metric-title" style={{ fontSize: '18px', textTransform: 'none', color: 'var(--text-primary)' }}>
              🥗 Planos Alimentares Semanais
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Cardápios inteligentes com 3 opções por refeição e valores nutricionais calculados para {patient.nome}.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {viewMode !== 'list' && (
              <button className="action-btn-sm" onClick={() => setViewMode('list')}>
                ← Voltar ao Histórico
              </button>
            )}

            <button
              className="action-btn-sm"
              onClick={handleStartManualPlan}
              disabled={isGenerating}
              title="Criar cardápio manualmente"
            >
              📝 Criar Manualmente
            </button>

            <button
              className="btn-primary"
              onClick={handleGenerateAIPlan}
              disabled={isGenerating}
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              ✨ Gerar Plano com IA
            </button>
          </div>
        </div>
      </div>

      {/* MODO 1: LISTA / HISTÓRICO DE PLANOS */}
      {viewMode === 'list' && (
        <div className="metric-card full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Histórico de Planos do Paciente ({history.length})
            </h4>
          </div>

          {loadingHistory ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Carregando histórico de planos alimentares...
            </div>
          ) : history.length === 0 ? (
            <div className="empty-patients-msg" style={{ padding: '48px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍽️</div>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                Nenhum plano alimentar gerado ainda
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 20px auto' }}>
                Clique no botão <strong>"✨ Gerar Plano com IA"</strong> acima para criar um cardápio completo de 7 dias com 3 opções por refeição e valores calóricos calculados.
              </p>
              <button className="btn-primary" onClick={handleGenerateAIPlan}>
                ✨ Gerar Plano com IA
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {history.map((plan) => (
                <div
                  key={plan.id}
                  className="patient-item"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleOpenHistoricalPlan(plan)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {plan.titulo || 'Plano Alimentar Semanal'}
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                        📅 Criado em: {new Date(plan.created_at).toLocaleDateString('pt-BR')} às {new Date(plan.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <button
                      type="button"
                      title="Excluir Plano"
                      onClick={(e) => handleDeletePlan(plan.id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--error)',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      🗑️
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span className="contact-chip" style={{ fontSize: '12px' }}>
                      ⚡ 7 Dias (Seg — Dom)
                    </span>
                    <span className="contact-chip" style={{ fontSize: '12px' }}>
                      🍽️ 3 Opções por Refeição
                    </span>
                    <span className="contact-chip" style={{ fontSize: '12px' }}>
                      🔥 Macros & Calorias
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)' }}>
                      Visualizar & Editar Plano →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODO 2: INTERFACE DE EDIÇÃO / CARDÁPIO COM 3 OPÇÕES E MACROS */}
      {viewMode === 'edit' && (
        <div className="metric-card full-width" style={{ gap: '24px' }}>
          {/* Barra de Título do Plano e Ações */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div style={{ flex: '1', minWidth: '260px' }}>
              <label className="form-label">Título do Plano Alimentar</label>
              <input
                type="text"
                className="form-input"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder="Ex: Dieta de Emagrecimento — Fase 1"
                style={{ fontWeight: '700', fontSize: '16px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="action-btn-sm"
                onClick={() => window.print()}
                title="Imprimir plano atual"
              >
                🖨️ Imprimir
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleSavePlan}
                disabled={isSaving}
                style={{ padding: '11px 24px', fontSize: '14px' }}
              >
                {isSaving ? 'Salvando...' : '💾 Salvar Plano Alimentar'}
              </button>
            </div>
          </div>

          {/* Abas dos 7 Dias da Semana */}
          <div className="patient-tabs-header" style={{ width: '100%', overflowX: 'auto', display: 'flex', padding: '6px', gap: '6px' }}>
            {DIAS_SEMANA.map((dia, idx) => (
              <button
                key={dia}
                type="button"
                className={`tab-btn ${activeDayIndex === idx ? 'active' : ''}`}
                style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', minWidth: '110px' }}
                onClick={() => setActiveDayIndex(idx)}
              >
                {dia.split('-')[0]}
              </button>
            ))}
          </div>

          {/* Card de Resumo Nutricional Estimado do Dia */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 128, 0.14) 0%, rgba(37, 99, 235, 0.08) 100%)',
              border: '1px solid rgba(0, 0, 128, 0.3)',
              borderRadius: 'var(--radius)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', color: 'var(--primary)' }}>
                Meta Estimada do Dia ({weeklyPlan[activeDayIndex]?.dia || DIAS_SEMANA[activeDayIndex]})
              </span>
              <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                🔥 Total: ~{totaisDia.calorias} kcal / dia
              </h4>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span className="contact-chip" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', fontWeight: '700' }}>
                🍗 Proteínas: {totaisDia.proteinas}g
              </span>
              <span className="contact-chip" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', fontWeight: '700' }}>
                🍞 Carbos: {totaisDia.carboidratos}g
              </span>
              <span className="contact-chip" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', fontWeight: '700' }}>
                🥑 Gorduras: {totaisDia.gorduras}g
              </span>
            </div>
          </div>

          {/* Listagem das 5 Refeições do Dia */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {REFEICOES.map((ref) => {
              const opcoes = weeklyPlan[activeDayIndex]?.refeicoes?.[ref.key] || [
                criarOpcaoVazia(1),
                criarOpcaoVazia(2),
                criarOpcaoVazia(3),
              ];

              return (
                <div
                  key={ref.key}
                  style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px 22px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {/* Cabeçalho da Refeição */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{ref.icon}</span>
                      <div>
                        <h4 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {ref.label}
                        </h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          3 opções alternativas para o paciente escolher
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid das 3 Opções com Valores Nutricionais */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {opcoes.map((opcao, optIdx) => (
                      <div
                        key={optIdx}
                        style={{
                          background: 'var(--card-bg)',
                          borderRadius: 'var(--radius)',
                          padding: '16px',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        {/* Título da Opção */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={opcao.nome_opcao || `Opção ${optIdx + 1}`}
                            onChange={(e) =>
                              handleOptionFieldChange(activeDayIndex, ref.key, optIdx, 'nome_opcao', e.target.value)
                            }
                            style={{
                              fontWeight: '700',
                              fontSize: '13px',
                              padding: '4px 8px',
                              height: '32px',
                              background: 'transparent',
                              border: '1px dashed var(--border)',
                            }}
                          />
                        </div>

                        {/* Badges de Macros / Calorias */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '6px',
                            background: 'var(--bg-secondary)',
                            padding: '8px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>
                              🔥 Kcal
                            </label>
                            <input
                              type="number"
                              className="form-input"
                              value={opcao.calorias_kcal ?? ''}
                              onChange={(e) =>
                                handleOptionFieldChange(activeDayIndex, ref.key, optIdx, 'calorias_kcal', e.target.value)
                              }
                              style={{ height: '28px', padding: '2px 6px', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>
                              🍗 Prot (g)
                            </label>
                            <input
                              type="number"
                              className="form-input"
                              value={opcao.proteinas_g ?? ''}
                              onChange={(e) =>
                                handleOptionFieldChange(activeDayIndex, ref.key, optIdx, 'proteinas_g', e.target.value)
                              }
                              style={{ height: '28px', padding: '2px 6px', fontSize: '12px', textAlign: 'center' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>
                              🍞 Carb (g)
                            </label>
                            <input
                              type="number"
                              className="form-input"
                              value={opcao.carboidratos_g ?? ''}
                              onChange={(e) =>
                                handleOptionFieldChange(activeDayIndex, ref.key, optIdx, 'carboidratos_g', e.target.value)
                              }
                              style={{ height: '28px', padding: '2px 6px', fontSize: '12px', textAlign: 'center' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>
                              🥑 Gord (g)
                            </label>
                            <input
                              type="number"
                              className="form-input"
                              value={opcao.gorduras_g ?? ''}
                              onChange={(e) =>
                                handleOptionFieldChange(activeDayIndex, ref.key, optIdx, 'gorduras_g', e.target.value)
                              }
                              style={{ height: '28px', padding: '2px 6px', fontSize: '12px', textAlign: 'center' }}
                            />
                          </div>
                        </div>

                        {/* Descrição dos Alimentos */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Alimentos & Porções:
                          </label>
                          <textarea
                            className="form-input"
                            rows={3}
                            placeholder="Descreva os alimentos desta opção..."
                            value={opcao.descricao || ''}
                            onChange={(e) =>
                              handleOptionFieldChange(activeDayIndex, ref.key, optIdx, 'descricao', e.target.value)
                            }
                            style={{ fontSize: '13px', lineHeight: '1.4', padding: '8px 10px', resize: 'vertical' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra Inferior de Navegação entre Dias e Salvar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="action-btn-sm"
              onClick={() => setActiveDayIndex((prev) => Math.max(0, prev - 1))}
              disabled={activeDayIndex === 0}
            >
              ← Dia Anterior
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleSavePlan}
              disabled={isSaving}
              style={{ padding: '10px 24px' }}
            >
              {isSaving ? 'Salvando alterações...' : '💾 Salvar Plano Alimentar'}
            </button>

            <button
              type="button"
              className="action-btn-sm"
              onClick={() => setActiveDayIndex((prev) => Math.min(DIAS_SEMANA.length - 1, prev + 1))}
              disabled={activeDayIndex === DIAS_SEMANA.length - 1}
            >
              Próximo Dia →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
