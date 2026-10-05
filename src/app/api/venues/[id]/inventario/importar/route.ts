import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DISCIPLINAS } from "@/lib/giras";
import { importarRiderVenue } from "@/lib/rider-venue-import";
import { logActividad } from "@/lib/actividad";

interface ItemEntrante {
  disciplina?: string | null;
  concepto?: string | null;
  cantidad?: number | string | null;
  marca?: string | null;
  modelo?: string | null;
  notas?: string | null;
}

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/// Las marcas del catálogo son el diccionario con el que se parte "KARA I –
/// L-ACOUSTICS" en marca y modelo. Salen del inventario propio, así que el
/// importador mejora solo conforme el catálogo crece.
async function marcasConocidas(): Promise<string[]> {
  const filas = await prisma.equipo.findMany({
    where: { marca: { not: null } },
    distinct: ["marca"],
    select: { marca: true },
  });
  return filas.map((f) => f.marca!).filter(Boolean);
}

/// Dos llamadas, un solo endpoint: sin `items` devuelve la lectura propuesta
/// para que se corrija en pantalla; con `items` guarda lo que el usuario dejó.
/// El texto crudo nunca se guarda tal cual.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const venue = await prisma.venue.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!venue) return NextResponse.json({ error: "Venue no encontrado" }, { status: 404 });

  const body = await req.json();

  if (!Array.isArray(body.items)) {
    const crudo = texto(body.texto);
    if (!crudo) return NextResponse.json({ error: "Pega el texto del rider del venue" }, { status: 400 });
    const lectura = importarRiderVenue(crudo, await marcasConocidas());
    return NextResponse.json(lectura);
  }

  const entrantes = (body.items as ItemEntrante[])
    .map((i) => {
      const concepto = texto(i.concepto);
      if (!concepto) return null;
      const cantidad = Number(i.cantidad);
      return {
        disciplina:
          typeof i.disciplina === "string" && DISCIPLINAS.includes(i.disciplina as (typeof DISCIPLINAS)[number])
            ? i.disciplina
            : "OTRO",
        concepto,
        cantidad: Number.isFinite(cantidad) && cantidad > 0 ? Math.trunc(cantidad) : 1,
        marca: texto(i.marca),
        modelo: texto(i.modelo),
        notas: texto(i.notas),
      };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  if (entrantes.length === 0) {
    return NextResponse.json({ error: "No hay renglones con concepto que guardar" }, { status: 400 });
  }

  const max = await prisma.venueInventario.aggregate({ where: { venueId: id }, _max: { orden: true } });
  const base = (max._max.orden ?? 0) + 10;

  await prisma.venueInventario.createMany({
    data: entrantes.map((e, i) => ({ ...e, venueId: id, orden: base + i * 10 })),
  });

  await logActividad(
    session.id,
    "IMPORTAR",
    "venue-inventario",
    id,
    `Importó ${entrantes.length} renglones al inventario de ${venue.nombre} desde su rider`,
  );

  const items = await prisma.venueInventario.findMany({
    where: { venueId: id },
    orderBy: [{ disciplina: "asc" }, { orden: "asc" }],
  });

  return NextResponse.json({ creados: entrantes.length, items });
}
