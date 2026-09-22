import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { personalId, monto, concepto, periodo } = await req.json();

  if (!personalId || !monto || !concepto || !periodo) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const personal = await prisma.personalInterno.findUnique({ where: { id: personalId } });
  if (!personal) return NextResponse.json({ error: "Personal no encontrado" }, { status: 404 });

  const fechaCompromiso = (() => {
    const d = new Date(periodo + (periodo.length === 10 ? "T12:00:00" : ""));
    return isNaN(d.getTime()) ? new Date() : d;
  })();

  try {
    const pago = await prisma.$transaction(async (tx) => {
      // Crear CxP
      const cxp = await tx.cuentaPagar.create({
        data: {
          tipoAcreedor: "PERSONAL_INTERNO",
          concepto: `${concepto} — ${personal.nombre}`,
          monto: parseFloat(monto),
          fechaCompromiso,
          esNomina: true,
          notas: `Pago variable/destajo generado desde Nómina. Período: ${periodo}`,
        },
      });

      // Crear PagoNomina
      const pagoNomina = await tx.pagoNomina.create({
        data: {
          personalId,
          periodo,
          tipoPeriodo: "EVENTO",
          monto: parseFloat(monto),
          concepto: `${concepto} — ${personal.nombre}`,
          estado: "PENDIENTE",
          cuentaPagarId: cxp.id,
        },
        include: { personal: { select: { id: true, nombre: true, puesto: true, departamento: true, cuentaBancaria: true } }, cuentaOrigen: { select: { id: true, nombre: true } } }
      });
      return pagoNomina;
    });

    return NextResponse.json({ success: true, pago });
  } catch (error: any) {
    console.error("Error al generar pago variable:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
