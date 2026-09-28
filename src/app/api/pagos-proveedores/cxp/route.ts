import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { asegurarCxPDeProveedorEvento } from "@/lib/pagos-proveedor";

// POST /api/pagos-proveedores/cxp — formalizar en lote los renglones de
// proveedor que todavía no son una cuenta por pagar. Es el equivalente al
// "Generar nota por pagar" de la nómina, pero para varios renglones de una vez.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { proveedorEventoIds } = (await req.json()) as { proveedorEventoIds?: string[] };
  if (!proveedorEventoIds?.length) {
    return NextResponse.json({ error: "Sin renglones que formalizar" }, { status: 400 });
  }

  const resultados = await prisma.$transaction(async (tx) => {
    const out: { id: string; ok: boolean; error?: string; creada?: boolean; concepto?: string }[] = [];
    for (const id of proveedorEventoIds) {
      const r = await asegurarCxPDeProveedorEvento(tx, id);
      out.push(r.ok ? { id, ok: true, creada: r.creada, concepto: r.concepto } : { id, ok: false, error: r.error });
    }
    return out;
  });

  const creadas = resultados.filter((r) => r.ok && r.creada);
  for (const r of creadas) {
    await logActividad(session.id, "CREAR", "cuenta_pagar", r.id, `CxP del evento: ${r.concepto}`);
  }

  return NextResponse.json({
    ok: true,
    creadas: creadas.length,
    fallidas: resultados.filter((r) => !r.ok),
  });
}
