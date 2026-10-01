from apps.categories.models import Category

from ..models import ImportedTransaction, StatementImport
from .exceptions import InvalidStatementFile
from .parsers import PARSERS_BY_EXTENSION

# Mesma heurística usada antes para transações vindas do Open Finance — ela só
# *sugere*, o usuário sempre confirma a categoria final na tela de revisão.
CATEGORY_KEYWORDS = {
    "Mercado": ["mercado", "supermercado", "atacad"],
    "Restaurante": ["ifood", "restaurante", "lanchonete", "burger"],
    "Transporte": ["uber", "99app", "posto", "combustivel", "combustível"],
    "Internet": ["fibra", "net virtua", "internet"],
    "Telefone": ["vivo", "claro", "tim", "celular"],
    "Assinaturas": ["netflix", "spotify", "amazon prime", "disney", "hbo"],
    "Saúde": ["farmacia", "farmácia", "drogaria"],
    "Contas": ["fibra", "net virtua", "internet", "enel", "cemig", "energisa", "light sa", "cpfl"],
}


def _suggest_category(description):
    text = description.lower()
    for category_name, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            category = Category.objects.filter(name=category_name, owner__isnull=True).first()
            if category:
                return category
    return None


def import_statement(*, owner, account, file_name, file_obj) -> StatementImport:
    extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    parser = PARSERS_BY_EXTENSION.get(extension)
    if not parser:
        supported = ", ".join(sorted(f".{ext}" for ext in PARSERS_BY_EXTENSION))
        raise InvalidStatementFile(f"Formato de arquivo não suportado. Use um destes: {supported}.")

    parsed_transactions = parser(file_obj)

    statement_import = StatementImport.objects.create(owner=owner, account=account, file_name=file_name)

    existing_ids = set(
        ImportedTransaction.objects.filter(statement_import__account=account).values_list(
            "external_id", flat=True
        )
    )

    created = 0
    for tx in parsed_transactions:
        if tx["external_id"] in existing_ids:
            continue

        ImportedTransaction.objects.create(
            statement_import=statement_import,
            external_id=tx["external_id"],
            description=tx["description"],
            amount=tx["amount"],
            date=tx["date"],
            suggested_category=_suggest_category(tx["description"]),
            raw_payload={k: str(v) for k, v in tx.items()},
        )
        existing_ids.add(tx["external_id"])
        created += 1

    statement_import.transaction_count = created
    statement_import.save(update_fields=["transaction_count"])
    return statement_import
