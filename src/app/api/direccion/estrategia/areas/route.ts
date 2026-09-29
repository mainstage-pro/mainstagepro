import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureEstrategiaSchema } from "../route";

// Propósito del área y su dueño. El código y el puente de permisos no se editan:
// son la liga con las llaves de acceso y con Puesto.area.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await ensureEstrategiaSchema();
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const area = await prisma.areaEstrategica.update({
    where: { id: b.id },
    data: {
      ...(b.nombre !== undefined ? { nombre: String(b.nombre).trim() } : {}),
      ...(b.proposito !== undefined ? { proposito: b.proposito } : {}),
      ...(b.responsableId !== undefined ? { responsableId: b.responsableId || null } : {}),
    },
  });
  return NextResponse.json({ area });
}
