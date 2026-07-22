import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, puedeVerificar } from "@/lib/auth";

// GET /api/verificacion/count — conteo de tareas pendientes de verificación.
// Devuelve 0 si el usuario no tiene permiso (así el badge no aparece).
export async function GET() {
  const session = await getSession();
  if (!session || !puedeVerificar(session)) return NextResponse.json({ count: 0 });

  const count = await prisma.tarea.count({
    where: { estadoVerificacion: "PENDIENTE_VERIFICACION" },
  });
  return NextResponse.json({ count });
}
