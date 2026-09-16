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
| POST | `/auth/delete-account/` | `{password}` — apaga a conta e todos os dados permanentemente |
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

## Clientes (não paginado)

`GET/POST /clients/`, `PATCH/DELETE /clients/{id}/` — pacientes, clientes de freelance etc., usados em `service_detail`/`freelance_detail`.

## Cartões de crédito (não paginado)

| Método | Rota | Observação |
|---|---|---|
| GET/POST | `/credit-cards/` | |
| PATCH/DELETE | `/credit-cards/{id}/` | `DELETE` retorna `409` se houver compras vinculadas |
| GET | `/credit-cards/{id}/invoice/?month=YYYY-MM` | Compras e total da fatura daquele mês |
| POST | `/credit-cards/{id}/invoice/pay/` | `{month, payment_date, account?}` — liquida todas as compras da fatura de uma vez |

Para lançar uma compra no cartão, envie `credit_card` (id do cartão) ao criar a transação em `POST /transactions/`; o mês da fatura é calculado automaticamente a partir do dia de fechamento do cartão.

## Parcelamentos (não paginado)

| Método | Rota | Observação |
|---|---|---|
| GET/POST | `/installment-plans/` | `POST` gera automaticamente as N transações mensais |
| DELETE | `/installment-plans/{id}/` | Remove o plano **e** todas as transações geradas |

## Recorrências (não paginado)

| Método | Rota | Observação |
|---|---|---|
| GET/POST | `/recurrences/` | Salário, aluguel, assinaturas etc. |
| PATCH/DELETE | `/recurrences/{id}/` | `PATCH {is_active: false}` pausa sem apagar |
| POST | `/recurrences/generate/` | Gera as transações pendentes até hoje (idempotente) — chamado automaticamente ao abrir o dashboard |

## Metas (não paginado)

`GET/POST /goals/`, `GET/PATCH/DELETE /goals/{id}/`, `POST /goals/{id}/contributions/`

## Dívidas (não paginado)

`GET/POST /debts/`, `GET/PATCH/DELETE /debts/{id}/`, `POST /debts/{id}/payments/`

A pessoa da dívida vem de **um** dos dois: `client` (id de um cliente cadastrado) ou `person_name` (texto livre) — pelo menos um é obrigatório (validado no serializer e também por `CheckConstraint` no banco). Quando `client` é enviado, `person_name` é preenchido automaticamente a partir dele.

## Orçamentos (não paginado)

| Método | Rota | Observação |
|---|---|---|
| GET | `/budgets/?month=YYYY-MM` | Inclui `spent_amount`, `percentage_used`, `is_over_alert` calculados |
| POST | `/budgets/` | `{category, month, limit_amount, alert_percentage?}` — um por categoria/mês |
| PATCH/DELETE | `/budgets/{id}/` | |

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
| `/dashboard/couple-summary/` | `{own, partners: [...], combined}` — ver abaixo |

`couple-summary` retorna os totais do usuário (`own`), um total combinado (`combined`) e, para cada vínculo **ativo**, um item em `partners` só com os campos que aquela `PartnershipPermission` libera (`shares_income_totals`, `shares_expense_totals`, `shares_goals`, `shares_debts` indicam o que veio — o campo correspondente, ex. `income_total`, some do JSON quando não compartilhado). `combined` soma apenas os valores que foram de fato compartilhados.

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

## Relatórios

| Método | Rota | Observação |
|---|---|---|
| GET | `/reports/transactions/export/?type=csv\|xlsx` | Aceita os mesmos filtros de `/transactions/` (`transaction_type`, `category`, `status`, `date_from`, `date_to`) |
| GET | `/reports/monthly-summary/pdf/?month=YYYY-MM` | PDF com resumo do mês e despesas por categoria |

O parâmetro é `type`, não `format` — o DRF reserva `?format=` para a própria negociação de conteúdo e devolveria 404 se `csv`/`xlsx` fossem usados ali.

## Erros

Formato padrão do DRF: `{"detail": "mensagem"}` para erros gerais, ou `{"campo": ["mensagem"]}` para erros de validação por campo. O frontend trata os dois formatos em `utils/errors.ts`.
