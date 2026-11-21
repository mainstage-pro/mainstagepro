import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { esTipoCanal, listasDelShow, renumerarCola, type TipoCanal } from "@/lib/show-canales";
import { ensureShowCanalOrdenTable } from "@/lib/migraciones-lazy";

/**
 * El orden del patch de ESTA fecha.
 *
 * Quien parcha esa noche manda: se puede acomodar toda la lista, también los
 * renglones que vienen del rider. El orden se guarda solo para esta plaza
 * (`ShowCanalOrden`); el rider de la gira no se toca y las demás fechas lo
 * siguen leyendo como viene.
 *
 * El número no se acepta del cliente: la lista unificada lo recalcula.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { id: true } });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  const body = await req.json();
  if (!esTipoCanal(body.tipo)) {
    return NextResponse.json({ error: "El canal tiene que ser entrada o salida" }, { status: 400 });
  }
  const tipo: TipoCanal = body.tipo;
  const claves: string[] = Array.isArray(body.claves)
    ? body.claves.filter((x: unknown) => typeof x === "string")
    : [];

  const listas = await listasDelShow(showId);
  const filas = tipo === "INPUT" ? listas.inputs : listas.outputs;

  // La lista tiene que ser exactamente lo que hoy se parcha: si llegara a medias,
  // los que faltan caerían donde el algoritmo los ponga y la lista saldría revuelta.
  const visibles = new Set(filas.map((f) => f.clave));
  if (claves.length !== visibles.size || new Set(claves).size !== claves.length || claves.some((c) => !visibles.has(c))) {
    return NextResponse.json(
      { error: "La lista cambió mientras la acomodabas: vuelve a cargar la fecha" },
      { status: 409 },
    );
  }

  await ensureShowCanalOrdenTable();
  await prisma.showCanalOrden.upsert({
    where: { showId_tipo: { showId, tipo } },
    create: { showId, tipo, claves },
    update: { claves },
  });

  // La cola de la fecha conserva su orden relativo: si luego se regresa al orden
  // del rider, los canales de aquí quedan como se acomodaron.
  const porClave = new Map(filas.map((f) => [f.clave, f]));
  const cola = claves.map((c) => porClave.get(c)).filter((f) => f?.origen === "SHOW" && f.canalShowId);
  await prisma.$transaction(
    cola.map((f, i) => prisma.showCanal.update({ where: { id: f!.canalShowId! }, data: { orden: (i + 1) * 10 } })),
  );
  await renumerarCola(showId, tipo);

  await logActividad(
    session.id,
    "ACTUALIZAR",
    "GiraShow",
    showId,
    `Acomodó el ${tipo === "INPUT" ? "input" : "output"} list solo en esta fecha`,
    { showId, tipo },
  );

  return NextResponse.json({ listas: await listasDelShow(showId) });
}

/// Regresa la fecha al orden del rider de la gira, con su cola detrás.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const tipo = req.nextUrl.searchParams.get("tipo");
  if (!esTipoCanal(tipo)) {
    return NextResponse.json({ error: "El canal tiene que ser entrada o salida" }, { status: 400 });
  }

  await ensureShowCanalOrdenTable();
  await prisma.showCanalOrden.deleteMany({ where: { showId, tipo } });
  await renumerarCola(showId, tipo);

  await logActividad(
    session.id,
    "ACTUALIZAR",
    "GiraShow",
    showId,
    `Regresó el ${tipo === "INPUT" ? "input" : "output"} list al orden del rider`,
    { showId, tipo },
  );

  return NextResponse.json({ listas: await listasDelShow(showId) });
}
