from django.db import migrations, models
from django.utils import timezone


def mark_existing_users_as_verified(apps, schema_editor):
    # Verification only applies to sign-ups from now on. Everyone who already
    # has an account keeps using it as before — locking them out until they
    # click a link nobody sent them would be a regression, not a safeguard.
    User = apps.get_model("accounts", "User")
    User.objects.filter(email_verified_at__isnull=True).update(email_verified_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(mark_existing_users_as_verified, migrations.RunPython.noop),
    ]
