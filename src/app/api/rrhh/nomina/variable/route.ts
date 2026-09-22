import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { personalId, tecnicoId, monto, concepto, periodo } = await req.json();

  if ((!personalId && !tecnicoId) || !monto || !concepto || !periodo) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  let nombre = "";
  if (personalId) {
    const personal = await prisma.personalInterno.findUnique({ where: { id: personalId } });
    if (!personal) return NextResponse.json({ error: "Personal no encontrado" }, { status: 404 });
    nombre = personal.nombre;
  } else {
    const tecnico = await prisma.tecnico.findUnique({ where: { id: tecnicoId } });
    if (!tecnico) return NextResponse.json({ error: "Técnico no encontrado" }, { status: 404 });
    nombre = tecnico.nombre;
  }

  const fechaCompromiso = (() => {
    const d = new Date(periodo + (periodo.length === 10 ? "T12:00:00" : ""));
    return isNaN(d.getTime()) ? new Date() : d;
  })();

  try {
    const pago = await prisma.$transaction(async (tx) => {
      // Crear CxP
      const cxp = await tx.cuentaPagar.create({
        data: {
          tipoAcreedor: personalId ? "PERSONAL_INTERNO" : "TECNICO",
          tecnicoId: tecnicoId || null,
          concepto: `${concepto} — ${nombre}`,
          monto: parseFloat(monto),
          fechaCompromiso,
          esNomina: true,
          notas: `Pago variable/destajo generado desde Nómina. Período: ${periodo}`,
        },
      });

      // Crear PagoNomina
      const pagoNomina = await tx.pagoNomina.create({
        data: {
          personalId: personalId || null,
          tecnicoId: tecnicoId || null,
          periodo,
          tipoPeriodo: "EVENTO",
          monto: parseFloat(monto),
          concepto: `${concepto} — ${nombre}`,
          estado: "PENDIENTE",
          cuentaPagarId: cxp.id,
        },
        include: { 
          personal: { select: { id: true, nombre: true, puesto: true, departamento: true, cuentaBancaria: true } }, 
          tecnico: { select: { id: true, nombre: true } },
          cuentaOrigen: { select: { id: true, nombre: true } } 
        }
      });
      return pagoNomina;
    });

    return NextResponse.json({ success: true, pago });
  } catch (error: any) {
    console.error("Error al generar pago variable:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
