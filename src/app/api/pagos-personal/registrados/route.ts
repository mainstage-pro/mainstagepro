import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { etiquetaComplemento } from "@/lib/nomina-pagos";

// GET /api/pagos-personal/registrados?tecnicoId=X&proyectoIds=a,b
// Pagos de nómina ya registrados de un técnico en esos proyectos: el pago
// ligado de cada jornada más sus complementos. Alimenta el editor de pagos.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tecnicoId = req.nextUrl.searchParams.get("tecnicoId");
  const proyectoIds = (req.nextUrl.searchParams.get("proyectoIds") ?? "").split(",").filter(Boolean);
  if (!tecnicoId || !proyectoIds.length) {
    return NextResponse.json({ error: "tecnicoId y proyectoIds requeridos" }, { status: 400 });
  }

  const filas = await prisma.proyectoPersonal.findMany({
    where: { tecnicoId, proyectoId: { in: proyectoIds } },
    select: {
      id: true,
      proyectoId: true,
      fechaJornada: true,
      rolEnEvento: true,
      movimientoId: true,
      rolTecnico: { select: { nombre: true } },
      proyecto: { select: { nombre: true } },
    },
  });
  if (!filas.length) return NextResponse.json({ pagos: [] });

  const filaPorId = new Map(filas.map((f) => [f.id, f]));
  const movs = await prisma.movimientoFinanciero.findMany({
    where: {
      OR: [
        { id: { in: filas.map((f) => f.movimientoId).filter((x): x is string => !!x) } },
        ...filas.map((f) => ({ tipo: "GASTO", notas: { contains: etiquetaComplemento(f.id) } })),
      ],
    },
    select: {
      id: true, fecha: true, monto: true, metodoPago: true, cuentaOrigenId: true,
      referencia: true, notas: true, estatusConciliacion: true,
      proyectoPersonal: { select: { id: true } },
    },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });

  const pagos = movs.flatMap((m) => {
    const filaId = m.proyectoPersonal?.id ?? (m.notas ?? "").match(/\[fila:([^\]]+)\]/)?.[1];
    const fila = filaId ? filaPorId.get(filaId) : undefined;
    if (!fila) return [];
    return [{
      id: m.id,
      filaId: fila.id,
      proyectoId: fila.proyectoId,
      proyectoNombre: fila.proyecto?.nombre ?? "Proyecto",
      puesto: fila.rolEnEvento ?? fila.rolTecnico?.nombre ?? "Puesto",
      fechaJornada: fila.fechaJornada,
      esComplemento: !m.proyectoPersonal,
      fecha: m.fecha.toISOString().slice(0, 10),
      monto: m.monto,
      metodoPago: m.metodoPago,
      cuentaOrigenId: m.cuentaOrigenId,
      referencia: m.referencia,
      conciliado: m.estatusConciliacion === "CONCILIADO",
    }];
  });

  return NextResponse.json({ pagos });
}
