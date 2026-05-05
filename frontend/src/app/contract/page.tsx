'use client';

import React from 'react';
import Link from 'next/link';

export default function ContractPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 md:p-24">
      <div className="max-w-4xl mx-auto bg-card-bg border border-card-border rounded-[3rem] p-12 md:p-20 shadow-2xl">
        <Link href="/" className="inline-block mb-12 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
          ← Volver a Nectar Labs
        </Link>
        
        <header className="mb-16 border-b border-card-border pb-12">
          <h1 className="text-4xl font-black tracking-tighter mb-4">CONTRATO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS</h1>
          <p className="text-nectar-gold font-bold uppercase tracking-widest text-xs">Modalidad: Partner Tecnológico</p>
        </header>

        <div className="prose prose-invert max-w-none space-y-12 text-sm leading-relaxed">
          <section>
            <p>Este contrato se celebra entre <strong>Néctar Labs</strong>, representado por <strong>Jesus Saul Villegas Cruz</strong>, en adelante "EL DESARROLLADOR", y [Nombre del Cliente o Empresa], en adelante "EL CLIENTE".</p>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight">DECLARACIONES Y DATOS DE LAS PARTES</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2 p-6 bg-background/50 rounded-2xl border border-card-border">
                <h3 className="font-black text-[10px] uppercase text-nectar-gold">EL DESARROLLADOR</h3>
                <p><strong>Jesus Saul Villegas Cruz</strong></p>
                <p>RFC: VICJ911227KY2</p>
                <p>Domicilio: Poder Legislativo 345, col. Ley 57. Hermosillo, Sonora.</p>
                <p>Email: contacto@finanzasparahippies.com</p>
              </div>
              <div className="space-y-2 p-6 bg-background/50 rounded-2xl border border-card-border opacity-50">
                <h3 className="font-black text-[10px] uppercase text-nectar-gold">EL CLIENTE</h3>
                <p>Razón Social: ___________________</p>
                <p>RFC: __________________________</p>
                <p>Domicilio: ______________________</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight">1. OBJETO DEL SERVICIO</h2>
            <p>EL DESARROLLADOR se compromete a brindar servicios de desarrollo, mantenimiento y soporte técnico para los activos digitales de EL CLIENTE, bajo la modalidad de Partner Tecnológico con un enfoque de mejora continua y estabilidad de sistemas.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight">2. OBJETIVO ESPECÍFICO</h2>
            <p>El enfoque principal durante el periodo inicial será el desarrollo de una plataforma web integral para la gestión de barbería, la cual incluirá:</p>
            <ul className="list-disc pl-6 space-y-2 font-bold text-nectar-gold">
              <li>Home Page para mostrar servicios y menu.</li>
              <li>Sistema de reservación de citas en línea para clientes.</li>
              <li>Panel de administración para el control de inventarios y flujo de caja del negocio.</li>
              <li>Módulo de gestión de barberos (comisiones, horarios y desempeño).</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight">3. PLANES Y ESQUEMAS DE INVERSIÓN</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-card-border rounded-xl">Plan Semanal: $750 MXN (2h/sem)</div>
              <div className="p-4 border border-card-border rounded-xl">Plan Quincenal: $1,400 MXN (5h/qna)</div>
              <div className="p-4 border border-nectar-gold bg-nectar-gold/5 rounded-xl font-black">Plan Mensual: $2,500 MXN (12h/mes)</div>
              <div className="p-4 border border-card-border rounded-xl">Plan Escala: Personalizado</div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight">4. BENEFICIOS TÉCNICOS</h2>
            <p>Todos los proyectos desarrollados por Néctar Labs incluyen:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
              <p><strong>Contenedores Docker:</strong> Aislamiento total de procesos.</p>
              <p><strong>Seguridad SSL:</strong> Certificados HTTPS incluidos.</p>
              <p><strong>Arquitectura Next.js + Django:</strong> Escalabilidad industrial.</p>
              <p><strong>Hetzner Cloud:</strong> Administración de alto rendimiento.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight">6. GESTIÓN DE HORAS Y PROPIEDAD</h2>
            <p><strong>Límite de Horas:</strong> El paquete máximo contratado es de 12 horas mensuales.</p>
            <p><strong>Excedentes (Mes 1-6):</strong> Las horas adicionales solicitadas durante el periodo obligatorio se facturarán a una tasa fija de <strong>$225 MXN</strong> por hora.</p>
            <p><strong>Propiedad Intelectual:</strong> La propiedad del código fuente se transfiere a EL CLIENTE únicamente tras la liquidación total de los pagos del periodo obligatorio (6 meses).</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight">7. CONTINUIDAD POST-COMPROMISO (MES 7+)</h2>
            <p>Al finalizar el periodo inicial de 6 meses, EL CLIENTE podrá optar por:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Suscripción continua:</strong> La tarifa se ajustará a <strong>$3,500 MXN</strong> mensuales, manteniendo los beneficios y las 12 horas del servicio.</li>
              <li><strong>Servicio por Evento (On-Demand):</strong> Tarifa de <strong>$500 MXN</strong> por hora, sujeto a disponibilidad de agenda.</li>
            </ul>
          </section>


          <footer className="pt-20 border-t border-card-border grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="text-center space-y-4">
              <div className="h-0.5 w-full bg-foreground/20 mb-8"></div>
              <p className="font-black">Jesus Saul Villegas Cruz</p>
              <p className="text-[10px] uppercase opacity-40 italic">EL DESARROLLADOR</p>
            </div>
            <div className="text-center space-y-4">
              <div className="h-0.5 w-full bg-foreground/20 mb-8"></div>
              <p className="font-black">___________________________</p>
              <p className="text-[10px] uppercase opacity-40 italic">EL CLIENTE</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
