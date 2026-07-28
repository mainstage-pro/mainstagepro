import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";

// Migración one-off: mueve las tareas de las secciones "Tareas en espera" a la
// bandeja de entrada (enBandeja=true, agrupadas por área según el proyecto) y
// suelta las de "Tareas de la semana" (seccionId=null) para que queden directas
// bajo "1. Tareas". GET = dry-run (no muta), POST = aplica.

function isAuthorized(req: NextRequest, adminSession: boolean): boolean {
  if (adminSession) return true;
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

// Mapea el nombre de un proyecto/área de Operaciones a la clave de área (para
// que la tarea caiga en la sección correcta de la bandeja). null = no mapea.
function areaDeProyecto(nombre: string | null | undefined): string | null {
  if (!nombre) return null;
  const n = norm(nombre);
  if (n.includes("DIRECCION")) return "DIRECCION";
  if (n.includes("ADMINISTRA")) return "ADMINISTRACION";
  if (n.includes("MARKETING")) return "MARKETING";
  if (n.includes("COMERCIAL") || n.includes("VENTAS")) return "VENTAS";
  if (n.includes("PRODUCCION")) return "PRODUCCION";
  return null;
}

const NO_TERMINALES = { estado: { notIn: ["COMPLETADA", "CANCELADA"] } };

async function seccionesEspera() {
  return prisma.tareaSeccion.findMany({
    where: { tipoModulo: "TAREA", nombre: { contains: "espera", mode: "insensitive" } },
    include: { proyecto: { select: { id: true, nombre: true } } },
  });
}
async function seccionesSemana() {
  return prisma.tareaSeccion.findMany({
    where: { tipoModulo: "TAREA", nombre: { contains: "semana", mode: "insensitive" } },
    include: { proyecto: { select: { id: true, nombre: true } } },
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const admin = session?.role === "ADMIN";
  if (!isAuthorized(req, admin)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const espera = await seccionesEspera();
  const semana = await seccionesSemana();

  const detalleEspera = [];
  for (const s of espera) {
    const count = await prisma.tarea.count({ where: { seccionId: s.id, parentId: null, ...NO_TERMINALES } });
    detalleEspera.push({
      seccion: s.nombre,
      proyecto: s.proyecto?.nombre ?? null,
      areaDestino: areaDeProyecto(s.proyecto?.nombre) ?? "(sin mapear · conserva área actual)",
      tareas: count,
    });
  }

  const detalleSemana = [];
  for (const s of semana) {
    const count = await prisma.tarea.count({ where: { seccionId: s.id, parentId: null } });
    detalleSemana.push({ seccion: s.nombre, proyecto: s.proyecto?.nombre ?? null, tareas: count });
  }

  return NextResponse.json({
    dryRun: true,
    enEspera: { secciones: detalleEspera, totalTareas: detalleEspera.reduce((a, d) => a + d.tareas, 0) },
    deLaSemana: { secciones: detalleSemana, totalTareas: detalleSemana.reduce((a, d) => a + d.tareas, 0) },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const admin = session?.role === "ADMIN";
  if (!isAuthorized(req, admin)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const espera = await seccionesEspera();
  const semana = await seccionesSemana();

  let movidasBandeja = 0;
  let areaReasignada = 0;
  for (const s of espera) {
    const area = areaDeProyecto(s.proyecto?.nombre);
    const base = { seccionId: s.id, parentId: null, ...NO_TERMINALES };
    if (area) {
      const r = await prisma.tarea.updateMany({ where: base, data: { enBandeja: true, seccionId: null, area } });
      movidasBandeja += r.count;
      areaReasignada += r.count;
    } else {
      const r = await prisma.tarea.updateMany({ where: base, data: { enBandeja: true, seccionId: null } });
      movidasBandeja += r.count;
    }
  }

  let soltadasSemana = 0;
  for (const s of semana) {
    const r = await prisma.tarea.updateMany({ where: { seccionId: s.id, parentId: null }, data: { seccionId: null } });
    soltadasSemana += r.count;
  }

  return NextResponse.json({
    ok: true,
    movidasABandeja: movidasBandeja,
    conAreaReasignada: areaReasignada,
    soltadasDeLaSemana: soltadasSemana,
    seccionesEspera: espera.length,
    seccionesSemana: semana.length,
  });
}
