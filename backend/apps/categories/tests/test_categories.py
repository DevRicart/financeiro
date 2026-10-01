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
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_create_category_is_owned_and_not_default(auth_client, user):
    response = auth_client.post(
        "/api/categories/", {"name": "Pets", "category_type": "EXPENSE", "icon": "🐾"}
    )
    assert response.status_code == 201
    assert response.data["owner"] == user.id
    assert response.data["is_default"] is False


@pytest.mark.django_db
def test_user_can_update_and_delete_own_category(auth_client, user):
    category = Category.objects.create(owner=user, name="Hobbies", category_type=Category.CategoryType.EXPENSE)

    update_response = auth_client.patch(f"/api/categories/{category.id}/", {"name": "Lazer"})
    assert update_response.status_code == 200
    assert update_response.data["name"] == "Lazer"

    delete_response = auth_client.delete(f"/api/categories/{category.id}/")
    assert delete_response.status_code == 204
    assert not Category.objects.filter(id=category.id).exists()


@pytest.mark.django_db
def test_user_can_edit_and_delete_a_default_category(auth_client):
    # Categories are shared household setup, not private data — either
    # partner can rename or remove the seeded defaults, same as their own.
    default_category = Category.objects.create(
        owner=None, name="Mercado", category_type=Category.CategoryType.EXPENSE, is_default=True
    )

    update_response = auth_client.patch(f"/api/categories/{default_category.id}/", {"name": "Supermercado"})
    assert update_response.status_code == 200
    assert update_response.data["name"] == "Supermercado"

    delete_response = auth_client.delete(f"/api/categories/{default_category.id}/")
    assert delete_response.status_code == 204


@pytest.mark.django_db
def test_cannot_modify_another_users_category(auth_client):
    other_user = User.objects.create_user(email="bob@example.com", username="bob", password="SenhaForte123")
    other_category = Category.objects.create(
        owner=other_user, name="Particular do Bob", category_type=Category.CategoryType.EXPENSE
    )

    response = auth_client.patch(f"/api/categories/{other_category.id}/", {"name": "Hackeado"})
    assert response.status_code == 404


@pytest.mark.django_db
def test_deleting_a_category_in_use_fails_cleanly(auth_client, user):
    category = Category.objects.create(owner=user, name="Transporte", category_type=Category.CategoryType.EXPENSE)
    Transaction.objects.create(
        owner=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=category,
        title="Uber",
        total_amount="25.00",
        competence_date="2026-09-01",
        due_date="2026-09-01",
    )

    response = auth_client.delete(f"/api/categories/{category.id}/")

    assert response.status_code == 400
    assert Category.objects.filter(id=category.id).exists()
