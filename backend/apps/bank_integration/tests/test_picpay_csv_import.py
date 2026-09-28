from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.transactions.models import FinancialAccount

from ..models import ImportedTransaction
from ..services.exceptions import InvalidStatementFile
from ..services.parsers.picpay_csv import parse_picpay_csv
from ..services.statement_import import import_statement

User = get_user_model()

SAMPLE_CSV = (
    'data,hora,tipo,"origem / destino",valor,"forma de pagamento"\n'
    '2026-09-25,18:38,"Compra realizada","Supermarket Rio de Janeir Bra","−R$ 40,80","Com saldo"\n'
    '2026-09-20,14:16,"Pix recebido","Luana Guimarães Miranda","+R$ 15,01",\n'
    '2026-07-30,16:39,"Pix automático",,"−R$ 94,99","Com saldo"\n'
    '2026-09-03,12:11,"Pix enviado","NU PAGAMENTOS S/A","−R$ 1.295,05","Com saldo"\n'
).encode("utf-8-sig")


def _csv_file(name="extrato.csv", content=SAMPLE_CSV):
    return SimpleUploadedFile(name, content, content_type="text/csv")


@pytest.fixture
def user():
    return User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")


@pytest.fixture
def account(user):
    return FinancialAccount.objects.create(
        owner=user, name="PicPay", account_type=FinancialAccount.AccountType.DIGITAL
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def mercado_category():
    return Category.objects.create(name="Mercado", category_type=Category.CategoryType.EXPENSE)


def test_parse_picpay_csv_reads_amounts_dates_and_descriptions():
    parsed = parse_picpay_csv(_csv_file())

    assert len(parsed) == 4
    assert parsed[0]["amount"] == Decimal("-40.80")
    assert parsed[0]["date"].isoformat() == "2026-09-25"
    assert parsed[0]["description"] == "Compra realizada - Supermarket Rio de Janeir Bra"

    assert parsed[1]["amount"] == Decimal("15.01")

    # Linha sem "origem / destino" (Pix automático) não deve quebrar nem sobrar " - " no fim.
    assert parsed[2]["description"] == "Pix automático"

    # Milhar com ponto: "1.295,05" -> 1295.05, não 1.295... nem 1295005.
    assert parsed[3]["amount"] == Decimal("-1295.05")


def test_parse_picpay_csv_rejects_unrecognized_header():
    garbage = SimpleUploadedFile("extrato.csv", b"a,b,c\n1,2,3\n", content_type="text/csv")
    with pytest.raises(InvalidStatementFile):
        parse_picpay_csv(garbage)


@pytest.mark.django_db
def test_import_statement_dispatches_csv_by_extension(user, account):
    statement_import = import_statement(
        owner=user, account=account, file_name="extrato.csv", file_obj=_csv_file()
    )

    assert statement_import.transaction_count == 4
    assert ImportedTransaction.objects.filter(statement_import=statement_import, amount=-40.80).exists()


@pytest.mark.django_db
def test_import_statement_suggests_category_from_csv_description(user, account, mercado_category):
    csv_content = (
        'data,hora,tipo,"origem / destino",valor,"forma de pagamento"\n'
        '2026-09-19,19:19,"Compra realizada","Assai Atacadista Lj28 Rio de Janeir Bra","−R$ 238,90","Com saldo"\n'
    ).encode("utf-8-sig")

    statement_import = import_statement(
        owner=user, account=account, file_name="extrato.csv", file_obj=_csv_file(content=csv_content)
    )

    imported = ImportedTransaction.objects.get(statement_import=statement_import)
    assert imported.suggested_category == mercado_category


@pytest.mark.django_db
def test_import_statement_skips_duplicate_csv_rows_on_reimport(user, account):
    import_statement(owner=user, account=account, file_name="extrato1.csv", file_obj=_csv_file())
    second = import_statement(owner=user, account=account, file_name="extrato2.csv", file_obj=_csv_file())

    assert second.transaction_count == 0


@pytest.mark.django_db
def test_upload_endpoint_accepts_picpay_csv(auth_client, account):
    response = auth_client.post(
        "/api/bank/statements/", {"account": account.id, "file": _csv_file()}, format="multipart"
    )
    assert response.status_code == 201
    assert response.data["transaction_count"] == 4


@pytest.mark.django_db
def test_upload_endpoint_rejects_unsupported_extension(auth_client, account):
    file = SimpleUploadedFile("extrato.pdf", b"%PDF-1.4 fake", content_type="application/pdf")
    response = auth_client.post("/api/bank/statements/", {"account": account.id, "file": file}, format="multipart")
    assert response.status_code == 400
