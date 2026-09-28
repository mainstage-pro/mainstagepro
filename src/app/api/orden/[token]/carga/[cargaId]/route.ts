import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";
import { proyectoIdPorToken } from "@/lib/orden-produccion";

type Ctx = { params: Promise<{ token: string; cargaId: string }> };

async function resolver(req: NextRequest, ctx: Ctx, limite: string) {
  const ip = getClientIp(req);
  if (!rateLimit(`${limite}:${ip}`, 200, 60_000)) {
    return { error: NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 }) };
  }
  const { token, cargaId } = await ctx.params;
  if (isTokenExpired(token)) return { error: NextResponse.json({ error: "Enlace expirado" }, { status: 410 }) };

  const proyectoId = await proyectoIdPorToken(token);
  if (!proyectoId) return { error: NextResponse.json({ error: "Orden no encontrada" }, { status: 404 }) };

  const carga = await prisma.proyectoCarga.findFirst({
    where: { id: cargaId, proyectoId },
    select: { id: true, tipo: true, estado: true },
  });
  if (!carga) return { error: NextResponse.json({ error: "Pase no encontrado" }, { status: 404 }) };

  return { proyectoId, carga };
}

/** Renglones del pase, para pintar la lista. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const r = await resolver(req, ctx, "orden-carga-get");
  if ("error" in r) return r.error;

  const carga = await prisma.proyectoCarga.findUnique({
    where: { id: r.carga.id },
    include: {
      items: {
        orderBy: { orden: "asc" },
        include: { marcadoPor: { select: { nombre: true } } },
      },
      abiertoPor: { select: { nombre: true } },
      cerradaPor: { select: { nombre: true } },
    },
  });
  if (!carga) return NextResponse.json({ error: "Pase no encontrado" }, { status: 404 });

  return NextResponse.json({
    carga: {
      id: carga.id,
      tipo: carga.tipo,
      etiqueta: carga.etiqueta,
      estado: carga.estado,
      cerradaEn: carga.cerradaEn?.toISOString() ?? null,
      notaCierre: carga.notaCierre,
      abiertoPor: carga.abiertoPor?.nombre ?? null,
      cerradaPor: carga.cerradaPor?.nombre ?? null,
      items: carga.items.map((i) => ({
        id: i.id,
        descripcion: i.descripcion,
        categoria: i.categoria,
        esAccesorio: i.esAccesorio,
        equipoId: i.equipoId,
        cantidadEsperada: i.cantidadEsperada,
        cantidadVerificada: i.cantidadVerificada,
        estado: i.estado,
        nota: i.nota,
        marcadoPor: i.marcadoPor?.nombre ?? null,
        marcadoEn: i.marcadoEn?.toISOString() ?? null,
        orden: i.orden,
      })),
    },
  });
}

/** Cierra el pase. Los renglones sin revisar se resuelven como faltantes. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const r = await resolver(req, ctx, "orden-carga-cerrar");
  if ("error" in r) return r.error;
  if (r.carga.estado === "CERRADA") return NextResponse.json({ error: "El pase ya está cerrado" }, { status: 409 });

  const body = await req.json().catch(() => null);
  const verificadorId = typeof body?.verificadorId === "string" ? body.verificadorId : null;
  if (!verificadorId) return NextResponse.json({ error: "Identifícate para cerrar el pase" }, { status: 400 });

  const verificador = await prisma.proyectoCargaVerificador.findFirst({
    where: { id: verificadorId, proyectoId: r.proyectoId },
    select: { id: true },
  });
  if (!verificador) return NextResponse.json({ error: "Identificación no válida" }, { status: 400 });

  const pendientes = await prisma.proyectoCargaItem.count({
    where: { cargaId: r.carga.id, estado: "PENDIENTE" },
  });
  const notaCierre = typeof body?.notaCierre === "string" ? body.notaCierre.trim() : "";
  if (pendientes > 0 && !notaCierre) {
    return NextResponse.json(
      { error: `Quedan ${pendientes} renglón(es) sin revisar: explica por qué antes de cerrar`, pendientes },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.proyectoCargaItem.updateMany({
      where: { cargaId: r.carga.id, estado: "PENDIENTE" },
      data: { estado: "FALTANTE", marcadoPorId: verificadorId, marcadoEn: new Date() },
    }),
    prisma.proyectoCarga.update({
      where: { id: r.carga.id },
      data: {
        estado: "CERRADA",
        cerradaEn: new Date(),
        cerradaPorId: verificadorId,
        notaCierre: notaCierre || null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, convertidosAFaltante: pendientes });
}
