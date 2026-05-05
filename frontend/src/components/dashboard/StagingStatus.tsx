import React from 'react';

interface Project {
  name: string;
  status: string;
  staging_url: string;
  server_ip?: string;
}


export default function StagingStatus({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-sm uppercase tracking-widest opacity-60">Infraestructura</h3>
        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest border border-green-500/20 animate-pulse">
          Online
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center p-4 rounded-2xl bg-background/50 border border-card-border group hover:border-nectar-gold transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-nectar-gold animate-glow"></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Staging Env</span>
          </div>
          <a href={project.staging_url} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-nectar-gold hover:underline">
            Visit URL
          </a>
        </div>

        <div className="flex justify-between items-center p-4 rounded-2xl bg-background/50 border border-card-border group hover:border-nectar-gold transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-foreground/20"></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Server IP</span>
          </div>
          <span className="text-[10px] font-mono text-foreground/40">{project.server_ip || '127.0.0.1'}</span>
        </div>
      </div>

      <div className="pt-4">
        <div className="flex justify-between text-[8px] uppercase tracking-widest font-black text-foreground/30 mb-2">
          <span>Despliegue de Recursos</span>
          <span className="text-nectar-gold">{project.status === 'MVP' ? '30%' : project.status === 'STAGING' ? '70%' : '100%'}</span>
        </div>
        <div className="w-full h-1 bg-foreground/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-nectar-gold transition-all duration-1000" 
            style={{ width: project.status === 'MVP' ? '30%' : project.status === 'STAGING' ? '70%' : '100%' }}
          ></div>
        </div>
      </div>
    </div>
  );
}
