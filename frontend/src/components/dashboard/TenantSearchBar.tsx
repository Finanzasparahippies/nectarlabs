'use client';

import React, { useState, useEffect } from 'react';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  owner: number;
  custom_domain: string | null;
  [key: string]: any;
}

interface UserItem {
  id: number;
  email: string;
  username: string;
  role: string;
}

interface Project {
  id: number;
  name: string;
  client: number;
}

interface TenantSearchBarProps {
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  onSelectTenant: (tenant: Tenant) => void;
  usersList: UserItem[];
  projects: Project[];
}

export default function TenantSearchBar({
  tenants,
  selectedTenant,
  onSelectTenant,
  usersList,
  projects,
}: TenantSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Derived filter logic
  const filteredItems = tenants.map((tenant) => {
    const searchLower = debouncedSearch.trim().toLowerCase();
    if (!searchLower) {
      return { tenant, matchedProject: null, score: 1 };
    }

    let isMatch = false;
    let matchedProjectName: string | null = null;

    // 1. Direct match on Tenant name, subdomain, custom_domain
    if (
      tenant.name.toLowerCase().includes(searchLower) ||
      tenant.subdomain.toLowerCase().includes(searchLower) ||
      (tenant.custom_domain && tenant.custom_domain.toLowerCase().includes(searchLower))
    ) {
      isMatch = true;
    }

    // 2. Match on Tenant Owner (Username, email)
    const ownerUser = usersList.find((u) => u.id === tenant.owner);
    if (ownerUser) {
      if (
        ownerUser.username.toLowerCase().includes(searchLower) ||
        ownerUser.email.toLowerCase().includes(searchLower)
      ) {
        isMatch = true;
      }
    }

    // 3. Match on Owner's Projects
    const ownerProjects = projects.filter((p) => p.client === tenant.owner);
    const matchingProj = ownerProjects.find((p) =>
      p.name.toLowerCase().includes(searchLower)
    );
    if (matchingProj) {
      isMatch = true;
      matchedProjectName = matchingProj.name;
    }

    return {
      tenant,
      matchedProject: matchedProjectName,
      isMatch,
    };
  }).filter((item) => debouncedSearch.trim() === '' || item.isMatch);

  // Text highlighting helper
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-nectar-gold/30 text-nectar-gold px-0.5 rounded font-black">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Input Box */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar marca, owner, proyecto..."
          className="w-full bg-background/50 border border-card-border focus:border-nectar-gold focus:outline-none rounded-2xl px-4 py-3 text-xs placeholder:text-foreground/30 text-foreground transition-all pl-10"
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/30 select-none">
          🔍
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground text-xs font-bold"
            title="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center px-1">
        <span className="text-[8px] font-black uppercase tracking-wider text-foreground/40">
          Resultados
        </span>
        <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7.5px] font-black uppercase tracking-widest rounded-full font-mono border border-nectar-gold/15">
          {filteredItems.length} Encontrados
        </span>
      </div>

      {/* Tenants List */}
      <div className="space-y-2 overflow-y-auto max-h-[350px] custom-scrollbar pr-1">
        {filteredItems.map(({ tenant, matchedProject }) => (
          <button
            key={tenant.id}
            onClick={() => onSelectTenant(tenant)}
            className={`w-full text-left p-4 rounded-xl border transition-all text-xs font-black uppercase tracking-wider group relative overflow-hidden flex flex-col gap-1.5 ${
              selectedTenant?.id === tenant.id
                ? 'bg-nectar-gold/10 text-nectar-gold border-nectar-gold/30 shadow-[0_0_12px_rgba(198,138,30,0.05)]'
                : 'bg-background/40 hover:bg-background/70 text-foreground/75 border-card-border'
            }`}
          >
            <div className="flex justify-between items-start gap-2 w-full min-w-0">
              <span className="truncate flex-1">
                {highlightText(tenant.name, debouncedSearch)}
              </span>
              <span
                className={`px-1.5 py-0.5 text-[6.5px] font-black rounded uppercase tracking-wider border shrink-0 ${
                  tenant.is_active
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {tenant.is_active ? 'Activo' : 'Reservado'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <p className="text-[7.5px] opacity-45 lowercase tracking-normal font-mono truncate">
                {highlightText(`${tenant.subdomain}.nectarlabs.dev`, debouncedSearch)}
              </p>
              {tenant.custom_domain && (
                <p className="text-[7.5px] opacity-45 lowercase tracking-normal font-mono truncate text-nectar-gold/80">
                  🌐 {highlightText(tenant.custom_domain, debouncedSearch)}
                </p>
              )}
            </div>

            {/* If matched on owner details */}
            {(() => {
              const ownerUser = usersList.find((u) => u.id === tenant.owner);
              const searchLower = debouncedSearch.trim().toLowerCase();
              if (
                ownerUser &&
                searchLower &&
                (ownerUser.username.toLowerCase().includes(searchLower) ||
                  ownerUser.email.toLowerCase().includes(searchLower))
              ) {
                return (
                  <div className="mt-1 pt-1.5 border-t border-card-border/30 flex flex-col text-[7px] text-foreground/40 gap-0.5">
                    <span>Propietario Coincidente:</span>
                    <span className="font-mono font-bold">
                      {highlightText(ownerUser.username, debouncedSearch)} ({highlightText(ownerUser.email, debouncedSearch)})
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Project match badge */}
            {matchedProject && (
              <div className="mt-1.5 px-2.5 py-1.5 bg-nectar-gold/5 border border-nectar-gold/20 rounded-lg text-[7px] text-nectar-gold font-bold flex flex-col gap-0.5 animate-fadeIn">
                <span className="uppercase text-[6px] tracking-wider opacity-60">Proyecto Coincidente</span>
                <span className="truncate">{matchedProject}</span>
              </div>
            )}
          </button>
        ))}

        {filteredItems.length === 0 && (
          <div className="py-8 text-center border border-dashed border-card-border rounded-xl opacity-30 text-[9px] font-black uppercase tracking-wider">
            Sin resultados
          </div>
        )}
      </div>
    </div>
  );
}
