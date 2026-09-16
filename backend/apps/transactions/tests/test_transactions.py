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
def test_create_transaction_starts_pending(auth_client, category):
    response = auth_client.post(
        "/api/transactions/",
        {
            "transaction_type": "EXPENSE",
            "category": category.id,
            "title": "Compras",
            "total_amount": "300.00",
            "competence_date": "2026-09-01",
        },
    )
    assert response.status_code == 201
    assert response.data["status"] == "PENDING"
    assert response.data["remaining_amount"] == "300.00"


@pytest.mark.django_db
def test_full_settlement_marks_completed(auth_client, user, category):
    transaction = Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Aluguel",
        total_amount="1000.00",
        competence_date="2026-09-01",
    )

    response = auth_client.post(
        f"/api/transactions/{transaction.id}/settlements/",
        {"amount": "1000.00", "settlement_date": "2026-09-05", "payment_method": "PIX"},
    )
    assert response.status_code == 201

    transaction.refresh_from_db()
    assert transaction.status == Transaction.Status.COMPLETED


@pytest.mark.django_db
def test_partial_settlement_marks_partial(auth_client, user, category):
    transaction = Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Cartão",
        total_amount="500.00",
        competence_date="2026-09-01",
    )

    auth_client.post(
        f"/api/transactions/{transaction.id}/settlements/",
        {"amount": "200.00", "settlement_date": "2026-09-05", "payment_method": "PIX"},
    )

    transaction.refresh_from_db()
    assert transaction.status == Transaction.Status.PARTIAL
    assert transaction.remaining_amount == 300


@pytest.mark.django_db
def test_user_cannot_see_other_users_transactions(category):
    owner = User.objects.create_user(email="owner@example.com", username="owner", password="x12345678")
    intruder = User.objects.create_user(email="intruder@example.com", username="intruder", password="x12345678")

    Transaction.objects.create(
        owner=owner,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Privado",
        total_amount="50.00",
        competence_date="2026-09-01",
    )

    client = APIClient()
    client.force_authenticate(user=intruder)
    response = client.get("/api/transactions/")
    assert response.status_code == 200
    assert response.data["count"] == 0
