import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calcularKPI } from "@/lib/kpi-calculators";
import { ensureEstrategiaSchema } from "../route";

async function guard() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  await ensureEstrategiaSchema();
  return session;
}

// Edita la meta vigente y el set completo de indicadores (llega como arreglo).
export async function PATCH(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  const vigente = await prisma.metaGlobal.findFirst({ where: { vigente: true } });
  if (!vigente) return NextResponse.json({ error: "No hay meta vigente" }, { status: 404 });

  await prisma.metaGlobal.update({
    where: { id: vigente.id },
    data: {
      ...(b.periodo !== undefined ? { periodo: String(b.periodo).trim() } : {}),
      ...(b.titulo !== undefined ? { titulo: String(b.titulo).trim() } : {}),
      ...(b.descripcion !== undefined ? { descripcion: b.descripcion } : {}),
      ...(b.fechaInicio ? { fechaInicio: new Date(b.fechaInicio) } : {}),
      ...(b.fechaFin ? { fechaFin: new Date(b.fechaFin) } : {}),
    },
  });

  if (Array.isArray(b.indicadores)) {
    const conservar: string[] = [];
    for (const [orden, i] of b.indicadores.entries()) {
      const data = {
        nombre: String(i.nombre ?? "").trim(),
        unidad: i.unidad || "%",
        lineaBase: i.lineaBase === "" || i.lineaBase == null ? null : Number(i.lineaBase),
        valorMeta: i.valorMeta === "" || i.valorMeta == null ? null : Number(i.valorMeta),
        valorActual: i.valorActual === "" || i.valorActual == null ? null : Number(i.valorActual),
        kpiSlug: i.kpiSlug || null,
        orden,
      };
      if (!data.nombre) continue;
      if (i.id) {
        await prisma.metaGlobalIndicador.update({ where: { id: i.id }, data });
        conservar.push(i.id);
      } else {
        const nuevo = await prisma.metaGlobalIndicador.create({
          data: { ...data, metaGlobalId: vigente.id },
        });
        conservar.push(nuevo.id);
      }
    }
    await prisma.metaGlobalIndicador.deleteMany({
      where: { metaGlobalId: vigente.id, id: { notIn: conservar } },
    });
  }

  const meta = await prisma.metaGlobal.findUnique({
    where: { id: vigente.id },
    include: { indicadores: { orderBy: { orden: "asc" } } },
  });
  return NextResponse.json({ meta });
}

// Abre el periodo siguiente y archiva el anterior. Los objetivos NO se arrastran:
// cada periodo se piensa de nuevo contra la meta nueva.
export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  const periodo = (b.periodo ?? "").trim();
  const titulo = (b.titulo ?? "").trim();
  if (!periodo || !titulo) {
    return NextResponse.json({ error: "Periodo y título requeridos" }, { status: 400 });
  }
  await prisma.metaGlobal.updateMany({ where: { vigente: true }, data: { vigente: false } });
  const meta = await prisma.metaGlobal.create({
    data: {
      periodo,
      titulo,
      descripcion: b.descripcion ?? null,
      fechaInicio: new Date(b.fechaInicio ?? `${periodo}-01-01`),
      fechaFin: new Date(b.fechaFin ?? `${periodo}-12-31`),
      vigente: true,
    },
    include: { indicadores: true },
  });
  return NextResponse.json({ meta }, { status: 201 });
}

// Relee de las finanzas los indicadores con KPI automático (y los objetivos que
// también tengan slug), para no capturar a mano lo que el sistema ya sabe.
export async function PUT() {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const meta = await prisma.metaGlobal.findFirst({
    where: { vigente: true },
    include: { indicadores: true },
  });
  if (!meta) return NextResponse.json({ error: "No hay meta vigente" }, { status: 404 });

  const anio = meta.fechaInicio.getFullYear();
  let actualizados = 0;

  for (const i of meta.indicadores) {
    if (!i.kpiSlug) continue;
    const valor = await calcularKPI(i.kpiSlug, { anio });
    if (valor === null) continue;
    await prisma.metaGlobalIndicador.update({ where: { id: i.id }, data: { valorActual: valor } });
    actualizados++;
  }

  const objetivos = await prisma.objetivoArea.findMany({
    where: { activo: true, kpiSlug: { not: null } },
    select: { id: true, kpiSlug: true },
  });
  for (const o of objetivos) {
    const valor = await calcularKPI(o.kpiSlug!, { anio });
    if (valor === null) continue;
    await prisma.objetivoArea.update({ where: { id: o.id }, data: { valorActual: valor } });
    actualizados++;
  }

  return NextResponse.json({ ok: true, actualizados, anio });
}
