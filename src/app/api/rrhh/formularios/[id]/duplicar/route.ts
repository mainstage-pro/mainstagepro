import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeVerFormularios, slugUnico } from "@/lib/formularios";

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerFormularios(session))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await context.params;
  const original = await prisma.formulario.findUnique({
    where: { id },
    include: {
      puestos: true,
      secciones: { include: { preguntas: true }, orderBy: { orden: "asc" } },
    },
  });
  if (!original) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const titulo = `${original.titulo} (copia)`;
  const slug = await slugUnico(titulo);

  const nuevo = await prisma.formulario.create({
    data: {
      titulo,
      descripcion: original.descripcion,
      imagenUrl: original.imagenUrl,
      slug,
      estado: "BORRADOR",
      aceptaRespuestas: true,
      umbralAvanza: original.umbralAvanza,
      umbralBanco: original.umbralBanco,
      mensajeConfirmacion: original.mensajeConfirmacion,
      creadoPorId: session.id,
      puestos: {
        create: original.puestos.map((p) => ({ puestoId: p.puestoId })),
      },
      secciones: {
        create: original.secciones
          .filter((s) => !s.archivada)
          .map((s) => ({
            orden: s.orden,
            titulo: s.titulo,
            descripcion: s.descripcion,
            codigoBloque: s.codigoBloque,
            bloque: s.bloque,
            mostrarSi: s.mostrarSi,
            preguntas: {
              create: s.preguntas
                .filter((p) => !p.archivada)
                .map((p) => ({
                  orden: p.orden,
                  codigo: p.codigo,
                  texto: p.texto,
                  ayuda: p.ayuda,
                  tipo: p.tipo,
                  obligatoria: p.obligatoria,
                  opciones: p.opciones,
                  mostrarSi: p.mostrarSi,
                  valoracion: p.valoracion,
                })),
            },
          })),
      },
    },
  });

  return NextResponse.json({ formulario: nuevo }, { status: 201 });
}
