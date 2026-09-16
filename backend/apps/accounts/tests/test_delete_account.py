import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.transactions.models import CreditCard, CreditCardPurchase, RecurrenceRule, Transaction

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_delete_account_wrong_password_is_rejected(auth_client):
    response = auth_client.post("/api/auth/delete-account/", {"password": "errada"})
    assert response.status_code == 400


@pytest.mark.django_db
def test_delete_account_with_credit_card_history_succeeds(auth_client, user):
    # This is exactly the scenario that raised django.db.models.deletion.
    # ProtectedError before the ordered-delete fix: a custom category and a
    # credit card both have surviving PROTECT'd references at the moment
    # Django's cascade would otherwise try to remove them.
    category = Category.objects.create(
        owner=user, name="Categoria própria", category_type=Category.CategoryType.EXPENSE
    )
    card = CreditCard.objects.create(owner=user, name="Nubank", institution="Nu", closing_day=10, due_day=17)
    transaction = Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Compra",
        total_amount="100.00",
        competence_date="2026-09-01",
    )
    CreditCardPurchase.objects.create(
        transaction=transaction, credit_card=card, purchase_date="2026-09-01", invoice_month="2026-09-01"
    )
    RecurrenceRule.objects.create(
        owner=user,
        title="Assinatura",
        transaction_type=Transaction.TransactionType.EXPENSE,
        amount="30.00",
        category=category,
        frequency=RecurrenceRule.Frequency.MONTHLY,
        start_date="2026-01-01",
    )

    response = auth_client.post("/api/auth/delete-account/", {"password": "SenhaForte123"})

    assert response.status_code == 204
    assert not User.objects.filter(id=user.id).exists()


@pytest.mark.django_db
def test_deleting_credit_card_with_purchases_returns_409_not_500(auth_client, user):
    category = Category.objects.create(name="Mercado", category_type=Category.CategoryType.EXPENSE)
    card = CreditCard.objects.create(owner=user, name="Nubank", institution="Nu", closing_day=10, due_day=17)
    transaction = Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Compra",
        total_amount="50.00",
        competence_date="2026-09-01",
    )
    CreditCardPurchase.objects.create(
        transaction=transaction, credit_card=card, purchase_date="2026-09-01", invoice_month="2026-09-01"
    )

    response = auth_client.delete(f"/api/credit-cards/{card.id}/")

    assert response.status_code == 409
    assert "detail" in response.data
