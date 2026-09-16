from django.contrib import admin

from .models import FinancialGoal, GoalContribution


class GoalContributionInline(admin.TabularInline):
    model = GoalContribution
    extra = 0


@admin.register(FinancialGoal)
class FinancialGoalAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "goal_type", "target_amount", "deadline"]
    list_filter = ["goal_type"]
    inlines = [GoalContributionInline]
