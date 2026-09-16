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
def income_category():
    return Category.objects.create(name="Salário", category_type=Category.CategoryType.INCOME)


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_summary_with_no_data_returns_zero_floats(auth_client):
    response = auth_client.get("/api/dashboard/summary/?month=2026-09")
    assert response.status_code == 200
    for key in ["income_total", "income_received", "expense_total", "expense_paid", "cash_profit", "accrual_profit"]:
        assert response.data[key] == 0.0
        assert isinstance(response.data[key], float)


@pytest.mark.django_db
def test_summary_reflects_income_and_settled_expenses(auth_client, user, category, income_category):
    Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.INCOME,
        category=income_category,
        title="Salário",
        total_amount="5000.00",
        competence_date="2026-09-05",
    )
    expense = Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Mercado",
        total_amount="300.00",
        competence_date="2026-09-10",
    )
    auth_client.post(
        f"/api/transactions/{expense.id}/settlements/",
        {"amount": "300.00", "settlement_date": "2026-09-10", "payment_method": "PIX"},
    )

    response = auth_client.get("/api/dashboard/summary/?month=2026-09")
    data = response.data
    assert data["income_total"] == 5000.0
    assert data["income_received"] == 0.0  # income has no settlement registered
    assert data["expense_paid"] == 300.0
    assert data["cash_profit"] == -300.0
    assert data["accrual_profit"] == 4700.0


@pytest.mark.django_db
def test_summary_excludes_cancelled_transactions(auth_client, user, category):
    Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Cancelada",
        total_amount="999.00",
        competence_date="2026-09-01",
        status=Transaction.Status.CANCELLED,
    )
    response = auth_client.get("/api/dashboard/summary/?month=2026-09")
    assert response.data["expense_total"] == 0.0


@pytest.mark.django_db
def test_expenses_by_category_groups_and_sorts_by_total(auth_client, user, category):
    other_category = Category.objects.create(name="Lazer", category_type=Category.CategoryType.EXPENSE)
    Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Compra 1",
        total_amount="100.00",
        competence_date="2026-09-01",
    )
    Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=other_category,
        title="Cinema",
        total_amount="300.00",
        competence_date="2026-09-02",
    )

    response = auth_client.get("/api/dashboard/expenses-by-category/?month=2026-09")
    assert response.status_code == 200
    assert [row["category__name"] for row in response.data] == ["Lazer", "Mercado"]
    assert response.data[0]["total"] == 300.0


@pytest.mark.django_db
def test_dashboard_scoped_to_authenticated_user_only(category):
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
    response = client.get("/api/dashboard/summary/?month=2026-09")
    assert response.data["expense_total"] == 0.0
