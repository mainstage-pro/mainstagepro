import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generarParaTipo } from "@/lib/contenido-generador";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipos = await prisma.tipoContenido.findMany({
    include: { variaciones: { orderBy: [{ semana: "asc" }, { posicion: "asc" }] } },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
  return NextResponse.json({ tipos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, formato, objetivo, diaSemana, semanaDelMes, recurrencia, cantMes, descripcion, activo, orden,
          enFacebook, enInstagram, enTiktok, enYoutube, enFeedIG, cicloSemanas, cicloInicio } = body;
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
      cicloSemanas: cicloSemanas ? parseInt(cicloSemanas) : null,
      cicloInicio: cicloInicio ? new Date(cicloInicio) : null,
    },
    include: { variaciones: true },
  });

  // Siembra el mes actual (y el siguiente si ya vamos pasando el 20)
  let generadas = 0;
  if (tipo.activo && tipo.cantMes && tipo.cantMes > 0) {
    const now = new Date();
    generadas += await generarParaTipo(tipo, now.getFullYear(), now.getMonth() + 1);
    if (now.getDate() >= 20) {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      generadas += await generarParaTipo(tipo, next.getFullYear(), next.getMonth() + 1);
    }
  }

  return NextResponse.json({ tipo, generadas }, { status: 201 });
}
