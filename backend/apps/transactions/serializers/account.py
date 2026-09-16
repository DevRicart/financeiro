from rest_framework import serializers

from apps.transactions.models import FinancialAccount


class FinancialAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialAccount
        fields = [
            "id",
            "name",
            "institution",
            "account_type",
            "initial_balance",
            "is_active",
        ]
        read_only_fields = ["id"]
