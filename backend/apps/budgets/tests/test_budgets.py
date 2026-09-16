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


@pytest.mark.django_db
def test_create_budget_normalizes_month_to_first_day(auth_client, category):
    response = auth_client.post(
        "/api/budgets/",
        {"category": category.id, "month": "2026-09-15", "limit_amount": "800.00", "alert_percentage": 80},
    )
    assert response.status_code == 201
    assert response.data["month"] == "2026-09-01"


@pytest.mark.django_db
def test_budget_reports_spent_amount_and_alert(auth_client, category, user):
    Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Compra 1",
        total_amount="700.00",
        competence_date="2026-09-05",
    )
    auth_client.post(
        "/api/budgets/",
        {"category": category.id, "month": "2026-09-01", "limit_amount": "800.00", "alert_percentage": 80},
    )

    response = auth_client.get("/api/budgets/?month=2026-09")
    assert response.status_code == 200
    budget = response.data[0]
    assert budget["spent_amount"] == 700.0
    assert budget["percentage_used"] == 87.5
    assert budget["is_over_alert"] is True


@pytest.mark.django_db
def test_budget_ignores_transactions_from_other_months(auth_client, category, user):
    Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Compra em agosto",
        total_amount="500.00",
        competence_date="2026-08-20",
    )
    auth_client.post(
        "/api/budgets/",
        {"category": category.id, "month": "2026-09-01", "limit_amount": "800.00"},
    )

    response = auth_client.get("/api/budgets/?month=2026-09")
    assert response.data[0]["spent_amount"] == 0.0


@pytest.mark.django_db
def test_cannot_create_duplicate_budget_for_same_category_and_month(auth_client, category):
    payload = {"category": category.id, "month": "2026-09-01", "limit_amount": "800.00"}
    first = auth_client.post("/api/budgets/", payload)
    second = auth_client.post("/api/budgets/", payload)

    assert first.status_code == 201
    assert second.status_code == 400
