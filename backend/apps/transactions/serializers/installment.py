from decimal import Decimal

from rest_framework import serializers

from apps.categories.models import Category
from apps.transactions.models import Installment, InstallmentPlan

from .transaction import TransactionSerializer


class InstallmentSerializer(serializers.ModelSerializer):
    transaction_detail = TransactionSerializer(source="transaction", read_only=True)

    class Meta:
        model = Installment
        fields = ["id", "number", "transaction", "transaction_detail"]
        read_only_fields = fields


class InstallmentPlanSerializer(serializers.ModelSerializer):
    installments = InstallmentSerializer(many=True, read_only=True)

    class Meta:
        model = InstallmentPlan
        fields = [
            "id",
            "description",
            "total_amount",
            "installment_count",
            "first_due_date",
            "installments",
            "created_at",
        ]
        read_only_fields = ["id", "installments", "created_at"]


class InstallmentPlanCreateSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=200)
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    installment_count = serializers.IntegerField(min_value=2, max_value=360)
    first_due_date = serializers.DateField()
    is_shared = serializers.BooleanField(required=False, default=False)

    def validate_category(self, value):
        user = self.context["request"].user
        if value.owner_id not in (None, user.id):
            raise serializers.ValidationError("Categoria inválida.")
        return value
