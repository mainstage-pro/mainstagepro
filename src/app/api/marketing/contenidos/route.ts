import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const DIA_MAP: Record<string, number> = {
  LUNES: 1, MARTES: 2, "MIÉRCOLES": 3, JUEVES: 4, VIERNES: 5, SÁBADO: 6, DOMINGO: 0,
};

function diasDelMes(year: number, month: number, weekday: number): Date[] {
  const result: Date[] = [];
  const total = new Date(year, month, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const date = new Date(Date.UTC(year, month - 1, d));
    if (date.getUTCDay() === weekday) result.push(date);
  }
  return result;
}

function diasEspaciados(year: number, month: number, n: number): Date[] {
  const total = new Date(year, month, 0).getDate();
  const result: Date[] = [];
  for (let i = 0; i < n; i++) {
    const day = Math.round((i * total) / n) + 1;
    result.push(new Date(Date.UTC(year, month - 1, Math.min(day, total))));
  }
  return result;
}

/** Generate publication slots for a single TipoContenido for a given month */
async function generarParaTipo(
  tipo: { id: string; cantMes: number | null; diaSemana: string | null; semanaDelMes: number | null; formato: string | null; objetivo: string | null; enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean },
  year: number,
  month: number
) {
  const cant = tipo.cantMes;
  if (!cant || cant <= 0) return 0;

  let fechas: Date[] = [];

  if (tipo.diaSemana) {
    const dias = tipo.diaSemana.split(",").map(d => d.trim());
    if (tipo.semanaDelMes) {
      for (const dia of dias) {
        const weekday = DIA_MAP[dia];
        if (weekday === undefined) continue;
        const ocurrencias = diasDelMes(year, month, weekday);
        const fecha = ocurrencias[tipo.semanaDelMes - 1];
        if (fecha) fechas.push(fecha);
      }
    } else {
      const cantPorDia = Math.ceil(cant / dias.length);
      for (const dia of dias) {
        const weekday = DIA_MAP[dia];
        if (weekday === undefined) continue;
        const ocurrencias = diasDelMes(year, month, weekday);
        fechas = [...fechas, ...ocurrencias.slice(0, cantPorDia)];
      }
      fechas = fechas.sort((a, b) => a.getTime() - b.getTime()).slice(0, cant);
    }
  } else {
    fechas = diasEspaciados(year, month, cant);
  }

  if (fechas.length === 0) return 0;

  const created = await prisma.publicacion.createMany({
    data: fechas.map(fecha => ({
      fecha,
      tipoId: tipo.id,
      formato: tipo.formato,
      objetivo: tipo.objetivo,
      enFacebook: tipo.enFacebook,
      enInstagram: tipo.enInstagram,
      enTiktok: tipo.enTiktok,
      enYoutube: tipo.enYoutube,
      estado: "PENDIENTE",
    })),
  });

  return created.count;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipos = await prisma.tipoContenido.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] });
  return NextResponse.json({ tipos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, formato, objetivo, diaSemana, semanaDelMes, recurrencia, cantMes, descripcion, activo, orden,
          enFacebook, enInstagram, enTiktok, enYoutube, enFeedIG } = body;
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const tipo = await prisma.tipoContenido.create({
    data: {
      nombre, formato: formato ?? "POST", objetivo, diaSemana,
      semanaDelMes: semanaDelMes ? parseInt(semanaDelMes) : null,
      recurrencia, cantMes, descripcion,
      activo: activo ?? true, orden: orden ?? 0,
      enFacebook: enFacebook ?? false,
      enInstagram: enInstagram ?? false,
      enTiktok: enTiktok ?? false,
      enYoutube: enYoutube ?? false,
      enFeedIG: enFeedIG ?? false,
    },
  });

  // Auto-generate for current month (and next month if we're past the 20th)
  let generadas = 0;
  if (tipo.activo && tipo.cantMes && tipo.cantMes > 0) {
    const now = new Date();
    generadas += await generarParaTipo(tipo, now.getFullYear(), now.getMonth() + 1);
    // If past day 20, also seed next month
    if (now.getDate() >= 20) {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      generadas += await generarParaTipo(tipo, next.getFullYear(), next.getMonth() + 1);
    }
  }

  return NextResponse.json({ tipo, generadas }, { status: 201 });
}
