#!/bin/bash
# =====================================================================
# Nectar Labs - Sandbox Image Pre-puller
# =====================================================================
# Descarga preventivamente las imágenes necesarias para el sandbox
# de evaluación de ejercicios para evitar timeouts en la primera ejecución.

echo "=== Descargando imágenes para el Sandbox de Nectar Labs ==="

IMAGES=(
  "python:3.12-slim"
  "node:20-alpine"
  "elixir:1.16-slim"
)

for IMG in "${IMAGES[@]}"; do
  echo " -> Descargando $IMG..."
  docker pull "$IMG"
done

echo "=== Descarga completada con éxito ==="
