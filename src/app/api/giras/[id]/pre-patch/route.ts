import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { esTipoCanal, listasDelAlcance, siguienteOrden } from "@/lib/pre-patch";

/// Una fecha solo puede parchar la interfaz de SU gira: con el id de otra, el
/// puerto quedaría colgado de una lista que nadie lee.
async function fechaDeLaGira(giraId: string, showId: unknown): Promise<string | null | "ajena"> {
  if (typeof showId !== "string" || !showId) return null;
  const show = await prisma.giraShow.findFirst({ where: { id: showId, giraId }, select: { id: true } });
  return show ? show.id : "ajena";
}

/// El pre-patch de la interfaz: sin `showId` es la base de la gira, con él es
/// como queda en esa fecha.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const showId = await fechaDeLaGira(id, req.nextUrl.searchParams.get("showId"));
  if (showId === "ajena") return NextResponse.json({ error: "Esa fecha no es de esta gira" }, { status: 400 });

  return NextResponse.json({ listas: await listasDelAlcance(id, showId) });
}

/// Hasta cuántos renglones se abren de un golpe. Una interfaz grande anda en 64
/// puertos por lado; el tope es para que un dedo pegado no siembre mil.
const TOPE_CANTIDAD = 128;

function cuantos(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= TOPE_CANTIDAD ? n : null;
}

/**
 * Puertos nuevos. Sin `showId` entran a la base de la gira y los leen todas las
 * fechas; con él nacen solo en esa plaza, en la cola de lo que trae la gira.
 *
 * Con `cantidad` se abren N renglones vacíos de una vez: cuando ya se sabe que
 * son 32 entradas, se abren las 32 y el nombre se llena después. Sin ella es el
 * alta de un puerto con todo capturado.
 *
 * El número de puerto no se acepta del cliente: la lista se cuenta corrida sobre
 * lo que de verdad se parcha.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true, conPrePatch: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const body = await req.json();

  if (!esTipoCanal(body.tipo)) {
    return NextResponse.json({ error: "El puerto tiene que ser de entrada o de salida" }, { status: 400 });
  }
  const tipo = body.tipo;

  const cantidad = cuantos(body.cantidad);

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  // Un renglón abierto nace sin nombre a propósito; el alta de uno sí lo exige,
  // porque ahí lo único que se está capturando es el nombre.
  if (!cantidad && !nombre) {
    return NextResponse.json({ error: "El puerto necesita un nombre" }, { status: 400 });
  }

  const showId = await fechaDeLaGira(id, body.showId);
  if (showId === "ajena") return NextResponse.json({ error: "Esa fecha no es de esta gira" }, { status: 400 });

  // Capturar un puerto es decir que la gira parcha una interfaz: se prende de una
  // vez en vez de dejar la lista escrita y apagada.
  if (!gira.conPrePatch) await prisma.gira.update({ where: { id }, data: { conPrePatch: true } });

  const desde = await siguienteOrden(id, showId, tipo);
  const lado = tipo === "INPUT" ? "entrada" : "salida";

  if (cantidad) {
    await prisma.prePatchCanal.createMany({
      data: Array.from({ length: cantidad }, (_, i) => ({
        giraId: id,
        showId,
        tipo,
        nombre: "",
        orden: desde + i * 10,
      })),
    });

    await logActividad(
      session.id,
      "CREAR",
      "PrePatchCanal",
      id,
      `Abrió ${cantidad} ${cantidad === 1 ? lado : `${lado}s`} en el pre-patch de la interfaz${showId ? " solo en esta fecha" : ""}`,
      { giraId: id, showId, cantidad },
    );

    return NextResponse.json({ listas: await listasDelAlcance(id, showId) });
  }

  const puerto = await prisma.prePatchCanal.create({
    data: {
      giraId: id,
      showId,
      tipo,
      nombre,
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
      orden: desde,
    },
    select: { id: true },
  });

  await logActividad(
    session.id,
    "CREAR",
    "PrePatchCanal",
    puerto.id,
    `Agregó la ${lado} «${nombre}» al pre-patch de la interfaz${showId ? " solo en esta fecha" : ""}`,
    { giraId: id, showId },
  );

  return NextResponse.json({ listas: await listasDelAlcance(id, showId) });
}
