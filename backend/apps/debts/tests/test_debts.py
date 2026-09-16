import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.debts.models import Debt

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
def test_full_payment_marks_debt_paid(auth_client, user):
    debt = Debt.objects.create(
        owner=user,
        person_name="João",
        reason="Empréstimo",
        direction=Debt.Direction.RECEIVABLE,
        total_amount="200.00",
    )

    response = auth_client.post(
        f"/api/debts/{debt.id}/payments/",
        {"amount": "200.00", "payment_date": "2026-09-10", "payment_method": "PIX"},
    )
    assert response.status_code == 201

    debt.refresh_from_db()
    assert debt.status == Debt.Status.PAID
