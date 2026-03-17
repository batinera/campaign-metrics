# Campaign Metrics API 📊

Backend NestJS para extração e agregação de métricas do Meta Ads (Facebook Ads). Focado em fornecer dados limpos para dashboards de performance.

## 🚀 Configuração Rápida

1. **Instale as dependências:**

   ```bash
   npm install
   ```

2. **Configure o ambiente:**
   Crie um arquivo `.env` na raiz baseado no `.env.example`:

   ```env
   FACEBOOK_ACCESS_TOKEN=seu_token_aqui
   JWT_SECRET=seu_segredo_para_gerar_tokens
   PORT=3000
   ```

3. **Inicie o servidor:**
   ```bash
   npm run start:dev
   ```

---

## 🔐 Autenticação

A API utiliza **JWT (JSON Web Token)**. Para acessar os endpoints de métricas, você deve primeiro obter um token.

### 1. Obter Token

**POST** `/auth/login`

- **Body:** `{"username": "seu_usuario"}`
- **Retorno:** `{"access_token": "eyJhbG..."}`

> _Nota: Atualmente o login aceita qualquer usuário para fins de desenvolvimento._

### 2. Utilizar Token

Em todas as requisições para `/facebook/*`, envie o cabeçalho:
`Authorization: Bearer <seu_access_token>`

---

## 📡 Endpoints Disponíveis

Todos os endpoints abaixo aceitam os filtros de data:

- `datePreset`: `today`, `yesterday`, `last_7d`, `last_30d`, etc.
- `dateStart` e `dateEnd`: No formato `YYYY-MM-DD` para períodos personalizados.

### 1. Listar Contas

**GET** `/facebook/accounts`

- Retorna todas as contas de anúncios vinculadas ao token. Útil para preencher filtros de "Seleção de Cliente" no Admin.

### 2. Resumo de Métricas (Cards)

**GET** `/facebook/metrics`

- **Query Params:** `accountId` (opcional), `datePreset`, `dateStart`, `dateEnd`.
- **Com `accountId`**: Retorna métricas de uma conta específica.
- **Sem `accountId`**: Retorna a **soma de todas as contas** (Visão Agregada Admin).
- **Retorno:** `spend`, `results` (Cliques no link), `cpa`, `reach`, `impressions`, `ctr`, `cpm`.

### 3. Dados para Gráfico

**GET** `/facebook/chart`

- **Query Params:** Mesmos do endpoint de metrics.
- **Retorno:** Lista de objetos contendo `date`, `spend` e `impressions` agrupados por dia.

---

## 🛠 Comandos Úteis

- `npm run build`: Compila o projeto.
- `npm run lint`: Executa o linter para verificar padrões de código.
