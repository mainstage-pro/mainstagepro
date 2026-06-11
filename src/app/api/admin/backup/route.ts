import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put, list } from "@vercel/blob";
import { getSession } from "@/lib/auth";

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

// POST — trigger manual backup
export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  try {
    const data = await generarBackup();
    const json = JSON.stringify(data, null, 2);
    const fecha = new Date().toISOString().replace("T", "_").substring(0, 16).replace(":", "-");
    const filename = `backups/mainstage-pro-${fecha}.json`;

    const blob = await put(filename, json, {
      access: "public",
      contentType: "application/json",
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
      fecha,
      size: `${(json.length / 1024).toFixed(0)} KB`,
      totales: data.meta.totales,
    });
  } catch (error) {
    console.error("[BACKUP] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET — listar backups existentes
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  try {
    const { blobs } = await list({ prefix: "backups/mainstage-pro-" });
    const backups = blobs
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(0, 30)
      .map(b => ({
        url: b.url,
        nombre: b.pathname.replace("backups/", ""),
        fecha: b.uploadedAt.toISOString(),
        size: `${(b.size / 1024).toFixed(0)} KB`,
      }));

    return NextResponse.json({ backups });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
