from django.db import models


class SalaryDetail(models.Model):
    transaction = models.OneToOneField(
        "transactions.Transaction",
        on_delete=models.CASCADE,
        related_name="salary_detail",
    )

    employer_name = models.CharField(max_length=150)
    gross_amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    net_amount = models.DecimalField(max_digits=14, decimal_places=2)
    reference_month = models.DateField()

    def __str__(self):
        return f"{self.employer_name} ({self.reference_month:%Y-%m})"


class ServiceIncomeDetail(models.Model):
    transaction = models.OneToOneField(
        "transactions.Transaction",
        on_delete=models.CASCADE,
        related_name="service_detail",
    )
    client = models.ForeignKey(
        "transactions.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_incomes",
    )

    service_date = models.DateField()
    service_type = models.CharField(max_length=100, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return f"Atendimento {self.service_date}"


class FreelanceDetail(models.Model):
    transaction = models.OneToOneField(
        "transactions.Transaction",
        on_delete=models.CASCADE,
        related_name="freelance_detail",
    )
    client = models.ForeignKey(
        "transactions.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="freelance_projects",
    )

    project_name = models.CharField(max_length=200)
    start_date = models.DateField(null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.project_name
