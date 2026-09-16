from rest_framework import serializers

from apps.transactions.models import FreelanceDetail, SalaryDetail, ServiceIncomeDetail


class SalaryDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryDetail
        fields = ["employer_name", "gross_amount", "net_amount", "reference_month"]


class ServiceIncomeDetailSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.display_name", read_only=True)

    class Meta:
        model = ServiceIncomeDetail
        fields = ["client", "client_name", "service_date", "service_type", "duration_minutes"]


class FreelanceDetailSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.display_name", read_only=True)

    class Meta:
        model = FreelanceDetail
        fields = ["client", "client_name", "project_name", "start_date", "delivery_date"]
