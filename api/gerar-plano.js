import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

/**
 * Função utilitária para gerar o plano alimentar usando a SDK do Gemini
 * @param {Object} dadosPaciente - Objeto contendo os dados clínicos do paciente
 * @param {string} apiKey - Chave da API do Google Gemini
 * @returns {Promise<Object>} Objeto JSON do plano alimentar semanal
 */
export async function generateMealPlan(dadosPaciente, apiKey) {
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY não configurada no servidor.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Esquema de uma opção de refeição com descrição e valores nutricionais
  const opcaoSchema = {
    type: SchemaType.OBJECT,
    properties: {
      nome_opcao: {
        type: SchemaType.STRING,
        description: "Título da opção (ex: Opção 1 — Pão integral com ovos e fruta)",
      },
      descricao: {
        type: SchemaType.STRING,
        description: "Lista e descrição detalhada dos alimentos, porções e preparo.",
      },
      calorias_kcal: {
        type: SchemaType.NUMBER,
        description: "Valor calórico total estimado da refeição em kcal.",
      },
      proteinas_g: {
        type: SchemaType.NUMBER,
        description: "Gramas de proteína estimadas.",
      },
      carboidratos_g: {
        type: SchemaType.NUMBER,
        description: "Gramas de carboidratos estimadas.",
      },
      gorduras_g: {
        type: SchemaType.NUMBER,
        description: "Gramas de gorduras estimadas.",
      },
    },
    required: [
      "nome_opcao",
      "descricao",
      "calorias_kcal",
      "proteinas_g",
      "carboidratos_g",
      "gorduras_g",
    ],
  };

  // Esquema estruturado para 7 dias, 5 refeições e 3 opções nutricionais completas por refeição
  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      plano_semanal: {
        type: SchemaType.ARRAY,
        description: "Lista dos 7 dias da semana com as 5 refeições estruturadas.",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            dia: {
              type: SchemaType.STRING,
              description: "Nome do dia da semana (ex: Segunda-feira, Terça-feira, etc.)",
            },
            refeicoes: {
              type: SchemaType.OBJECT,
              properties: {
                cafe_da_manha: {
                  type: SchemaType.ARRAY,
                  items: opcaoSchema,
                  description: "3 opções completas com valores nutricionais para o café da manhã.",
                },
                lanche_manha: {
                  type: SchemaType.ARRAY,
                  items: opcaoSchema,
                  description: "3 opções completas com valores nutricionais para o lanche da manhã.",
                },
                almoco: {
                  type: SchemaType.ARRAY,
                  items: opcaoSchema,
                  description: "3 opções completas com valores nutricionais para o almoço.",
                },
                lanche_tarde: {
                  type: SchemaType.ARRAY,
                  items: opcaoSchema,
                  description: "3 opções completas com valores nutricionais para o lanche da tarde.",
                },
                jantar: {
                  type: SchemaType.ARRAY,
                  items: opcaoSchema,
                  description: "3 opções completas com valores nutricionais para o jantar.",
                },
              },
              required: [
                "cafe_da_manha",
                "lanche_manha",
                "almoco",
                "lanche_tarde",
                "jantar",
              ],
            },
          },
          required: ["dia", "refeicoes"],
        },
      },
    },
    required: ["plano_semanal"],
  };

  const candidateModels = [
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-2.5-pro'
  ];

  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.7,
        },
      });

      const promptText = `
Você é um nutricionista clínico profissional especialista na culinária e rotina brasileira.
Gere um plano alimentar semanal completo, saudável, diversificado e com valores nutricionais precisos com base nos dados do paciente fornecidos abaixo.

Dados do Paciente (Metas, Alergias, Restrições e Histórico):
${JSON.stringify(dadosPaciente, null, 2)}

# Regras Críticas de Execução:
- Para CADA uma das 5 refeições diárias (café da manhã, lanche da manhã, almoço, lanche da tarde e jantar), forneça EXATAMENTE 3 OPÇÕES COMPLETAS E VARIADAS caso o paciente queira alternar o cardápio.
- Cada opção deve conter sua descrição detalhada com quantidades e porções (ex: "2 fatias de pão 100% integral + 2 ovos mexidos com azeite + 1 fatia de mamão com chia").
- Para CADA opção, calcule e informe com precisão os valores nutricionais: calorias_kcal, proteinas_g, carboidratos_g e gorduras_g.
- Você deve responder APENAS e estritamente o objeto JSON solicitado.
- Não inclua blocos de código markdown (como \`\`\`json ... \`\`\`), explicações, introduções ou textos complementares.
- Adapte o cardápio rigorosamente a quaisquer alergias ou restrições descritas nos dados.
- Utilize alimentos comuns, acessíveis e culturalmente aceitos no Brasil.
- Evite repetições monótonas de alimentos nos dias seguidos.
`.trim();

      const result = await model.generateContent(promptText);
      const responseText = result.response.text();

      try {
        return JSON.parse(responseText);
      } catch (parseErr) {
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      }
    } catch (err) {
      console.warn(`Tentativa com ${modelName} falhou (${err.message}). Tentando próximo modelo...`);
      lastError = err;
    }
  }

  throw lastError || new Error('Não foi possível obter resposta de nenhum modelo do Gemini.');
}

/**
 * Serverless handler para Vercel / Netlify / Node API
 */
export default async function handler(req, res) {
  // Configuração CORS básica
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const { dadosPaciente } = req.body || {};

    if (!dadosPaciente || typeof dadosPaciente !== 'object') {
      return res.status(400).json({ error: 'Dados do paciente são obrigatórios no corpo da requisição.' });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave GOOGLE_API_KEY não encontrada nas variáveis de ambiente do servidor.' });
    }

    const planoGerado = await generateMealPlan(dadosPaciente, apiKey);
    return res.status(200).json(planoGerado);
  } catch (error) {
    console.error('Erro ao processar /api/gerar-plano:', error);
    return res.status(500).json({
      error: 'Falha ao gerar plano alimentar com IA.',
      details: error.message || 'Erro interno no servidor.',
    });
  }
}
