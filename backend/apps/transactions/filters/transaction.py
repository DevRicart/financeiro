import django_filters

from apps.transactions.models import Transaction


class TransactionFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="competence_date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="competence_date", lookup_expr="lte")

    class Meta:
        model = Transaction
        fields = {
            "transaction_type": ["exact"],
            "category": ["exact"],
            "status": ["exact"],
            "is_shared": ["exact"],
        }
