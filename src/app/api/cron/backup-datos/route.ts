import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put, list, del } from "@vercel/blob";
import { ensureSeguimientoEtapaCol } from "@/lib/etapaSeguimientos";

export const maxDuration = 60;

async function generarBackup() {
  await ensureSeguimientoEtapaCol();
  const [
    // ── CRM ───────────────────────────────────────────
    clientes, tratos, prospeccion, seguimientos,
    // ── Proyectos ─────────────────────────────────────
    proyectos, cotizaciones,
    // ── Finanzas ──────────────────────────────────────
    movimientos, cuentasCobrar, cuentasPagar,
    categorias, pasivos, repartos,
    // ── Socios y HERVAM ───────────────────────────────
    socios, hervamConfig, hervamPagos,
    // ── RRHH ──────────────────────────────────────────
    personal, nominas,
    // ── Catálogos ─────────────────────────────────────
    tecnicos, equipos, proveedores, venues, empresas,
    // ── Sistema ───────────────────────────────────────
    users, presentacionesVenta,
  ] = await Promise.all([
    // CRM
    prisma.cliente.findMany(),
    prisma.trato.findMany(),
    prisma.prospeccion.findMany().catch(() => []),
    prisma.seguimiento.findMany().catch(() => []),
    // Proyectos
    prisma.proyecto.findMany({ include: { personal: true, checklist: true } }),
    prisma.cotizacion.findMany({ include: { lineas: true } }),
    // Finanzas
    prisma.movimientoFinanciero.findMany(),
    prisma.cuentaCobrar.findMany(),
    prisma.cuentaPagar.findMany(),
    prisma.categoriaFinanciera.findMany(),
    prisma.pasivoDeuda.findMany().catch(() => []),
    prisma.repartoUtilidad.findMany({ include: { cuotas: true } }).catch(() => []),
    // Socios y HERVAM
    prisma.socio.findMany({ include: { activos: true, reportes: true } }).catch(() => []),
    prisma.hervamConfig.findMany().catch(() => []),
    prisma.hervamPago.findMany().catch(() => []),
    // RRHH
    prisma.personalInterno.findMany().catch(() => []),
    prisma.pagoNomina.findMany().catch(() => []),
    // Catálogos
    prisma.tecnico.findMany(),
    prisma.equipo.findMany(),
    prisma.proveedor.findMany().catch(() => []),
    prisma.venue.findMany().catch(() => []),
    prisma.empresa.findMany().catch(() => []),
    // Sistema
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, area: true, active: true, createdAt: true } }),
    prisma.presentacionVenta.findMany({ include: { imagenes: true } }).catch(() => []),
  ]);

  return {
    meta: {
      generadoEn: new Date().toISOString(),
      version: "2.0",
      totales: {
        clientes: clientes.length,
        tratos: tratos.length,
        proyectos: proyectos.length,
        cotizaciones: cotizaciones.length,
        movimientos: movimientos.length,
        cuentasCobrar: cuentasCobrar.length,
        cuentasPagar: cuentasPagar.length,
        tecnicos: tecnicos.length,
        equipos: equipos.length,
        socios: socios.length,
        personal: personal.length,
        proveedores: proveedores.length,
      },
    },
    // CRM
    clientes, tratos, prospeccion, seguimientos,
    // Proyectos
    proyectos, cotizaciones,
    // Finanzas
    movimientos, cuentasCobrar, cuentasPagar,
    categorias, pasivos, repartos,
    // Socios y HERVAM
    socios, hervamConfig, hervamPagos,
    // RRHH
    personal, nominas,
    // Catálogos
    tecnicos, equipos, proveedores, venues, empresas,
    // Sistema
    users, presentacionesVenta,
  };
}

/** Elimina backups con más de 30 días de antigüedad */
async function limpiarBackupsAntiguos() {
  try {
    const { blobs } = await list({ prefix: "backups/mainstage-pro-" });
    const hace30Dias = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const viejos = blobs.filter(b => new Date(b.uploadedAt).getTime() < hace30Dias);
    if (viejos.length > 0) {
      await Promise.all(viejos.map(b => del(b.url)));
      console.log(`[BACKUP] Eliminados ${viejos.length} backups de >30 días`);
    }
  } catch (e) {
    console.error("[BACKUP] Error limpiando backups antiguos:", e);
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron validation
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const data = await generarBackup();
    const json = JSON.stringify(data, null, 2);
    const fecha = new Date().toISOString().split("T")[0];
    const filename = `backups/mainstage-pro-${fecha}.json`;

    // ✅ Cambiado a "private" — solo accesible con token firmado
    const blob = await put(filename, json, {
      access: "private",
      contentType: "application/json",
    });

    // Limpiar backups viejos después de subir el nuevo
    await limpiarBackupsAntiguos();

    console.log(`[BACKUP] v2.0 generado: ${filename} — ${(json.length / 1024).toFixed(0)} KB`);

    return NextResponse.json({
      ok: true,
      fecha,
      size: `${(json.length / 1024).toFixed(0)} KB`,
      totales: data.meta.totales,
    });
  } catch (error) {
    console.error("[BACKUP] Error:", error);
    return NextResponse.json({ error: "Error generando backup" }, { status: 500 });
  }
}

// También permite POST para trigger manual (desde /admin/backup)
export async function POST(req: NextRequest) {
  return GET(req);
}
