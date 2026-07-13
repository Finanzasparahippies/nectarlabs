/**
 * Dashboard Layout
 * El dashboard es una herramienta interna que SIEMPRE debe mostrarse en modo oscuro.
 * Usamos la clase `dark` directamente en el wrapper del layout para que Tailwind
 * aplique las variables de tema oscuro sin depender de la preferencia del OS
 * ni causar hydration mismatch (no hay useEffect, no hay flash de modo claro).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark bg-background text-foreground min-h-screen">
      {children}
    </div>
  );
}

