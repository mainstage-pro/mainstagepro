import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";
import { proyectoIdPorToken } from "@/lib/orden-produccion";
import { ESTADOS_ITEM, origenFallaDePase } from "@/lib/control-carga";
import { SEVERIDADES_FALLA } from "@/lib/falla-equipo";

type Ctx = { params: Promise<{ token: string; cargaId: string; itemId: string }> };

/** Marca un renglón del pase. Un dañado con equipo identificado levanta la falla. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const ip = getClientIp(req);
  if (!rateLimit(`orden-item:${ip}`, 300, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token, cargaId, itemId } = await ctx.params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });

  const proyectoId = await proyectoIdPorToken(token);
  if (!proyectoId) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  const item = await prisma.proyectoCargaItem.findFirst({
    where: { id: itemId, cargaId, carga: { proyectoId } },
    include: { carga: { select: { id: true, tipo: true, estado: true } } },
  });
  if (!item) return NextResponse.json({ error: "Renglón no encontrado" }, { status: 404 });
  if (item.carga.estado === "CERRADA") {
    return NextResponse.json({ error: "El pase ya está cerrado" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const estado = typeof body?.estado === "string" ? body.estado : "";
  if (!ESTADOS_ITEM.includes(estado as (typeof ESTADOS_ITEM)[number])) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const verificadorId = typeof body?.verificadorId === "string" ? body.verificadorId : null;
  if (!verificadorId) return NextResponse.json({ error: "Identifícate para marcar" }, { status: 400 });

  const verificador = await prisma.proyectoCargaVerificador.findFirst({
    where: { id: verificadorId, proyectoId },
    select: { id: true, nombre: true },
  });
  if (!verificador) return NextResponse.json({ error: "Identificación no válida" }, { status: 400 });

  const nota = typeof body?.nota === "string" && body.nota.trim() ? body.nota.trim() : null;

  let cantidadVerificada: number;
  if (typeof body?.cantidadVerificada === "number" && Number.isFinite(body.cantidadVerificada)) {
    cantidadVerificada = Math.max(0, Math.min(item.cantidadEsperada, Math.round(body.cantidadVerificada)));
  } else {
    cantidadVerificada = estado === "FALTANTE" || estado === "PENDIENTE" ? 0 : item.cantidadEsperada;
  }

  // La falla anterior se retira si el renglón deja de estar dañado: fue una corrección.
  let fallaId = item.fallaId;
  if (fallaId && estado !== "DANADO") {
    await prisma.fallaEquipo.delete({ where: { id: fallaId } }).catch(() => {});
    fallaId = null;
  }

  if (estado === "DANADO" && !fallaId && item.equipoId) {
    const severidadRaw = typeof body?.severidad === "string" ? body.severidad : "";
    const severidad = SEVERIDADES_FALLA.includes(severidadRaw as (typeof SEVERIDADES_FALLA)[number])
      ? severidadRaw
      : "MODERADA";

    const falla = await prisma.fallaEquipo.create({
      data: {
        equipoId: item.equipoId,
        fecha: new Date(),
        descripcion: nota ?? `Detectado en control de carga (${item.carga.tipo.toLowerCase()}) por ${verificador.nombre}`,
        severidad,
        origen: origenFallaDePase(item.carga.tipo),
        proyectoId,
        fotoEvidencia: typeof body?.fotoUrl === "string" ? body.fotoUrl : null,
      },
      select: { id: true },
    });
    fallaId = falla.id;
  }

  const actualizado = await prisma.proyectoCargaItem.update({
    where: { id: item.id },
    data: {
      estado,
      cantidadVerificada,
      nota,
      fallaId,
      fotoUrl: typeof body?.fotoUrl === "string" ? body.fotoUrl : item.fotoUrl,
      marcadoPorId: estado === "PENDIENTE" ? null : verificadorId,
      marcadoEn: estado === "PENDIENTE" ? null : new Date(),
    },
    select: { id: true, estado: true, cantidadVerificada: true, nota: true, marcadoEn: true, fallaId: true },
  });

  return NextResponse.json({
    item: {
      ...actualizado,
      marcadoEn: actualizado.marcadoEn?.toISOString() ?? null,
      marcadoPor: estado === "PENDIENTE" ? null : verificador.nombre,
    },
    fallaCreada: !!fallaId && fallaId !== item.fallaId,
  });
}
