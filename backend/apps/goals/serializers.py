from rest_framework import serializers

from .models import FinancialGoal, GoalContribution


class GoalContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalContribution
        fields = ["id", "goal", "user", "amount", "contribution_date", "notes"]
        read_only_fields = ["id", "goal", "user"]


class FinancialGoalSerializer(serializers.ModelSerializer):
    contributions = GoalContributionSerializer(many=True, read_only=True)
    current_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = FinancialGoal
        fields = [
            "id",
            "name",
            "description",
            "goal_type",
            "participants",
            "target_amount",
            "deadline",
            "contributions",
            "current_amount",
            "progress_percentage",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
