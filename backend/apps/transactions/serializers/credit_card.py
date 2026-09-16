from rest_framework import serializers

from apps.transactions.models import CreditCard, CreditCardPurchase


class CreditCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditCard
        fields = [
            "id",
            "name",
            "institution",
            "last_four_digits",
            "credit_limit",
            "closing_day",
            "due_day",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_closing_day(self, value):
        if not 1 <= value <= 31:
            raise serializers.ValidationError("Dia inválido.")
        return value

    def validate_due_day(self, value):
        if not 1 <= value <= 31:
            raise serializers.ValidationError("Dia inválido.")
        return value


class CreditCardPurchaseSerializer(serializers.ModelSerializer):
    transaction_title = serializers.CharField(source="transaction.title", read_only=True)
    transaction_amount = serializers.DecimalField(
        source="transaction.total_amount", max_digits=14, decimal_places=2, read_only=True
    )
    transaction_status = serializers.CharField(source="transaction.status", read_only=True)

    class Meta:
        model = CreditCardPurchase
        fields = [
            "id",
            "transaction",
            "transaction_title",
            "transaction_amount",
            "transaction_status",
            "credit_card",
            "purchase_date",
            "invoice_month",
        ]
        read_only_fields = fields
