import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Script de migración única: Prospeccion → Trato (etapa PROSPECCION)
// Ejecutar una sola vez con GET /api/migrate-prospeccion
// Migra TODOS los registros de la tabla prospecciones que no tienen trato asociado
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mapOrigen: Record<string, string> = {
    META_ADS:      "META_ADS",
    MANUAL:        "ORGANICO",
    REFERIDO:      "REFERIDO",
    RECOMPRA:      "RECOMPRA",
    ORGANICO:      "ORGANICO",
    NETWORKING:    "PROSPECCION",
    REDES_SOCIALES:"ORGANICO",
    OTRO:          "OTRO",
  };

  const mapTipoLead: Record<string, string> = {
    META_ADS:      "INBOUND",
    MANUAL:        "OUTBOUND",
    REFERIDO:      "INBOUND",
    RECOMPRA:      "INBOUND",
    ORGANICO:      "INBOUND",
    NETWORKING:    "OUTBOUND",
    REDES_SOCIALES:"INBOUND",
    OTRO:          "INBOUND",
  };

  try {
    // Obtener todos los prospectos sin trato vinculado
    const prospecciones = await prisma.prospeccion.findMany({
      where: { trato: null },
      include: {
        cliente: { select: { id: true, nombre: true } },
      },
    });

    const resultados = [];
    let creados = 0;
    let errores = 0;

    for (const p of prospecciones) {
      try {
        const origenMapped = mapOrigen[p.origen] ?? "OTRO";
        const tipoLead = p.tipo === "CLIENTE_PROPIO" ? "INBOUND" : (mapTipoLead[p.origen] ?? "INBOUND");

        const trato = await prisma.trato.create({
          data: {
            clienteId:           p.clienteId,
            etapa:               "PROSPECCION",
            tipoLead,
            origenLead:          origenMapped,
            origenVenta:         p.tipo === "CLIENTE_PROPIO" ? "CLIENTE_PROPIO" : "PUBLICIDAD",
            responsableId:       p.responsableId ?? null,
            fechaEventoEstimada: p.fechaEventoEstimada ?? null,
            lugarEstimado:       p.lugarEstimado ?? null,
            notas:               p.notas ?? null,
            tipoServicio:        p.tipoServicioInteres ?? null,
            prospeccionId:       p.id,
          },
        });

        resultados.push({ prospeccionId: p.id, tratoId: trato.id, cliente: p.cliente.nombre, status: "OK" });
        creados++;
      } catch (err) {
        resultados.push({ prospeccionId: p.id, cliente: p.cliente?.nombre ?? "?", status: "ERROR", error: String(err) });
        errores++;
      }
    }

    return NextResponse.json({
      mensaje: `Migración completada: ${creados} tratos creados, ${errores} errores`,
      total: prospecciones.length,
      creados,
      errores,
      resultados,
    });
  } catch (error) {
    console.error("[GET /api/migrate-prospeccion]", error);
    return NextResponse.json({ error: "Error en migración", detail: String(error) }, { status: 500 });
  }
}
