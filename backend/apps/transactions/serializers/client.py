from rest_framework import serializers

from apps.transactions.models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            "id",
            "display_name",
            "internal_code",
            "default_amount",
            "email",
            "phone",
            "notes",
            "is_active",
        ]
        read_only_fields = ["id"]
