# Arquitetura

```
Navegador
   │
   ▼
React (Vite) ── porta 5173 (dev) ──┐
                                    │  fetch /api/*
                                    ▼
                          Django + DRF ── porta 8000
                                    │
                     ┌──────────────┐
                     ▼              ▼
               PostgreSQL     (futuro: Redis/Celery)
             (SQLite em dev)
```

Em produção, o Nginx fica na frente de tudo: serve os arquivos estáticos do React e faz proxy de `/api`, `/admin`, `/static` e `/media` para o Gunicorn. Veja [deployment.md](deployment.md).

## Backend (`backend/apps/`)

| App | Responsabilidade | Status |
|---|---|---|
| `accounts` | Usuário customizado (login por e-mail), JWT, troca/recuperação de senha, exclusão de conta | ✅ completo |
| `couples` | Vínculo entre parceiros, convite/aceite, permissões de compartilhamento | ✅ completo |
| `categories` | Categorias de receita/despesa, seed de 30 categorias padrão | ✅ completo |
| `transactions` | Núcleo do sistema: receitas, despesas, contas financeiras, pagamentos/recebimentos (settlements) com status automático, cartões de crédito e faturas, parcelamentos, recorrências, clientes e detalhamento de receita (salário/atendimento/freelancer) | ✅ completo |
| `goals` | Metas financeiras e contribuições | ✅ completo |
| `debts` | Dívidas a pagar/receber e pagamentos parciais | ✅ completo |
| `budgets` | Orçamentos mensais por categoria, com alerta de percentual | ✅ completo |
| `reports` | Exportação de transações (CSV/Excel) e resumo mensal em PDF | ✅ completo |
| `dashboards` | Endpoints de agregação (sem tabelas próprias): resumo, evolução mensal, despesas por categoria | ✅ completo |
| `bank_integration` | Importação de extrato OFX enviado pelo usuário, fila de revisão de importações | ✅ completo |
| `notifications` | Notificações (alertas de orçamento, vencimentos) | ⬜ esqueleto vazio |
| `common` | Utilidades compartilhadas: helpers de data (`dates.py`, usados por parcelamento/recorrência/fatura de cartão) e o exception handler global (`exceptions.py`) | ✅ em uso |

Padrão interno adotado no app `transactions` (o mais complexo): `models/`, `serializers/`, `services/` (escreve dados), `selectors/` (consultas), `permissions/`, `filters/` — todos como subpacotes. Os demais apps usam arquivos únicos (`serializers.py`, `views.py`) por serem CRUDs mais simples; adote o mesmo padrão de `transactions` neles se a lógica crescer.

### Exception handler global (`apps/common/exceptions.py`)

Duas classes de erro que bibliotecas do próprio Django/DRF não convertem sozinhas em uma resposta de API limpa, e que apareceram de verdade durante os testes manuais desta etapa:

- `django.db.models.deletion.ProtectedError` (de campos `on_delete=PROTECT`, como `CreditCardPurchase.credit_card`) → vira `409 Conflict` em vez de um 500 cru.
- `User.DoesNotExist` dentro do `TokenRefreshView` do SimpleJWT (um refresh token cuja conta foi excluída em outro dispositivo) → vira `401` em vez de 500.

Configurado em `REST_FRAMEWORK["EXCEPTION_HANDLER"]` (`config/settings/base.py`), então vale para toda a API automaticamente.

## Frontend (`frontend/src/`)

| Pasta | Conteúdo |
|---|---|
| `pages/` | Uma tela por rota (Login, Dashboard, Transactions, Imports, Goals, Debts, Partnership, Profile) |
| `layouts/` | `AuthLayout` (telas de login/cadastro) e `AppLayout` (sidebar + área logada) |
| `routes/` | Configuração do React Router e guards (`ProtectedRoute`, `PublicRoute`) |
| `services/` | Um arquivo por domínio, encapsulando chamadas Axios (`transactions.service.ts`, `bank.service.ts`, etc.) |
| `contexts/` + `hooks/` | `AuthContext`/`useAuth`: estado de sessão, tokens, usuário logado |
| `schemas/` | Validação de formulário com Zod, usada via `@hookform/resolvers` |
| `components/ui/` | Componentes genéricos (Button, Input, Select, Card, Modal, Badge, EmptyState, LoadingSpinner) |
| `types/` | Tipos TypeScript espelhando os serializers do backend |

## Fluxo de autenticação

1. Login/registro retornam `access` (curta duração) e `refresh` (longa duração), guardados no `localStorage`.
2. Todo request do Axios injeta `Authorization: Bearer <access>` (`services/api.ts`).
3. Em um 401, o interceptor tenta renovar o `access` via `/api/auth/token/refresh/` uma única vez; se falhar, limpa os tokens e redireciona para `/login`.

## Fluxo de importação bancária (extrato OFX ou CSV)

1. Usuário exporta o extrato do banco e envia na tela **Importações**, escolhendo a `FinancialAccount` de destino (`POST /api/bank/statements/`, multipart).
2. `apps/bank_integration/services/statement_import.py` escolhe o parser pela extensão do arquivo (`services/parsers/`: `ofx.py` via `ofxparse`, cobre a maioria dos bancos; `picpay_csv.py`, formato específico do PicPay — cada banco de CSV precisa do seu próprio parser, já que não é um formato padronizado). Cada parser devolve uma lista normalizada `{external_id, date, amount, description}`.
3. `statement_import.py` cria um `StatementImport` (registro do lote) e grava cada transação como `ImportedTransaction` com status `PENDING_REVIEW`, tentando sugerir uma categoria por palavra-chave. Transações cujo `external_id` já foi importado antes para aquela conta são puladas (idempotente — reimportar um extrato com datas sobrepostas não duplica). No OFX, `external_id` é o `FITID`; no CSV do PicPay, que não tem um ID de transação, é um hash das colunas da própria linha.
4. Na tela **Importações**, o usuário confirma categoria + descrição de cada item pendente (`POST /api/bank/imports/{id}/confirm/`), que então vira uma `Transaction` real com uma liquidação (`TransactionSettlement`) já registrada.
