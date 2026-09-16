from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Partnership, PartnershipPermission

User = get_user_model()


class PartnershipPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnershipPermission
        fields = [
            "share_income_totals",
            "share_income_details",
            "share_expense_totals",
            "share_expense_details",
            "share_client_names",
            "share_goals",
            "share_debts",
            "share_accounts",
        ]


class PartnershipSerializer(serializers.ModelSerializer):
    permissions = PartnershipPermissionSerializer(read_only=True)
    creator_email = serializers.EmailField(source="creator.email", read_only=True)
    partner_email = serializers.EmailField(source="partner.email", read_only=True)

    class Meta:
        model = Partnership
        fields = [
            "id",
            "creator",
            "creator_email",
            "partner",
            "partner_email",
            "status",
            "permissions",
            "created_at",
            "accepted_at",
        ]
        read_only_fields = ["id", "creator", "partner", "status", "created_at", "accepted_at"]


class PartnershipInviteSerializer(serializers.Serializer):
    partner_email = serializers.EmailField()

    def validate_partner_email(self, value):
        request = self.context["request"]
        if value.lower() == request.user.email.lower():
            raise serializers.ValidationError("Você não pode convidar a si mesmo.")
        if not User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Nenhum usuário encontrado com este e-mail.")
        return value
