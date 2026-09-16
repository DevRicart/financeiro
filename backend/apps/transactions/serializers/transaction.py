from rest_framework import serializers

from apps.categories.serializers import CategorySerializer
from apps.transactions.models import Transaction, TransactionSettlement


class TransactionSettlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionSettlement
        fields = [
            "id",
            "transaction",
            "amount",
            "settlement_date",
            "payment_method",
            "account",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "transaction", "created_at"]


class TransactionSerializer(serializers.ModelSerializer):
    category_detail = CategorySerializer(source="category", read_only=True)
    settlements = TransactionSettlementSerializer(many=True, read_only=True)
    settled_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "transaction_type",
            "income_type",
            "category",
            "category_detail",
            "title",
            "description",
            "total_amount",
            "competence_date",
            "due_date",
            "status",
            "is_shared",
            "settlements",
            "settled_amount",
            "remaining_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]
