import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        venue: { select: { nombre: true } },
        lugarEvento: true
      }
    });

    if (!proyecto) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Extract unique technicians and their roles
    const tecnicosMap = new Map();
    for (const p of proyecto.personal) {
      if (!p.tecnico) continue;
      if (!tecnicosMap.has(p.tecnicoId)) {
        tecnicosMap.set(p.tecnicoId, {
          id: p.tecnico.id,
          nombre: p.tecnico.nombre,
          telefono: p.tecnico.telefono,
          roles: [],
          puesto: p.tecnico.puestoId // we could fetch puesto details if needed
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
      select: { tecnicoId: true, status: true, motivoCorreccion: true }
    });

    return NextResponse.json({
      proyecto: {
        id: proyecto.id,
        nombre: proyecto.nombre,
        fechaEvento: proyecto.fechaEvento,
        clienteNombre: proyecto.cliente.empresa || proyecto.cliente.nombre,
        lugar: proyecto.venue?.nombre || proyecto.lugarEvento
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
