import os
import unicodedata
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.billing.models import SATProductKey, SATUnitKey

def normalize_text(text):
    if not text:
        return ""
    normalized = unicodedata.normalize('NFKD', str(text))
    return "".join(c for c in normalized if not unicodedata.combining(c)).lower()

class Command(BaseCommand):
    help = "Imports SAT Product and Unit Catalogs from the Excel file in media/"

    def handle(self, *args, **options):
        file_path = "/app/media/catalogo-sat/catCFDI_V_4_20260603.xls"
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"File not found at: {file_path}"))
            return

        self.stdout.write("Reading sheet 'c_ClaveProdServ'...")
        try:
            # header=3 means row 3 contains column labels
            df_prod = pd.read_excel(file_path, sheet_name='c_ClaveProdServ', header=3)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to read c_ClaveProdServ: {e}"))
            return

        self.stdout.write("Reading sheet 'c_ClaveUnidad'...")
        try:
            # header=4 means row 4 contains column labels
            df_unit = pd.read_excel(file_path, sheet_name='c_ClaveUnidad', header=4)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to read c_ClaveUnidad: {e}"))
            return

        # 1. Process Product/Service keys
        self.stdout.write("Cleaning existing products...")
        SATProductKey.objects.all().delete()
        self.stdout.write("Parsing Product/Service keys...")
        products_to_create = []
        existing_products = set()

        for idx, row in df_prod.iterrows():
            code_val = str(row.iloc[0]).strip()
            desc_val = str(row.iloc[1]).strip()
            
            # Skip metadata or empty codes/descriptions
            if not code_val or code_val == "nan" or not desc_val or desc_val == "nan":
                continue
            
            # Format numeric codes to preserve exactly 8 digits if possible
            if code_val.endswith(".0"):
                code_val = code_val[:-2]
            code_val = code_val.zfill(8)

            if code_val in existing_products:
                continue

            products_to_create.append(
                SATProductKey(
                    code=code_val,
                    description=desc_val,
                    normalized_description=normalize_text(desc_val),
                    is_active=True
                )
            )

        self.stdout.write(f"Saving {len(products_to_create)} new products in bulk...")
        chunk_size = 5000
        for i in range(0, len(products_to_create), chunk_size):
            chunk = products_to_create[i:i + chunk_size]
            with transaction.atomic():
                SATProductKey.objects.bulk_create(chunk)
            self.stdout.write(f"Saved chunk {i // chunk_size + 1}")

        # 2. Process Unit keys
        self.stdout.write("Cleaning existing units...")
        SATUnitKey.objects.all().delete()
        self.stdout.write("Parsing Unit keys...")
        units_to_create = []
        existing_units = set()

        for idx, row in df_unit.iterrows():
            code_val = str(row.iloc[0]).strip()
            name_val = str(row.iloc[1]).strip()
            desc_val = str(row.iloc[2]).strip() if len(row) > 2 else ""

            if not code_val or code_val == "nan" or not name_val or name_val == "nan":
                continue

            if code_val.endswith(".0"):
                code_val = code_val[:-2]

            if code_val in existing_units:
                continue

            units_to_create.append(
                SATUnitKey(
                    code=code_val,
                    name=name_val,
                    normalized_name=normalize_text(name_val),
                    description=None if not desc_val or desc_val == "nan" else desc_val,
                    is_active=True
                )
            )

        self.stdout.write(f"Saving {len(units_to_create)} new units in bulk...")
        with transaction.atomic():
            SATUnitKey.objects.bulk_create(units_to_create)

        self.stdout.write(self.style.SUCCESS("SAT catalog imported successfully!"))
