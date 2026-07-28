import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureReporteMensualAreaTabla } from "@/lib/migraciones-lazy";
import {
  AREAS_EVALUABLES,
  emptyReporteMensualArea,
  reporteListoParaEnviar,
  type KpiRow,
  type ReporteMensualAreaData,
} from "@/lib/reporte-area-mensual";

function esDireccion(session: { role: string; area?: string | null }) {
  return session.role === "ADMIN" || session.area === "DIRECCION";
}

// Puede escribir el reporte de un área: dirección/admin, o el responsable del área.
function puedeEditar(session: { role: string; area?: string | null }, area: string) {
  return esDireccion(session) || session.area === area;
}

type Row = {
  id: string;
  area: string;
  mes: string;
  autorId: string | null;
  autorNombre: string | null;
  resultados: string;
  kpis: string;
  analisis: string;
  bloqueos: string;
  compromisos: string;
  enviado: boolean;
  enviadoEn: Date | null;
  updatedAt: Date;
};

function parseKpis(raw: string): KpiRow[] {
  try {
    const v = JSON.parse(raw || "[]");
    if (!Array.isArray(v)) return [];
    return v.map((k) => ({
      nombre: String(k?.nombre ?? ""),
      valor: String(k?.valor ?? ""),
      meta: String(k?.meta ?? ""),
      unidad: String(k?.unidad ?? ""),
    }));
  } catch {
    return [];
  }
}

function rowToData(r: Row): ReporteMensualAreaData {
  return {
    id: r.id,
    area: r.area,
    mes: r.mes,
    autorId: r.autorId,
    autorNombre: r.autorNombre,
    resultados: r.resultados ?? "",
    kpis: parseKpis(r.kpis),
    analisis: r.analisis ?? "",
    bloqueos: r.bloqueos ?? "",
    compromisos: r.compromisos ?? "",
    enviado: r.enviado,
    enviadoEn: r.enviadoEn ? r.enviadoEn.toISOString() : null,
    actualizadoEn: r.updatedAt ? r.updatedAt.toISOString() : null,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureReporteMensualAreaTabla();

  const mes = req.nextUrl.searchParams.get("mes") || "";
  const area = req.nextUrl.searchParams.get("area") || "";

  // Un solo reporte (área + mes).
  if (area && mes) {
    const row = (await prisma.reporteMensualArea.findUnique({
      where: { area_mes: { area, mes } },
    })) as unknown as Row | null;
    return NextResponse.json({
      reporte: row ? rowToData(row) : emptyReporteMensualArea(area, mes),
      puedeEditar: puedeEditar(session, area),
    });
  }

  // Listado por mes (una entrada por cada área evaluable, vacía si no existe).
  if (mes) {
    const rows = (await prisma.reporteMensualArea.findMany({ where: { mes } })) as unknown as Row[];
    const porArea = new Map(rows.map((r) => [r.area, rowToData(r)]));
    const reportes = AREAS_EVALUABLES.map((a) => porArea.get(a.id) ?? emptyReporteMensualArea(a.id, mes));
    return NextResponse.json({ mes, reportes });
  }

  return NextResponse.json({ error: "Falta mes o área" }, { status: 400 });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureReporteMensualAreaTabla();

  const body = await request.json();
  const area = String(body.area || "");
  const mes = String(body.mes || "");
  if (!AREAS_EVALUABLES.some((a) => a.id === area)) {
    return NextResponse.json({ error: "Área inválida" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: "Mes inválido" }, { status: 400 });
  }
  if (!puedeEditar(session, area)) {
    return NextResponse.json({ error: "No puedes editar el reporte de esta área" }, { status: 403 });
  }

  const kpis: KpiRow[] = Array.isArray(body.kpis)
    ? body.kpis.map((k: Partial<KpiRow>) => ({
        nombre: String(k?.nombre ?? ""),
        valor: String(k?.valor ?? ""),
        meta: String(k?.meta ?? ""),
        unidad: String(k?.unidad ?? ""),
      }))
    : [];

  const data: ReporteMensualAreaData = {
    ...emptyReporteMensualArea(area, mes),
    resultados: typeof body.resultados === "string" ? body.resultados : "",
    analisis: typeof body.analisis === "string" ? body.analisis : "",
    bloqueos: typeof body.bloqueos === "string" ? body.bloqueos : "",
    compromisos: typeof body.compromisos === "string" ? body.compromisos : "",
    kpis,
  };

  // Entregar solo si pasa la validación (fuente de verdad en servidor).
  let enviado = false;
  let enviadoEn: Date | null = null;
  const existente = (await prisma.reporteMensualArea.findUnique({
    where: { area_mes: { area, mes } },
    select: { enviado: true, enviadoEn: true, autorId: true, autorNombre: true },
  })) as { enviado: boolean; enviadoEn: Date | null; autorId: string | null; autorNombre: string | null } | null;

  if (body.enviar === true) {
    const { ok, faltantes } = reporteListoParaEnviar(data);
    if (!ok) {
      return NextResponse.json({ error: "Reporte incompleto", faltantes }, { status: 400 });
    }
    enviado = true;
    enviadoEn = existente?.enviadoEn ?? new Date();
  } else if (body.enviar === false) {
    enviado = false;
    enviadoEn = null;
  } else {
    enviado = existente?.enviado ?? false;
    enviadoEn = existente?.enviadoEn ?? null;
  }

  const payload = {
    area,
    mes,
    autorId: existente?.autorId ?? session.id,
    autorNombre: existente?.autorNombre ?? session.name,
    resultados: data.resultados,
    kpis: JSON.stringify(kpis),
    analisis: data.analisis,
    bloqueos: data.bloqueos,
    compromisos: data.compromisos,
    enviado,
    enviadoEn,
  };

  const guardado = (await prisma.reporteMensualArea.upsert({
    where: { area_mes: { area, mes } },
    create: payload,
    update: payload,
  })) as unknown as Row;

  return NextResponse.json({ reporte: rowToData(guardado) });
}
