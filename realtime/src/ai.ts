import { Groq } from 'groq-sdk';
import pool from './db.js';

const getGroqApiKey = (): string => {
  return process.env.GROQ_API_KEY || '';
};

// Main function to format services info
const buildNectarLabsServicesInfo = (): string => {
  return `
=======================================================
--- INFORMACIÓN DETALLADA DE NECTARLABS.DEV (LANDING PAGE) ---
Néctar Labs es un estudio digital premium que desarrolla 'Software Artesanal': ingeniería de software de alta fidelidad y diseño de marca estratégico.

1. ALCANCES Y CAPACIDADES DE INGENIERÍA PARA PLANES DE SOCIO TECNOLOGICO:
   - Desde Sistemas Sencillos hasta Apps Complejas: Desarrollamos a la medida cualquier requerimiento digital. No usamos plantillas, todo se escribe código a código.
   - Sistemas y CRMs a medida: Administradores de base de datos, ERPs sencillos, gestores de inventario y dashboards operativos para automatizar el día a día.
   - Apps de Alta Complejidad: Plataformas SaaS multi-usuario, Marketplaces con pasarelas de pago, motores de reserva masivos con firma digital (marcas de tiempo criptográficas), logística de envíos y tracking GPS en tiempo real en mapas, integraciones API con SAP/Salesforce, y automatizaciones avanzadas con agentes de IA.
   - Diseño de Marca & Branding Táctico: Contamos con un equipo de diseñadores dedicados. Creamos logotipos de autor, manuales de identidad de marca (paletas de colores, tipografías), diseño UX/UI exclusivo de interfaces y materiales listos para producción. Ofrecemos tiers de diseño integrado en los planes de soporte activo (con entregas Semanales).
   - Subdominio personalizado: Contamos con la opcion de dar un subdominio personalizado con el nombre de tu empresa en nuestro dominio y asi ahorrarte costos de dominio y hosting, esto esta incluido en todos nuestros modulos independientes (addons). Por ejemplo: miserviciodeautolavado.nectarlabs.dev
   - Propiedad y Soberanía Total: Entregamos el código fuente completo, propiedad intelectual absoluta y desplegamos cada proyecto en una infraestructura en la nube dedicada por socio (Hetzner, Docker) con llaves del servidor y aislamiento completo.

2. NUESTRA FÓRMULA EN LOS PLANES DE SOCIO TECNOLOGICO (PROCESO DE TRABAJO - WORK FLOW):
   - Fase 01 (Consultoría): 'El Caos Creativo'. Analizamos la visión del negocio y los cuellos de botella operativos para formular la solución.
   - Fase 02 (Blueprint): 'Arquitectura de Orden'. Traducimos la idea en un flujo digital predecible, automatizando procesos internos.
   - Fase 03 (Desarrollo): 'Ingeniería de Alta Fidelidad'. Codificación nativa a mano con Django (Python) y Next.js (React/TypeScript). Sin plantillas.
   - Fase 04 (Evolución): 'Activo Digital Vivo'. Despliegue en infraestructura dedicada en la nube (Hetzner, Docker) y evolución continua.

3. CATÁLOGO DE MÓDULOS NÉCTAR (ADD-ONS A LA CARTA):
   - Néctar AI Chat Bot (bot-chat): Widget de chat en tiempo real incrustable en cualquier web + consola de administración y soporte de IA. $99 MXN/mes o $990 MXN/año (ahorro de 2 meses). Requiere Django Channels + Redis.
   - Néctar Contratos Digitales (booking-signature): Motor de reserva de citas y firma de propuestas táctil/mouse con marcas de tiempo criptográficas y generación automática de PDFs en ReportLab. $149 MXN/mes o $1490 MXN/año. Almacenamiento en Cloudflare R2 / AWS S3.
   - Tienda + Envíos con Skydropx (delivery-tracking): Cotización de envíos en tiempo real con margen de ganancia y emisión automatizada de guías. $249 MXN/mes o $2490 MXN/año.
   - Néctar Sponsors & NSCAP (sponsorship): Membresías y feeds de contenido exclusivo con cobros recurrentes vía Stripe Billing API. $169 MXN/mes o $1690 MXN/año.
   - Néctar Administrador de Ventas y Analytics (business-analytics): Dashboard de métricas financieras, gráficos interactivos y exportación de transacciones. $99 MXN/mes o $990 MXN/año.
   - Néctar Newsletter y Campañas (campaigner): Campañas de correo masivo optimizadas con Amazon SES o SMTP privado y tokens UUID de desuscripción de cumplimiento legal. $199 MXN/mes o $1990 MXN/año.
   - Facturación SAT México (facturacion-cfdi): Emisión de facturas CFDI 4.0 oficiales del SAT automatizadas y marca blanca. $499 MXN/mes o $4990 MXN/año.
   - Facturación Automática SAT (automatic-invoicing): Timbrado automático e inmediato de facturas CFDI 4.0 al recibir pagos. $199 MXN/mes o $1990 MXN/año.
   - Combo E-commerce Automatizado (ecommerce-combo): El paquete integral definitivo: Tienda + Envíos con Skydropx, Facturación SAT y Newsletter Masivo en uno. $799 MXN/mes o $7990 MXN/año.

4. PLANES DE SOPORTE Y DESARROLLO ACTIVO (COMPROMISO DE 6 MESES):
   - Ofrecemos planes de suscripción para desarrollo activo (semanal, quincenal o mensual) basados en las horas de desarrollo y diseño contratadas.
   - Cada plan ofrece un canal dedicado de soporte y alianza estratégica a 6 meses para forjar plataformas completas a medida.

5. ENLACES Y NAVEGACIÓN ÚTILES DE NECTARLABS.DEV:
   - Registro de cuenta: /register
   - Inicio de sesión: /login
   - Catálogo de Add-ons (para usuarios registrados): /dashboard/addons
   - Visor de Contrato Oficial: /contract (donde publicamos de forma transparente nuestros términos legales)
   - FAQ Técnico: /faq (especificaciones sobre propiedad del código, hosting y metodologías)
   - Programa de Vendedores / Referidos: /#seller-program (sección en la landing page)

6. PROGRAMA DE VENDEDORES / REFERIDOS (AFILIADOS NÉCTAR LABS):
   - ¿Qué es? Un programa de afiliados donde cualquier persona puede referir clientes a Néctar Labs y ganar comisiones recurrentes sobre cada mensualidad pagada por el cliente referido.
   - Estructura de Comisiones (por cada mensualidad del cliente referido):
     * Mes 1 (Primer Pago): 10% del monto de la mensualidad.
     * Mes 2 (Segundo Pago): 5% del monto de la mensualidad.
     * Mes 3 en adelante: 2% permanente mientras el cliente siga activo y pagando.
   - Estructura de Comisiones por venta de cotizacion:
     * 15% del monto total de la cotización.
     * Se paga una sola vez al aprobarse la cotización y realizarse el primer pago del cliente.
   - Ejemplo Real: Con un cliente en plan de $10,000 MXN/mes:
     * Mes 1: $1,000 MXN de comisión (10%).
     * Mes 2: $500 MXN (5%).
     * Mes 3 en adelante: $200 MXN/mes de por vida (2%).
     * Con 5 clientes activos: $1,000 MXN automáticos por mes en residual.
   - Cómo Registrarse como Vendedor:
     1. Crear cuenta en /register (es gratis).
     2. Solicitar el rol de Vendedor y agendar una reunión previa con Néctar Labs para validación y aprobación directa del Administrador/CEO.
     3. Una vez aprobado tras la reunión, el código de referido aparece en el Dashboard (/dashboard).
     4. Compartir el código con prospectos interesados en software a medida.
     5. Las comisiones se generan automáticamente con cada pago confirmado del cliente referido.
   - Beneficios del Programa:
     * Sin inversión inicial requerida.
     * Sin límite de clientes referidos.
     * Sin exclusividad geográfica ni de industria.
     * Sin cuotas mínimas de venta.
     * Trabajo 100% remoto, a cualquier hora.
     * Dashboard en tiempo real para ver comisiones y clientes referidos.
   - Limitaciones importantes:
     * Este es el ÚNICO beneficio para vendedores en esta modalidad.
     * NO incluye: seguro médico, prestaciones de ley, contrato laboral, aguinaldo, ni ningún beneficio adicional.
     * Requiere agendar una reunión de validación con Néctar Labs antes de que la cuenta de vendedor sea aprobada por el Administrador/CEO.
     * La comisión solo se genera cuando el cliente referido PAGA (no al firmar contrato) y si el vendedor está en estado aprobado.
     * Si el cliente cancela su plan, las comisiones futuras se detienen.
     * El descuento que recibe el cliente por usar el código es del 10% en su primer mes.
   - ¿Para quién es ideal? Para consultores de negocios, agencias de marketing, freelancers, emprendedores digitales o cualquier persona con red de contactos empresariales que necesiten servicios tecnológicos.
=======================================================
`;
};

// Build context for NectarLabs main platform (BUSINESS dashboard chat)
const buildNectarLabsSupportContext = async (client: any): Promise<string> => {
  try {
    const clientId = client.id;
    const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.username;

    // Concurrently fetch tenants, contracts, tickets, AND ALL installments to solve N+1 Query bug
    const [tenantsRes, contractsRes, ticketsRes, allInstallmentsRes] = await Promise.all([
      pool.query('SELECT * FROM tenants_tenant WHERE owner_id = $1', [clientId]),
      pool.query('SELECT c.*, p.name as plan_name FROM shop_contract c LEFT JOIN shop_plan p ON c.plan_id = p.id WHERE c.user_id = $1', [clientId]),
      pool.query('SELECT * FROM tickets_ticket WHERE client_id = $1', [clientId]),
      pool.query("SELECT * FROM shop_paymentinstallment WHERE contract_id IN (SELECT id FROM shop_contract WHERE user_id = $1) AND status = 'PENDING'", [clientId])
    ]);

    const context: string[] = [];
    context.push('--- CONTEXTO EN TIEMPO REAL DE LA BASE DE DATOS ---');
    context.push(`Usuario: ${clientName} (${client.email})`);

    if (tenantsRes.rows.length > 0) {
      context.push('\n[Colmenas / Portales del Socio:]');
      for (const tenant of tenantsRes.rows) {
        const activeAddons: string[] = tenant.active_addons || [];
        let addonsStr = 'Ninguno';
        if (activeAddons.length > 0) {
          const addonsQuery = await pool.query('SELECT name, slug FROM shop_addon WHERE slug = ANY($1)', [activeAddons]);
          addonsStr = addonsQuery.rows.map((a: any) => `${a.name} (${a.slug})`).join(', ');
        }
        const stagingUrl = `https://${tenant.subdomain}.staging.nectarlabs.dev`;
        context.push(
          `- Nombre de la Colmena: ${tenant.name}\n` +
          `  Subdominio/Slug: ${tenant.subdomain}\n` +
          `  Enlace Staging: ${stagingUrl}\n` +
          `  Dominio Personalizado: ${tenant.custom_domain || 'No configurado'}\n` +
          `  Add-ons Activos: ${addonsStr}\n` +
          `  Estado de la Colmena: ${tenant.is_active ? 'Activo' : 'Inactivo'}`
        );
      }
    } else {
      context.push('\n[Colmenas / Portales:] El socio aún no tiene ninguna Colmena creada.');
    }

    if (contractsRes.rows.length > 0) {
      context.push('\n[Contratos de Desarrollo:]');
      for (const contract of contractsRes.rows) {
        const planName = contract.plan_name || 'Sin Plan (Solo Adquisición de Add-ons)';
        // Safe date formatter check
        const formattedNextPayment = contract.next_payment_date instanceof Date
          ? contract.next_payment_date.toISOString().split('T')[0]
          : 'No programado';

        context.push(
          `- Contrato #${contract.id} | Plan: ${planName}\n` +
          `  Titular: ${contract.full_name}\n` +
          `  Identificación Fiscal (RFC): ${contract.tax_id}\n` +
          `  Firmado por Cliente: ${contract.signature_base64 ? 'Sí' : 'No'}\n` +
          `  Firmado por Néctar: ${contract.developer_signature ? 'Sí' : 'No'}\n` +
          `  Completamente Firmado: ${contract.is_fully_signed ? 'Sí' : 'No'}\n` +
          `  Próximo Pago: ${formattedNextPayment}\n` +
          `  Estado del Contrato: ${contract.is_active ? 'Activo' : 'Inactivo'}`
        );

        // Filter installments in memory to avoid crushing Postgres database
        const contractInstallments = allInstallmentsRes.rows.filter(i => i.contract_id === contract.id);
        if (contractInstallments.length > 0) {
          context.push('  Mensualidades Pendientes:');
          for (const inst of contractInstallments) {
            const formattedDueDate = inst.due_date instanceof Date
              ? inst.due_date.toISOString().split('T')[0]
              : String(inst.due_date).split('T')[0] || 'N/A';
            context.push(`    * Mes ${inst.installment_number}/6 - Vence: ${formattedDueDate} - Monto: $${inst.amount} MXN`);
          }
        }
      }
    } else {
      context.push('\n[Contratos:] No hay contratos de desarrollo registrados.');
    }

    // ... Conserva el mapeo de tickets igual ...
    context.push(buildNectarLabsServicesInfo());
    return context.join('\n');
  } catch (err) {
    console.error('[AI] Error building NectarLabs support context:', err);
    return 'Error cargando contexto de la base de datos.';
  }
};

// Build context for client tenant portal (e.g. Sushilo portal client chat)
const buildTenantSupportContext = async (chat: any, client: any, tenant: any): Promise<string> => {
  try {
    const ticketsRes = await pool.query(
      'SELECT * FROM tickets_ticket WHERE client_id = $1 AND tenant_id = $2',
      [client.id, tenant.id]
    );

    const context: string[] = [];
    context.push(`--- CONTEXTO DEL PORTAL DE SOPORTE DE ${tenant.name.toUpperCase()} ---`);
    context.push(`Usuario Cliente: ${`${client.first_name || ''} ${client.last_name || ''}`.trim() || client.username} (${client.email})`);
    context.push(`Nombre del Negocio: ${tenant.name} | Subdominio: ${tenant.subdomain}`);

    if (ticketsRes.rows.length > 0) {
      context.push(`\n[Tus Tickets de Soporte en ${tenant.name}:]`);
      for (const ticket of ticketsRes.rows) {
        context.push(
          `- Ticket #${ticket.id} [${ticket.category}]: '${ticket.title}'\n` +
          `  Prioridad: ${ticket.priority} | Estado: ${ticket.status}\n` +
          `  Última Actualización: ${ticket.updated_at ? ticket.updated_at.toISOString().split('T')[0] : 'N/A'}`
        );
      }
    } else {
      context.push(`\nNo tienes tickets de soporte registrados en la Colmena de ${tenant.name}.`);
    }

    return context.join('\n');
  } catch (err) {
    console.error('[AI] Error building tenant support context:', err);
    return 'Error cargando contexto de la Colmena.';
  }
};

// Build system prompt based on whether it is a tenant chat or main dashboard chat
const buildSystemPrompt = async (chat: any, client: any, tenant: any): Promise<string> => {
  if (tenant) {
    const dbContext = await buildTenantSupportContext(chat, client, tenant);
    const welcomeMsg = tenant.welcome_message || '¡Hola! ¿En qué podemos ayudarte hoy?';
    const TenantContext = tenant.tenant_context || 'No hay información del contexto del cliente.';

    return (
      `Eres el Asistente Virtual de Soporte Técnico de '${tenant.name}'.\n` +
      `Tu contexto es el siguiente: ${TenantContext}.\n` +
      `Mensaje de bienvenida oficial: '${welcomeMsg}'.\n` +
      `Ayudas a los clientes a resolver dudas sobre la plataforma y el estado de sus tickets de soporte.\n` +
      `Responde siempre de forma breve, útil, cortés, amigable y profesional.\n` +
      `Solo tienes acceso a los datos del cliente provistos en el contexto de abajo. No inventes información.\n` +
      `REGLA DE ORO DE VOCABULARIO: Prohibido usar palabras técnicas de desarrollo como 'tenant' o 'instancia'.\n` +
      `En su lugar, usa 'Colmena' (para referirte a su espacio/cuenta de negocio) y 'Portal' (para su sitio web/aplicación activa).\n` +
      `Nunca menciones a NectarLabs a menos que te pregunten qué es (es la colmena matriz proveedora de software).\n` +
      `Si el usuario pregunta algo complejo o que requiere la ayuda de un humano, ` +
      `dile educadamente que un agente de soporte de la colmena se comunicará con él muy pronto.\n\n` +
      `${dbContext}`
    );
  } else {
    const dbContext = await buildNectarLabsSupportContext(client);

    return (
      `Eres el Ingeniero de Soporte IA de Néctar Labs, un taller premium que diseña Software Artesanal: desde sistemas internos sencillos (CRM, administradores) hasta aplicaciones de altísima complejidad con toda la lógica de negocio, pasarelas de pago y automatizaciones.\n` +
      `Tu misión es asistir a los socios de negocio a gestionar sus Colmenas (Portales), revisar sus contratos de desarrollo, mensualidades pendientes y módulos de software (Add-ons).\n` +
      `Tono: Profesional, sumamente amigable, de alta confianza, claro, premium y directo al grano.\n\n` +
      `Normas de Vocabulario y Metáfora de Colmenas (MANDATORIAS):\n` +
      `1. NUNCA, bajo ninguna circunstancia, uses palabras técnicas como 'tenant', 'multi-tenant', 'instancia' o 'servidor'.\n` +
      `2. En su lugar, emplea SIEMPRE la metáfora de la Colmena de abejas:\n` +
      `   - 'tenant' -> 'Colmena' (ej: 'tu Colmena de Sushilo' o 'iniciar una nueva Colmena').\n` +
      `   - 'portal' / 'subdominio' -> 'Portal' o 'Entrada al Panal' (ej: 'tu Portal de Sushilo' o 'crear un Portal dentro de tu Colmena').\n` +
      `   - 'add-ons' / 'plugins' -> 'Módulos Néctar' o 'Gotas de Néctar' (ej: 'el módulo Néctar Live Chat' o 'endulzar tu Colmena con Néctar Booking').\n` +
      `   - 'desarrolladores' y 'diseñadores' -> 'Apicultores de software' y 'Diseñadores de Marca del Panal'.\n` +
      `3. Ejemplos de traducción obligatorios:\n` +
      `   - Incorrecto: 'puedo guiarte a través del proceso de creación de un nuevo tenant y portal'\n` +
      `   - Correcto: 'te guiaré con gusto para crear una nueva Colmena para tu negocio e integrar sus Portales dulces'\n` +
      `   - Incorrecto: 'una vez configurado el tenant, puedes activar los add-ons en tu portal'\n` +
      `   - Correcto: 'una vez lista tu Colmena, puedes endulzarla activando los módulos Néctar (como Néctar Live Chat o Booking) en tus Portales'\n\n` +
      `Alcances de Ingeniería de Néctar Labs (para responder sobre lo que podemos crear):\n` +
      `- Desarrollamos cualquier solución a mano y a la medida (sin plantillas): desde administradores sencillos de base de datos (CRMs, ERPs, inventarios) hasta aplicaciones web y móviles complejas con lógica industrial, geolocalización en vivo, firma digital y automatizaciones.\n` +
      `- Diseño de Marca & Branding: Ofrecemos servicios premium de diseño de marca integrados en nuestros contratos (Semanal, Quincenal, Mensual) para crear logotipos, manuales de marca y diseño UX/UI exclusivo de interfaces. No requieren una Colmena especial para cotizarlo, se puede solicitar aquí mismo en el chat o agregar a su contrato actual.\n` +
      `- Independencia Técnica: Entregamos el código fuente completo, propiedad intelectual absoluta y desplegamos cada proyecto en una infraestructura en la nube dedicada por socio (Hetzner, Docker) con llaves del servidor y aislamiento completo.\n\n` +
      `Normas de Seguridad y Comportamiento:\n` +
      `1. Solo tienes acceso al contexto de base de datos provisto abajo. Si te preguntan algo que no está en el contexto, indica amablemente que un Apicultor de Néctar lo validará.\n` +
      `2. Nunca des información de precios globales, contraseñas, secretos o datos de otros socios.\n` +
      `3. Si preguntan por sus Colmenas creadas, dales el nombre y el enlace de staging (ej: 'Tu Colmena de Sushilo está en https://sushilo.staging.nectarlabs.dev'). Para crear una nueva Colmena, diles que pueden ir a su Dashboard y hacer clic en el botón 'Crear Portal'.\n` +
      `4. Si preguntan por mensualidades o contratos, detalla los montos y fechas de vencimiento de las cuotas pendientes de su contrato.\n\n` +
      `${dbContext}`
    );
  }
};

// Generate AI Streaming Reply
export const generateAiReplyStream = async (
  chatId: number,
  newMsgText: string,
  onToken: (token: string) => void,
  onComplete: (fullText: string) => void,
  onError: (err: any) => void
) => {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    console.warn('[AI] GROQ_API_KEY no configurada. IA inactiva.');
    return onError(new Error('GROQ_API_KEY no configurada'));
  }

  try {
    const groq = new Groq({ apiKey });

    // Fetch support chat details, client user details, and tenant details
    const chatRes = await pool.query('SELECT * FROM tickets_supportchat WHERE id = $1', [chatId]);
    if (chatRes.rows.length === 0) {
      return onError(new Error('Chat no encontrado'));
    }
    const chat = chatRes.rows[0];

    const [clientRes, tenantRes] = await Promise.all([
      pool.query('SELECT * FROM users_user WHERE id = $1', [chat.client_id]),
      chat.tenant_id
        ? pool.query('SELECT * FROM tenants_tenant WHERE id = $1', [chat.tenant_id])
        : Promise.resolve({ rows: [] as any[] })
    ]);

    const client = clientRes.rows[0];
    const tenant = tenantRes.rows[0] || null;

    if (!client) {
      return onError(new Error('Cliente de chat no encontrado'));
    }

    // Build dynamic system prompt
    const systemPrompt = await buildSystemPrompt(chat, client, tenant);

    // Fetch last 15 messages for context history
    const historyRes = await pool.query(
      `SELECT m.*, u.email as sender_email, u.role as sender_role 
       FROM tickets_supportchatmessage m 
       JOIN users_user u ON m.sender_id = u.id 
       WHERE m.chat_id = $1 
       ORDER BY m.created_at DESC LIMIT 15`,
      [chatId]
    );

    // Reverse history to keep chronological order
    const historyRows = [...historyRes.rows].reverse();

    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    for (const msg of historyRows) {
      if (msg.is_ai_message) {
        messages.push({ role: 'assistant', content: msg.message });
      } else if (msg.sender_email.toLowerCase() === client.email.toLowerCase()) {
        messages.push({ role: 'user', content: msg.message });
      } else {
        // Agent messages
        messages.push({ role: 'assistant', content: msg.message });
      }
    }

    // Ensure the last message is a user message
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      messages.push({ role: 'user', content: newMsgText });
    }

    // Stream Chat Completion from Groq Cloud
    const stream = await groq.chat.completions.create({
      messages,
      model: 'llama-3.1-8b-instant',
      temperature: 0.4,
      max_tokens: 400,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullText += token;
        onToken(token);
      }
    }

    onComplete(fullText);
  } catch (err) {
    console.error('[AI] Error generating AI streaming reply:', err);
    onError(err);
  }
};
