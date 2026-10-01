from django.db.models import ProtectedError, Q
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """Categories are shared household infrastructure, not private data: the
    default pool (owner=None) is visible to and editable by every user, same
    as their own. `get_queryset` is the actual authorization boundary — a
    category outside it 404s before any object-level check would run — so no
    extra permission class is needed to keep users off each other's data."""

    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["category_type", "is_active"]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        return Category.objects.filter(
            Q(owner=user) | Q(owner__isnull=True, is_default=True)
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, is_default=False)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Esta categoria já foi usada em lançamentos e não pode ser excluída. Desative-a em vez disso."},
                status=status.HTTP_400_BAD_REQUEST,
            )
