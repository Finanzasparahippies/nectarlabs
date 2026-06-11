import pandas as pd

file_path = "/app/media/catalogo-sat/catCFDI_V_4_20260603.xls"
try:
    for sheet in ['c_ClaveProdServ', 'c_ClaveUnidad', 'c_UsoCFDI', 'c_RegimenFiscal']:
        df = pd.read_excel(file_path, sheet_name=sheet, nrows=25)
        print(f"\n--- Sheet: {sheet} ---")
        for idx, row in df.iterrows():
            print(f"Row {idx}: {row.tolist()[:6]}")
except Exception as e:
    print("Error reading sheets:", e)
