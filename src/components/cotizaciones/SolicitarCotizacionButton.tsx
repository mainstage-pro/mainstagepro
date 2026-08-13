'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { FileText } from 'lucide-react'
import { useAccess } from '@/components/AccessProvider'

// El asistente es pesado: se carga sólo al abrirlo, no en el bundle de cada página.
const AsistenteCotizacion = dynamic(
  () => import('@/components/cotizaciones/AsistenteCotizacion'),
  { ssr: false }
)

// Botón flotante global para "Solicitar cotización" — visible en toda la plataforma
// (compu, celular, iPad). Sólo aparece si el usuario tiene acceso al módulo comercial.
export default function SolicitarCotizacionButton() {
  const { canAccess } = useAccess()
  const [open, setOpen] = useState(false)

  if (!canAccess('crm-tratos')) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed z-40 right-4 flex items-center gap-2 px-4 py-3 rounded-full bg-[#B3985B] text-black font-semibold text-sm shadow-lg shadow-black/40 hover:bg-[#c9a96a] transition-colors"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        title="Solicitar cotización"
        aria-label="Solicitar cotización"
      >
        <FileText strokeWidth={2} className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Solicitar cotización</span>
      </button>
      {open && <AsistenteCotizacion onClose={() => setOpen(false)} />}
    </>
  )
}
