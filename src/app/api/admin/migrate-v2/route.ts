import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/admin/migrate-v2
 * Aplica las migraciones de schema v2 (Fase 1 rutas de servicio):
 * - ProyectoChecklist.tipo
 * - ProyectoPersonal.confirmToken, confirmRespuesta
 * - ProyectoEquipo.confirmToken, confirmDisponible
 * - Proyecto.logisticaRenta
 *
 * Solo accesible por ADMIN.
 */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados: string[] = [];

  const run = async (sql: string, desc: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      resultados.push(`✓ ${desc}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Ignorar errores de columna ya existente
      if (msg.includes("already exists") || msg.includes("duplicate column")) {
        resultados.push(`⚠ Ya existe: ${desc}`);
      } else {
        resultados.push(`✗ Error en ${desc}: ${msg}`);
      }
    }
  };

  // ProyectoChecklist.tipo
  await run(
    `ALTER TABLE proyecto_checklist ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'OPERACION'`,
    "proyecto_checklist.tipo"
  );

  // ProyectoPersonal.confirmToken
  await run(
    `ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "confirmToken" TEXT`,
    "proyecto_personal.confirmToken"
  );
  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_confirm_token ON proyecto_personal("confirmToken") WHERE "confirmToken" IS NOT NULL`,
    "index proyecto_personal.confirmToken"
  );

  // ProyectoPersonal.confirmRespuesta
  await run(
    `ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "confirmRespuesta" TEXT`,
    "proyecto_personal.confirmRespuesta"
  );

  // ProyectoEquipo.confirmToken
  await run(
    `ALTER TABLE proyecto_equipos ADD COLUMN IF NOT EXISTS "confirmToken" TEXT`,
    "proyecto_equipos.confirmToken"
  );
  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_equipo_confirm_token ON proyecto_equipos("confirmToken") WHERE "confirmToken" IS NOT NULL`,
    "index proyecto_equipos.confirmToken"
  );

  // ProyectoEquipo.confirmDisponible
  await run(
    `ALTER TABLE proyecto_equipos ADD COLUMN IF NOT EXISTS "confirmDisponible" BOOLEAN`,
    "proyecto_equipos.confirmDisponible"
  );

  // Proyecto.logisticaRenta
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "logisticaRenta" TEXT`,
    "proyectos.logisticaRenta"
  );

  // Proyecto.reporteCatering
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "reporteCatering" TEXT`,
    "proyectos.reporteCatering"
  );

  // Trato.tipoProspecto
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "tipoProspecto" TEXT NOT NULL DEFAULT 'ACTIVO'`,
    "tratos.tipoProspecto"
  );

  // Trato.nurturingData
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "nurturingData" TEXT`,
    "tratos.nurturingData"
  );

  // Trato.horaInicioEvento / horaFinEvento / duracionMontajeHrs
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "horaInicioEvento" TEXT`,
    "tratos.horaInicioEvento"
  );
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "horaFinEvento" TEXT`,
    "tratos.horaFinEvento"
  );
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "duracionMontajeHrs" DOUBLE PRECISION`,
    "tratos.duracionMontajeHrs"
  );

  // Trato.ventanaMontajeInicio / ventanaMontajeFin
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "ventanaMontajeInicio" TEXT`,
    "tratos.ventanaMontajeInicio"
  );
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "ventanaMontajeFin" TEXT`,
    "tratos.ventanaMontajeFin"
  );

  // ConfigComisiones.metaProspectoDiaria
  await run(
    `ALTER TABLE config_comisiones ADD COLUMN IF NOT EXISTS "metaProspectoDiaria" INTEGER NOT NULL DEFAULT 12`,
    "config_comisiones.metaProspectoDiaria"
  );

  // PrecioClienteEquipo.precioOriginal (precio de lista al momento de registrar el especial)
  await run(
    `ALTER TABLE precios_cliente_equipo ADD COLUMN IF NOT EXISTS "precioOriginal" DOUBLE PRECISION`,
    "precios_cliente_equipo.precioOriginal"
  );

  // Limpiar todos los precios especiales registrados antes de este cambio
  // (se corrieron por error al editar cotizaciones)
  const eliminados = await prisma.precioClienteEquipo.deleteMany({
    where: { precioOriginal: null },
  });
  resultados.push(`🧹 Precios especiales sin origen limpiados: ${eliminados.count}`);

  // User.area — área organizacional
  await run(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "area" TEXT NOT NULL DEFAULT 'GENERAL'`,
    "users.area"
  );

  // Migrar roles: VENDEDOR → USER (con area=VENTAS), REGULAR → USER
  await run(
    `UPDATE users SET area = 'VENTAS' WHERE role = 'VENDEDOR'`,
    "migrar área de vendedores"
  );
  await run(
    `UPDATE users SET role = 'USER' WHERE role = 'VENDEDOR' OR role = 'REGULAR'`,
    "migrar roles VENDEDOR/REGULAR → USER"
  );

  // Postulacion.propuestaToken (token para página pública de aceptación)
  await run(
    `ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS "propuestaToken" TEXT`,
    "postulaciones.propuestaToken"
  );
  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_postulacion_propuesta_token ON postulaciones("propuestaToken") WHERE "propuestaToken" IS NOT NULL`,
    "index postulaciones.propuestaToken"
  );

  // Postulacion.onboardingData (checklist de integración)
  await run(
    `ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS "onboardingData" TEXT`,
    "postulaciones.onboardingData"
  );

  // Cotizacion.incluirChofer — toggle servicio de chofer ($500)
  await run(
    `ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS "incluirChofer" BOOLEAN NOT NULL DEFAULT false`,
    "cotizaciones.incluirChofer"
  );

  // Proyecto: chofer asignado
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "choferNombre" TEXT`,
    "proyectos.choferNombre"
  );
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "choferExterno" BOOLEAN NOT NULL DEFAULT false`,
    "proyectos.choferExterno"
  );
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "choferCosto" DOUBLE PRECISION`,
    "proyectos.choferCosto"
  );

  // Proyecto: recolección de equipo rentado
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "recoleccionStatus" TEXT NOT NULL DEFAULT 'NO_APLICA'`,
    "proyectos.recoleccionStatus"
  );
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "recoleccionNotas" TEXT`,
    "proyectos.recoleccionNotas"
  );
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "recoleccionFechaReal" TIMESTAMP(3)`,
    "proyectos.recoleccionFechaReal"
  );
  // Marcar proyectos de renta existentes como PENDIENTE si no están completados
  await run(
    `UPDATE proyectos SET "recoleccionStatus" = 'PENDIENTE' WHERE ("tipoServicio" = 'RENTA') AND "estado" NOT IN ('COMPLETADO','CANCELADO') AND "recoleccionStatus" = 'NO_APLICA'`,
    "migrar recoleccionStatus de proyectos RENTA activos"
  );

  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "docsTecnicos" TEXT`,
    "proyectos.docsTecnicos"
  );

  // ── Vehículos y mantenimiento ──────────────────────────────────────────────
  await run(
    `ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS "planPagos" TEXT`,
    "cotizaciones.planPagos"
  );
  await run(
    `ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS "mainstageTradeData" TEXT`,
    "cotizaciones.mainstageTradeData"
  );
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "scoutingData" TEXT`,
    "tratos.scoutingData"
  );

  await run(
    `ALTER TABLE equipos ADD COLUMN IF NOT EXISTS "amperajeRequerido" DOUBLE PRECISION`,
    "equipos.amperajeRequerido"
  );
  await run(
    `ALTER TABLE equipos ADD COLUMN IF NOT EXISTS "voltajeRequerido" INTEGER`,
    "equipos.voltajeRequerido"
  );

  await run(
    `CREATE TABLE IF NOT EXISTS vehiculos (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      marca TEXT,
      modelo TEXT,
      anio INTEGER,
      placas TEXT,
      color TEXT,
      kilometraje INTEGER,
      "proximoServicioKm" INTEGER,
      "proximoServicioFecha" TIMESTAMP(3),
      activo BOOLEAN NOT NULL DEFAULT true,
      notas TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`,
    "tabla vehiculos"
  );
  await run(
    `CREATE TABLE IF NOT EXISTS mantenimiento_vehiculos (
      id TEXT PRIMARY KEY,
      "vehiculoId" TEXT NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
      fecha TIMESTAMP(3) NOT NULL,
      km INTEGER,
      "tipoRegistro" TEXT NOT NULL,
      servicio TEXT NOT NULL,
      aceite TEXT,
      anticongelante TEXT,
      "estadoLlantas" TEXT,
      "proximoKm" INTEGER,
      "proximaFecha" TIMESTAMP(3),
      prioridad TEXT NOT NULL DEFAULT 'NORMAL',
      estatus TEXT NOT NULL DEFAULT 'COMPLETADO',
      costo DOUBLE PRECISION,
      comentarios TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`,
    "tabla mantenimiento_vehiculos"
  );

  // ── Meta Ads ───────────────────────────────────────────────────────────────
  await run(
    `CREATE TABLE IF NOT EXISTS meta_campanas (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      objetivo TEXT NOT NULL DEFAULT 'LEADS',
      estado TEXT NOT NULL DEFAULT 'BORRADOR',
      presupuesto DOUBLE PRECISION NOT NULL DEFAULT 0,
      "fechaInicio" TIMESTAMP(3),
      "fechaFin" TIMESTAMP(3),
      audiencia TEXT,
      ubicaciones TEXT,
      notas TEXT,
      "creadoPorId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`,
    "tabla meta_campanas"
  );
  await run(
    `CREATE TABLE IF NOT EXISTS meta_anuncios (
      id TEXT PRIMARY KEY,
      "campanaId" TEXT NOT NULL REFERENCES meta_campanas(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      formato TEXT NOT NULL DEFAULT 'IMAGEN',
      titular TEXT,
      descripcion TEXT,
      cta TEXT,
      "urlDestino" TEXT,
      estado TEXT NOT NULL DEFAULT 'ACTIVO',
      notas TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`,
    "tabla meta_anuncios"
  );
  await run(
    `CREATE TABLE IF NOT EXISTS meta_resultados (
      id TEXT PRIMARY KEY,
      "campanaId" TEXT NOT NULL REFERENCES meta_campanas(id) ON DELETE CASCADE,
      fecha TIMESTAMP(3) NOT NULL,
      impresiones INTEGER NOT NULL DEFAULT 0,
      alcance INTEGER NOT NULL DEFAULT 0,
      clics INTEGER NOT NULL DEFAULT 0,
      leads INTEGER NOT NULL DEFAULT 0,
      gastado DOUBLE PRECISION NOT NULL DEFAULT 0,
      cpm DOUBLE PRECISION,
      cpc DOUBLE PRECISION,
      cpl DOUBLE PRECISION,
      frecuencia DOUBLE PRECISION,
      notas TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`,
    "tabla meta_resultados"
  );

  // ── Protocolo de entrada/salida de equipos en renta ──────────────────────
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "protocoloSalida" TEXT`,
    "proyectos.protocoloSalida"
  );
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "protocoloEntrada" TEXT`,
    "proyectos.protocoloEntrada"
  );

  // ── Tipos de campaña ──────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS tipos_campana (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      objetivo TEXT NOT NULL DEFAULT 'INFORMATIVO',
      "objetivoMeta" TEXT NOT NULL DEFAULT 'RECONOCIMIENTO',
      formato TEXT NOT NULL DEFAULT 'VIDEO',
      recurrencia TEXT NOT NULL DEFAULT 'MENSUAL',
      canal TEXT NOT NULL DEFAULT 'META',
      "duracionDias" INTEGER NOT NULL DEFAULT 14,
      "presupuestoEstimado" DOUBLE PRECISION,
      "publicoEdadMin" INTEGER NOT NULL DEFAULT 25,
      "publicoEdadMax" INTEGER NOT NULL DEFAULT 55,
      "publicoGenero" TEXT NOT NULL DEFAULT 'TODOS',
      ubicaciones TEXT NOT NULL DEFAULT 'FEED_IG,REELS_IG,STORIES_IG',
      cta TEXT NOT NULL DEFAULT 'MAS_INFORMACION',
      "copyReferencia" TEXT,
      "pixelEvento" TEXT,
      descripcion TEXT,
      color TEXT NOT NULL DEFAULT '#B3985B',
      activo BOOLEAN NOT NULL DEFAULT true,
      orden INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`, "tabla tipos_campana");

  // Nuevas columnas para tipos_campana existentes
  await run(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS "objetivoMeta" TEXT NOT NULL DEFAULT 'RECONOCIMIENTO'`, "tipos_campana.objetivoMeta");
  await run(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS formato TEXT NOT NULL DEFAULT 'VIDEO'`, "tipos_campana.formato");
  await run(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS recurrencia TEXT NOT NULL DEFAULT 'MENSUAL'`, "tipos_campana.recurrencia");
  await run(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS "publicoEdadMin" INTEGER NOT NULL DEFAULT 25`, "tipos_campana.publicoEdadMin");
  await run(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS "publicoEdadMax" INTEGER NOT NULL DEFAULT 55`, "tipos_campana.publicoEdadMax");
  await run(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS "publicoGenero" TEXT NOT NULL DEFAULT 'TODOS'`, "tipos_campana.publicoGenero");
  await run(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS ubicaciones TEXT NOT NULL DEFAULT 'FEED_IG,REELS_IG,STORIES_IG'`, "tipos_campana.ubicaciones");
  await run(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS cta TEXT NOT NULL DEFAULT 'MAS_INFORMACION'`, "tipos_campana.cta");
  await run(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS "copyReferencia" TEXT`, "tipos_campana.copyReferencia");
  await run(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS "pixelEvento" TEXT`, "tipos_campana.pixelEvento");

  // ── Ejecuciones de campaña ────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS ejecuciones_campana (
      id TEXT PRIMARY KEY,
      "tipoId" TEXT REFERENCES tipos_campana(id),
      nombre TEXT NOT NULL,
      objetivo TEXT,
      canal TEXT,
      color TEXT,
      "fechaInicio" TIMESTAMP(3) NOT NULL,
      "fechaFin" TIMESTAMP(3) NOT NULL,
      estado TEXT NOT NULL DEFAULT 'PLANIFICADA',
      presupuesto DOUBLE PRECISION,
      notas TEXT,
      mes TEXT NOT NULL,
      "idMetaAds" TEXT,
      alcance INTEGER,
      impresiones INTEGER,
      clics INTEGER,
      ctr DOUBLE PRECISION,
      "cantResultados" INTEGER,
      "costoResultado" DOUBLE PRECISION,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`, "tabla ejecuciones_campana");

  // Nuevas columnas para ejecuciones existentes
  await run(`ALTER TABLE ejecuciones_campana ADD COLUMN IF NOT EXISTS "idMetaAds" TEXT`, "ejecuciones_campana.idMetaAds");
  await run(`ALTER TABLE ejecuciones_campana ADD COLUMN IF NOT EXISTS alcance INTEGER`, "ejecuciones_campana.alcance");
  await run(`ALTER TABLE ejecuciones_campana ADD COLUMN IF NOT EXISTS impresiones INTEGER`, "ejecuciones_campana.impresiones");
  await run(`ALTER TABLE ejecuciones_campana ADD COLUMN IF NOT EXISTS clics INTEGER`, "ejecuciones_campana.clics");
  await run(`ALTER TABLE ejecuciones_campana ADD COLUMN IF NOT EXISTS ctr DOUBLE PRECISION`, "ejecuciones_campana.ctr");
  await run(`ALTER TABLE ejecuciones_campana ADD COLUMN IF NOT EXISTS "cantResultados" INTEGER`, "ejecuciones_campana.cantResultados");
  await run(`ALTER TABLE ejecuciones_campana ADD COLUMN IF NOT EXISTS "costoResultado" DOUBLE PRECISION`, "ejecuciones_campana.costoResultado");

  // ── Foto evidencia en mantenimiento de equipos ───────────────────────────
  await run(
    `ALTER TABLE mantenimientos_equipos ADD COLUMN IF NOT EXISTS "fotoEvidencia" TEXT`,
    "mantenimientos_equipos.fotoEvidencia"
  );

  // ── Base de datos de venues ───────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      direccion TEXT,
      ciudad TEXT,
      contacto TEXT,
      "telefonoContacto" TEXT,
      "emailContacto" TEXT,
      "capacidadPersonas" INTEGER,
      "largoM" DOUBLE PRECISION,
      "anchoM" DOUBLE PRECISION,
      "alturaMaximaM" DOUBLE PRECISION,
      "accesoVehicular" TEXT,
      "puntoDescarga" TEXT,
      "voltajeDisponible" TEXT,
      "amperajeTotal" DOUBLE PRECISION,
      fases TEXT,
      "ubicacionTablero" TEXT,
      "restriccionDecibeles" TEXT,
      "restriccionHorario" TEXT,
      "restriccionInstalacion" TEXT,
      "tiposEvento" TEXT,
      calificacion DOUBLE PRECISION,
      notas TEXT,
      "fotoPortada" TEXT,
      activo BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`, "tabla venues");

  // ── Brief levantamiento de contenido ─────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS levantamientos_contenido (
      id TEXT PRIMARY KEY,
      "tratoId" TEXT NOT NULL UNIQUE REFERENCES tratos(id) ON DELETE CASCADE,
      "nombreEvento" TEXT,
      "tipoEvento" TEXT,
      fecha TIMESTAMP(3),
      "horarioEvento" TEXT,
      "horarioCobertura" TEXT,
      lugar TEXT,
      "nombreCliente" TEXT,
      "redesSocialesCliente" TEXT,
      "tieneProveedoresAdicionales" TEXT,
      "proveedoresDetalle" TEXT,
      "objetivosContenido" TEXT,
      "detalleObjetivo" TEXT,
      "planCobertura" TEXT,
      "planCoberturaOtro" TEXT,
      "temasSugeridos" TEXT,
      "colaboradoresCamara" BOOLEAN,
      "colaboradoresNombres" TEXT,
      "notasAdicionales" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`, "tabla levantamientos_contenido");

  // ── Técnicos habilidades ─────────────────────────────────────────────────
  await run(
    `ALTER TABLE tecnicos ADD COLUMN IF NOT EXISTS habilidades TEXT`,
    "tecnicos.habilidades"
  );

  return NextResponse.json({ ok: true, resultados });
}
