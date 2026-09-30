from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.debts.models import Debt, DebtRecurrenceRule
from apps.debts.services import generate_due_debts

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
def test_generate_backfills_missed_monthly_occurrences(user):
    DebtRecurrenceRule.objects.create(
        owner=user,
        person_name="Aluguel do imóvel",
        reason="Aluguel",
        direction=Debt.Direction.PAYABLE,
        amount="1500.00",
        frequency=DebtRecurrenceRule.Frequency.MONTHLY,
        start_date=date(2026, 1, 5),
    )

    created = generate_due_debts(user=user, as_of=date(2026, 3, 10))

    generated_dates = sorted(debt.due_date for debt in created)
    assert generated_dates == [date(2026, 1, 5), date(2026, 2, 5), date(2026, 3, 5)]


@pytest.mark.django_db
def test_generate_is_idempotent(user):
    DebtRecurrenceRule.objects.create(
        owner=user,
        person_name="Academia",
        reason="Mensalidade",
        direction=Debt.Direction.PAYABLE,
        amount="90.00",
        frequency=DebtRecurrenceRule.Frequency.MONTHLY,
        start_date=date(2026, 1, 1),
    )

    first_run = generate_due_debts(user=user, as_of=date(2026, 4, 1))
    second_run = generate_due_debts(user=user, as_of=date(2026, 4, 1))

    assert len(first_run) == 4
    assert len(second_run) == 0
    assert Debt.objects.filter(owner=user, recurrence_rule__reason="Mensalidade").count() == 4


@pytest.mark.django_db
def test_generate_respects_end_date(user):
    DebtRecurrenceRule.objects.create(
        owner=user,
        person_name="Empréstimo",
        reason="Parcela",
        direction=Debt.Direction.RECEIVABLE,
        amount="200.00",
        frequency=DebtRecurrenceRule.Frequency.MONTHLY,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 2, 15),
    )

    created = generate_due_debts(user=user, as_of=date(2026, 6, 1))

    assert len(created) == 2  # Jan 1 e Fev 1 apenas; Mar 1 já passou do end_date


@pytest.mark.django_db
def test_generate_endpoint(auth_client, user):
    DebtRecurrenceRule.objects.create(
        owner=user,
        person_name="Assinatura de streaming",
        reason="Netflix",
        direction=Debt.Direction.PAYABLE,
        amount="30.00",
        frequency=DebtRecurrenceRule.Frequency.MONTHLY,
        start_date=date.today().replace(day=1),
    )
    response = auth_client.post("/api/debt-recurrences/generate/")
    assert response.status_code == 200
    assert response.data["created_count"] == 1


@pytest.mark.django_db
def test_create_recurrence_without_client_or_name_is_rejected(auth_client):
    response = auth_client.post(
        "/api/debt-recurrences/",
        {
            "reason": "Sem nome",
            "direction": "PAYABLE",
            "amount": "10.00",
            "frequency": "MONTHLY",
            "start_date": "2026-01-01",
        },
    )
    assert response.status_code == 400
    assert "person_name" in response.data
