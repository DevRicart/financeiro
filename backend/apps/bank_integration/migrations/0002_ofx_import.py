import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    """Substitui a integração com a Pluggy (Open Finance) por importação de
    extratos OFX enviados pelo usuário. Nenhuma das tabelas antigas tinha
    dado real de produção (Pluggy nunca chegou a rodar com credenciais reais),
    por isso a troca é uma recriação direta em vez de uma migração de dados."""

    dependencies = [
        ("categories", "0001_initial"),
        ("transactions", "0001_initial"),
        ("bank_integration", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.DeleteModel(name="ImportedTransaction"),
        migrations.DeleteModel(name="SyncedAccount"),
        migrations.DeleteModel(name="BankConnection"),
        migrations.CreateModel(
            name="StatementImport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file_name", models.CharField(blank=True, max_length=255)),
                ("transaction_count", models.PositiveIntegerField(default=0)),
                ("imported_at", models.DateTimeField(auto_now_add=True)),
                (
                    "account",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="statement_imports",
                        to="transactions.financialaccount",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="statement_imports",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-imported_at"],
            },
        ),
        migrations.CreateModel(
            name="ImportedTransaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("external_id", models.CharField(db_index=True, max_length=200)),
                ("description", models.CharField(max_length=255)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("date", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING_REVIEW", "Aguardando revisão"),
                            ("CONFIRMED", "Confirmada"),
                            ("IGNORED", "Ignorada"),
                        ],
                        default="PENDING_REVIEW",
                        max_length=20,
                    ),
                ),
                ("raw_payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "resulting_transaction",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="imported_from",
                        to="transactions.transaction",
                    ),
                ),
                (
                    "suggested_category",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="categories.category",
                    ),
                ),
                (
                    "statement_import",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="imported_transactions",
                        to="bank_integration.statementimport",
                    ),
                ),
            ],
            options={
                "ordering": ["-date"],
            },
        ),
    ]
