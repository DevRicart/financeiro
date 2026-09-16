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
                     ┌──────────────┼──────────────┐
                     ▼              ▼              ▼
               PostgreSQL      Pluggy API     (futuro: Redis/Celery)
             (SQLite em dev)  (Open Finance)
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
| `bank_integration` | Conexão com a Pluggy, sincronização, fila de revisão de importações | ✅ completo |
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

## Fluxo de importação bancária (Open Finance)

1. Usuário clica em "Conectar banco" → backend pede um `connectToken` à Pluggy → frontend abre o widget oficial da Pluggy com esse token.
2. Widget retorna um `itemId` → frontend registra a conexão no backend (`POST /api/bank/connections/`).
3. Backend busca contas e transações na Pluggy, cria uma `FinancialAccount` espelhando cada conta bancária, e grava cada transação nova como `ImportedTransaction` com status `PENDING_REVIEW` (tentando sugerir uma categoria por palavra-chave).
4. Ao abrir o dashboard, o frontend chama `POST /api/bank/sync-all/` automaticamente, atualizando todas as conexões.
5. Na tela **Importações**, o usuário confirma categoria + descrição de cada item pendente (`POST /api/bank/imports/{id}/confirm/`), que então vira uma `Transaction` real com uma liquidação (`TransactionSettlement`) já registrada.
