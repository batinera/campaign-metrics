# Campaign Metrics API 📊

Backend NestJS com **GraphQL** para extração e agregação de métricas do Meta Ads (Facebook Ads). Focado em fornecer dados limpos para dashboards de performance.

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

### Utilizar Token

Em todas as requisições GraphQL, envie o cabeçalho:
`Authorization: Bearer <seu_access_token>`

---

## 📡 API GraphQL

A API expõe **um único endpoint**: `POST /graphql`

- **Playground:** `GET http://localhost:3000/graphql` (interface interativa para testar queries)

### Queries Disponíveis

#### 1. accounts

Lista todas as contas de anúncios vinculadas ao token.

```graphql
query {
  accounts {
    id
    accountId
    name
    currency
  }
}
```

#### 2. campaigns

Retorna a hierarquia completa: campanhas → grupos de anúncio (ad sets) → anúncios, com métricas (summary, chart) em cada nível.

**Argumentos (opcional):**

- `filter`: objeto com `accountId`, `campaignId`, `campaignIds`, `status`, `datePreset`, `dateStart`, `dateEnd`, `sortBy`, `sortOrder`

**Exemplo de query:**

```graphql
query {
  campaigns(
    filter: {
      accountId: "act_721084900278023"
      status: ACTIVE
      datePreset: last_7d
      sortBy: name
      sortOrder: asc
    }
  ) {
    id
    name
    status
    summary {
      spend
      results
      cpa
      reach
      impressions
      ctr
      cpm
    }
    chart {
      date
      spend
      impressions
    }
    adSets {
      id
      name
      summary {
        spend
        results
        cpa
      }
      chart {
        date
        spend
        impressions
      }
      ads {
        id
        name
        status
        creative {
          id
          name
          image_url
        }
      }
    }
  }
}
```

O cliente pode solicitar apenas os campos necessários, evitando over-fetching.

### Filtros

| Campo               | Tipo       | Descrição                                                                      |
| ------------------- | ---------- | ------------------------------------------------------------------------------ |
| accountId           | String     | ID da conta (ex: `act_721084900278023`)                                        |
| campaignId          | String     | ID de uma campanha específica                                                  |
| campaignIds         | [String]   | Lista de IDs de campanhas                                                      |
| status              | StatusEnum | ACTIVE, PAUSED, ARCHIVED, DELETED                                              |
| datePreset          | String     | today, yesterday, last_7d, last_14d, last_30d, this_month, last_month, maximum |
| dateStart / dateEnd | String     | Período no formato YYYY-MM-DD                                                  |
| sortBy              | String     | name ou created_time                                                           |
| sortOrder           | String     | asc ou desc                                                                    |

---

## 🛠 Comandos Úteis

- `npm run build`: Compila o projeto.
- `npm run lint`: Executa o linter para verificar padrões de código.
