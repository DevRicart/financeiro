from django.db.models import ProtectedError, Q
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from .models import Category
from .serializers import CategorySerializer


class IsOwnerOrReadOnlyDefault(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if obj.is_default:
            return request.method in permissions.SAFE_METHODS
        return obj.owner_id == request.user.id


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnlyDefault]
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
