'use client';

import Link from 'next/link';

export function NuevoTratoDropdown({ onLeadCreated: _onLeadCreated }: { onLeadCreated?: () => void | Promise<void> } = {}) {
  return (
    <Link
      href="/crm/tratos/nuevo"
      className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
    >
      + Nuevo contacto
    </Link>
  );
}
