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
    return Category.objects.create(name="Eletrônicos", category_type=Category.CategoryType.EXPENSE)


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_create_installment_plan_generates_transactions(auth_client, category):
    response = auth_client.post(
        "/api/installment-plans/",
        {
            "description": "Notebook",
            "category": category.id,
            "total_amount": "3600.00",
            "installment_count": 12,
            "first_due_date": "2026-01-15",
        },
    )
    assert response.status_code == 201
    assert len(response.data["installments"]) == 12

    amounts = [item["transaction_detail"]["total_amount"] for item in response.data["installments"]]
    assert amounts == ["300.00"] * 12

    dates = [item["transaction_detail"]["competence_date"] for item in response.data["installments"]]
    assert dates == [f"2026-{month:02d}-15" for month in range(1, 13)]


@pytest.mark.django_db
def test_installment_plan_rounding_absorbed_by_last_installment(auth_client, category):
    response = auth_client.post(
        "/api/installment-plans/",
        {
            "description": "Curso",
            "category": category.id,
            "total_amount": "100.00",
            "installment_count": 3,
            "first_due_date": "2026-01-01",
        },
    )
    assert response.status_code == 201
    amounts = [item["transaction_detail"]["total_amount"] for item in response.data["installments"]]
    # 100 / 3 = 33.33 repeating; the last installment absorbs the remainder
    # so the three add back up to exactly 100.00.
    assert amounts == ["33.33", "33.33", "33.34"]
    assert sum(float(a) for a in amounts) == 100.00


@pytest.mark.django_db
def test_deleting_installment_plan_removes_generated_transactions(auth_client, category, user):
    response = auth_client.post(
        "/api/installment-plans/",
        {
            "description": "TV",
            "category": category.id,
            "total_amount": "1200.00",
            "installment_count": 4,
            "first_due_date": "2026-03-01",
        },
    )
    plan_id = response.data["id"]
    assert Transaction.objects.filter(owner=user).count() == 4

    delete_response = auth_client.delete(f"/api/installment-plans/{plan_id}/")
    assert delete_response.status_code == 204
    assert Transaction.objects.filter(owner=user).count() == 0
