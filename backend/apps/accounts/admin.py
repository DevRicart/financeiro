from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ["email"]
    list_display = ["email", "username", "preferred_name", "is_email_verified", "is_staff", "is_active"]
    search_fields = ["email", "username", "preferred_name"]
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Financeiro", {"fields": ("preferred_name", "avatar", "currency", "timezone")}),
        # Fill this in by hand to let someone in whose confirmation e-mail never arrived.
        ("E-mail", {"fields": ("email_verified_at",)}),
    )

    @admin.display(boolean=True, description="E-mail verificado")
    def is_email_verified(self, user):
        return user.is_email_verified
