from rest_framework import serializers

from .models import Debt, DebtPayment


class DebtPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebtPayment
        fields = ["id", "debt", "amount", "payment_date", "payment_method", "notes"]
        read_only_fields = ["id", "debt"]


class DebtSerializer(serializers.ModelSerializer):
    payments = DebtPaymentSerializer(many=True, read_only=True)
    paid_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Debt
        fields = [
            "id",
            "person_name",
            "reason",
            "direction",
            "total_amount",
            "due_date",
            "status",
            "payments",
            "paid_amount",
            "remaining_amount",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]
