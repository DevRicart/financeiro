from rest_framework import serializers

from .models import Debt, DebtPayment


class DebtPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebtPayment
        fields = ["id", "debt", "amount", "payment_date", "payment_method", "notes"]
        read_only_fields = ["id", "debt"]


class DebtSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.display_name", read_only=True)
    display_name = serializers.CharField(read_only=True)
    payments = DebtPaymentSerializer(many=True, read_only=True)
    paid_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Debt
        fields = [
            "id",
            "client",
            "client_name",
            "person_name",
            "display_name",
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

    def validate_client(self, value):
        if value is None:
            return value
        user = self.context["request"].user
        if value.owner_id != user.id:
            raise serializers.ValidationError("Cliente inválido.")
        return value

    def validate(self, attrs):
        # Either a registered client or a free-typed name is required — never
        # neither. When a client is given, it always wins: person_name is
        # derived from it so `display_name`/admin/str() stay consistent even
        # if the caller also sent a stray person_name.
        client = attrs.get("client", getattr(self.instance, "client", None))
        person_name = attrs.get("person_name", getattr(self.instance, "person_name", ""))

        if client:
            attrs["person_name"] = client.display_name
        elif not person_name:
            raise serializers.ValidationError(
                {"person_name": "Informe um nome ou selecione um cliente."}
            )

        return attrs
