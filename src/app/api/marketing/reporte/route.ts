import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  // Default: last 6 months up to today
  const meses = parseInt(searchParams.get("meses") ?? "6");

  const ahora = new Date();
  const desde = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1), 1);

  const publicaciones = await prisma.publicacion.findMany({
    where: { fecha: { gte: desde } },
    include: { tipo: { select: { id: true, nombre: true, formato: true } } },
    orderBy: { fecha: "asc" },
  });

  // ── Por mes ──────────────────────────────────────────────────────────────
  const porMes: Record<string, { mes: string; total: number; publicadas: number; pendientes: number; listas: number; enProceso: number }> = {};
  for (const p of publicaciones) {
    const key = p.fecha.toISOString().slice(0, 7);
    if (!porMes[key]) porMes[key] = { mes: key, total: 0, publicadas: 0, pendientes: 0, listas: 0, enProceso: 0 };
    porMes[key].total++;
    if (p.estado === "PUBLICADO") porMes[key].publicadas++;
    else if (p.estado === "PENDIENTE") porMes[key].pendientes++;
    else if (p.estado === "LISTO") porMes[key].listas++;
    else if (p.estado === "EN_PROCESO") porMes[key].enProceso++;
  }

  // ── Por formato ──────────────────────────────────────────────────────────
  const porFormato: Record<string, { formato: string; total: number; publicadas: number }> = {};
  for (const p of publicaciones) {
    const fmt = p.formato ?? p.tipo?.formato ?? "OTRO";
    if (!porFormato[fmt]) porFormato[fmt] = { formato: fmt, total: 0, publicadas: 0 };
    porFormato[fmt].total++;
    if (p.estado === "PUBLICADO") porFormato[fmt].publicadas++;
  }

  // ── Por tipo de contenido ────────────────────────────────────────────────
  const porTipo: Record<string, { tipoId: string; nombre: string; total: number; publicadas: number }> = {};
  for (const p of publicaciones) {
    const tid = p.tipoId ?? "_sin_tipo";
    const nombre = p.tipo?.nombre ?? "Sin tipo";
    if (!porTipo[tid]) porTipo[tid] = { tipoId: tid, nombre, total: 0, publicadas: 0 };
    porTipo[tid].total++;
    if (p.estado === "PUBLICADO") porTipo[tid].publicadas++;
  }

  // ── Por plataforma ───────────────────────────────────────────────────────
  const plataformas = {
    facebook: publicaciones.filter(p => p.enFacebook).length,
    instagram: publicaciones.filter(p => p.enInstagram).length,
    tiktok: publicaciones.filter(p => p.enTiktok).length,
    youtube: publicaciones.filter(p => p.enYoutube).length,
  };

  return NextResponse.json({
    total: publicaciones.length,
    publicadas: publicaciones.filter(p => p.estado === "PUBLICADO").length,
    pendientes: publicaciones.filter(p => p.estado === "PENDIENTE").length,
    enProceso: publicaciones.filter(p => p.estado === "EN_PROCESO").length,
    listas: publicaciones.filter(p => p.estado === "LISTO").length,
    porMes: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes)),
    porFormato: Object.values(porFormato).sort((a, b) => b.total - a.total),
    porTipo: Object.values(porTipo).sort((a, b) => b.total - a.total),
    plataformas,
  });
}
