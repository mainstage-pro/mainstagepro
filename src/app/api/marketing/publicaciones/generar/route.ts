import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const DIA_MAP: Record<string, number> = {
  LUNES: 1, MARTES: 2, "MIÉRCOLES": 3, JUEVES: 4, VIERNES: 5, SÁBADO: 6, DOMINGO: 0,
};

// Todas las fechas del mes que caen en un día de semana específico
function diasDelMes(year: number, month: number, weekday: number): Date[] {
  const result: Date[] = [];
  const total = new Date(year, month, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === weekday) result.push(date);
  }
  return result;
}

// Distribuir N fechas de forma equidistante en el mes
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
    let fechas: Date[] = [];

    if (tipo.diaSemana) {
      // Soporte para múltiples días separados por coma: "LUNES,VIERNES"
      const dias = tipo.diaSemana.split(",").map(d => d.trim());

      if (tipo.semanaDelMes) {
        // Publicación en la N-ésima ocurrencia del día en el mes (ej: primer lunes)
        for (const dia of dias) {
          const weekday = DIA_MAP[dia];
          if (weekday === undefined) continue;
          const ocurrencias = diasDelMes(year, month, weekday);
          const fecha = ocurrencias[tipo.semanaDelMes - 1];
          if (fecha) fechas.push(fecha);
        }
      } else {
        // Distribuir cant entre los días disponibles
        const cantPorDia = Math.ceil(cant / dias.length);
        for (const dia of dias) {
          const weekday = DIA_MAP[dia];
          if (weekday === undefined) continue;
          const ocurrencias = diasDelMes(year, month, weekday);
          fechas = [...fechas, ...ocurrencias.slice(0, cantPorDia)];
        }
        // Ordenar y recortar al total exacto
        fechas = fechas.sort((a, b) => a.getTime() - b.getTime()).slice(0, cant);
      }
    } else {
      // Sin día definido: distribuir equitativamente en el mes
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
