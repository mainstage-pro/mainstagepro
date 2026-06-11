import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const maxDuration = 60;

async function generarBackup() {
  const [
    clientes, proyectos, cotizaciones, users,
    movimientos, cuentasCobrar, cuentasPagar,
    tecnicos, equipos, tratos, categorias,
    presentacionesVenta,
  ] = await Promise.all([
    prisma.cliente.findMany(),
    prisma.proyecto.findMany({ include: { personal: true, checklist: true } }),
    prisma.cotizacion.findMany({ include: { lineas: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.movimientoFinanciero.findMany(),
    prisma.cuentaCobrar.findMany(),
    prisma.cuentaPagar.findMany(),
    prisma.tecnico.findMany(),
    prisma.equipo.findMany(),
    prisma.trato.findMany(),
    prisma.categoriaGasto.findMany(),
    prisma.presentacionVenta.findMany({ include: { imagenes: true } }).catch(() => []),
  ]);

  return {
    meta: {
      generadoEn: new Date().toISOString(),
      version: "1.0",
      totales: {
        clientes: clientes.length,
        proyectos: proyectos.length,
        cotizaciones: cotizaciones.length,
        movimientos: movimientos.length,
        cuentasCobrar: cuentasCobrar.length,
        cuentasPagar: cuentasPagar.length,
        tecnicos: tecnicos.length,
        equipos: equipos.length,
        tratos: tratos.length,
      },
    },
    clientes,
    proyectos,
    cotizaciones,
    users,
    movimientos,
    cuentasCobrar,
    cuentasPagar,
    tecnicos,
    equipos,
    tratos,
    categorias,
    presentacionesVenta,
  };
}

export async function GET(req: NextRequest) {
  // Vercel Cron validation
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const data = await generarBackup();
    const json = JSON.stringify(data, null, 2);
    const fecha = new Date().toISOString().split("T")[0];
    const filename = `backups/mainstage-pro-${fecha}.json`;

    const blob = await put(filename, json, {
      access: "public",
      contentType: "application/json",
    });

    // Log en DB (simple)
    console.log(`[BACKUP] Backup generado: ${blob.url} — ${(json.length / 1024).toFixed(0)} KB`);

    return NextResponse.json({
      ok: true,
      url: blob.url,
      fecha,
      size: `${(json.length / 1024).toFixed(0)} KB`,
      totales: data.meta.totales,
    });
  } catch (error) {
    console.error("[BACKUP] Error:", error);
    return NextResponse.json({ error: "Error generando backup" }, { status: 500 });
  }
}

// También permite POST para trigger manual
export async function POST(req: NextRequest) {
  return GET(req);
}
