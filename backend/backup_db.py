import os
import sys
import django
from django.core.management import call_command

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def run_backup():
    print("Iniciando respaldo de base de datos Supabase...")
    
    # Path to nectarlabs-main/backups/db_backup.json
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backup_dir = os.path.join(os.path.dirname(base_dir), 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    
    backup_file_path = os.path.join(backup_dir, 'db_backup.json')
    
    print(f"Exportando datos a {backup_file_path}...")
    try:
        with open(backup_file_path, 'w', encoding='utf-8') as f:
            call_command(
                'dumpdata', 
                exclude=['auth.permission', 'contenttypes'], 
                indent=2, 
                stdout=f
            )
        print("¡Respaldo completado con éxito!")
    except Exception as e:
        print(f"Error al generar el respaldo de datos: {e}", file=sys.stderr)

if __name__ == '__main__':
    run_backup()
