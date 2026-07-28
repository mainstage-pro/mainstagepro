import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureActasFaltas } from "@/lib/migraciones-lazy";
import { ensureCatalogoFaltas } from "@/lib/faltas";

// Catálogo de faltas administrativas (subconjunto de TipoIncidencia con gravedad).
// Siembra idempotente en la primera lectura.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureActasFaltas();
  await ensureCatalogoFaltas();

  const tipos = await prisma.tipoIncidencia.findMany({
    where: { activo: true },
    orderBy: [{ categoria: "asc" }, { gravedad: "asc" }, { nombre: "asc" }],
  });
  return NextResponse.json({ tipos });
}
