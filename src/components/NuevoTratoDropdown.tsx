'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LeadRapidoSheet } from '@/components/LeadRapidoSheet';

interface Props {
  onLeadCreated?: () => void;
}

export function NuevoTratoDropdown({ onLeadCreated }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          + Nueva oportunidad
          <svg className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 overflow-hidden">
            <button
              onClick={() => { setDropdownOpen(false); setSheetOpen(true); }}
              className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-[#252525] hover:text-white transition-colors border-b border-[#2a2a2a]"
            >
              <p className="font-medium">⚡ Lead rápido</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Solo nombre y origen</p>
            </button>
            <Link
              href="/crm/tratos/nuevo"
              onClick={() => setDropdownOpen(false)}
              className="block px-4 py-3 text-sm text-gray-200 hover:bg-[#252525] hover:text-white transition-colors"
            >
              <p className="font-medium">📋 Trato completo</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Flujo de descubrimiento</p>
            </Link>
          </div>
        )}
      </div>

      <LeadRapidoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onLeadCreated={() => { onLeadCreated?.(); }}
      />
    </>
  );
}
