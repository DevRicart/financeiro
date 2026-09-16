from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.transactions.models import RecurrenceRule, Transaction
from apps.transactions.services import generate_due_transactions

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")


@pytest.fixture
def category():
    return Category.objects.create(name="Moradia", category_type=Category.CategoryType.EXPENSE)


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_generate_backfills_missed_monthly_occurrences(user, category):
    RecurrenceRule.objects.create(
        owner=user,
        title="Aluguel",
        transaction_type=Transaction.TransactionType.EXPENSE,
        amount="1500.00",
        category=category,
        frequency=RecurrenceRule.Frequency.MONTHLY,
        start_date=date(2026, 1, 5),
    )

    created = generate_due_transactions(user=user, as_of=date(2026, 3, 10))

    generated_dates = sorted(t.competence_date for t in created)
    assert generated_dates == [date(2026, 1, 5), date(2026, 2, 5), date(2026, 3, 5)]


@pytest.mark.django_db
def test_generate_is_idempotent(user, category):
    RecurrenceRule.objects.create(
        owner=user,
        title="Internet",
        transaction_type=Transaction.TransactionType.EXPENSE,
        amount="100.00",
        category=category,
        frequency=RecurrenceRule.Frequency.MONTHLY,
        start_date=date(2026, 1, 1),
    )

    first_run = generate_due_transactions(user=user, as_of=date(2026, 4, 1))
    second_run = generate_due_transactions(user=user, as_of=date(2026, 4, 1))

    assert len(first_run) == 4
    assert len(second_run) == 0
    assert Transaction.objects.filter(owner=user, recurrence_rule__title="Internet").count() == 4


@pytest.mark.django_db
def test_generate_respects_end_date(user, category):
    RecurrenceRule.objects.create(
        owner=user,
        title="Academia",
        transaction_type=Transaction.TransactionType.EXPENSE,
        amount="90.00",
        category=category,
        frequency=RecurrenceRule.Frequency.MONTHLY,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 2, 15),
    )

    created = generate_due_transactions(user=user, as_of=date(2026, 6, 1))

    assert len(created) == 2  # Jan 1 and Feb 1 only; Mar 1 is past end_date


@pytest.mark.django_db
def test_generate_endpoint(auth_client, category, user):
    RecurrenceRule.objects.create(
        owner=user,
        title="Assinatura",
        transaction_type=Transaction.TransactionType.EXPENSE,
        amount="30.00",
        category=category,
        frequency=RecurrenceRule.Frequency.MONTHLY,
        start_date=date.today().replace(day=1),
    )
    response = auth_client.post("/api/recurrences/generate/")
    assert response.status_code == 200
    assert response.data["created_count"] == 1
