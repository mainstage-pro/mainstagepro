import { redirect } from 'next/navigation'

// Bloque 2: la vista "Mi Día" del plan de trabajo se unificó dentro de
// /operaciones (lee Tarea tipoOrigen="PLAN"). Esta ruta ahora solo redirige.
export default function MiDiaRedirect() {
  redirect('/operaciones?vista=plan')
}
