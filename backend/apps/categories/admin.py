from django.contrib import admin

from .models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "category_type", "owner", "is_default", "is_active"]
    list_filter = ["category_type", "is_default", "is_active"]
    search_fields = ["name"]
