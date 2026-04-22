import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const DIA_MAP: Record<string, number> = {
  LUNES: 1, MARTES: 2, "MIÉRCOLES": 3, JUEVES: 4, VIERNES: 5, SÁBADO: 6, DOMINGO: 0,
};

function diasDelMes(year: number, month: number, weekday: number): Date[] {
  const total = new Date(year, month, 0).getDate();
  const result: Date[] = [];
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === weekday) result.push(date);
  }
  return result;
}

/** Pick n items evenly distributed from arr. Returns full arr if n >= arr.length. */
function pickEvenly(arr: Date[], n: number): Date[] {
  if (n <= 0) return [];
  if (n >= arr.length) return [...arr];
  if (n === 1) return [arr[Math.floor(arr.length / 2)]];
  const result: Date[] = [];
  for (let i = 0; i < n; i++) {
    result.push(arr[Math.round(i * (arr.length - 1) / (n - 1))]);
  }
  return result;
}

/**
 * Generate exactly cantMes dates for the given month.
 * - diaSemana + semanaDelMes: specific occurrence (e.g. first Monday) — exact behavior.
 * - diaSemana only: prefers those days; fills remaining slots evenly when not enough.
 * - No diaSemana: evenly distributed across all days of the month.
 */
function generarFechas(
  year: number,
  month: number,
  tipo: { cantMes: number; diaSemana: string | null; semanaDelMes: number | null }
): Date[] {
  const cant = tipo.cantMes;
  const total = new Date(year, month, 0).getDate();
  const allDays = Array.from({ length: total }, (_, i) => new Date(year, month - 1, i + 1));

  if (tipo.diaSemana && tipo.semanaDelMes) {
    const dias = tipo.diaSemana.split(",").map(d => d.trim());
    const fechas: Date[] = [];
    for (const dia of dias) {
      const wd = DIA_MAP[dia];
      if (wd === undefined) continue;
      const occ = diasDelMes(year, month, wd);
      const fecha = occ[tipo.semanaDelMes - 1];
      if (fecha) fechas.push(fecha);
    }
    return fechas;
  }

  if (tipo.diaSemana) {
    const dias = tipo.diaSemana.split(",").map(d => d.trim());
    const preferidos: Date[] = [];
    for (const dia of dias) {
      const wd = DIA_MAP[dia];
      if (wd === undefined) continue;
      preferidos.push(...diasDelMes(year, month, wd));
    }
    preferidos.sort((a, b) => a.getTime() - b.getTime());

    if (preferidos.length >= cant) {
      return pickEvenly(preferidos, cant);
    }

    // Not enough preferred days — fill remaining with evenly-spaced non-preferred days
    const prefDates = new Set(preferidos.map(d => d.getDate()));
    const resto = allDays.filter(d => !prefDates.has(d.getDate()));
    const fill = pickEvenly(resto, cant - preferidos.length);
    return [...preferidos, ...fill].sort((a, b) => a.getTime() - b.getTime());
  }

  return pickEvenly(allDays, cant);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { mes } = body;
  if (!mes) return NextResponse.json({ error: "Mes requerido" }, { status: 400 });

  const [year, month] = mes.split("-").map(Number);

  const tipos = await prisma.tipoContenido.findMany({
    where: { activo: true, cantMes: { gt: 0 } },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  const toCreate: {
    fecha: Date; tipoId: string; formato: string | null; objetivo: string | null;
    enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean;
    estado: string;
  }[] = [];

  for (const tipo of tipos) {
    const fechas = generarFechas(year, month, {
      cantMes: tipo.cantMes!,
      diaSemana: tipo.diaSemana,
      semanaDelMes: tipo.semanaDelMes,
    });
    for (const fecha of fechas) {
      toCreate.push({
        fecha, tipoId: tipo.id, formato: tipo.formato, objetivo: tipo.objetivo,
        enFacebook: tipo.enFacebook, enInstagram: tipo.enInstagram,
        enTiktok: tipo.enTiktok, enYoutube: tipo.enYoutube,
        estado: "PENDIENTE",
      });
    }
  }

  const created = await prisma.publicacion.createMany({ data: toCreate });
  return NextResponse.json({ creadas: created.count });
}
