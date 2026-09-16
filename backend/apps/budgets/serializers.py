from rest_framework import serializers

from apps.categories.serializers import CategorySerializer

from .models import MonthlyBudget


class MonthlyBudgetSerializer(serializers.ModelSerializer):
    category_detail = CategorySerializer(source="category", read_only=True)
    spent_amount = serializers.SerializerMethodField()
    percentage_used = serializers.SerializerMethodField()
    is_over_alert = serializers.SerializerMethodField()

    class Meta:
        model = MonthlyBudget
        fields = [
            "id",
            "category",
            "category_detail",
            "month",
            "limit_amount",
            "alert_percentage",
            "spent_amount",
            "percentage_used",
            "is_over_alert",
        ]
        read_only_fields = ["id"]

    def get_spent_amount(self, obj):
        return float(getattr(obj, "spent_amount", 0) or 0)

    def get_percentage_used(self, obj):
        spent = self.get_spent_amount(obj)
        limit = float(obj.limit_amount)
        if limit <= 0:
            return 0.0
        return round(min(999, (spent / limit) * 100), 1)

    def get_is_over_alert(self, obj):
        return self.get_percentage_used(obj) >= obj.alert_percentage

    def validate_month(self, value):
        return value.replace(day=1)

    def validate_category(self, value):
        user = self.context["request"].user
        if value.owner_id not in (None, user.id):
            raise serializers.ValidationError("Categoria inválida.")
        return value

    def validate(self, attrs):
        # `owner` isn't a serializer field (it's set server-side in
        # perform_create), so DRF can't auto-build a UniqueTogetherValidator
        # from the model's UniqueConstraint — without this, a duplicate would
        # hit the DB directly and surface as an unhandled IntegrityError.
        user = self.context["request"].user
        category = attrs.get("category", getattr(self.instance, "category", None))
        month = attrs.get("month", getattr(self.instance, "month", None))

        if category and month:
            queryset = MonthlyBudget.objects.filter(owner=user, category=category, month=month)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError("Já existe um orçamento para esta categoria neste mês.")

        return attrs
