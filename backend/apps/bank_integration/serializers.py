from rest_framework import serializers

from apps.categories.models import Category
from apps.categories.serializers import CategorySerializer

from .models import ImportedTransaction, StatementImport


class StatementImportSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)

    class Meta:
        model = StatementImport
        fields = ["id", "account", "account_name", "file_name", "transaction_count", "imported_at"]
        read_only_fields = ["id", "account_name", "transaction_count", "imported_at"]


class ImportedTransactionSerializer(serializers.ModelSerializer):
    suggested_category_detail = CategorySerializer(source="suggested_category", read_only=True)
    account_name = serializers.CharField(source="statement_import.account.name", read_only=True)

    class Meta:
        model = ImportedTransaction
        fields = [
            "id",
            "description",
            "amount",
            "date",
            "status",
            "suggested_category",
            "suggested_category_detail",
            "account_name",
            "created_at",
        ]
        read_only_fields = fields


class ImportedTransactionConfirmSerializer(serializers.Serializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    is_shared = serializers.BooleanField(required=False, default=False)

    def validate_category(self, value):
        user = self.context["request"].user
        if value.owner_id not in (None, user.id):
            raise serializers.ValidationError("Categoria inválida.")
        return value
