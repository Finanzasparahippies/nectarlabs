# Guía de Orquestación Multi-Inquilinos Zero-SSH y Billetera Unificada

Néctar Labs cuenta con una arquitectura de despliegue y consumo de servicios desacoplada, escalable y tolerante a fallos para inquilinos autónomos y nativos.

---

## 1. Comandos CLI Rápidos (`./nectar.sh`)

La CLI centraliza todas las operaciones de Docker y Django mediante los siguientes atajos:

### Orquestación de Despliegues (Zero-SSH)
```bash
# Inspección de salud de contenedores (Frontend / Backend)
./nectar.sh tenant-status <slug>
./nectar.sh tenant-deploy <slug> --action=status [--env=staging|production]

# Despliegue y build automático de contenedores del inquilino
./nectar.sh tenant-deploy <slug> --action=deploy [--env=staging|production]

# Control de ciclo de vida
./nectar.sh tenant-deploy <slug> --action=start
./nectar.sh tenant-deploy <slug> --action=stop
./nectar.sh tenant-deploy <slug> --action=restart
```

### Gestión de Billetera Unificada
```bash
# Consultar saldo unificado (CFDI, Envíos, Amazon SES)
./nectar.sh tenant-wallet <slug> --balance

# Abonar saldo a la billetera
./nectar.sh tenant-wallet <slug> --credit 500.00 --service RECHARGE --notes "Abono inicial de pruebas"

# Debitar saldo manualmente o auditar transacciones
./nectar.sh tenant-wallet <slug> --debit 25.00 --service INVOICING_CFDI --notes "Ajuste de consumo"
./nectar.sh tenant-wallet <slug> --history
```

---

## 2. Billetera Unificada Néctar Labs

Todos los consumos de servicios de un inquilino se debitan automáticamente de la billetera unificada:

1. **Facturación CFDI 4.0 (Facturapi v2):**
   - Cuando el inquilino no tiene timbres de cortesía o prepagados en `stamp_balance`, el sistema descuenta automáticamente **$1.00 MXN** de la `wallet_balance`.
2. **Guías de Paquetería (Envia.com & Skydropx Pro):**
   - Al emitir una guía con la cuenta corporativa, se descuenta el costo real del courier más la comisión de Néctar Labs. El saldo se sincroniza atómicamente con `wallet_balance`.
3. **Campañas de Email / Amazon SES:**
   - El envío masivo de correos fuera del periodo de prueba deduce **$0.01 MXN** por destinatario directamente de la `wallet_balance`.

---

## 3. Arquitectura Ingress Universal Nginx (Zero-Config por Tenant)

Nginx ya no requiere bloques `server { ... }` individuales por cada tienda o inquilino nuevo.

- **Wildcard Ingress Staging:** `staging.nectarlabs.dev`, `*.staging.nectarlabs.dev`, `*-staging.nectarlabs.dev`, `staging.*` y `*.staging.*` son recibidos por el servidor universal de Staging en Nginx.
- **Resolución Perimetral en Next.js (`proxy.ts`):**
  1. Extrae el slug del subdominio o consulta el host contra `/api/tenants/resolve-host/`.
  2. Si el cliente solicita `/favicon.ico`, reescribe internamente hacia `/api/tenants/<slug>/favicon.ico`, sirviendo el favicon configurado por el inquilino en tiempo real.
  3. Reenvía a `/tenants/<slug>/...` renderizando la plantilla nativa con Glassmorphism o la página personalizada si los contenedores dedicados están apagados.
  4. Si los contenedores dedicados están encendidos, el proxy o iframe entrega la experiencia completa sin generar errores 502 Bad Gateway.

---

## 4. Configuración DNS y Cloudflare (IP `187.188.46.10`)

Para conectar un nuevo dominio o subdominio de inquilino:

1. Crear un registro **A** o **CNAME** en Cloudflare:
   - Tipo: `A`
   - Nombre: `staging.<partner-domain>` o `<subdomain>.staging`
   - Contenido / IP: `187.188.46.10`
   - Proxy: **Activado (Nube Naranja)**
2. En SSL/TLS de Cloudflare, usar modo **Full** o **Full (Strict)**.
3. El certificado comodín de Néctar Labs o el SSL de Cloudflare cubre el tráfico cifrado de extremo a extremo.

---

## 5. Pruebas Automatizadas

Para validar el correcto funcionamiento de la billetera, favicon y orquestación:
```bash
./nectar.sh manage test apps.tenants.tests.TenantUnifiedWalletAndOrchestrationTests --verbosity=2
```
