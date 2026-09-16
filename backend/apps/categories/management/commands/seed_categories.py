from django.core.management.base import BaseCommand

from apps.categories.models import Category

EXPENSE_CATEGORIES = [
    ("Alimentação", "🍽️"),
    ("Mercado", "🛒"),
    ("Restaurante", "🍔"),
    ("Transporte", "🚗"),
    ("Moradia", "🏠"),
    ("Energia", "💡"),
    ("Água", "🚰"),
    ("Internet", "🌐"),
    ("Telefone", "📱"),
    ("Saúde", "🏥"),
    ("Educação", "📚"),
    ("Lazer", "🎮"),
    ("Assinaturas", "🔁"),
    ("Presentes", "🎁"),
    ("Vestuário", "👕"),
    ("Eletrônicos", "💻"),
    ("Investimentos", "📈"),
    ("Impostos", "🧾"),
    ("Animais", "🐾"),
    ("Viagens", "✈️"),
    ("Outros", "📦"),
]

INCOME_CATEGORIES = [
    ("Salário", "💼"),
    ("Atendimento", "🩺"),
    ("Freelancer", "🧑‍💻"),
    ("Receita extra", "➕"),
    ("Investimento", "📈"),
    ("Reembolso", "↩️"),
    ("Venda", "🏷️"),
    ("Presente recebido", "🎁"),
    ("Outros", "📦"),
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
