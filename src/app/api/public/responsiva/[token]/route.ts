import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolverEstadoEvento } from "@/lib/venues";

export async function GET(req: NextRequest, context: any) {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { responsivaToken: (await context.params).token },
      select: {
        id: true,
        nombre: true,
        fechaEvento: true,
        cliente: { select: { nombre: true, empresa: true } },
        personal: {
          include: {
            tecnico: true,
            rolTecnico: true
          }
        },
        venue: { select: { id: true, nombre: true, ciudad: true, estado: true, direccion: true } },
        lugarEvento: true,
        direccionVenue: true
      }
    });

    if (!proyecto) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Intento de vincular venue por nombre si no estaba ligado explícitamente
    let venue = proyecto.venue;
    if (!venue && proyecto.lugarEvento) {
      venue = await prisma.venue.findFirst({
        where: { nombre: { equals: proyecto.lugarEvento.trim(), mode: "insensitive" } },
        select: { id: true, nombre: true, ciudad: true, estado: true, direccion: true }
      });
    }

    const estadoLugar = resolverEstadoEvento({
      estado: venue?.estado,
      ciudad: venue?.ciudad,
      lugar: proyecto.lugarEvento || venue?.nombre,
      direccion: proyecto.direccionVenue || venue?.direccion
    });

    // Extract unique technicians and their roles
    const tecnicosMap = new Map();
    for (const p of proyecto.personal) {
      if (!p.tecnico) continue;
      if (!tecnicosMap.has(p.tecnicoId)) {
        tecnicosMap.set(p.tecnicoId, {
          id: p.tecnico.id,
          nombre: p.tecnico.nombre,
          telefono: p.tecnico.celular,
          roles: [],
        });
      }
      if (p.rolTecnico) {
        tecnicosMap.get(p.tecnicoId).roles.push(p.rolTecnico.nombre);
      }
    }

    const tecnicos = Array.from(tecnicosMap.values()).map(t => ({
      ...t,
      // If any role involves rigging, we mark as rigger
      esRigger: t.roles.some((r: string) => r.toLowerCase().includes('rigger') || r.toLowerCase().includes('rigging') || r.toLowerCase().includes('puntos'))
    }));

    // Fetch existing responsivas
    const responsivas = await prisma.responsivaTecnico.findMany({
      where: { proyectoId: proyecto.id },
      select: { tecnicoId: true, status: true, motivoCorreccion: true, datosCapturados: true }
    });

    return NextResponse.json({
      proyecto: {
        id: proyecto.id,
        nombre: proyecto.nombre,
        fechaEvento: proyecto.fechaEvento,
        clienteNombre: proyecto.cliente?.empresa || proyecto.cliente?.nombre,
        lugar: venue?.nombre || proyecto.lugarEvento,
        estadoLugar
      },
      tecnicos,
      responsivas
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: any) {
  try {
    const body = await req.json();
    const { tecnicoId, firmaUrl, datosCapturados, pdfUrl, tipoResponsiva } = body;

    const proyecto = await prisma.proyecto.findUnique({
      where: { responsivaToken: (await context.params).token }
    });

    if (!proyecto) return NextResponse.json({ error: "Not found" }, { status: 404 });

    
    if (datosCapturados?.nombre) {
      await prisma.tecnico.update({
        where: { id: tecnicoId },
        data: { nombre: datosCapturados.nombre }
      });
    }

    const responsiva = await prisma.responsivaTecnico.upsert({
      where: {
        proyectoId_tecnicoId: {
          proyectoId: proyecto.id,
          tecnicoId
        }
      },
      update: {
        status: 'RECIBIDA',
        firmaUrl,
        datosCapturados,
        pdfUrl,
        tipoResponsiva,
        enviadoEn: new Date(),
        motivoCorreccion: null
      },
      create: {
        proyectoId: proyecto.id,
        tecnicoId,
        status: 'RECIBIDA',
        firmaUrl,
        datosCapturados,
        pdfUrl,
        tipoResponsiva,
        enviadoEn: new Date()
      }
    });

    return NextResponse.json({ success: true, responsiva });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
