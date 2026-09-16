import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.couples.models import Partnership, PartnershipPermission
from apps.transactions.models import Transaction

User = get_user_model()


@pytest.fixture
def user_a():
    return User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")


@pytest.fixture
def user_b():
    return User.objects.create_user(email="bruno@example.com", username="bruno", password="SenhaForte123")


@pytest.fixture
def category():
    return Category.objects.create(name="Mercado", category_type=Category.CategoryType.EXPENSE)


@pytest.fixture
def client_a(user_a):
    client = APIClient()
    client.force_authenticate(user=user_a)
    return client


def _make_expense(user, category, amount, day="10"):
    Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Despesa",
        total_amount=amount,
        competence_date=f"2026-09-{day}",
    )


@pytest.mark.django_db
def test_couple_summary_with_no_partnership_shows_only_own_data(client_a, user_a, category):
    _make_expense(user_a, category, "100.00")
    response = client_a.get("/api/dashboard/couple-summary/?month=2026-09")
    assert response.status_code == 200
    assert response.data["own"]["expense_total"] == 100.0
    assert response.data["partners"] == []
    assert response.data["combined"]["expense_total"] == 100.0


@pytest.mark.django_db
def test_couple_summary_hides_partner_data_when_not_shared(client_a, user_a, user_b, category):
    _make_expense(user_a, category, "100.00")
    _make_expense(user_b, category, "500.00")

    partnership = Partnership.objects.create(creator=user_a, partner=user_b, status=Partnership.Status.ACTIVE)
    PartnershipPermission.objects.create(
        partnership=partnership, share_income_totals=False, share_expense_totals=False
    )

    response = client_a.get("/api/dashboard/couple-summary/?month=2026-09")
    partner_entry = response.data["partners"][0]

    assert partner_entry["shares_expense_totals"] is False
    assert "expense_total" not in partner_entry
    # Partner's 500 must NOT leak into the combined total when sharing is off.
    assert response.data["combined"]["expense_total"] == 100.0


@pytest.mark.django_db
def test_couple_summary_includes_partner_totals_when_shared(client_a, user_a, user_b, category):
    _make_expense(user_a, category, "100.00")
    _make_expense(user_b, category, "500.00")

    partnership = Partnership.objects.create(creator=user_a, partner=user_b, status=Partnership.Status.ACTIVE)
    PartnershipPermission.objects.create(partnership=partnership, share_expense_totals=True)

    response = client_a.get("/api/dashboard/couple-summary/?month=2026-09")
    partner_entry = response.data["partners"][0]

    assert partner_entry["partner_name"] in (user_b.preferred_name, user_b.email, "bruno@example.com")
    assert partner_entry["expense_total"] == 500.0
    assert response.data["combined"]["expense_total"] == 600.0


@pytest.mark.django_db
def test_couple_summary_ignores_pending_or_rejected_partnerships(client_a, user_a, user_b, category):
    _make_expense(user_b, category, "500.00")
    Partnership.objects.create(creator=user_a, partner=user_b, status=Partnership.Status.PENDING)

    response = client_a.get("/api/dashboard/couple-summary/?month=2026-09")
    assert response.data["partners"] == []
    assert response.data["combined"]["expense_total"] == 0.0


@pytest.mark.django_db
def test_couple_summary_works_when_user_is_the_invited_partner(user_a, user_b, category):
    # Symmetric: user_b was invited by user_a (user_b is `partner`, not
    # `creator`), and should still see the couple summary correctly.
    _make_expense(user_a, category, "200.00")
    partnership = Partnership.objects.create(creator=user_a, partner=user_b, status=Partnership.Status.ACTIVE)
    PartnershipPermission.objects.create(partnership=partnership, share_expense_totals=True)

    client_b = APIClient()
    client_b.force_authenticate(user=user_b)
    response = client_b.get("/api/dashboard/couple-summary/?month=2026-09")

    partner_entry = response.data["partners"][0]
    assert partner_entry["partner_id"] == user_a.id
    assert partner_entry["expense_total"] == 200.0
