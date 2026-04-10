import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const DIA_MAP: Record<string, number> = {
  LUNES: 1, MARTES: 2, "MIÉRCOLES": 3, JUEVES: 4, VIERNES: 5, SÁBADO: 6, DOMINGO: 0,
};

// Returns all dates in [year, month] (1-indexed) that match a given JS weekday (0=Sun..6=Sat)
function diasDelMes(year: number, month: number, weekday: number): Date[] {
  const result: Date[] = [];
  const totalDays = new Date(year, month, 0).getDate();
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === weekday) result.push(date);
  }
  return result;
}

// Spread N dates evenly across the month
function diasEspaciados(year: number, month: number, n: number): Date[] {
  const total = new Date(year, month, 0).getDate();
  const result: Date[] = [];
  for (let i = 0; i < n; i++) {
    const day = Math.round((i * total) / n) + 1;
    result.push(new Date(year, month - 1, Math.min(day, total)));
  }
  return result;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { mes } = body; // "2026-04"
  if (!mes) return NextResponse.json({ error: "Mes requerido" }, { status: 400 });

  const [year, month] = mes.split("-").map(Number);

  // Get active types with cantMes > 0
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
    const cant = tipo.cantMes!;
    let fechas: Date[];

    if (tipo.diaSemana && DIA_MAP[tipo.diaSemana] !== undefined) {
      const weekday = DIA_MAP[tipo.diaSemana];
      const candidatos = diasDelMes(year, month, weekday);
      fechas = candidatos.slice(0, cant);
      // If not enough matching days, fill remaining with spaced dates
      if (fechas.length < cant) {
        const extra = diasEspaciados(year, month, cant - fechas.length);
        fechas = [...fechas, ...extra].sort((a, b) => a.getTime() - b.getTime());
      }
    } else {
      fechas = diasEspaciados(year, month, cant);
    }

    for (const fecha of fechas) {
      toCreate.push({
        fecha,
        tipoId: tipo.id,
        formato: tipo.formato,
        objetivo: tipo.objetivo,
        enFacebook: tipo.enFacebook,
        enInstagram: tipo.enInstagram,
        enTiktok: tipo.enTiktok,
        enYoutube: tipo.enYoutube,
        estado: "PENDIENTE",
      });
    }
  }

  const created = await prisma.publicacion.createMany({ data: toCreate });

  return NextResponse.json({ creadas: created.count });
}
