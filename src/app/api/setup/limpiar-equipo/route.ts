import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Ruta temporal — elimina las 6 cuentas creadas por error y limpia las instancias huérfanas.
 * Protegida con secret. Eliminar después de usar.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== "msp-clean-2026") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const emailsAEliminar = [
    "emiliano@mainstagepro.mx",
    "sebastian@mainstagepro.mx",
    "carlos@mainstagepro.mx",
    "rodrigo@mainstagepro.mx",
    "zaid@mainstagepro.mx",
    "daniel@mainstagepro.mx",
  ];

  // Borrar usuarios (onDelete: SetNull en templates e instancias)
  const deleted = await prisma.user.deleteMany({
    where: { email: { in: emailsAEliminar } },
  });

  // Reasignar instancias de hoy sin responsable al admin
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  let reasignadas = 0;
  if (admin) {
    const r = await prisma.pTTareaInstancia.updateMany({
      where: { responsableId: undefined },
      data: { responsableId: admin.id },
    });
    reasignadas = r.count;
  }

  return NextResponse.json({ ok: true, usuariosEliminados: deleted.count, instanciasReasignadas: reasignadas });
}
