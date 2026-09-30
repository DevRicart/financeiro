from datetime import date, timedelta

from apps.common.dates import add_months

from .models import Debt, DebtRecurrenceRule

MAX_OCCURRENCES_PER_RULE = 500


def _occurrences_up_to(rule, until_date):
    occurrences = []
    current = rule.start_date
    while current <= until_date and (rule.end_date is None or current <= rule.end_date):
        occurrences.append(current)
        if len(occurrences) >= MAX_OCCURRENCES_PER_RULE:
            break
        if rule.frequency == DebtRecurrenceRule.Frequency.WEEKLY:
            current = current + timedelta(days=7)
        elif rule.frequency == DebtRecurrenceRule.Frequency.MONTHLY:
            current = add_months(current, 1)
        else:
            current = add_months(current, 12)
    return occurrences


def generate_due_debts(*, user, as_of=None):
    """Mirrors apps.transactions.services.recurrence.generate_due_transactions:
    backfills every missed occurrence up to `as_of` (default: today) for the
    user's active debt-recurrence rules as a new Debt. Idempotent: relies on
    `Debt.recurrence_rule` + `due_date` to know what was already generated.
    """
    today = as_of or date.today()
    created = []

    for rule in DebtRecurrenceRule.objects.filter(owner=user, is_active=True):
        occurrences = _occurrences_up_to(rule, today)
        if not occurrences:
            continue

        existing_dates = set(
            Debt.objects.filter(
                recurrence_rule=rule, due_date__in=occurrences
            ).values_list("due_date", flat=True)
        )

        for occurrence_date in occurrences:
            if occurrence_date in existing_dates:
                continue
            created.append(
                Debt.objects.create(
                    owner=user,
                    client=rule.client,
                    person_name=rule.person_name,
                    reason=rule.reason,
                    direction=rule.direction,
                    total_amount=rule.amount,
                    due_date=occurrence_date,
                    recurrence_rule=rule,
                )
            )

    return created
