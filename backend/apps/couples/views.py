from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Partnership, PartnershipPermission
from .serializers import (
    PartnershipInviteSerializer,
    PartnershipPermissionSerializer,
    PartnershipSerializer,
)

User = get_user_model()


class PartnershipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PartnershipSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        return Partnership.objects.filter(
            Q(creator=user) | Q(partner=user)
        ).select_related("creator", "partner", "permissions")

    def destroy(self, request, *args, **kwargs):
        partnership = self.get_object()
        partnership.status = Partnership.Status.ENDED
        partnership.save(update_fields=["status"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def invite(self, request):
        serializer = PartnershipInviteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        partner = User.objects.get(email__iexact=serializer.validated_data["partner_email"])

        partnership, created = Partnership.objects.get_or_create(
            creator=request.user,
            partner=partner,
            defaults={"status": Partnership.Status.PENDING},
        )
        if not created and partnership.status in (Partnership.Status.REJECTED, Partnership.Status.ENDED):
            partnership.status = Partnership.Status.PENDING
            partnership.accepted_at = None
            partnership.save(update_fields=["status", "accepted_at"])

        PartnershipPermission.objects.get_or_create(partnership=partnership)

        return Response(PartnershipSerializer(partnership).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        partnership = self.get_object()
        if partnership.partner_id != request.user.id:
            return Response(
                {"detail": "Apenas o convidado pode aceitar este convite."},
                status=status.HTTP_403_FORBIDDEN,
            )
        partnership.status = Partnership.Status.ACTIVE
        partnership.accepted_at = timezone.now()
        partnership.save(update_fields=["status", "accepted_at"])
        return Response(PartnershipSerializer(partnership).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        partnership = self.get_object()
        if partnership.partner_id != request.user.id:
            return Response(
                {"detail": "Apenas o convidado pode recusar este convite."},
                status=status.HTTP_403_FORBIDDEN,
            )
        partnership.status = Partnership.Status.REJECTED
        partnership.save(update_fields=["status"])
        return Response(PartnershipSerializer(partnership).data)


class PartnershipPermissionUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = PartnershipPermissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        partnership = generics.get_object_or_404(
            Partnership.objects.filter(
                Q(creator=self.request.user) | Q(partner=self.request.user)
            ),
            pk=self.kwargs["pk"],
        )
        permission, _ = PartnershipPermission.objects.get_or_create(partnership=partnership)
        return permission
