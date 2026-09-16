from rest_framework import serializers

from apps.categories.serializers import CategorySerializer
from apps.transactions.models import CreditCard, Transaction, TransactionSettlement

from .income_details import FreelanceDetailSerializer, SalaryDetailSerializer, ServiceIncomeDetailSerializer


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

    salary_detail = SalaryDetailSerializer(required=False)
    service_detail = ServiceIncomeDetailSerializer(required=False)
    freelance_detail = FreelanceDetailSerializer(required=False)

    is_recurring = serializers.SerializerMethodField()
    is_installment = serializers.SerializerMethodField()
    is_credit_card_purchase = serializers.SerializerMethodField()

    credit_card = serializers.PrimaryKeyRelatedField(
        queryset=CreditCard.objects.all(), write_only=True, required=False
    )
    credit_card_name = serializers.CharField(source="credit_card_purchase.credit_card.name", read_only=True)
    invoice_month = serializers.DateField(source="credit_card_purchase.invoice_month", read_only=True)

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
            "salary_detail",
            "service_detail",
            "freelance_detail",
            "is_recurring",
            "is_installment",
            "is_credit_card_purchase",
            "credit_card",
            "credit_card_name",
            "invoice_month",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def get_is_recurring(self, obj):
        return obj.recurrence_rule_id is not None

    def get_is_installment(self, obj):
        return hasattr(obj, "installment")

    def get_is_credit_card_purchase(self, obj):
        return hasattr(obj, "credit_card_purchase")

    def validate_credit_card(self, value):
        user = self.context["request"].user
        if value.owner_id != user.id:
            raise serializers.ValidationError("Cartão inválido.")
        return value
