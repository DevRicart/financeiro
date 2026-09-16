from rest_framework import serializers

from apps.transactions.models import RecurrenceRule


class RecurrenceRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurrenceRule
        fields = [
            "id",
            "title",
            "transaction_type",
            "amount",
            "category",
            "frequency",
            "start_date",
            "end_date",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_category(self, value):
        user = self.context["request"].user
        if value.owner_id not in (None, user.id):
            raise serializers.ValidationError("Categoria inválida.")
        return value
