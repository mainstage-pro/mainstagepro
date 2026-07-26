import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureProyectoIdeasTable } from "@/lib/proyecto-ideas";
import { crearProyectoDesdeCotizacion, ensureTratoIndiceSoltado } from "@/lib/crear-proyecto";

// Convierte una idea de la bandeja de entrada en un proyecto de evento formal.
// Como un Proyecto siempre nace de una cotización (invariante del modelo), se crea
// una cotización base en BORRADOR y se reutiliza la lógica de crearProyectoDesdeCotizacion.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  await ensureProyectoIdeasTable();
  const idea = await prisma.proyectoIdea.findUnique({ where: { id } });
  if (!idea) return NextResponse.json({ error: "Idea no encontrada" }, { status: 404 });
  if (idea.estado === "CONVERTIDA" && idea.proyectoId) {
    return NextResponse.json({ proyectoId: idea.proyectoId, yaExistia: true });
  }

  const nombre = (body.nombre ?? idea.titulo ?? "").trim();
  if (!nombre) return NextResponse.json({ error: "El nombre del proyecto es obligatorio" }, { status: 400 });

  const clienteIdExistente: string | null = body.clienteId || null;
  const clienteNombreNuevo: string = (body.clienteNombre ?? "").trim();
  if (!clienteIdExistente && !clienteNombreNuevo) {
    return NextResponse.json({ error: "Selecciona un cliente o escribe uno nuevo" }, { status: 400 });
  }

  const tipoEvento: string = body.tipoEvento || "OTRO";
  const tipoServicio: string | null = body.tipoServicio || null;
  const lugarEvento: string | null = body.lugarEvento?.trim() || null;
  const fechaEvento: Date | null = body.fechaEvento ? new Date(body.fechaEvento + "T12:00:00") : null;
  const descripcion: string | null = (body.descripcion ?? idea.descripcion ?? "")?.trim() || null;
  const encargadoId: string | null = body.responsableId || idea.responsableId || null;

  try {
    await ensureTratoIndiceSoltado();
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Resolver cliente (crear si es nuevo)
      let clienteId = clienteIdExistente;
      if (!clienteId) {
        const cliente = await tx.cliente.create({
          data: { nombre: clienteNombreNuevo, esProspecto: true },
        });
        clienteId = cliente.id;
      }

      // 2. Crear cotización base en BORRADOR
      const last = await tx.cotizacion.findFirst({
        where: { numeroCotizacion: { startsWith: "COT-" } },
        orderBy: { numeroCotizacion: "desc" },
        select: { numeroCotizacion: true },
      });
      const lastNum = last ? parseInt(last.numeroCotizacion.replace("COT-", "")) || 0 : 0;
      const numeroCotizacion = `COT-${String(lastNum + 1).padStart(4, "0")}`;

      const cot = await tx.cotizacion.create({
        data: {
          numeroCotizacion,
          clienteId,
          creadaPorId: session.id,
          estado: "BORRADOR",
          nombreEvento: nombre,
          tipoEvento,
          tipoServicio,
          fechaEvento,
          lugarEvento,
          observaciones: descripcion,
        },
      });

      // 3. Crear el proyecto reutilizando la lógica existente
      const proy = await crearProyectoDesdeCotizacion(tx, cot.id, { id: session.id, name: session.name });

      // 4. Ajustar responsable y descripción según lo capturado en la idea
      await tx.proyecto.update({
        where: { id: proy.id },
        data: {
          encargadoId: encargadoId ?? undefined,
          descripcionGeneral: descripcion ?? undefined,
        },
      });

      // 5. Marcar la idea como convertida
      await tx.proyectoIdea.update({
        where: { id: idea.id },
        data: { estado: "CONVERTIDA", proyectoId: proy.id },
      });

      return proy;
    });

    return NextResponse.json({ proyectoId: resultado.id, numeroProyecto: resultado.numeroProyecto });
  } catch (e) {
    console.error("[/api/proyectos/ideas/[id]/convertir]", e);
    return NextResponse.json({ error: "No se pudo convertir la idea en proyecto" }, { status: 500 });
  }
}
