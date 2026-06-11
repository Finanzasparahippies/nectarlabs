import pandas as pd

file_path = "/app/media/catalogo-sat/catCFDI_V_4_20260603.xls"
try:
    xl = pd.ExcelFile(file_path)
    for sheet in ['c_ClaveProdServ', 'c_ClaveUnidad', 'c_UsoCFDI']:
        if sheet in xl.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet, nrows=10)
            print(f"\n--- Sheet: {sheet} ---")
            print("Columns:", df.columns.tolist())
            print(df.head(3))
except Exception as e:
    print("Error reading sheets:", e)
