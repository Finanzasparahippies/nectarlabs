from PIL import Image
import cairosvg
import os

# Configuración
svg_file = "logo-negro.def.svg"      # Tu archivo SVG de origen
output_dir = "icons"       # Carpeta donde se guardarán los íconos

# Crear carpeta de salida si no existe
os.makedirs(output_dir, exist_ok=True)

# 1️⃣ Generar favicon.ico con múltiples tamaños
ico_sizes = [16, 32, 48, 64]
png_temp = os.path.join(output_dir, "temp.png")
cairosvg.svg2png(url=svg_file, write_to=png_temp, output_width=max(ico_sizes), output_height=max(ico_sizes))
img = Image.open(png_temp)
ico_path = os.path.join(output_dir, "favicon.ico")
img.save(ico_path, format="ICO", sizes=[(s,s) for s in ico_sizes])
print(f"Favicon generado: {ico_path}")

# 2️⃣ Generar PNGs para móviles y pantallas retina
png_sizes = [192, 256, 512]
for size in png_sizes:
    png_path = os.path.join(output_dir, f"icon-{size}x{size}.png")
    cairosvg.svg2png(url=svg_file, write_to=png_path, output_width=size, output_height=size)
    print(f"PNG generado: {png_path}")

# Limpiar temporal
os.remove(png_temp)
print("Todos los íconos generados con éxito.")