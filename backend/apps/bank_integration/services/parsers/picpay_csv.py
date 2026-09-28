import csv
import hashlib
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation

from ..exceptions import InvalidStatementFile

# Colunas do extrato CSV exportado pelo app do PicPay (Extrato > Exportar > CSV).
EXPECTED_HEADER = {"data", "hora", "tipo", "origem / destino", "valor", "forma de pagamento"}


def _parse_amount(raw: str) -> Decimal:
    text = raw.strip()
    sign = -1 if text[:1] in ("-", "−") else 1
    digits = text.lstrip("+-−").replace("R$", "").strip().replace(".", "").replace(",", ".")
    try:
        return sign * Decimal(digits)
    except InvalidOperation as exc:
        raise InvalidStatementFile(f"Valor inválido no CSV: '{raw}'.") from exc


def parse_picpay_csv(file_obj):
    try:
        text = file_obj.read().decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise InvalidStatementFile("Não foi possível ler esse arquivo como CSV do PicPay.") from exc

    reader = csv.DictReader(io.StringIO(text))
    header = {(name or "").strip() for name in (reader.fieldnames or [])}
    if not EXPECTED_HEADER.issubset(header):
        raise InvalidStatementFile("Esse CSV não parece ser um extrato do PicPay (colunas não reconhecidas).")

    parsed = []
    for row in reader:
        date_str = row["data"].strip()
        time_str = row["hora"].strip()
        tipo = row["tipo"].strip()
        destino = (row.get("origem / destino") or "").strip()
        valor = row["valor"].strip()

        try:
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError as exc:
            raise InvalidStatementFile(f"Data inválida no CSV: '{date_str}'.") from exc

        description = f"{tipo} - {destino}" if destino else tipo
        # Não há um ID de transação no CSV do PicPay — a combinação de todos os
        # campos da linha é o que garante unicidade para efeito de deduplicação.
        external_id = hashlib.sha1(f"{date_str}|{time_str}|{tipo}|{destino}|{valor}".encode("utf-8")).hexdigest()

        parsed.append(
            {
                "external_id": external_id,
                "date": date,
                "amount": _parse_amount(valor),
                "description": description,
            }
        )
    return parsed
