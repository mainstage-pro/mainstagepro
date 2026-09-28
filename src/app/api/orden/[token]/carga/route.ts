import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";
import { proyectoIdPorToken } from "@/lib/orden-produccion";
import {
  itemsDesdeEquipos,
  itemsParaRetorno,
  type EquipoParaCarga,
  type ItemCargaGuardado,
} from "@/lib/control-carga";

/** Abre un pase de control de carga y congela sus renglones. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`orden-carga:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });

  const proyectoId = await proyectoIdPorToken(token);
  if (!proyectoId) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const tipo = body?.tipo === "RETORNO" ? "RETORNO" : "SALIDA";
  const verificadorId = typeof body?.verificadorId === "string" ? body.verificadorId : null;
  if (!verificadorId) return NextResponse.json({ error: "Identifícate antes de abrir el pase" }, { status: 400 });

  const verificador = await prisma.proyectoCargaVerificador.findFirst({
    where: { id: verificadorId, proyectoId },
    select: { id: true },
  });
  if (!verificador) return NextResponse.json({ error: "Identificación no válida" }, { status: 400 });

  const abierto = await prisma.proyectoCarga.findFirst({
    where: { proyectoId, tipo, estado: "EN_CURSO" },
    select: { id: true },
  });
  if (abierto) return NextResponse.json({ error: "Ya hay un pase de ese tipo abierto", cargaId: abierto.id }, { status: 409 });

  let snapshot;
  if (tipo === "RETORNO") {
    const itemsSalida = await prisma.proyectoCargaItem.findMany({
      where: { carga: { proyectoId, tipo: "SALIDA", estado: "CERRADA" } },
      select: {
        proyectoEquipoId: true, riderAccesorioId: true, equipoId: true, esAccesorio: true,
        descripcion: true, categoria: true, cantidadVerificada: true, estado: true, orden: true,
      },
    });
    snapshot = itemsParaRetorno(itemsSalida as ItemCargaGuardado[]);
    // Sin una salida cerrada no hay referencia de qué subió: se parte del listado.
    if (snapshot.length === 0) snapshot = await snapshotDelProyecto(proyectoId);
  } else {
    snapshot = await snapshotDelProyecto(proyectoId);
  }

  if (snapshot.length === 0) {
    return NextResponse.json({ error: "No hay equipo cargado en el proyecto" }, { status: 400 });
  }

  const carga = await prisma.proyectoCarga.create({
    data: {
      proyectoId,
      tipo,
      etiqueta: typeof body?.etiqueta === "string" && body.etiqueta.trim() ? body.etiqueta.trim() : null,
      abiertoPorId: verificadorId,
      items: { create: snapshot },
    },
    select: { id: true },
  });

  return NextResponse.json({ cargaId: carga.id });
}

async function snapshotDelProyecto(proyectoId: string) {
  const equipos = await prisma.proyectoEquipo.findMany({
    where: { proyectoId },
    select: {
      id: true,
      equipoId: true,
      cantidad: true,
      equipo: { select: { descripcion: true, marca: true, modelo: true, categoria: { select: { nombre: true } } } },
      riderAccesorios: { select: { id: true, nombre: true, cantidad: true }, orderBy: { orden: "asc" } },
    },
    orderBy: { id: "asc" },
  });

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { equiposRiderExtra: true },
  });

  let extras: { descripcion: string; cantidad: number }[] = [];
  try {
    const raw = proyecto?.equiposRiderExtra ? JSON.parse(proyecto.equiposRiderExtra) : [];
    if (Array.isArray(raw)) {
      extras = raw
        .filter((e: { descripcion?: string }) => typeof e?.descripcion === "string" && e.descripcion.trim())
        .map((e: { descripcion: string; cantidad?: number }) => ({ descripcion: e.descripcion, cantidad: Number(e.cantidad) || 1 }));
    }
  } catch { /* JSON capturado a mano — se ignora si viene roto */ }

  return itemsDesdeEquipos(equipos as EquipoParaCarga[], extras);
}
