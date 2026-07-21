import os
import subprocess
import argparse
import logging
from datetime import datetime

# -------- CONFIG --------
parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True)
parser.add_argument("--output", default="optimizadas")
parser.add_argument("--quality", type=int, default=75)
parser.add_argument("--max-size", type=int, default=1920)
parser.add_argument("--log-dir", default="logs")

args = parser.parse_args()

# Crear carpeta de logs
os.makedirs(args.log_dir, exist_ok=True)

# Nombre del log con timestamp
log_filename = datetime.now().strftime("optimize_%Y%m%d_%H%M%S.log")
log_path = os.path.join(args.log_dir, log_filename)

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_path),
        logging.StreamHandler()
    ]
)

logging.info("🚀 Inicio de optimización")

total_original = 0
total_optimized = 0

# -------- PROCESO --------
for root, dirs, files in os.walk(args.input):
    relative_path = os.path.relpath(root, args.input)
    output_dir = os.path.join(args.output, relative_path)
    os.makedirs(output_dir, exist_ok=True)

    article_name = os.path.basename(root)
    logging.info(f"📁 Procesando: {article_name}")

    for filename in files:
        if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
            continue

        input_path = os.path.join(root, filename)
        name, _ = os.path.splitext(filename)
        output_path = os.path.join(output_dir, f"{name}.webp")

        try:
            original_size = os.path.getsize(input_path)
            total_original += original_size

            if os.path.exists(output_path):
                optimized_size = os.path.getsize(output_path)
                total_optimized += optimized_size
                logging.info(f"⏭️ Ya existe: {output_path}")
                continue

            command = [
                "magick",
                input_path,
                "-resize", f"{args.max_size}x{args.max_size}>",
                "-quality", str(args.quality),
                "-strip",
                output_path
            ]

            result = subprocess.run(command, capture_output=True)

            if result.returncode != 0:
                logging.error(f"❌ Error procesando {input_path}: {result.stderr.decode()}")
                continue

            if os.path.exists(output_path):
                optimized_size = os.path.getsize(output_path)
                total_optimized += optimized_size

                saved = original_size - optimized_size
                logging.info(f"✔ {filename} | {original_size/1024:.1f}KB → {optimized_size/1024:.1f}KB")
                logging.info(f"✔ {filename} | ahorro: {saved/1024:.1f} KB")


        except Exception as e:
            logging.exception(f"💥 Error inesperado con {input_path}: {e}")

# -------- REPORTE --------
logging.info("📊 ===== REPORTE =====")

mb_original = total_original / (1024 * 1024)
mb_optimized = total_optimized / (1024 * 1024)
mb_saved = (total_original - total_optimized) / (1024 * 1024)

percent = (1 - total_optimized / total_original) * 100 if total_original > 0 else 0

logging.info(f"Original:   {mb_original:.2f} MB")
logging.info(f"Optimizado: {mb_optimized:.2f} MB")
logging.info(f"Ahorro:     {mb_saved:.2f} MB ({percent:.1f}%)")

logging.info(f"📝 Log guardado en: {log_path}")