# Campaign Metrics API 📊

Backend NestJS para extração e agregação de métricas do Meta Ads (Facebook Ads). Focado em fornecer dados limpos para dashboards de performance.

## 🚀 Configuração Rápida

Siga este passo a passo para configurar seu ambiente de desenvolvimento local:

1.  **Instale as dependências:**

    ```bash
    npm install
    ```

2.  **Suba o banco de dados (Docker):**

    ```bash
    docker compose up -d
    ```

3.  **Build e Seed do banco:**
    Este comando compila o projeto e cria o usuário administrador inicial (`admin`) no banco de dados para que você consiga se autenticar.

    ```bash
    npm run build && npm run seed
    ```

4.  **Inicie o servidor em modo desenvolvimento:**
    ```bash
    npm run start:dev
    ```

---

## 🔐 Autenticação

A API utiliza **JWT (JSON Web Token)**. Após rodar o `seed` (passo 3), você terá um usuário padrão:

- **Usuário:** `admin`
- **Senha:** `Admin123!`

### Como obter o Token?

**POST** `/auth/login`

- **Body:** `{"username": "admin"}`
- **Retorno:** `{"access_token": "eyJhbG..."}`

> _Nota: O script de seed garante que o usuário `admin` exista no banco para fins de desenvolvimento._

### 2. Utilizar Token

Em todas as requisições para `/facebook/*`, envie o cabeçalho:
`Authorization: Bearer <seu_access_token>`

---

## 📡 Endpoints Disponíveis

**Filtros comuns** (quando aplicável):

- `datePreset`: `today`, `yesterday`, `last_7d`, `last_30d`, etc.
- `dateStart` e `dateEnd`: No formato `YYYY-MM-DD` para períodos personalizados.
- `accountId`, `campaignId`, `campaignIds`, `status`: Filtros por conta, campanha e status.

**Ordenação** (apenas no endpoint de campanhas):

- `sortBy`: `name` (alfabética) ou `created_time` (por data de criação).
- `sortOrder`: `asc` (crescente) ou `desc` (decrescente).

### 1. Listar Contas

**GET** `/facebook/accounts`

- Retorna todas as contas de anúncios vinculadas ao token. Útil para preencher filtros de "Seleção de Cliente" no Admin.

### 2. Listar Campanhas

**GET** `/facebook/campaigns`

- Retorna todas as campanhas com seus **grupos de anúncio (ad sets)** aninhados.
- Cada campanha inclui `adSets`: array com os ad sets da campanha.
- **Query Params**:
  - `accountId` (opcional): ID da conta (`act_...`).
  - `campaignId`, `campaignIds`, `status`, `datePreset`, `dateStart`, `dateEnd`: Filtros comuns.
  - **Ordenação**:
    - `sortBy` (opcional): Critério de ordenação. Valores: `name` (alfabética) ou `created_time` (por data de criação). **Padrão:** `created_time`.
    - `sortOrder` (opcional): Direção da ordenação. Valores: `asc` (crescente) ou `desc` (decrescente). **Padrão:** `desc`.
- **Exemplos de ordenação**:
  - Ordem alfabética A-Z: `?sortBy=name&sortOrder=asc`
  - Ordem alfabética Z-A: `?sortBy=name&sortOrder=desc`
  - Campanhas mais recentes primeiro: `?sortBy=created_time&sortOrder=desc` (padrão)
  - Campanhas mais antigas primeiro: `?sortBy=created_time&sortOrder=asc`

### 3. Listar Anúncios

**GET** `/facebook/ads`

- Retorna os anúncios **agrupados por grupo de anúncio (ad set)**.
- **Retorno**: array de `{ adSet: { id, name }, ads: AdDto[] }`.
- **Query Params**: `accountId`, `campaignId`, `campaignIds`, `status`, `datePreset`, `dateStart`, `dateEnd`.

### 4. Performance Consolidada (Ideal para Dashboards)

**GET** `/facebook/performance`

- **O que faz**: Consolida o Resumo (Cards), os Dados do Gráfico e métricas **por grupo de anúncio (ad set)** em uma única chamada.
- **Query Params**:
  - `accountId` (opcional): ID da conta (`act_...`).
  - `campaignId` (opcional): ID de uma campanha específica.
  - `campaignIds` (opcional): Lista de IDs de campanhas (ex: `?campaignIds[]=id1&campaignIds[]=id2`).
  - `status` (opcional): Filtro de status (`active`, `paused`, `archived`, `deleted`).
  - `datePreset` (opcional): Atalhos de data. Valores aceitos: `today`, `yesterday`, `last_7d`, `last_14d`, `last_30d`, `this_month`, `last_month`, `maximum`.
  - `dateStart` e `dateEnd` (opcional): Período personalizado no formato `YYYY-MM-DD`.
- **Retorno**:
  - `summary`: métricas consolidadas (spend, results, cpa, reach, impressions, ctr, cpm).
  - `chart`: dados diários globais para gráfico.
  - `byAdSet`: array com métricas **separadas por grupo de anúncio** (cada item inclui `adSet`, `summary`, `chart`, `ads`).
  - `ads`: lista completa de anúncios.

#### Exemplos de Filtros de Data:

- **Apenas hoje**: `?datePreset=today`
- **Últimos 30 dias**: `?datePreset=last_30d`
- **Mês atual**: `?datePreset=this_month`
- **Período específico**: `?dateStart=2024-01-01&dateEnd=2024-01-15`
- **Um único dia específico**: `?dateStart=2024-03-20&dateEnd=2024-03-20`

---

## 🛠 Comandos Úteis

- `npm run build`: Compila o projeto.
- `npm run lint`: Executa o linter para verificar padrões de código.
