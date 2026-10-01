from django.core.management.base import BaseCommand

from apps.categories.models import Category

EXPENSE_CATEGORIES = [
    ("Assinaturas", "🔁"),
    ("Educação", "📚"),
    ("Eletrônicos", "💻"),
    ("Investimentos", "📈"),
    ("Lazer", "🎮"),
    ("Mercado", "🛒"),
    ("Casa", "🏠"),
    ("Outros", "📦"),
    ("Presentes", "🎁"),
    ("Restaurante", "🍔"),
    ("Saúde", "🏥"),
    ("Telefone", "📱"),
    ("Transporte", "🚗"),
    ("Vestuário", "👕"),
    ("Viagens", "✈️"),
    ("Contas", "🧾"),
]

INCOME_CATEGORIES = [
    ("Atendimento", "🩺"),
    ("Freelancer", "🧑‍💻"),
    ("Investimentos", "📈"),
    ("Outros", "📦"),
    ("Presente recebido", "🎁"),
    ("Reembolso", "↩️"),
    ("Salário", "💼"),
    ("Venda", "🏷️"),
]


class Command(BaseCommand):
    help = "Cria as categorias padrão de receita e despesa (idempotente)."

    def handle(self, *args, **options):
        created = 0
        for name, icon in EXPENSE_CATEGORIES:
            _, was_created = Category.objects.get_or_create(
                owner=None,
                name=name,
                category_type=Category.CategoryType.EXPENSE,
                defaults={"icon": icon, "is_default": True},
            )
            created += int(was_created)

        for name, icon in INCOME_CATEGORIES:
            _, was_created = Category.objects.get_or_create(
                owner=None,
                name=name,
                category_type=Category.CategoryType.INCOME,
                defaults={"icon": icon, "is_default": True},
            )
            created += int(was_created)

        self.stdout.write(self.style.SUCCESS(f"{created} categorias padrão criadas."))
