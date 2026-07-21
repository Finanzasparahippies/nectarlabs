import pandas as pd

file_path = "/app/media/catalogo-sat/catCFDI_V_4_20260603.xls"
try:
    for sheet in ['c_ClaveProdServ', 'c_ClaveUnidad']:
        # Read without parsing all columns first to get size
        df = pd.read_excel(file_path, sheet_name=sheet)
        print(f"Sheet '{sheet}' has {len(df)} rows.")
except Exception as e:
    print("Error reading sheets:", e)
