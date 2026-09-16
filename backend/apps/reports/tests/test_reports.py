import openpyxl
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.transactions.models import Transaction

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")


@pytest.fixture
def category():
    return Category.objects.create(name="Mercado", category_type=Category.CategoryType.EXPENSE)


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def transaction(user, category):
    return Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Compra do mês",
        total_amount="150.00",
        competence_date="2026-09-10",
    )


@pytest.mark.django_db
def test_csv_export_contains_transaction_row(auth_client, transaction):
    response = auth_client.get("/api/reports/transactions/export/?type=csv")
    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/csv")
    body = response.content.decode("utf-8-sig")
    assert "Compra do mês" in body
    assert "150.00" in body


@pytest.mark.django_db
def test_csv_export_respects_transaction_filters(auth_client, user, category):
    Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.INCOME,
        category=Category.objects.create(name="Salário", category_type=Category.CategoryType.INCOME),
        title="Salário",
        total_amount="5000.00",
        competence_date="2026-09-01",
    )
    Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Despesa",
        total_amount="80.00",
        competence_date="2026-09-01",
    )

    response = auth_client.get("/api/reports/transactions/export/?type=csv&transaction_type=INCOME")
    body = response.content.decode("utf-8-sig")
    assert "Salário" in body
    assert "Despesa" not in body


@pytest.mark.django_db
def test_xlsx_export_is_a_valid_workbook(auth_client, transaction, tmp_path):
    response = auth_client.get("/api/reports/transactions/export/?type=xlsx")
    assert response.status_code == 200
    assert response["Content-Type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    file_path = tmp_path / "export.xlsx"
    file_path.write_bytes(response.content)
    workbook = openpyxl.load_workbook(file_path)
    sheet = workbook.active
    rows = list(sheet.iter_rows(values_only=True))
    assert rows[0] == ("Data", "Descrição", "Categoria", "Tipo", "Valor", "Situação")
    assert rows[1][1] == "Compra do mês"


@pytest.mark.django_db
def test_monthly_summary_pdf_returns_pdf_bytes(auth_client, transaction):
    response = auth_client.get("/api/reports/monthly-summary/pdf/?month=2026-09")
    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


@pytest.mark.django_db
def test_export_does_not_leak_other_users_transactions(category):
    owner = User.objects.create_user(email="owner@example.com", username="owner", password="x12345678")
    intruder = User.objects.create_user(email="intruder@example.com", username="intruder", password="x12345678")
    Transaction.objects.create(
        owner=owner,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Privado",
        total_amount="500.00",
        competence_date="2026-09-01",
    )

    client = APIClient()
    client.force_authenticate(user=intruder)
    response = client.get("/api/reports/transactions/export/?type=csv")
    assert "Privado" not in response.content.decode("utf-8-sig")
