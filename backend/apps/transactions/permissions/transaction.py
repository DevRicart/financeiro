from rest_framework.permissions import BasePermission


class IsTransactionOwner(BasePermission):
    """Owner-only for now. Partner read-access via PartnershipPermission
    (see apps.couples) will extend this once cross-partner queries land."""

    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id
