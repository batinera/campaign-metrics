# Campaign Metrics – Backend

Backend em **NestJS** que consome a [Marketing API do Meta (Facebook)](https://developers.facebook.com/docs/marketing-api) para expor métricas de campanhas de anúncios ao frontend.

## Requisitos

- Node.js 18+
- Conta Meta com permissão de anúncios e um [App](https://developers.facebook.com/apps/) com permissões `ads_read` e `ads_management`

## Configuração

1. Clone o repositório e instale as dependências:

```bash
npm install
```

2. Crie um arquivo `.env` na raiz (copie de `.env.example`):

```bash
cp .env.example .env
```

3. Defina o token de acesso do Facebook no `.env`:

```env
FACEBOOK_ACCESS_TOKEN=seu_token_aqui
```

**Importante:** não commite o `.env` com o token. O token pode ser obtido no [Graph API Explorer](https://developers.facebook.com/tools/explorer/) (com o app e as permissões corretas).

## Executando

```bash
# desenvolvimento (watch)
npm run start:dev

# produção
npm run build && npm run start:prod
```

Por padrão o servidor sobe em `http://localhost:3000`.

## API

Base URL: `http://localhost:3000/facebook`

| Método | Rota                                    | Descrição                                               |
| ------ | --------------------------------------- | ------------------------------------------------------- |
| GET    | `/facebook/accounts`                    | Lista contas de anúncios do usuário                     |
| GET    | `/facebook/campaigns?accountId=act_XXX` | Lista campanhas de uma conta                            |
| GET    | `/facebook/insights`                    | Métricas agregadas (KPIs) para o período                |
| GET    | `/facebook/insights/daily`              | Dados diários para gráficos (investimento e impressões) |

### Query params para `/facebook/insights` e `/facebook/insights/daily`

- **accountId** (opcional): ID da conta (ex: `act_123456789`). Se omitido, usa a primeira conta.
- **campaignId** (opcional): ID da campanha para filtrar.
- **datePreset**: `today` \| `yesterday` \| `last_7d` \| `last_14d` \| `last_30d` \| `this_month` \| `last_month` \| `maximum`
- **dateStart** / **dateEnd**: Período customizado (YYYY-MM-DD). Usado quando `datePreset` não é enviado.

### Exemplo de resposta – `/facebook/insights`

```json
{
  "valorUsado": 315.9,
  "resultados": 11,
  "custoPorResultado": 28.72,
  "alcance": 6525,
  "impressoes": 8599,
  "cliquesNoLink": 105,
  "ctr": 1.22,
  "cpm": 36.74,
  "frequencia": 1.32
}
```

### Exemplo de resposta – `/facebook/insights/daily`

```json
[
  { "date": "2025-03-06", "spend": 40.5, "impressions": 1200 },
  { "date": "2025-03-07", "spend": 55.2, "impressions": 1500 }
]
```

## Documentação Meta

- [Marketing API – Overview](https://developers.facebook.com/docs/marketing-api/overview)
- [Insights API](https://developers.facebook.com/docs/marketing-api/insights)
- [Graph API](https://developers.facebook.com/docs/graph-api/overview)

## Licença

MIT
