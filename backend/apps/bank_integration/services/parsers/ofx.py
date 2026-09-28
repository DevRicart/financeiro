from decimal import Decimal

from ofxparse import OfxParser

from ..exceptions import InvalidStatementFile


def parse_ofx(file_obj):
    try:
        ofx = OfxParser.parse(file_obj)
        transactions = ofx.account.statement.transactions
    except Exception as exc:
        raise InvalidStatementFile("Não foi possível ler esse arquivo como OFX.") from exc

    parsed = []
    for tx in transactions:
        description = (tx.payee or tx.memo or "").strip() or "Transação importada"
        parsed.append(
            {
                "external_id": tx.id,
                "date": tx.date.date(),
                "amount": Decimal(str(tx.amount)),
                "description": description,
            }
        )
    return parsed
