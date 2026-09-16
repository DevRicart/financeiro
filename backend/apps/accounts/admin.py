from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ["email"]
    list_display = ["email", "username", "preferred_name", "is_staff", "is_active"]
    search_fields = ["email", "username", "preferred_name"]
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Financeiro", {"fields": ("preferred_name", "avatar", "currency", "timezone")}),
    )
