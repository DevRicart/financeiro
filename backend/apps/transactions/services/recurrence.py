from datetime import date, timedelta

from apps.common.dates import add_months

from ..models import RecurrenceRule, Transaction

MAX_OCCURRENCES_PER_RULE = 500


def _occurrences_up_to(rule, until_date):
    occurrences = []
    current = rule.start_date
    while current <= until_date and (rule.end_date is None or current <= rule.end_date):
        occurrences.append(current)
        if len(occurrences) >= MAX_OCCURRENCES_PER_RULE:
            break
        if rule.frequency == RecurrenceRule.Frequency.WEEKLY:
            current = current + timedelta(days=7)
        elif rule.frequency == RecurrenceRule.Frequency.MONTHLY:
            current = add_months(current, 1)
        else:
            current = add_months(current, 12)
    return occurrences


def generate_due_transactions(*, user, as_of=None):
    """Backfills every missed occurrence up to `as_of` (default: today) for
    the user's active recurrence rules (e.g. rent, salary) — not just the
    most recent one, so it behaves correctly even if the user hasn't opened
    the app in a while. Idempotent: relies on `Transaction.recurrence_rule`
    + `competence_date` to know what was already generated.
    """
    today = as_of or date.today()
    created = []

    for rule in RecurrenceRule.objects.filter(owner=user, is_active=True):
        occurrences = _occurrences_up_to(rule, today)
        if not occurrences:
            continue

        existing_dates = set(
            Transaction.objects.filter(
                recurrence_rule=rule, competence_date__in=occurrences
            ).values_list("competence_date", flat=True)
        )

        for occurrence_date in occurrences:
            if occurrence_date in existing_dates:
                continue
            created.append(
                Transaction.objects.create(
                    owner=user,
                    transaction_type=rule.transaction_type,
                    category=rule.category,
                    title=rule.title,
                    total_amount=rule.amount,
                    competence_date=occurrence_date,
                    due_date=occurrence_date,
                    recurrence_rule=rule,
                )
            )

    return created
