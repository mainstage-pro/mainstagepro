import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeVerFormularios, slugUnico } from "@/lib/formularios";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerFormularios(session))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await context.params;
  const formulario = await prisma.formulario.findUnique({
    where: { id },
    include: {
      puestos: { include: { puesto: { select: { id: true, nombre: true, area: true } } } },
      secciones: {
        orderBy: { orden: "asc" },
        include: { preguntas: { orderBy: { orden: "asc" } } },
      },
      _count: { select: { respuestas: true } },
    },
  });
  if (!formulario) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ formulario });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerFormularios(session))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const existente = await prisma.formulario.findUnique({ where: { id } });
  if (!existente) return NextResponse.json({ error: "No existe" }, { status: 404 });

  // Encabezado / configuración.
  const data: Record<string, unknown> = {};
  if (typeof body.titulo === "string") data.titulo = body.titulo;
  if ("descripcion" in body) data.descripcion = body.descripcion ?? null;
  if ("imagenUrl" in body) data.imagenUrl = body.imagenUrl ?? null;
  if (typeof body.estado === "string") data.estado = body.estado;
  if (typeof body.aceptaRespuestas === "boolean") data.aceptaRespuestas = body.aceptaRespuestas;
  if (typeof body.umbralAvanza === "number") data.umbralAvanza = Math.round(body.umbralAvanza);
  if (typeof body.umbralBanco === "number") data.umbralBanco = Math.round(body.umbralBanco);
  if ("mensajeConfirmacion" in body) data.mensajeConfirmacion = body.mensajeConfirmacion ?? null;
  if (typeof body.slug === "string" && body.slug.trim() && body.slug !== existente.slug) {
    data.slug = await slugUnico(body.slug, id);
  }

  // Puestos vinculados (reemplazo total si viene).
  if (Array.isArray(body.puestoIds)) {
    await prisma.formularioPuesto.deleteMany({ where: { formularioId: id } });
    if (body.puestoIds.length > 0) {
      await prisma.formularioPuesto.createMany({
        data: body.puestoIds
          .filter((pid: unknown): pid is string => typeof pid === "string")
          .map((pid: string) => ({ formularioId: id, puestoId: pid })),
        skipDuplicates: true,
      });
    }
  }

  // Estructura (secciones + preguntas) — reemplazo total si viene.
  // Todo dentro de una transacción para que un error no deje estructura rota.
  if (Array.isArray(body.secciones)) {
    await prisma.$transaction(async (tx) => {
      // Si hay respuestas, archivamos en vez de borrar. El snapshot ya protege
      // la lectura histórica, pero conservar las filas facilita trazar.
      const tieneRespuestas = await tx.formularioRespuesta.count({ where: { formularioId: id } });
      if (tieneRespuestas > 0) {
        await tx.formularioPregunta.updateMany({
          where: { seccion: { formularioId: id } },
          data: { archivada: true },
        });
        await tx.formularioSeccion.updateMany({
          where: { formularioId: id },
          data: { archivada: true },
        });
      } else {
        await tx.formularioSeccion.deleteMany({ where: { formularioId: id } });
      }

      for (let i = 0; i < body.secciones.length; i++) {
        const s = body.secciones[i];
        const sec = await tx.formularioSeccion.create({
          data: {
            formularioId: id,
            orden: typeof s.orden === "number" ? s.orden : i,
            titulo: s.titulo ?? "Sección",
            descripcion: s.descripcion ?? null,
            codigoBloque: s.codigoBloque ?? null,
            bloque: s.bloque ?? null,
            mostrarSi: s.mostrarSi ? JSON.stringify(s.mostrarSi) : null,
          },
        });
        const preguntas = Array.isArray(s.preguntas) ? s.preguntas : [];
        for (let j = 0; j < preguntas.length; j++) {
          const p = preguntas[j];
          await tx.formularioPregunta.create({
            data: {
              seccionId: sec.id,
              orden: typeof p.orden === "number" ? p.orden : j,
              codigo: p.codigo ?? null,
              texto: p.texto ?? "",
              ayuda: p.ayuda ?? null,
              tipo: p.tipo ?? "texto_corto",
              obligatoria: p.obligatoria !== false,
              opciones: Array.isArray(p.opciones) ? JSON.stringify(p.opciones) : null,
              mostrarSi: p.mostrarSi ? JSON.stringify(p.mostrarSi) : null,
              valoracion: p.valoracion ? JSON.stringify(p.valoracion) : null,
            },
          });
        }
      }
    });
  }

  if (Object.keys(data).length > 0) {
    await prisma.formulario.update({ where: { id }, data });
  }

  const actualizado = await prisma.formulario.findUnique({
    where: { id },
    include: {
      puestos: { include: { puesto: { select: { id: true, nombre: true, area: true } } } },
      secciones: {
        where: { archivada: false },
        orderBy: { orden: "asc" },
        include: { preguntas: { where: { archivada: false }, orderBy: { orden: "asc" } } },
      },
    },
  });
  return NextResponse.json({ formulario: actualizado });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerFormularios(session))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await context.params;
  // Hard-delete: la cascada borra secciones, preguntas y respuestas.
  // Decisión: si en el futuro se requiere soft-delete por auditoría, agregar
  // un flag `archivado` al modelo; por ahora, eliminar un formulario en Fase 1
  // es una acción deliberada de ADMIN/DIRECCION.
  await prisma.formulario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
