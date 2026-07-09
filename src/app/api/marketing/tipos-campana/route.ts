import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCampanaBriefColumns, archivarEventualesVencidos } from "@/lib/campana-brief-db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCampanaBriefColumns();
  await archivarEventualesVencidos();
  const tipos = await prisma.tipoCampana.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] });
  return NextResponse.json({ tipos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCampanaBriefColumns();
  const body = await request.json();
  const {
    nombre, objetivo, objetivoMeta, formato, recurrencia, canal,
    duracionDias, presupuestoEstimado,
    publicoEdadMin, publicoEdadMax, publicoGenero, ubicaciones,
    cta, copyReferencia, pixelEvento,
    descripcion, grupo, color, activo, orden,
    categoria, vigenciaDesde, vigenciaHasta, briefTemplate,
  } = body;
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  const tipo = await prisma.tipoCampana.create({
    data: {
      nombre: nombre.trim(),
      objetivo: objetivo ?? "INFORMATIVO",
      objetivoMeta: objetivoMeta ?? "RECONOCIMIENTO",
      formato: formato ?? "VIDEO",
      recurrencia: recurrencia ?? "MENSUAL",
      canal: canal ?? "META",
      duracionDias: duracionDias ? parseInt(duracionDias) : 14,
      presupuestoEstimado: presupuestoEstimado ? parseFloat(presupuestoEstimado) : null,
      publicoEdadMin: publicoEdadMin ? parseInt(publicoEdadMin) : 25,
      publicoEdadMax: publicoEdadMax ? parseInt(publicoEdadMax) : 55,
      publicoGenero: publicoGenero ?? "TODOS",
      ubicaciones: ubicaciones ?? "FEED_IG,REELS_IG,STORIES_IG",
      cta: cta ?? "MAS_INFORMACION",
      copyReferencia: copyReferencia || null,
      pixelEvento: pixelEvento || null,
      descripcion: descripcion || null,
      grupo: grupo || null,
      color: color ?? "#B3985B",
      categoria: categoria === "eventual" ? "eventual" : "base",
      vigenciaDesde: vigenciaDesde ? new Date(vigenciaDesde) : null,
      vigenciaHasta: vigenciaHasta ? new Date(vigenciaHasta) : null,
      briefTemplate: briefTemplate || null,
      activo: activo ?? true,
      orden: orden ?? 0,
    },
  });
  return NextResponse.json({ tipo }, { status: 201 });
}
