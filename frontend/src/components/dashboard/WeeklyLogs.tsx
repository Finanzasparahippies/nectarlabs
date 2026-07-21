import React from 'react';

interface Log {
  id: number;
  date: string;
  hours: string;
  description: string;
}

export default function WeeklyLogs({ logs }: { logs: Log[] }) {
  const totalHours = logs.reduce((acc, log) => acc + parseFloat(log.hours), 0);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-10">
        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] opacity-40">Bitácora de Ingeniería</h3>
        <div className="text-right">
          <p className="text-[8px] uppercase tracking-widest text-foreground/40 font-black">Consumo Acumulado</p>
          <p className="text-3xl font-black text-nectar-gold">{totalHours} <span className="text-[10px] opacity-40">HRS</span></p>
        </div>
      </div>

      <div className="space-y-2">
        {logs.length > 0 ? (
          logs.map(log => (
            <div key={log.id} className="flex items-center gap-6 p-5 rounded-2xl border border-transparent hover:border-card-border hover:bg-foreground/[0.02] transition-all group">
              <div className="flex-shrink-0 w-14 h-14 bg-background border border-card-border rounded-2xl flex flex-col items-center justify-center group-hover:border-nectar-gold transition-colors">
                <span className="block text-[8px] font-black text-nectar-gold uppercase">{new Date(log.date).toLocaleDateString('es-MX', { weekday: 'short' })}</span>
                <span className="block text-xl font-black">{new Date(log.date).getDate()}</span>
              </div>
              
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-foreground/80">{log.description}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black text-nectar-gold">+{log.hours}h</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/50"></div>
                  </div>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-20 mt-1">Auditado • Hetzner Cluster</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 opacity-20">
            <p className="font-bold uppercase tracking-widest text-xs">Aún no hay registros en la bitácora</p>
          </div>
        )}
      </div>
    </div>
  );
}
