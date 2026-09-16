from django.contrib import admin

from .models import Partnership, PartnershipPermission


class PartnershipPermissionInline(admin.StackedInline):
    model = PartnershipPermission
    extra = 0


@admin.register(Partnership)
class PartnershipAdmin(admin.ModelAdmin):
    list_display = ["creator", "partner", "status", "created_at", "accepted_at"]
    list_filter = ["status"]
    inlines = [PartnershipPermissionInline]
