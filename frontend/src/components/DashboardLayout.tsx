import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-card-border p-6 flex flex-col gap-8">

        <div className="text-nectar-gold font-bold text-xl tracking-tighter">NECTAR LABS</div>
        <nav className="flex flex-col gap-2">
          <a href="#" className="p-3 bg-nectar-gold/10 text-nectar-gold rounded-lg font-medium">Overview</a>
          <a href="#" className="p-3 text-foreground/50 hover:text-foreground transition-all">Analytics</a>
          <a href="#" className="p-3 text-foreground/50 hover:text-foreground transition-all">Business</a>
          <a href="#" className="p-3 text-foreground/50 hover:text-foreground transition-all">Settings</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold">Business Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground/50">Admin User</span>
            <div className="w-10 h-10 bg-nectar-gold rounded-full"></div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
