from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.common.dates import compute_invoice_month
from apps.transactions.models import CreditCard, Transaction

User = get_user_model()


def test_compute_invoice_month_before_closing():
    assert compute_invoice_month(date(2026, 3, 10), closing_day=15) == date(2026, 3, 1)


def test_compute_invoice_month_after_closing():
    assert compute_invoice_month(date(2026, 3, 20), closing_day=15) == date(2026, 4, 1)


def test_compute_invoice_month_rolls_over_year():
    assert compute_invoice_month(date(2026, 12, 20), closing_day=15) == date(2027, 1, 1)


@pytest.fixture
def user():
    return User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")


@pytest.fixture
def category():
    return Category.objects.create(name="Eletrônicos", category_type=Category.CategoryType.EXPENSE)


@pytest.fixture
def card(user):
    return CreditCard.objects.create(
        owner=user, name="Nubank", institution="Nubank", closing_day=10, due_day=17
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_creating_transaction_with_credit_card_creates_purchase(auth_client, category, card):
    response = auth_client.post(
        "/api/transactions/",
        {
            "transaction_type": "EXPENSE",
            "category": category.id,
            "title": "Fone de ouvido",
            "total_amount": "250.00",
            "competence_date": "2026-03-20",
            "credit_card": card.id,
        },
    )
    assert response.status_code == 201
    assert response.data["is_credit_card_purchase"] is True
    assert response.data["credit_card_name"] == "Nubank"
    assert response.data["invoice_month"] == "2026-04-01"


@pytest.mark.django_db
def test_pay_invoice_settles_all_purchases_in_month(auth_client, category, card, user):
    for day, title in [(2, "Compra 1"), (25, "Compra 2")]:
        Transaction.objects.create(
            owner=user,
            transaction_type=Transaction.TransactionType.EXPENSE,
            category=category,
            title=title,
            total_amount="100.00",
            competence_date=date(2026, 3, day),
        )
    # Attach both to the card's March invoice directly via the model, since
    # only the through-transaction-creation path is exposed over the API.
    from apps.transactions.models import CreditCardPurchase

    for transaction in Transaction.objects.filter(owner=user):
        CreditCardPurchase.objects.create(
            transaction=transaction,
            credit_card=card,
            purchase_date=transaction.competence_date,
            invoice_month=date(2026, 3, 1),
        )

    invoice_response = auth_client.get(f"/api/credit-cards/{card.id}/invoice/?month=2026-03")
    assert invoice_response.status_code == 200
    assert invoice_response.data["total"] == 200.0
    assert len(invoice_response.data["purchases"]) == 2

    pay_response = auth_client.post(
        f"/api/credit-cards/{card.id}/invoice/pay/",
        {"month": "2026-03", "payment_date": "2026-03-17"},
    )
    assert pay_response.status_code == 200
    assert pay_response.data["settled_count"] == 2

    for transaction in Transaction.objects.filter(owner=user):
        assert transaction.status == Transaction.Status.COMPLETED
