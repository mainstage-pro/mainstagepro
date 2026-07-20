'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UndoToastContainer } from '@/components/ui/undo-toast'
import { Calendar, ClipboardList, BarChart3, History } from 'lucide-react'

export default function PlanTrabajoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { href: '/plan-trabajo/hoy',          label: 'Mi día',       Icon: Calendar      },
    { href: '/plan-trabajo/plan',         label: 'Plan',         Icon: ClipboardList },
    { href: '/plan-trabajo/rendimiento',  label: 'Rendimiento',  Icon: BarChart3     },
    { href: '/plan-trabajo/historial',    label: 'Historial',    Icon: History       },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="px-6 pt-8 pb-0 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-[#c9a96a] uppercase tracking-[0.2em] font-semibold">
              Sistema Operativo v2.0
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Plan de Trabajo</h1>
          </div>
        </div>
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-all ${
                  isActive
                    ? 'bg-[#111] border-[#2a2a2a] text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#0d0d0d]'
                }`}
              >
                <tab.Icon strokeWidth={1.75} className="w-3.5 h-3.5" />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
      <div>{children}</div>
      <UndoToastContainer />
    </div>
  )
}
