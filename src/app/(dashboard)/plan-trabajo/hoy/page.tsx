'use client'

import { useEffect, useState } from 'react'
import PlanDiaPanel from '../../operaciones/components/PlanDiaPanel'

// "Mi día" del plan de trabajo: lee Tarea (tipoOrigen="PLAN") vía
// /api/plan-trabajo/tareas-dia. Vivió embebida en /operaciones (vista=plan),
// pero esa vista se retiró del hub de Gestión Operativa sin dejar reemplazo;
// esta página reconecta el panel directamente bajo /plan-trabajo.
export default function MiDiaPage() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(me => setIsAdmin(me?.role === 'ADMIN' || me?.role === 'DIRECTOR'))
      .catch(() => {})
  }, [])

  return <PlanDiaPanel isAdmin={isAdmin} />
}
