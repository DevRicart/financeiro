# API REST

Base local: `http://localhost:8000/api`. Todas as rotas abaixo (exceto autenticação e webhook) exigem `Authorization: Bearer <access_token>`.

## Autenticação

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register/` | Cria conta, retorna `{user, access, refresh}` |
| POST | `/auth/login/` | Login por e-mail, retorna `{user, access, refresh}` |
| POST | `/auth/token/refresh/` | Troca um `refresh` por um novo `access` |
| POST | `/auth/logout/` | Invalida (blacklist) o `refresh` enviado |
| POST | `/auth/password-reset/` | Envia e-mail com link de redefinição (`{email}`) |
| POST | `/auth/password-reset/confirm/` | Confirma nova senha (`{uid, token, new_password}`) |
| POST | `/auth/change-password/` | Troca de senha estando logado |
| GET/PATCH | `/auth/me/` | Perfil do usuário logado |

## Categorias

| Método | Rota | Observação |
|---|---|---|
| GET | `/categories/?category_type=EXPENSE\|INCOME` | Não paginado — sempre retorna a lista completa |
| POST | `/categories/` | Cria categoria própria |
| PATCH/DELETE | `/categories/{id}/` | Só em categorias próprias (não dá pra editar/apagar uma padrão) |

## Contas financeiras

`GET/POST /financial-accounts/`, `PATCH/DELETE /financial-accounts/{id}/` — não paginado.

## Transações (paginado — `?page=N`)

| Método | Rota | Observação |
|---|---|---|
| GET | `/transactions/?transaction_type=&category=&status=&date_from=&date_to=` | Filtros combináveis |
| POST | `/transactions/` | Cria receita/despesa |
| GET/PATCH/DELETE | `/transactions/{id}/` | |
| POST | `/transactions/{id}/settlements/` | Registra pagamento/recebimento (recalcula status) |
| DELETE | `/settlements/{id}/` | Remove uma liquidação (recalcula status) |

## Metas (não paginado)

`GET/POST /goals/`, `GET/PATCH/DELETE /goals/{id}/`, `POST /goals/{id}/contributions/`

## Dívidas (não paginado)

`GET/POST /debts/`, `GET/PATCH/DELETE /debts/{id}/`, `POST /debts/{id}/payments/`

## Parceiro (não paginado)

| Método | Rota | Observação |
|---|---|---|
| GET | `/partnerships/` | Vínculos onde o usuário é criador ou parceiro |
| POST | `/partnerships/invite/` | `{partner_email}` — precisa já existir uma conta com esse e-mail |
| POST | `/partnerships/{id}/accept/` \| `/reject/` | Só quem foi convidado pode chamar |
| PATCH | `/partnerships/{id}/permissions/` | Ajusta o que é compartilhado |
| DELETE | `/partnerships/{id}/` | Encerra (status `ENDED`, não apaga o histórico) |

## Dashboard

Todos aceitam `?month=YYYY-MM` (padrão: mês atual), exceto o de evolução.

| Rota | Retorna |
|---|---|
| `/dashboard/summary/` | Receita/despesa prevista x recebida/paga, lucro de caixa e por competência |
| `/dashboard/expenses-by-category/` | Total por categoria no mês |
| `/dashboard/income-by-type/` | Total por tipo de receita no mês |
| `/dashboard/monthly-evolution/?months=6` | Série temporal de receita/despesa/saldo |
| `/dashboard/goals/` | Metas do usuário (mesmo shape de `/goals/`) |
| `/dashboard/debts/` | Dívidas do usuário (mesmo shape de `/debts/`) |

## Open Finance (Pluggy)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/bank/connect-token/` | `{item_id?}` — gera o token para abrir o widget da Pluggy |
| GET/POST | `/bank/connections/` | Lista conexões / registra uma nova após o widget retornar um `item_id` |
| POST | `/bank/connections/{id}/sync/` | Sincroniza uma conexão específica agora |
| POST | `/bank/sync-all/` | Sincroniza todas as conexões do usuário (chamado ao abrir o dashboard) |
| GET | `/bank/imports/?status=PENDING_REVIEW` | Fila de revisão (paginado) |
| POST | `/bank/imports/{id}/confirm/` | `{category, title, description?, is_shared?}` — vira uma `Transaction` real |
| POST | `/bank/imports/{id}/ignore/` | Marca como ignorada |
| POST | `/bank/webhook/` | Endpoint público — configure na Pluggy para sincronizar automaticamente em eventos |

Se `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET` não estiverem configurados, as rotas acima retornam `503` com uma mensagem explicando o que falta — não um erro genérico.

## Erros

Formato padrão do DRF: `{"detail": "mensagem"}` para erros gerais, ou `{"campo": ["mensagem"]}` para erros de validação por campo. O frontend trata os dois formatos em `utils/errors.ts`.
