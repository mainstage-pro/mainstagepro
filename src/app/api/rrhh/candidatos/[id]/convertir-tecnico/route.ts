// Convierte un candidato aprobado/contratado (crew técnico) en Tecnico del
// Directorio. Fase 2 simplificada: el seed de perfiles técnicos y su mapeo a
// rolTabulador se sembrarán en Fase 3, así que aquí el UI envía el rolTecnicoId
// que el usuario eligió en el Combobox (puede preseleccionarse por coincidencia
// de nombre con disciplina+nivel, pero la decisión final es humana).
//
// Si ya existe un Técnico con el mismo teléfono (normalizado a dígitos), por
// defecto lo VINCULA en vez de crear otro. Para forzar crear nuevo, el cliente
// manda forzarNuevo=true.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const { postulacionId, rolTecnicoId, zona, nivel, forzarNuevo } = body as {
    postulacionId?: string;
    rolTecnicoId?: string;
    zona?: string;
    nivel?: string;
    forzarNuevo?: boolean;
  };

  if (!postulacionId) return NextResponse.json({ error: "Falta postulacionId" }, { status: 400 });

  const candidato = await prisma.candidato.findUnique({ where: { id } });
  if (!candidato) return NextResponse.json({ error: "Candidato no encontrado" }, { status: 404 });

  const post = await prisma.postulacion.findUnique({ where: { id: postulacionId } });
  if (!post) return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
  if (!["APROBADO", "CONTRATADO"].includes(post.etapa)) {
    return NextResponse.json({ error: "Solo candidatos aprobados o contratados" }, { status: 400 });
  }

  // Dedup por teléfono (normalizado a dígitos, al menos 7 para evitar falsos positivos)
  const telDig = (candidato.telefono ?? "").replace(/\D/g, "");
  let tecnico = null as Awaited<ReturnType<typeof prisma.tecnico.findFirst>> | null;
  if (!forzarNuevo && telDig.length >= 7) {
    tecnico = await prisma.tecnico.findFirst({ where: { celular: { contains: telDig } } });
  }

  if (tecnico) {
    // Solo vincular
    await prisma.postulacion.update({ where: { id: postulacionId }, data: { tecnicoId: tecnico.id, updatedAt: new Date() } });
    // Agregar el rol si no lo tiene
    if (rolTecnicoId) {
      await prisma.tecnicoRol.upsert({
        where: { tecnicoId_rolTecnicoId: { tecnicoId: tecnico.id, rolTecnicoId } },
        create: { tecnicoId: tecnico.id, rolTecnicoId },
        update: {},
      });
    }
    await logActividad(session.id, "CANDIDATO_A_TECNICO", "Tecnico", tecnico.id,
      `Candidato ${candidato.nombre} vinculado a técnico existente`,
      { candidatoId: id, postulacionId });
    return NextResponse.json({ tecnico, vinculado: true });
  }

  // Crear nuevo
  tecnico = await prisma.tecnico.create({
    data: {
      nombre: candidato.nombre,
      celular: candidato.telefono ?? null,
      zonaHabitual: zona ?? candidato.ciudad ?? null,
      nivel: nivel ?? "A",
      rolId: rolTecnicoId ?? null,
      ...(rolTecnicoId ? { roles: { create: [{ rolTecnicoId }] } } : {}),
    },
  });
  await prisma.postulacion.update({ where: { id: postulacionId }, data: { tecnicoId: tecnico.id, updatedAt: new Date() } });

  await logActividad(session.id, "CANDIDATO_A_TECNICO", "Tecnico", tecnico.id,
    `Candidato ${candidato.nombre} convertido a técnico`,
    { candidatoId: id, postulacionId });

  return NextResponse.json({ tecnico, creado: true });
}
