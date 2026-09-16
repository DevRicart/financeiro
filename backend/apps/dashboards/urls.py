from django.urls import path

from . import views

urlpatterns = [
    path("summary/", views.DashboardSummaryView.as_view(), name="dashboard-summary"),
    path(
        "monthly-evolution/",
        views.MonthlyEvolutionView.as_view(),
        name="dashboard-monthly-evolution",
    ),
    path(
        "expenses-by-category/",
        views.ExpensesByCategoryView.as_view(),
        name="dashboard-expenses-by-category",
    ),
    path("income-by-type/", views.IncomeByTypeView.as_view(), name="dashboard-income-by-type"),
    path("goals/", views.DashboardGoalsView.as_view(), name="dashboard-goals"),
    path("debts/", views.DashboardDebtsView.as_view(), name="dashboard-debts"),
    path("couple-summary/", views.CoupleSummaryView.as_view(), name="dashboard-couple-summary"),
]
