import { prisma } from "@/lib/prisma";

/**
 * Helper: verifica si una columna ya existe en la tabla antes de hacer ALTER TABLE.
 * ALTER TABLE ... ADD COLUMN IF NOT EXISTS adquiere ACCESS EXCLUSIVE lock aunque la
 * columna ya exista, lo que bloquea todas las queries a esa tabla. Verificar primero
 * en information_schema evita ese lock innecesario en producción.
 */
async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = ${table} AND column_name = ${column}
    ) as exists
  `;
  return rows[0]?.exists === true;
}

/**
 * Migraciones lazy para la operación técnica (patrón Neon: ADD COLUMN IF NOT EXISTS).
 * - roles_tecnicos.disciplina: categoría del rol para ligarlo con la BD de técnicos.
 * - proyecto_personal.esAdicional: marcador interno de técnico fuera de cotización.
 * - proyectos.evaluacionPostEvento: JSON del cierre operativo del coordinador.
 * Idempotente y seguro de correr múltiples veces; se guarda con un flag de módulo.
 */
let _ready = false;

export async function ensureOperacionTecnicaColumns() {
  if (_ready) return;
  if (!await columnExists('roles_tecnicos', 'disciplina')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE roles_tecnicos ADD COLUMN IF NOT EXISTS "disciplina" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('proyecto_personal', 'esAdicional')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "esAdicional" BOOLEAN NOT NULL DEFAULT false`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('proyectos', 'evaluacionPostEvento')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "evaluacionPostEvento" JSONB`
      );
    } catch { /* ya existe */ }
  }
  // proyectos.evaluacionDireccion: calificación 1-5 por dimensión que hace dirección
  // sobre el evento, apoyándose en el reporte y evidencia del coordinador.
  if (!await columnExists('proyectos', 'evaluacionDireccion')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "evaluacionDireccion" JSONB`
      );
    } catch { /* ya existe */ }
  }
  // proyecto_personal.movimientoId: liga la fila con el MovimientoFinanciero (GASTO)
  // que se genera al marcar PAGADO. Declarada en schema.prisma → Prisma la pide en
  // cualquier findMany de proyecto_personal sin select, por eso el DDL aditivo se aplica
  // en prod ANTES del deploy; esto es red de seguridad idempotente para dev/local.
  if (!await columnExists('proyecto_personal', 'movimientoId')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "movimientoId" TEXT`
      );
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "proyecto_personal_movimientoId_key" ON proyecto_personal ("movimientoId")`
      );
    } catch { /* ya existe */ }
  }
  _ready = true;
}

/**
 * Migraciones lazy del proceso de ventas (patrón Neon: ADD COLUMN IF NOT EXISTS).
 * - tratos.modoDescubrimiento: "FORMULARIO" | "LLAMADA", define la rama del descubrimiento.
 * - tratos.etapaInterna: sub-etapa dentro de la etapa del pipeline (ver src/lib/proceso/valores.ts).
 *   Declarada en schema.prisma → Prisma la pide en cualquier findMany de tratos sin select,
 *   por eso DEBE existir antes de cualquier lectura (corre también al arranque).
 * - tratos.descubrimientoNivel: "BASICO" | "TECNICO", calculado, nunca capturado.
 * - tratos.descubrimientoPendiente: marca que falta completar el descubrimiento.
 * Idempotente y seguro de correr múltiples veces.
 */
let _procesoVentaReady = false;

export async function ensureProcesoVentaColumns() {
  if (_procesoVentaReady) return;
  if (!await columnExists('tratos', 'modoDescubrimiento')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "modoDescubrimiento" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('tratos', 'preferenciaContacto')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "preferenciaContacto" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('tratos', 'etapaInterna')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "etapaInterna" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('tratos', 'descubrimientoNivel')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "descubrimientoNivel" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('tratos', 'descubrimientoPendiente')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "descubrimientoPendiente" BOOLEAN NOT NULL DEFAULT false`
      );
    } catch { /* ya existe */ }
  }
  // Backfill: los tratos que ya existían nacen con etapaInterna null (barra vacía).
  // Les asignamos la primera sub-etapa que pertenece a su etapa del pipeline.
  // Solo toca filas null → idempotente (tras la primera corrida actualiza 0 filas).
  // Tolera datos legacy con etapa = 'LEAD' (front, equivale a CONTACTO_INICIAL).
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE tratos SET "etapaInterna" = CASE
        WHEN etapa IN ('LEAD', 'CONTACTO_INICIAL')                   THEN 'PRIMER_CONTACTO'
        WHEN etapa = 'PROSPECCION'                                   THEN 'NURTURING'
        WHEN etapa = 'DESCUBRIMIENTO'                                THEN 'FORMULARIO_ENVIADO'
        WHEN etapa = 'OPORTUNIDAD'                                   THEN 'PROPUESTA_EN_ELABORACION'
        WHEN etapa = 'VENTA_CERRADA'                                 THEN 'CONFIRMADA'
        WHEN etapa = 'VENTA_PERDIDA'                                 THEN 'PERDIDA'
        ELSE "etapaInterna"
      END
      WHERE "etapaInterna" IS NULL
    `);
  } catch { /* backfill best-effort */ }
  _procesoVentaReady = true;
}

/**
 * Migración lazy: se retiró la etapa CONTACTO_INICIAL del pipeline. El "Primer contacto"
 * pasa a ser la primera sub-etapa de PROSPECCION. Reasigna la subetapa en la BD y migra
 * los tratos legacy que quedaron en CONTACTO_INICIAL. Solo DML, sin cambio de esquema.
 * Idempotente (tras la primera corrida actualiza 0 filas).
 */
let _contactoInicialRetiradoReady = false;

export async function ensureContactoInicialRetirado() {
  if (_contactoInicialRetiradoReady) return;
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE proceso_subetapas SET etapa = 'PROSPECCION' WHERE "etapaInterna" = 'PRIMER_CONTACTO' AND etapa <> 'PROSPECCION'`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE tratos SET etapa = 'PROSPECCION' WHERE etapa = 'CONTACTO_INICIAL'`
    );
  } catch { /* best-effort */ }
  _contactoInicialRetiradoReady = true;
}

/**
 * Migraciones lazy para servicios de varios días (patrón Neon: ADD COLUMN IF NOT EXISTS).
 * - tratos.fechasEvento / proyectos.fechasEvento: JSON con las fechas explícitas del evento
 *   cuando dura más de un día. El día 1 sigue en fechaEventoEstimada / fechaEvento.
 * Idempotente y seguro de correr múltiples veces.
 */
let _multidiaReady = false;

export async function ensureMultidiaColumns() {
  if (_multidiaReady) return;
  if (!await columnExists('tratos', 'fechasEvento')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "fechasEvento" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('proyectos', 'fechasEvento')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "fechasEvento" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('proyectos', 'horariosEvento')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "horariosEvento" TEXT`
      );
    } catch { /* ya existe */ }
  }
  _multidiaReady = true;
}

/**
 * Navegación persistida del trato: recuerda el panel/tab donde se quedó el usuario
 * para restaurar la posición al reabrir. Las 3 columnas están en schema.prisma, así
 * que Prisma las pide en cualquier lectura de tratos sin select — deben existir antes
 * de leer. Idempotente. Ver docs/crm-trato-campos.md (Fase 1).
 */
let _navegacionReady = false;

export async function ensureNavegacionColumns() {
  if (_navegacionReady) return;
  if (!await columnExists('tratos', 'ultimoPanel')) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "ultimoPanel" TEXT`);
    } catch { /* ya existe */ }
  }
  if (!await columnExists('tratos', 'ultimoTab')) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "ultimoTab" TEXT`);
    } catch { /* ya existe */ }
  }
  if (!await columnExists('tratos', 'ultimaVisita')) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "ultimaVisita" TIMESTAMP(3)`);
    } catch { /* ya existe */ }
  }
  _navegacionReady = true;
}

/**
 * Migraciones lazy del día de montaje/desmontaje opcional (patrón Neon).
 * - proyectos.montajeDiaAparte / desmontajeDiaAparte: si el montaje/desmontaje es un día
 *   adicional (día antes / día después) o el mismo día del evento.
 * - proyectos.fechaDesmontaje / duracionDesmontajeHrs: fecha y duración del desmontaje.
 * Las 4 se declaran en schema.prisma → Prisma las pide en cualquier findMany de proyectos
 * sin select, por eso DEBEN existir antes de cualquier lectura (corre al arranque).
 * Backfill: los proyectos con fechaMontaje en un día distinto al del evento nacen con
 * montajeDiaAparte=true, preservando el comportamiento previo. Idempotente.
 */
let _montajeDiaReady = false;

export async function ensureMontajeDesmontajeColumns() {
  if (_montajeDiaReady) return;
  const cols: [string, string][] = [
    ['montajeDiaAparte', `ADD COLUMN IF NOT EXISTS "montajeDiaAparte" BOOLEAN NOT NULL DEFAULT false`],
    ['desmontajeDiaAparte', `ADD COLUMN IF NOT EXISTS "desmontajeDiaAparte" BOOLEAN NOT NULL DEFAULT false`],
    ['fechaDesmontaje', `ADD COLUMN IF NOT EXISTS "fechaDesmontaje" TIMESTAMP(3)`],
    ['duracionDesmontajeHrs', `ADD COLUMN IF NOT EXISTS "duracionDesmontajeHrs" DOUBLE PRECISION`],
  ];
  for (const [column, clause] of cols) {
    if (!await columnExists('proyectos', column)) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE proyectos ${clause}`);
      } catch { /* ya existe */ }
    }
  }
  // Backfill: montaje en fecha distinta al evento ⇒ era un día aparte (comportamiento previo).
  // Solo toca filas donde ambas fechas existen y difieren; idempotente tras la primera corrida.
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE proyectos SET "montajeDiaAparte" = true
      WHERE "fechaMontaje" IS NOT NULL
        AND "montajeDiaAparte" = false
        AND date("fechaMontaje") < date("fechaEvento")
    `);
  } catch { /* backfill best-effort */ }
  _montajeDiaReady = true;
}

/**
 * Migraciones lazy de la sincronización cotización → proyecto (patrón Neon).
 * - proyecto_equipos.necesitaRevision: el equipo se quitó/redujo en la cotización
 *   pero tiene datos manuales (proveedor, notas, rider) — no se borra, se marca.
 * - proyecto_personal.necesitaRevision: el rol de operación técnica se quitó de la
 *   cotización pero el slot puede tener técnico asignado — no se borra, se marca.
 * Ambas declaradas en schema.prisma → Prisma las pide en cualquier findMany sin
 * select, por eso DEBEN existir antes de cualquier lectura (corre al arranque).
 * Idempotente y seguro de correr múltiples veces.
 */
let _syncReady = false;

export async function ensureSyncColumns() {
  if (_syncReady) return;
  if (!await columnExists('proyecto_equipos', 'necesitaRevision')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyecto_equipos ADD COLUMN IF NOT EXISTS "necesitaRevision" BOOLEAN NOT NULL DEFAULT false`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('proyecto_personal', 'necesitaRevision')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "necesitaRevision" BOOLEAN NOT NULL DEFAULT false`
      );
    } catch { /* ya existe */ }
  }
  _syncReady = true;
}

/**
 * Migraciones lazy de finanzas (patrón Neon: ADD COLUMN IF NOT EXISTS).
 * - cuentas_pagar.categoriaId: liga la CxP con una categoría financiera (FK opcional).
 *   El dashboard lee CuentaPagar con findMany sin select, así que esta columna DEBE
 *   existir en prod antes de cualquier lectura — por eso se garantiza al arranque.
 * Idempotente y seguro de correr múltiples veces.
 */
let _finanzasReady = false;

export async function ensureFinanzasColumns() {
  if (_finanzasReady) return;
  if (!await columnExists('cuentas_pagar', 'categoriaId')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE cuentas_pagar ADD COLUMN IF NOT EXISTS "categoriaId" TEXT REFERENCES categorias_financieras(id) ON DELETE SET NULL`
      );
    } catch { /* ya existe */ }
  }
  _finanzasReady = true;
}

/**
 * Migraciones lazy de marketing (patrón Neon: ADD COLUMN IF NOT EXISTS).
 * - tipos_campana.{categoria,vigenciaDesde,vigenciaHasta,briefTemplate}
 * - ejecuciones_campana.{brief,briefCompleto}
 * Todas declaradas en schema.prisma → Prisma las pide en cualquier findMany sin select.
 * Idempotente y seguro de correr múltiples veces.
 */
let _marketingReady = false;

export async function ensureMarketingColumns() {
  if (_marketingReady) return;
  const cols: [string, string, string][] = [
    ['tipos_campana', 'categoria', `ADD COLUMN IF NOT EXISTS "categoria" TEXT NOT NULL DEFAULT 'base'`],
    ['tipos_campana', 'vigenciaDesde', `ADD COLUMN IF NOT EXISTS "vigenciaDesde" TIMESTAMP(3)`],
    ['tipos_campana', 'vigenciaHasta', `ADD COLUMN IF NOT EXISTS "vigenciaHasta" TIMESTAMP(3)`],
    ['tipos_campana', 'briefTemplate', `ADD COLUMN IF NOT EXISTS "briefTemplate" TEXT`],
    ['ejecuciones_campana', 'brief', `ADD COLUMN IF NOT EXISTS "brief" TEXT`],
    ['ejecuciones_campana', 'briefCompleto', `ADD COLUMN IF NOT EXISTS "briefCompleto" BOOLEAN NOT NULL DEFAULT false`],
    ['ejecuciones_campana', 'audiencia', `ADD COLUMN IF NOT EXISTS "audiencia" TEXT`],
    ['ejecuciones_campana', 'ubicaciones', `ADD COLUMN IF NOT EXISTS "ubicaciones" TEXT`],
  ];
  for (const [table, column, clause] of cols) {
    if (!await columnExists(table, column)) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ${clause}`);
      } catch { /* ya existe */ }
    }
  }
  // Tablas del sistema unificado de publicidad (anuncios y resultados por campaña).
  // Solo se leen con include explícito en los endpoints, pero se crean al arranque.
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS anuncios_campana (
        id TEXT PRIMARY KEY,
        "ejecucionId" TEXT NOT NULL REFERENCES ejecuciones_campana(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        formato TEXT NOT NULL DEFAULT 'IMAGEN',
        titular TEXT,
        copy TEXT,
        cta TEXT,
        "urlDestino" TEXT,
        estado TEXT NOT NULL DEFAULT 'ACTIVO',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "anuncios_campana_ejecucionId_idx" ON anuncios_campana("ejecucionId")`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS resultados_campana (
        id TEXT PRIMARY KEY,
        "ejecucionId" TEXT NOT NULL REFERENCES ejecuciones_campana(id) ON DELETE CASCADE,
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
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "resultados_campana_ejecucionId_idx" ON resultados_campana("ejecucionId")`);
  } catch { /* ya existen */ }
  _marketingReady = true;
}

/**
 * Migración lazy del desbloqueo manual de calendario (patrón Neon).
 * - cotizaciones.eventoConfirmado: marca que el evento se confirmó aunque la
 *   cotización aún no se cierre/apruebe, para que aparezca en calendario y agendas.
 *   Declarada en schema.prisma → Prisma la pide en cualquier findMany de cotizaciones
 *   sin select, por eso el DDL aditivo se aplica a prod ANTES del deploy
 *   (scripts/ddl-cotizacion-evento-confirmado.ts); esto es respaldo idempotente.
 */
let _eventoConfirmadoReady = false;

export async function ensureCotizacionEventoConfirmadoColumn() {
  if (_eventoConfirmadoReady) return;
  if (!await columnExists('cotizaciones', 'eventoConfirmado')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS "eventoConfirmado" BOOLEAN NOT NULL DEFAULT false`
      );
    } catch { /* ya existe */ }
  }
  _eventoConfirmadoReady = true;
}

/**
 * cotizaciones.paqueteId: liga la cotización con el Paquete comercial base del que
 * se desglosó, para poder mostrar sus renders en la presentación al cliente.
 * Columna nullable declarada en schema.prisma. Idempotente (patrón Neon).
 */
let _cotizacionPaqueteReady = false;

export async function ensureCotizacionPaqueteColumn() {
  if (_cotizacionPaqueteReady) return;
  if (!await columnExists('cotizaciones', 'paqueteId')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS "paqueteId" TEXT`
      );
    } catch { /* ya existe */ }
  }
  _cotizacionPaqueteReady = true;
}

/**
 * Migraciones lazy del pipeline de seguimientos (patrón Neon: ADD COLUMN IF NOT EXISTS).
 * - seguimientos.etapa: etapa del pipeline en que se agendó el seguimiento.
 * - presentaciones_venta.tratoId: liga la presentación con su trato (sin FK a propósito).
 * Ambas declaradas en schema.prisma. Idempotente y seguro de correr múltiples veces.
 */
let _seguimientoReady = false;

export async function ensureSeguimientoColumns() {
  if (_seguimientoReady) return;
  // Columnas nuevas del proceso comercial estándar en seguimientos.
  for (const [col, type] of [
    ['etapaTrato', 'TEXT'],
    ['etapaInterna', 'TEXT'],
    ['procesoPasoId', 'TEXT'],
    ['guionSnapshot', 'TEXT'],
  ] as const) {
    if (!await columnExists('seguimientos', col)) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE seguimientos ADD COLUMN IF NOT EXISTS "${col}" ${type}`
        );
      } catch { /* ya existe */ }
    }
  }
  // Backfill: migrar la columna legacy "etapa" → "etapaTrato" si aún existe.
  if (await columnExists('seguimientos', 'etapa')) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE seguimientos SET "etapaTrato" = "etapa" WHERE "etapaTrato" IS NULL AND "etapa" IS NOT NULL`
      );
    } catch { /* nada que migrar */ }
  }
  // Normalizar tipo legacy: auto / auto_etapa → PROCESO, manual → MANUAL.
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE seguimientos SET "tipo" = CASE WHEN "tipo" IN ('auto', 'auto_etapa') THEN 'PROCESO' WHEN "tipo" = 'manual' THEN 'MANUAL' ELSE "tipo" END WHERE "tipo" IN ('auto', 'auto_etapa', 'manual')`
    );
  } catch { /* ya normalizado */ }
  // Normalizar canal legacy en minúsculas → mayúsculas del enum CanalSeguimiento.
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE seguimientos SET "canal" = CASE WHEN "canal" = 'whatsapp' THEN 'WHATSAPP' WHEN "canal" = 'llamada' THEN 'LLAMADA' WHEN "canal" IN ('reunion', 'presencial') THEN 'PRESENCIAL' WHEN "canal" = 'email' THEN 'EMAIL' ELSE "canal" END WHERE "canal" IN ('whatsapp', 'llamada', 'reunion', 'presencial', 'email')`
    );
  } catch { /* ya normalizado */ }
  if (!await columnExists('presentaciones_venta', 'tratoId')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE presentaciones_venta ADD COLUMN IF NOT EXISTS "tratoId" TEXT`
      );
    } catch { /* ya existe */ }
  }
  _seguimientoReady = true;
}

/**
 * Crea la tabla de evaluación de dirección por área si aún no existe (patrón Neon).
 * Tabla nueva y aislada: ninguna lectura existente depende de ella, así que
 * CREATE TABLE IF NOT EXISTS es seguro. La consulta el endpoint de evaluación de
 * área, que llama a esta función antes de leer/escribir. Idempotente.
 */
let _evalAreaReady = false;

export async function ensureEvaluacionAreaTabla() {
  if (_evalAreaReady) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS evaluaciones_area_direccion (
        id TEXT PRIMARY KEY,
        area TEXT NOT NULL,
        mes TEXT NOT NULL,
        "evaluadorId" TEXT,
        "evaluadorNombre" TEXT,
        "responsableId" TEXT,
        "responsableNombre" TEXT,
        calificaciones TEXT NOT NULL DEFAULT '{}',
        notas TEXT NOT NULL DEFAULT '{}',
        comentario TEXT NOT NULL DEFAULT '',
        finalizada BOOLEAN NOT NULL DEFAULT false,
        "finalizadaEn" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "evaluaciones_area_direccion_area_mes_key" ON evaluaciones_area_direccion (area, mes)`
    );
  } catch { /* ya existe */ }
  _evalAreaReady = true;
}

/**
 * Crea la tabla del reporte mensual de área si aún no existe (patrón Neon).
 * Tabla nueva y aislada: ninguna lectura existente depende de ella, así que
 * CREATE TABLE IF NOT EXISTS es seguro. La consulta el endpoint del reporte
 * mensual de área, que llama a esta función antes de leer/escribir. Idempotente.
 */
let _reporteMensualAreaReady = false;

export async function ensureReporteMensualAreaTabla() {
  if (_reporteMensualAreaReady) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS reportes_mensuales_area (
        id TEXT PRIMARY KEY,
        area TEXT NOT NULL,
        mes TEXT NOT NULL,
        "autorId" TEXT,
        "autorNombre" TEXT,
        resultados TEXT NOT NULL DEFAULT '',
        kpis TEXT NOT NULL DEFAULT '[]',
        analisis TEXT NOT NULL DEFAULT '',
        bloqueos TEXT NOT NULL DEFAULT '',
        compromisos TEXT NOT NULL DEFAULT '',
        enviado BOOLEAN NOT NULL DEFAULT false,
        "enviadoEn" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "reportes_mensuales_area_area_mes_key" ON reportes_mensuales_area (area, mes)`
    );
  } catch { /* ya existe */ }
  _reporteMensualAreaReady = true;
}

/**
 * Crea las tablas del proceso comercial estándar si aún no existen (patrón Neon).
 * proceso_subetapas / proceso_pasos / proceso_reglas. Idempotente.
 */
let _procesoTablasReady = false;

export async function ensureProcesoTablas() {
  if (_procesoTablasReady) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS proceso_subetapas (
        id TEXT PRIMARY KEY,
        etapa TEXT NOT NULL,
        "etapaInterna" TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        orden INTEGER NOT NULL,
        activa BOOLEAN NOT NULL DEFAULT true,
        "generacionAutomatica" BOOLEAN NOT NULL DEFAULT true
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS proceso_pasos (
        id TEXT PRIMARY KEY,
        "subetapaId" TEXT NOT NULL REFERENCES proceso_subetapas(id) ON DELETE CASCADE,
        orden INTEGER NOT NULL,
        dia INTEGER NOT NULL,
        "diaUrgente" INTEGER,
        titulo TEXT NOT NULL,
        objetivo TEXT NOT NULL,
        guion TEXT NOT NULL,
        canal TEXT NOT NULL,
        herramienta TEXT,
        "avanzaSubetapaA" TEXT,
        activo BOOLEAN NOT NULL DEFAULT true
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS proceso_reglas (
        id TEXT PRIMARY KEY,
        orden INTEGER NOT NULL,
        texto TEXT NOT NULL,
        categoria TEXT NOT NULL,
        activa BOOLEAN NOT NULL DEFAULT true
      )
    `);
  } catch { /* ya existen */ }
  _procesoTablasReady = true;
}

/**
 * Faltas administrativas y actas (patrón Neon). Añade metadatos al catálogo
 * (tipos_incidencia) y crea la tabla de actas. Las columnas nuevas de
 * tipos_incidencia se leen desde rutas existentes, así que el DDL también se
 * aplica a producción con scripts/ddl-actas-faltas.ts ANTES del deploy; esta
 * función es el respaldo idempotente. Segura de correr múltiples veces.
 */
let _actasFaltasReady = false;

export async function ensureActasFaltas() {
  if (_actasFaltasReady) return;
  try {
    if (!await columnExists('tipos_incidencia', 'codigo'))
      await prisma.$executeRawUnsafe(`ALTER TABLE tipos_incidencia ADD COLUMN codigo TEXT`);
    if (!await columnExists('tipos_incidencia', 'gravedad'))
      await prisma.$executeRawUnsafe(`ALTER TABLE tipos_incidencia ADD COLUMN gravedad TEXT NOT NULL DEFAULT 'LEVE'`);
    if (!await columnExists('tipos_incidencia', 'deteccion'))
      await prisma.$executeRawUnsafe(`ALTER TABLE tipos_incidencia ADD COLUMN deteccion TEXT NOT NULL DEFAULT 'MANUAL'`);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "tipos_incidencia_codigo_key" ON tipos_incidencia (codigo)`
    );
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS actas_administrativas (
        id TEXT PRIMARY KEY,
        folio TEXT NOT NULL UNIQUE,
        ambito TEXT NOT NULL DEFAULT 'INTERNA',
        personal_id TEXT REFERENCES personal_interno(id) ON DELETE CASCADE,
        persona_nombre TEXT,
        proyecto_id TEXT REFERENCES proyectos(id) ON DELETE SET NULL,
        tipo_id TEXT REFERENCES tipos_incidencia(id) ON DELETE SET NULL,
        puesto_id TEXT,
        gravedad TEXT NOT NULL DEFAULT 'LEVE',
        fecha TIMESTAMP(3) NOT NULL,
        hechos TEXT NOT NULL,
        evidencia_url TEXT,
        nivel_escalon INTEGER NOT NULL DEFAULT 1,
        consecuencia TEXT NOT NULL,
        monto_descuento DOUBLE PRECISION,
        incidencia_id TEXT UNIQUE,
        descargo TEXT,
        levantada_por TEXT,
        estado TEXT NOT NULL DEFAULT 'ABIERTA',
        token TEXT NOT NULL UNIQUE,
        aceptada BOOLEAN NOT NULL DEFAULT false,
        aceptada_nombre TEXT,
        aceptada_en TIMESTAMP(3),
        aceptada_ip TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Ramas de acta (INTERNA/EVENTO) — aditivo idempotente para tablas ya creadas.
    // Estas columnas se leen desde rutas existentes (findMany sin select), por eso el
    // DDL también se aplica a prod con scripts/ddl-actas-ambito.ts ANTES del deploy.
    if (!await columnExists('actas_administrativas', 'ambito'))
      await prisma.$executeRawUnsafe(`ALTER TABLE actas_administrativas ADD COLUMN IF NOT EXISTS ambito TEXT NOT NULL DEFAULT 'INTERNA'`);
    if (!await columnExists('actas_administrativas', 'persona_nombre'))
      await prisma.$executeRawUnsafe(`ALTER TABLE actas_administrativas ADD COLUMN IF NOT EXISTS persona_nombre TEXT`);
    if (!await columnExists('actas_administrativas', 'proyecto_id'))
      await prisma.$executeRawUnsafe(`ALTER TABLE actas_administrativas ADD COLUMN IF NOT EXISTS proyecto_id TEXT`);
    // Relajar NOT NULL heredado: un acta de evento puede no tener ficha interna.
    await prisma.$executeRawUnsafe(`ALTER TABLE actas_administrativas ALTER COLUMN personal_id DROP NOT NULL`);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "actas_administrativas_personal_id_idx" ON actas_administrativas (personal_id)`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "actas_administrativas_proyecto_id_idx" ON actas_administrativas (proyecto_id)`
    );
  } catch { /* ya existe */ }
  _actasFaltasReady = true;
}

