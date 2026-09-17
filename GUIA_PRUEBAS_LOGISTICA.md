# 📦 Guía Maestra de Pruebas de Logística en Nectar Labs (CLI, Tenants y Tests Automatizados)

Esta guía detalla cómo ejecutar diagnósticos en vivo, cotizaciones multicourier y tests unitarios tanto desde la **plataforma central (Nectar Labs)** como desde **cualquier inquilino (tenant)** con subdominio (`*.nectarlabs.dev`) o dominio personalizado (`kores.vip`, `msambar.com`).

---

## 🔍 1. ¿Por qué ocurrió el error anterior?

El comando ejecutado fue:
```bash
./nectar.sh test-staging test_logistics --provider DYNAMIC_BEST --origin 83000 --dest 06600
```
- `test-staging` invoca el test runner de Django (`python manage.py test`), el cual **solo acepta nombres de clases/métodos de prueba** (ej. `apps.shop.tests.ShopAPITests`) y no reconoce argumentos como `--provider` ni `--origin`.
- El comando de diagnóstico de envíos es **`test-logistics`** (`python manage.py test_logistics`), el cual sí acepta `--provider`, `--origin`, `--dest`, `--tenant`, `--package-type`, etc.

> [!TIP]
> **Mejora aplicada en `nectar.sh`:** Ahora el script detecta automáticamente si pasas `test_logistics` a `test-staging` o `test` y lo redirige al comando de diagnóstico correcto sin fallar.

---

## 🚀 2. Modalidades de Prueba de Logística

### A. Diagnóstico de Cotización en Vivo (CLI)

#### 1. Desde Nectar Labs (Cuenta Maestra Global)
Cotiza usando la cuenta y almacén matriz de Nectar Labs (Hermosillo 83000 -> CDMX 06600):
```bash
# Multicotización dinámica (mejor tarifa entre Envia.com y Skydropx Pro)
./nectar.sh test-logistics --provider DYNAMIC_BEST --dest 06600

# Forzar únicamente Envia.com
./nectar.sh test-logistics --provider ENVIA --dest 06600

# Forzar únicamente Skydropx Pro
./nectar.sh test-logistics --provider SKYDROPX --dest 06600

# Cambiar código postal de origen y destino
./nectar.sh test-logistics --origin 83000 --dest 44100
```

#### 2. Desde un Tenant Específico (kores.vip, msambar.com o subdominio)
El comando resuelve automáticamente el inquilino, lee su almacén de origen (`shipping_origin_zip_code`), su transportista preferido, su tipo de empaque predeterminado y su margen comercial (0% default):

```bash
# Evaluando al inquilino kores.vip (detecta su bodega, empaque y margen)
./nectar.sh test-logistics --tenant kores.vip --dest 06600

# Evaluando al inquilino msambar.com
./nectar.sh test-logistics --tenant msambar.com --dest 06600

# Evaluando por subdominio o nombre
./nectar.sh test-logistics --tenant kores --dest 06600

# Si deseas evaluar al tenant pero sobreescribiendo el código postal de destino:
./nectar.sh test-logistics --tenant msambar.com --dest 64000

# Si deseas simular un margen comercial específico (ej. 15% de ganancia):
./nectar.sh test-logistics --tenant msambar.com --dest 06600 --markup 15.0
```

#### 3. Pruebas con Diferentes Tipos de Empaque
```bash
# Sobre / Documentos (ENVELOPE)
./nectar.sh test-logistics --tenant kores.vip --package-type ENVELOPE --dest 06600

# Caja Pequeña (SMALL_BOX)
./nectar.sh test-logistics --tenant msambar.com --package-type SMALL_BOX --dest 06600

# Tarima / Carga Pesada (PALLET)
./nectar.sh test-logistics --tenant msambar.com --package-type PALLET --dest 06600

# Empaque con dimensiones manuales (Custom)
./nectar.sh test-logistics --weight 2.5 --length 30 --width 20 --height 15 --dest 06600
```

#### 4. Emisión de Guía Real en Sandbox (Generación de Etiqueta PDF)
```bash
./nectar.sh test-logistics --provider ENVIA --generate-label --dest 06600
```

---

## 🧪 3. Ejecución de Tests Automatizados (Unit & Integration Tests)

Para correr la suite de pruebas unitarias que valida la billetera virtual, el ledger con desglose contable, el lock distribuido y los webhooks:

```bash
# Correr TODOS los tests del módulo shop en Staging:
./nectar.sh test-staging apps.shop.tests

# Correr únicamente el test de emisión de guía, deducción de billetera e idempotencia:
./nectar.sh test-staging apps.shop.tests.ShopAPITests.test_generate_shipping_label_deducts_wallet_and_logs_ledger

# Correr el test de concurrencia y Lock Distribuido:
./nectar.sh test-staging apps.shop.tests.ShopAPITests.test_generate_label_distributed_lock_concurrency

# Correr el test de restricción Unique a nivel de Base de Datos:
./nectar.sh test-staging apps.shop.tests.ShopAPITests.test_idempotency_key_database_unique_constraint

# Correr el test de webhooks de tracking y cargos de sobrepeso:
./nectar.sh test-staging apps.shop.tests.ShopAPITests.test_envia_webhook_tracking_and_surcharge

# Correr el test de resolución automática por Dominio Personalizado:
./nectar.sh test-staging apps.shop.tests.ShopAPITests.test_get_shipping_rates_resolves_custom_domain
```

---

## 🌐 4. Pruebas vía API HTTP (Simulación de Checkout / Tienda Online)

Puedes probar la cotización exactamente como lo hace el carrito de compras de una tienda alojada en Nectar Labs o en un dominio externo.

### Cotizar para inquilino en dominio propio (`msambar.com` o `kores.vip`):
```bash
curl -X POST "https://api.nectarlabs.dev/api/shop/shipping-rates/" \
  -H "Host: msambar.com" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": {
      "zip_code": "06600",
      "city": "Cuauhtémoc",
      "state": "CDMX",
      "country": "MX"
    }
  }'
```
*El sistema resolverá el inquilino mediante la cabecera `Host: msambar.com`, calculará la distancia y peso según la bodega configurada por ese cliente, y retornará las tarifas de paquetería.*

---

## 🖥️ 5. Pruebas Visuales desde el Dashboard de Inquilinos

1. Inicia sesión en el panel del inquilino: `https://nectarlabs.dev/dashboard/tenant-settings` (o en su subdominio).
2. Ve a la pestaña **"Logística & Envíos"**.
3. En la sección **"Sandbox de Diagnóstico en Vivo"**:
   - Ingresa cualquier Código Postal destino (ej. `06600` para CDMX, `64000` para Monterrey, `44100` para Guadalajara).
   - Haz clic en **"Simular Cotización en Vivo"**.
   - Verás la comparativa de paqueterías (FedEx, Paquetexpress, DHL, Estafeta, Redpack) con el desglose exacto:
     - **Costo Base Courier**
     - **Comisión Nectar Labs ($10.00 MXN)**
     - **Margen de Ganancia del Tenant (0.00% default)**
     - **Total al Comprador**
