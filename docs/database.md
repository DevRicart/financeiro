# Banco de dados

Todo valor monetário usa `DecimalField` (nunca `float`), para evitar erros de arredondamento — inclusive nos campos calculados expostos pela API (`settled_amount`, `remaining_amount`, etc., sempre serializados como string, ex: `"350.00"`). As únicas exceções propositais são os endpoints de `dashboards`, que convertem para `float` porque são somente leitura e usados diretamente em gráficos.

## Tabelas por app

**accounts**
- `accounts_user` — usuário customizado (login por e-mail)

**couples**
- `couples_partnership` — vínculo entre dois usuários (`creator`, `partner`, `status`)
- `couples_partnershippermission` — o que é compartilhado em cada vínculo (OneToOne com `partnership`)

**categories**
- `categories_category` — `owner` nulo = categoria padrão do sistema; `owner` preenchido = categoria criada pelo próprio usuário

**transactions**
- `transactions_financialaccount` — contas do usuário (corrente, poupança, carteira, digital, investimento, dinheiro)
- `transactions_transaction` — tabela central: receitas e despesas na mesma tabela, diferenciadas por `transaction_type`; `recurrence_rule` aponta para a regra que a gerou, se houver
- `transactions_transactionsettlement` — cada pagamento/recebimento de uma transação (uma transação pode ter várias liquidações parciais)
- `transactions_client` — pacientes/clientes de atendimento ou freelance
- `transactions_salarydetail` / `transactions_serviceincomedetail` / `transactions_freelancedetail` — detalhamento OneToOne de uma `Transaction` de receita, conforme `income_type`
- `transactions_creditcard` — cartões do usuário (`closing_day`, `due_day`)
- `transactions_creditcardpurchase` — liga uma `Transaction` a um cartão e ao mês da fatura correspondente
- `transactions_installmentplan` / `transactions_installment` — um parcelamento e cada parcela (uma `Transaction` própria por parcela)
- `transactions_recurrencerule` — regra de recorrência (salário, aluguel, assinaturas); cada ocorrência gerada vira uma `Transaction` com `recurrence_rule` preenchido

**goals**
- `goals_financialgoal` — metas (individuais ou compartilhadas via `participants` M2M)
- `goals_goalcontribution` — cada aporte feito a uma meta

**debts**
- `debts_debt` — dívidas a pagar (`PAYABLE`) ou a receber (`RECEIVABLE`); a pessoa é um `client` (FK opcional para `transactions.Client`) **ou** um `person_name` livre — nunca nenhum dos dois (`CheckConstraint`)
- `debts_debtpayment` — pagamentos parciais de uma dívida

**budgets**
- `budgets_monthlybudget` — limite de gasto por categoria/mês, com `alert_percentage`; único por `(owner, category, month)`

**bank_integration**
- `bank_integration_bankconnection` — uma conexão com um banco via Pluggy (`pluggy_item_id`)
- `bank_integration_syncedaccount` — cada conta bancária trazida pela Pluggy, espelhada em uma `FinancialAccount`
- `bank_integration_importedtransaction` — fila de revisão: toda transação vinda do banco, até ser confirmada (vira uma `Transaction` real) ou ignorada

**reports** e **notifications** não têm tabelas próprias (`reports` só lê/exporta dados existentes; `notifications` ainda é um esqueleto vazio).

## Relações principais

```
User
 ├── Transaction (owner)
 ├── Category (owner, se não for padrão)
 ├── FinancialAccount (owner)
 ├── FinancialGoal (owner) / GoalContribution (user)
 ├── Debt (owner)
 ├── BankConnection (owner)
 └── Partnership (creator ou partner)

Transaction
 ├── Category (obrigatório, PROTECT — não dá pra apagar uma categoria em uso)
 └── TransactionSettlement[] (related_name="settlements")

BankConnection
 └── SyncedAccount[]
       ├── FinancialAccount (criada automaticamente na primeira sincronização)
       └── ImportedTransaction[] (related_name="imported_transactions")
             └── resulting_transaction → Transaction (preenchido só após confirmação)
```

## Status calculado automaticamente

`Transaction.status` e `Debt.status` não são escolhidos livremente pelo usuário — são recalculados no backend sempre que uma liquidação/pagamento é criada ou removida:

- valor pago = 0 → `PENDING` / `OPEN`
- 0 < valor pago < total → `PARTIAL`
- valor pago ≥ total → `COMPLETED` / `PAID`

Essa lógica vive em `apps/transactions/services/transaction.py::_recompute_status` e `apps/debts/views.py::_recompute_debt_status`. As duas consultam o valor pago com uma query direta (`Sum("amount")`) em vez de usar a propriedade `settled_amount`/`paid_amount` do objeto em memória — isso evita um bug real que apareceu durante o desenvolvimento: quando o objeto vem de uma consulta com `prefetch_related`, reler a relação em cache retorna o valor de antes da liquidação ser criada.

## Cuidado com `on_delete=PROTECT` + exclusão de conta

`Transaction.category`, `RecurrenceRule.category` e `CreditCardPurchase.credit_card` usam `on_delete=models.PROTECT` — de propósito, para impedir apagar uma categoria/cartão em uso através do endpoint dele mesmo (`DELETE /categories/{id}/`, `DELETE /credit-cards/{id}/`).

O detalhe que não é óbvio: `PROTECT` do Django dispara assim que existe **qualquer** linha referenciando o registro — mesmo que essa linha *também* esteja prestes a ser apagada na mesma operação em cascata. Isso quebrava a exclusão de conta (`POST /api/auth/delete-account/`) sempre que o usuário tinha uma categoria própria em uso ou qualquer compra no cartão: apagar o `User` tentava apagar a `Category`/`CreditCard` dele em cascata, e o Django recusava porque ainda havia uma `Transaction` apontando para ela — ainda que essa `Transaction` fosse do mesmo usuário e também estivesse sendo apagada.

A correção, em `apps/accounts/views.py::DeleteAccountView`, é apagar explicitamente `RecurrenceRule` e `Transaction` do usuário **antes** de apagar o `User` — assim, quando o cascade do Django chega em `Category`/`CreditCard`, não sobra mais nenhuma referência protegida. Se adicionar um novo `PROTECT` apontando para um model com `owner`, revise essa view.

## Migrações

Cada app tem suas migrações em `apps/<app>/migrations/`. Para gerar novas depois de alterar um model:

```bash
python manage.py makemigrations
python manage.py migrate
```
