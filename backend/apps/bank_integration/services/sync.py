from datetime import timedelta

from django.utils import timezone

from apps.categories.models import Category
from apps.transactions.models import FinancialAccount

from ..models import BankConnection, ImportedTransaction, SyncedAccount
from .pluggy_client import pluggy_client

# Very small keyword heuristic to pre-fill a category suggestion on imported
# transactions. It only ever *suggests* — the user still confirms the final
# category on the review screen, which is the whole point of the flow.
CATEGORY_KEYWORDS = {
    "Mercado": ["mercado", "supermercado", "atacad"],
    "Restaurante": ["ifood", "restaurante", "lanchonete", "burger"],
    "Transporte": ["uber", "99app", "posto", "combustivel", "combustível"],
    "Internet": ["fibra", "net virtua", "internet"],
    "Telefone": ["vivo", "claro", "tim", "celular"],
    "Assinaturas": ["netflix", "spotify", "amazon prime", "disney", "hbo"],
    "Saúde": ["farmacia", "farmácia", "drogaria"],
    "Energia": ["enel", "cemig", "energisa", "light sa", "cpfl"],
}

ACCOUNT_TYPE_MAP = {
    "BANK": FinancialAccount.AccountType.CHECKING,
    "SAVINGS_ACCOUNT": FinancialAccount.AccountType.SAVINGS,
    "CREDIT": FinancialAccount.AccountType.DIGITAL,
}


def _suggest_category(description):
    text = description.lower()
    for category_name, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            category = Category.objects.filter(name=category_name, owner__isnull=True).first()
            if category:
                return category
    return None


def _ensure_financial_account(connection, synced_account, account_data):
    if synced_account.financial_account_id:
        return

    financial_account = FinancialAccount.objects.create(
        owner=connection.owner,
        name=account_data.get("name") or "Conta importada",
        institution=connection.institution_name,
        account_type=ACCOUNT_TYPE_MAP.get(
            account_data.get("type"), FinancialAccount.AccountType.DIGITAL
        ),
        initial_balance=account_data.get("balance") or 0,
    )
    synced_account.financial_account = financial_account
    synced_account.save(update_fields=["financial_account"])


def sync_bank_connection(connection: BankConnection):
    connection.status = BankConnection.Status.UPDATING
    connection.save(update_fields=["status"])

    accounts = pluggy_client.list_accounts(connection.pluggy_item_id)

    for account_data in accounts:
        synced_account, _ = SyncedAccount.objects.update_or_create(
            pluggy_account_id=account_data["id"],
            defaults={
                "connection": connection,
                "name": account_data.get("name", ""),
                "account_type": account_data.get("type", ""),
                "balance": account_data.get("balance") or 0,
                "currency_code": account_data.get("currencyCode", "BRL"),
                "raw_data": account_data,
            },
        )
        _ensure_financial_account(connection, synced_account, account_data)

        from_date = timezone.now().date() - timedelta(days=90)
        transactions = pluggy_client.list_transactions(synced_account.pluggy_account_id, from_date)

        for tx in transactions:
            if ImportedTransaction.objects.filter(pluggy_transaction_id=tx["id"]).exists():
                continue

            amount = tx.get("amount", 0)
            description = tx.get("description") or tx.get("descriptionRaw") or "Transação importada"

            ImportedTransaction.objects.create(
                synced_account=synced_account,
                pluggy_transaction_id=tx["id"],
                description=description,
                amount=amount,
                date=tx["date"][:10],
                suggested_category=_suggest_category(description),
                raw_payload=tx,
            )

    connection.status = BankConnection.Status.UPDATED
    connection.last_synced_at = timezone.now()
    connection.save(update_fields=["status", "last_synced_at"])
