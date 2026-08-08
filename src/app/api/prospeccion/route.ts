import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);

    const tipo          = searchParams.get("tipo");
    const etapa         = searchParams.get("etapa");
    const estado        = searchParams.get("estado");
    const tipoEvento    = searchParams.get("tipoEvento");
    const responsableId = searchParams.get("responsableId");
    const q             = searchParams.get("q")?.trim() || null;
    const showAll       = searchParams.get("showAll") === "true";

    const where: Record<string, unknown> = {};

    if (tipo)          where.tipo          = tipo;
    if (etapa)         where.etapa         = etapa;
    if (estado)        where.estado        = estado;
    if (tipoEvento)    where.tipoEvento    = tipoEvento;
    if (responsableId) where.responsableId = responsableId;

    if (!showAll && !estado) {
      where.estado = { notIn: ["CONVERTIDO", "CANCELADO"] };
    }

    if (q) {
      where.cliente = {
        nombre: { contains: q, mode: "insensitive" },
      };
    }

    const prospecciones = await prisma.prospeccion.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            empresa: true,
            telefono: true,
            correo: true,
            tipoCliente: true,
          },
        },
        responsable: {
          select: { id: true, name: true },
        },
        trato: {
          select: { id: true, etapa: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ prospecciones, total: prospecciones.length });
  } catch (error) {
    console.error("[GET /api/prospeccion]", error);
    return NextResponse.json({ error: "Error al obtener prospecciones" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();

    const {
      // ── Formato nuevo (LeadRapidoSheet / webhooks) ──────────────────────
      clienteId: bodyClienteId,
      clienteNuevo,         // { nombre, telefono?, correo?, empresa? }
      origenLead,           // META_ADS | ORGANICO | REFERIDO | ...
      notasIniciales,       // texto libre del formulario
      fechaEventoEstimada,  // YYYY-MM-DD
      // ── Formato legacy (ProspeccionClient) ─────────────────────────────
      nombre,
      telefono,
      correo,
      empresa,
      tipo,
      tipoEvento,
      origen,
      responsableId,
      etapa,
      notas,
      fechaProximoContacto,
    } = body;

    // Mapear origenLead → origen (valores del modelo Prospeccion)
    const mapOrigenLead: Record<string, string> = {
      META_ADS:   "META_ADS",
      GOOGLE_ADS: "ORGANICO",
      ORGANICO:   "ORGANICO",
      REFERIDO:   "REFERIDO",
      RECOMPRA:   "RECOMPRA",
      PROSPECCION:"NETWORKING",
      OTRO:       "OTRO",
    };
    const origenFinal: string = origen ?? (origenLead ? (mapOrigenLead[origenLead] ?? "MANUAL") : "MANUAL");
    const tipoFinal: string   = tipo ?? "NUEVO_PROSPECTO";
    const tipoEventoFinal: string = tipoEvento ?? "VARIOS";

    let clienteId: string;

    if (bodyClienteId) {
      clienteId = bodyClienteId;
      // Actualizar solo la atribución de origen; no se degrada la clasificación:
      // un cliente al que le prospectamos sigue siendo cliente.
      if (origenLead) {
        await prisma.cliente.update({
          where: { id: clienteId },
          data:  { origenLead },
        });
      }
    } else if (clienteNuevo?.nombre || nombre) {
      // Dedup: verificar si ya existe cliente con el mismo teléfono o correo
      const clienteData = clienteNuevo ?? { nombre, telefono, correo, empresa };
      const telNorm = clienteData.telefono?.replace(/\D/g, "") || null;
      const correoNorm = clienteData.correo?.toLowerCase().trim() || null;

      let clienteExistente = null;
      if (telNorm || correoNorm) {
        clienteExistente = await prisma.cliente.findFirst({
          where: {
            OR: [
              ...(telNorm ? [{ telefono: { contains: telNorm } }] : []),
              ...(correoNorm ? [{ correo: correoNorm }] : []),
            ],
          },
        });
      }

      if (clienteExistente) {
        // Reutilizar cliente existente — no se degrada su clasificación.
        clienteId = clienteExistente.id;
      } else {
        // Crear nuevo cliente
        const nuevoCliente = await prisma.cliente.create({
          data: {
            nombre:     clienteData.nombre.trim(),
            telefono:   clienteData.telefono  || null,
            correo:     clienteData.correo    || null,
            empresa:    clienteData.empresa   || null,
            tipoCliente: "POR_DESCUBRIR",
            esProspecto: true,
            origenLead:  origenLead ?? null,
          },
        });
        clienteId = nuevoCliente.id;
      }
    } else {
      return NextResponse.json(
        { error: "Se requiere clienteId, clienteNuevo.nombre o nombre para crear un cliente" },
        { status: 400 }
      );
    }

    // Auto-set fechaProximoContacto = mañana si no se especifica
    const fechaProxContactoFinal = fechaProximoContacto
      ? new Date(fechaProximoContacto)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const prospeccion = await prisma.prospeccion.create({
      data: {
        clienteId,
        tipo:          tipoFinal,
        tipoEvento:    tipoEventoFinal,
        origen:        origenFinal,
        responsableId: responsableId || null,
        etapa:         etapa ?? "NUEVO_CONTACTO",
        estado:        "ACTIVO",
        notas:         notas ?? notasIniciales ?? null,
        fechaEventoEstimada: fechaEventoEstimada ? new Date(fechaEventoEstimada) : null,
        fechaProximoContacto: fechaProxContactoFinal,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            empresa: true,
            telefono: true,
            correo: true,
            tipoCliente: true,
          },
        },
        responsable: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ prospeccion }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/prospeccion]", error);
    return NextResponse.json({ error: "Error al crear prospeccion" }, { status: 500 });
  }
}

