import calendar
from datetime import date


def add_months(source_date: date, months: int) -> date:
    """Adds calendar months, clamping the day when the target month is shorter
    (e.g. Jan 31 + 1 month -> Feb 28/29, not an error)."""
    month_index = source_date.month - 1 + months
    year = source_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(source_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def compute_invoice_month(purchase_date: date, closing_day: int) -> date:
    """A credit card purchase made after the card's closing day rolls into
    next month's invoice; on or before it, it belongs to the current one."""
    if purchase_date.day > closing_day:
        return add_months(date(purchase_date.year, purchase_date.month, 1), 1)
    return date(purchase_date.year, purchase_date.month, 1)
