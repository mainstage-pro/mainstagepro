import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sincronizarProveedorDeEquipos } from "@/lib/proveedor-equipos";

// Endpoint de un solo uso. El equipo de tercero ahora se captura en el rider y de
// ahí sale el renglón del proveedor; los proyectos vivos que ya lo tenían
// capturado nunca abrieron ese renglón. Esto se los abre, adoptando la cuenta por
// pagar que ya existiera para no duplicar la deuda. Se borra después de correrlo.

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const aplicar = req.nextUrl.searchParams.get("aplicar") === "1";

  const equipos = await prisma.proyectoEquipo.findMany({
    where: {
      tipo: "EXTERNO",
      proveedorId: { not: null },
      proyecto: { estado: { notIn: ["COMPLETADO", "CANCELADO"] } },
    },
    select: {
      proyectoId: true,
      proveedorId: true,
      proyecto: { select: { numeroProyecto: true } },
      proveedor: { select: { nombre: true } },
    },
  });

  const pares = new Map<string, { proyectoId: string; proveedorId: string; etiqueta: string }>();
  for (const e of equipos) {
    pares.set(`${e.proyectoId}::${e.proveedorId}`, {
      proyectoId: e.proyectoId,
      proveedorId: e.proveedorId!,
      etiqueta: `${e.proyecto.numeroProyecto} · ${e.proveedor?.nombre ?? "?"}`,
    });
  }

  const reporte: string[] = [];
  for (const { proyectoId, proveedorId, etiqueta } of pares.values()) {
    const yaTiene = await prisma.proveedorEvento.findFirst({
      where: { proyectoId, proveedorId, imprevisto: false },
      select: { id: true },
    });
    if (yaTiene) {
      reporte.push(`${etiqueta} — ya tiene renglón`);
      continue;
    }
    if (!aplicar) {
      reporte.push(`${etiqueta} — se le abre renglón`);
      continue;
    }
    await prisma.$transaction((tx) => sincronizarProveedorDeEquipos(tx, proyectoId, proveedorId));
    reporte.push(`${etiqueta} — ✓ renglón abierto`);
  }

  return NextResponse.json({ aplicado: aplicar, pares: pares.size, reporte });
}
