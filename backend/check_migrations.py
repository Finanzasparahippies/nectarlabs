import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db.migrations.autodetector import MigrationAutodetector
from django.db.migrations.state import ProjectState
from django.db.migrations.loader import MigrationLoader
from django.db.migrations.questioner import NonInteractiveMigrationQuestioner

loader = MigrationLoader(None, ignore_no_migrations=True)
autodetector = MigrationAutodetector(
    loader.project_state(),
    ProjectState.from_apps(django.apps.apps),
    NonInteractiveMigrationQuestioner(specified_apps=None, dry_run=True),
)
changes = autodetector.changes(graph=loader.graph)
if not changes:
    print("No pending migrations detected.")
else:
    for app_label, migrations_list in changes.items():
        print(f"App: {app_label}")
        for migration in migrations_list:
            print(f"  Migration: {migration.name}")
            for op in migration.operations:
                print(f"    Operation: {op}")
