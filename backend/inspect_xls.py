import pandas as pd

file_path = "/app/media/catalogo-sat/catCFDI_V_4_20260603.xls"
try:
    xl = pd.ExcelFile(file_path)
    print("Sheets found:", xl.sheet_names)
except Exception as e:
    print("Error reading sheets:", e)
