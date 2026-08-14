import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCalendariosTabla } from "@/lib/migraciones-lazy";
import { CALENDARIOS, type CalendarioKey } from "@/lib/calendarios";
import { crearPlantillaTemporada } from "@/lib/paquetes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any) {
  return {
    id: r.id,
    calendario: r.calendario as CalendarioKey,
    tipo: r.tipo,
    titulo: r.titulo,
    descripcion: r.descripcion ?? null,
    anio: r.anio ?? null,
    mesInicio: r.mes_inicio,
    diaInicio: r.dia_inicio ?? null,
    mesFin: r.mes_fin ?? null,
    diaFin: r.dia_fin ?? null,
    color: r.color ?? null,
    icono: r.icono ?? null,
    ideas: r.ideas ?? null,
    tipoEventoSlug: r.tipo_evento_slug ?? null,
    servicio: r.servicio ?? null,
    orden: r.orden ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCalendariosTabla();

  const cal = req.nextUrl.searchParams.get("calendario");
  if (!cal || !(cal in CALENDARIOS)) {
    return NextResponse.json({ error: "Calendario inválido" }, { status: 400 });
  }
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT * FROM calendario_entradas WHERE calendario = $1 AND activo = true
     ORDER BY mes_inicio ASC, COALESCE(dia_inicio, 0) ASC, orden ASC`,
    cal,
  );
  return NextResponse.json({ entradas: rows.map(mapRow) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCalendariosTabla();

  const b = await req.json();
  const cal = b.calendario;
  if (!cal || !(cal in CALENDARIOS)) return NextResponse.json({ error: "Calendario inválido" }, { status: 400 });
  if (!b.titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });
  const mesInicio = Number(b.mesInicio);
  if (!(mesInicio >= 1 && mesInicio <= 12)) return NextResponse.json({ error: "Mes inválido" }, { status: 400 });

  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `INSERT INTO calendario_entradas
       (id, calendario, tipo, titulo, descripcion, anio, mes_inicio, dia_inicio, mes_fin, dia_fin, color, icono, ideas, tipo_evento_slug, servicio, orden)
     VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    cal,
    (b.tipo || CALENDARIOS[cal as CalendarioKey].tipos[0].key),
    b.titulo.trim(),
    b.descripcion?.trim() || null,
    b.anio != null && b.anio !== "" ? Number(b.anio) : null,
    mesInicio,
    b.diaInicio != null && b.diaInicio !== "" ? Number(b.diaInicio) : null,
    b.mesFin != null && b.mesFin !== "" ? Number(b.mesFin) : null,
    b.diaFin != null && b.diaFin !== "" ? Number(b.diaFin) : null,
    b.color?.trim() || null,
    b.icono?.trim() || null,
    b.ideas?.trim() || null,
    b.tipoEventoSlug?.trim() || null,
    b.servicio?.trim() || null,
    Number(b.orden) || 0,
  );
  const entrada = mapRow(rows[0]);

  // Alta de una fecha comercial ⇒ genera su plantilla de paquete en blanco.
  // No debe tumbar la creación de la entrada si algo falla.
  if (cal === "COMERCIAL") {
    try {
      await crearPlantillaTemporada(entrada.titulo, entrada.icono, entrada.tipoEventoSlug);
    } catch (e) {
      console.error("No se pudo crear la plantilla de temporada:", e);
    }
  }

  return NextResponse.json({ entrada }, { status: 201 });
}
