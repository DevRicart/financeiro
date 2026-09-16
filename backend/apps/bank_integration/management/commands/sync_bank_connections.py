from django.core.management.base import BaseCommand

from apps.bank_integration.models import BankConnection
from apps.bank_integration.services.sync import sync_bank_connection


class Command(BaseCommand):
    help = "Sincroniza todas as conexões bancárias ativas com a Pluggy. Rode via cron (ex: a cada 6h)."

    def handle(self, *args, **options):
        connections = BankConnection.objects.all()
        for connection in connections:
            self.stdout.write(f"Sincronizando {connection}...")
            try:
                sync_bank_connection(connection)
            except Exception as exc:  # noqa: BLE001 - report and keep going
                self.stderr.write(self.style.ERROR(f"Falhou: {connection} -> {exc}"))
        self.stdout.write(self.style.SUCCESS(f"{connections.count()} conexões processadas."))
