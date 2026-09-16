from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "category_type",
            "icon",
            "color",
            "is_default",
            "is_active",
            "owner",
        ]
        read_only_fields = ["id", "is_default", "owner"]
