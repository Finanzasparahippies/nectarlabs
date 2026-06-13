'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetcher } from '@/lib/api';

interface SATAutocompleteProps {
  value: string;
  onChange: (code: string, label: string) => void;
  mode: 'product' | 'unit';
  placeholder?: string;
  primaryColor?: string;
  subdomain?: string;
  tenantId?: string;
}

export default function SATAutocomplete({
  value,
  onChange,
  mode,
  placeholder = 'Buscar...',
  primaryColor = '#C68A1E',
  subdomain,
  tenantId
}: SATAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Helper to build query URL with tenant context
  const buildUrl = (endpoint: string, qParam: string) => {
    let url = `${endpoint}?q=${encodeURIComponent(qParam)}`;
    if (subdomain) {
      url += `&subdomain=${encodeURIComponent(subdomain)}`;
    }
    if (tenantId) {
      url += `&tenant_id=${encodeURIComponent(tenantId)}`;
    }
    return url;
  };

  // Load the label of the current code on initialization or value change
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      setQuery('');
      return;
    }

    const fetchCurrentLabel = async () => {
      try {
        const endpoint = mode === 'product' ? '/billing/sat/products/' : '/billing/sat/units/';
        const res = await fetcher(buildUrl(endpoint, value));
        const exactMatch = res.find((item: any) => item.code === value);
        if (exactMatch) {
          const label = mode === 'product' ? exactMatch.description : exactMatch.name;
          setSelectedLabel(`${exactMatch.code} - ${label}`);
          setQuery(value);
        } else {
          setSelectedLabel(value);
          setQuery(value);
        }
      } catch (err) {
        console.error('Error fetching current SAT label:', err);
        setSelectedLabel(value);
        setQuery(value);
      }
    };

    fetchCurrentLabel();
  }, [value, mode]);

  // Fetch results based on query
  const fetchResults = async (searchQuery: string) => {
    setLoading(true);
    try {
      const endpoint = mode === 'product' ? '/billing/sat/products/' : '/billing/sat/units/';
      const data = await fetcher(buildUrl(endpoint, searchQuery));
      setResults(data || []);
    } catch (err) {
      console.error('Error fetching SAT catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on focus or query change
  useEffect(() => {
    if (!isOpen) return;

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Immediately search for short queries to load defaults, otherwise debounce
    if (query.trim().length < 2) {
      fetchResults('');
    } else {
      searchTimeout.current = setTimeout(() => {
        fetchResults(query.trim());
      }, 300);
    }

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search query input to show current selection code
        setQuery(value || '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const handleSelect = (item: any) => {
    const label = mode === 'product' ? item.description : item.name;
    onChange(item.code, label);
    setSelectedLabel(`${item.code} - ${label}`);
    setQuery(item.code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={placeholder}
          value={isOpen ? query : selectedLabel || query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery(''); // Clear field on focus to allow typing and show all options
          }}
          className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold text-foreground admin-input font-mono"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('', '');
              setSelectedLabel('');
              setQuery('');
            }}
            className="absolute right-3 text-white/40 hover:text-white text-[9px] cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#050a06]/95 backdrop-blur-md shadow-2xl py-1.5 custom-scrollbar autocomplete-dropdown">
          {loading ? (
            <div className="flex items-center justify-center py-4 text-[8px] font-black uppercase tracking-wider sat-status text-white/40">
              <span className="w-3 h-3 rounded-full border-2 border-t-white border-white/10 animate-spin mr-2 sat-spinner"></span>
              Buscando catálogo...
            </div>
          ) : results.length === 0 ? (
            <div className="py-3 px-4 text-[8px] font-black uppercase tracking-wider text-center sat-status text-white/30">
              No se encontraron resultados
            </div>
          ) : (
            results.map((item) => {
              const itemLabel = mode === 'product' ? item.description : item.name;
              const isSelected = item.code === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-4 py-2 hover:bg-white/5 transition-colors flex flex-col gap-0.5 border-b border-white/[0.02] last:border-0"
                >
                  <div className="flex justify-between items-center w-full">
                    <span 
                      className="text-[9px] font-black font-mono tracking-wider sat-code text-white"
                      style={isSelected ? { color: primaryColor } : {}}
                    >
                      {item.code}
                    </span>
                    {isSelected && (
                      <span className="text-[7px] font-black uppercase tracking-wider" style={{ color: primaryColor }}>
                        Seleccionado
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] font-medium line-clamp-2 uppercase sat-label text-white/60">
                    {itemLabel}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
