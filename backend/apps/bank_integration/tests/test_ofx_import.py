import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.transactions.models import FinancialAccount

from ..models import ImportedTransaction, StatementImport
from ..services.statement_import import import_statement

User = get_user_model()


def _sample_ofx(fitids=("TX1001", "TX1002")):
    return f"""OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20260901120000
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>0001
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260801
<DTEND>20260901
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260805120000
<TRNAMT>-150.00
<FITID>{fitids[0]}
<MEMO>SUPERMERCADO ABC
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260810120000
<TRNAMT>3000.00
<FITID>{fitids[1]}
<MEMO>SALARIO EMPRESA XYZ
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>2850.00
<DTASOF>20260901120000
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
""".encode("ascii")


def _ofx_file(name="extrato.ofx", fitids=("TX1001", "TX1002")):
    return SimpleUploadedFile(name, _sample_ofx(fitids), content_type="application/x-ofx")


@pytest.fixture
def user():
    return User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")


@pytest.fixture
def account(user):
    return FinancialAccount.objects.create(
        owner=user, name="Conta corrente", account_type=FinancialAccount.AccountType.CHECKING
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture(autouse=True)
def mercado_category():
    return Category.objects.create(name="Mercado", category_type=Category.CategoryType.EXPENSE)


@pytest.mark.django_db
def test_import_statement_creates_pending_transactions(user, account):
    statement_import = import_statement(
        owner=user, account=account, file_name="extrato.ofx", file_obj=_ofx_file()
    )

    assert statement_import.transaction_count == 2
    imported = list(ImportedTransaction.objects.filter(statement_import=statement_import).order_by("date"))
    assert len(imported) == 2
    assert imported[0].amount == -150
    assert imported[0].status == ImportedTransaction.Status.PENDING_REVIEW
    assert imported[0].suggested_category.name == "Mercado"
    assert imported[1].amount == 3000


@pytest.mark.django_db
def test_import_statement_skips_already_imported_transactions(user, account):
    import_statement(owner=user, account=account, file_name="extrato1.ofx", file_obj=_ofx_file())
    second = import_statement(owner=user, account=account, file_name="extrato2.ofx", file_obj=_ofx_file())

    assert second.transaction_count == 0
    assert ImportedTransaction.objects.filter(statement_import__account=account).count() == 2


@pytest.mark.django_db
def test_upload_endpoint_creates_review_queue(auth_client, account):
    response = auth_client.post(
        "/api/bank/statements/", {"account": account.id, "file": _ofx_file()}, format="multipart"
    )
    assert response.status_code == 201
    assert response.data["transaction_count"] == 2
    assert StatementImport.objects.filter(account=account).count() == 1


@pytest.mark.django_db
def test_upload_endpoint_rejects_invalid_file(auth_client, account):
    garbage = SimpleUploadedFile("nota.txt", b"isto nao e um ofx", content_type="text/plain")
    response = auth_client.post("/api/bank/statements/", {"account": account.id, "file": garbage}, format="multipart")
    assert response.status_code == 400


@pytest.mark.django_db
def test_upload_endpoint_rejects_another_users_account(auth_client):
    other_owner = User.objects.create_user(email="beto@example.com", username="beto", password="SenhaForte123")
    other_account = FinancialAccount.objects.create(
        owner=other_owner, name="Conta do Beto", account_type=FinancialAccount.AccountType.CHECKING
    )

    response = auth_client.post(
        "/api/bank/statements/", {"account": other_account.id, "file": _ofx_file()}, format="multipart"
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_confirm_creates_real_transaction(auth_client, user, account, mercado_category):
    statement_import = import_statement(
        owner=user, account=account, file_name="extrato.ofx", file_obj=_ofx_file()
    )
    imported = ImportedTransaction.objects.filter(statement_import=statement_import, amount=-150).get()

    response = auth_client.post(
        f"/api/bank/imports/{imported.id}/confirm/",
        {"category": mercado_category.id, "title": "Mercado do mês"},
    )

    assert response.status_code == 200
    imported.refresh_from_db()
    assert imported.status == ImportedTransaction.Status.CONFIRMED
    assert imported.resulting_transaction is not None
    assert imported.resulting_transaction.total_amount == 150
    assert imported.resulting_transaction.transaction_type == "EXPENSE"


@pytest.mark.django_db
def test_imports_do_not_leak_other_users_data(user, account):
    import_statement(owner=user, account=account, file_name="extrato.ofx", file_obj=_ofx_file())

    intruder = User.objects.create_user(email="intruder@example.com", username="intruder", password="x12345678")
    client = APIClient()
    client.force_authenticate(user=intruder)

    response = client.get("/api/bank/imports/")
    assert response.status_code == 200
    assert response.data["results"] == []
