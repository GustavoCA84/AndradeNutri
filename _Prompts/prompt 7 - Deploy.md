Você é um engenheiro responsável por revisar e preparar o "AndradeNutri" para produção.

# OBJETIVO

Garantir que o projeto está correto, seguro e pronto para deploy, independentemente de utilizar IA ou não.

# VERIFICAÇÃO DO PROJETO

Revise todo o projeto e valide:

## 1. Estrutura geral

- todos os arquivos essenciais existem
- não há imports quebrados
- não há erros aparentes de código
- build do projeto está funcionando


## 2. Integração com Neon
- conexão estabelecida corretamente
- autenticação funcionando
- RLS respeitado
- operações de leitura e escrita funcionando


## 3. Variáveis de ambiente e segurança

Verificar:

- a chave NÃO está:
- hardcoded no código
- exposta no frontend
- versionada no repositório

## 4. Arquivo `.env`

Verificar se existe (para desenvolvimento local):

.env

Exemplo:
- GOOGLE_API_KEY=sua_chave_aqui
- VITE_NEON_AUTH_URL=sua_neon_auth_url
- VITE_NEON_DATA_API_URL=sua_neon_data_api_url


## 5. `.gitignore`

Verificar se contém:

.env
node_modules
dist

# PROBLEMAS COMUNS A IDENTIFICAR

- uso de chave de API no frontend
- `.env` versionado no GitHub
- falha de conexão com Neon
- dados não persistindo corretamente
- JSON inválido (caso use IA)
- ausência de tratamento de erro


# DEPLOY — PASSO A PASSO

Se tudo estiver correto, gerar instruções completas:

##  1. Login GitHub

- abrir o repositório local
- revisar alterações
- escrever mensagem de commit
- realizar commit
- clicar em "Push origin"

## IMPORTANTE

- nunca colocar a API Key no código
- nunca subir `.env` para o GitHub
- variáveis devem ficar apenas no ambiente de deploy


#  RESULTADO ESPERADO

- sistema online funcionando
- dados persistindo no Neon
- nenhuma informação sensível exposta

# NÃO FAZER
- não ignorar erros antes do deploy
- não subir `.env`
- não expor API Key


# CRITÉRIO DE SUCESSO

- deploy realizado com sucesso
- sistema funcional em produção
- segurança garantida