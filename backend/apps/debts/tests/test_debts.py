import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework.test import APIClient

from apps.debts.models import Debt
from apps.transactions.models import Client

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


@pytest.mark.django_db
def test_create_debt_with_free_typed_name(auth_client):
    response = auth_client.post(
        "/api/debts/",
        {"person_name": "Maria", "reason": "Almoço", "direction": "PAYABLE", "total_amount": "50.00"},
    )
    assert response.status_code == 201
    assert response.data["person_name"] == "Maria"
    assert response.data["display_name"] == "Maria"
    assert response.data["client"] is None


@pytest.mark.django_db
def test_create_debt_with_registered_client_derives_person_name(auth_client, user):
    client_obj = Client.objects.create(owner=user, display_name="João Cliente")

    response = auth_client.post(
        "/api/debts/",
        {"client": client_obj.id, "reason": "Consultoria", "direction": "RECEIVABLE", "total_amount": "300.00"},
    )
    assert response.status_code == 201
    assert response.data["person_name"] == "João Cliente"
    assert response.data["display_name"] == "João Cliente"
    assert response.data["client_name"] == "João Cliente"


@pytest.mark.django_db
def test_create_debt_without_client_or_name_is_rejected(auth_client):
    response = auth_client.post(
        "/api/debts/", {"reason": "Sem nome", "direction": "PAYABLE", "total_amount": "10.00"}
    )
    assert response.status_code == 400
    assert "person_name" in response.data


@pytest.mark.django_db
def test_cannot_use_another_users_client(auth_client):
    other_user = User.objects.create_user(email="outra@example.com", username="outra", password="x12345678")
    other_client = Client.objects.create(owner=other_user, display_name="Cliente de outra pessoa")

    response = auth_client.post(
        "/api/debts/",
        {"client": other_client.id, "reason": "Teste", "direction": "PAYABLE", "total_amount": "10.00"},
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_db_constraint_blocks_debt_without_client_or_name(user):
    with pytest.raises(IntegrityError):
        Debt.objects.create(
            owner=user, reason="Sem nome nem cliente", direction=Debt.Direction.PAYABLE, total_amount="10.00"
        )
