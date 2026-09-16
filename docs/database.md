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
- `transactions_transaction` — tabela central: receitas e despesas na mesma tabela, diferenciadas por `transaction_type`
- `transactions_transactionsettlement` — cada pagamento/recebimento de uma transação (uma transação pode ter várias liquidações parciais)

**goals**
- `goals_financialgoal` — metas (individuais ou compartilhadas via `participants` M2M)
- `goals_goalcontribution` — cada aporte feito a uma meta

**debts**
- `debts_debt` — dívidas a pagar (`PAYABLE`) ou a receber (`RECEIVABLE`)
- `debts_debtpayment` — pagamentos parciais de uma dívida

**bank_integration**
- `bank_integration_bankconnection` — uma conexão com um banco via Pluggy (`pluggy_item_id`)
- `bank_integration_syncedaccount` — cada conta bancária trazida pela Pluggy, espelhada em uma `FinancialAccount`
- `bank_integration_importedtransaction` — fila de revisão: toda transação vinda do banco, até ser confirmada (vira uma `Transaction` real) ou ignorada

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

## Migrações

Cada app tem suas migrações em `apps/<app>/migrations/`. Para gerar novas depois de alterar um model:

```bash
python manage.py makemigrations
python manage.py migrate
```
