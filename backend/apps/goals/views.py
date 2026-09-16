from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import FinancialGoal
from .serializers import FinancialGoalSerializer, GoalContributionSerializer


class FinancialGoalViewSet(viewsets.ModelViewSet):
    serializer_class = FinancialGoalSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        return (
            FinancialGoal.objects.filter(Q(owner=user) | Q(participants=user))
            .distinct()
            .prefetch_related("contributions", "participants")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["post"])
    def contributions(self, request, pk=None):
        goal = self.get_object()
        serializer = GoalContributionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contribution = serializer.save(goal=goal, user=request.user)
        return Response(GoalContributionSerializer(contribution).data, status=201)
