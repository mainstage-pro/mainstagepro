import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "setup-mainstage-2026-schema";

export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({}));
  if (secret !== SECRET) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const results: string[] = [];

  try {
    // 1. plantillas_cotizacion
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "plantillas_cotizacion" (
        "id" TEXT NOT NULL,
        "nombre" TEXT NOT NULL,
        "descripcion" TEXT,
        "tipoEvento" TEXT,
        "tipoServicio" TEXT,
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "creadaPorId" TEXT,
        "horasOperacion" DOUBLE PRECISION,
        "tipoJornada" TEXT,
        "diasEquipo" INTEGER NOT NULL DEFAULT 1,
        "diasOperacion" INTEGER NOT NULL DEFAULT 1,
        "diasTransporte" INTEGER NOT NULL DEFAULT 1,
        "diasHospedaje" INTEGER NOT NULL DEFAULT 1,
        "diasComidas" INTEGER NOT NULL DEFAULT 1,
        "observaciones" TEXT,
        "terminosComerciales" TEXT,
        "vigenciaDias" INTEGER NOT NULL DEFAULT 30,
        "aplicaIva" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "plantillas_cotizacion_pkey" PRIMARY KEY ("id")
      );
    `);
    results.push("✅ plantillas_cotizacion");

    // 2. plantillas_cotizacion_lineas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "plantillas_cotizacion_lineas" (
        "id" TEXT NOT NULL,
        "plantillaId" TEXT NOT NULL,
        "tipo" TEXT NOT NULL,
        "equipoId" TEXT,
        "rolTecnicoId" TEXT,
        "descripcion" TEXT NOT NULL,
        "marca" TEXT,
        "modelo" TEXT,
        "nivel" TEXT,
        "jornada" TEXT,
        "esExterno" BOOLEAN NOT NULL DEFAULT false,
        "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
        "dias" INTEGER NOT NULL DEFAULT 1,
        "precioUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "costoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "esIncluido" BOOLEAN NOT NULL DEFAULT false,
        "notas" TEXT,
        "orden" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "plantillas_cotizacion_lineas_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "plantillas_cotizacion_lineas_plantillaId_fkey"
          FOREIGN KEY ("plantillaId") REFERENCES "plantillas_cotizacion"("id") ON DELETE CASCADE
      );
    `);
    results.push("✅ plantillas_cotizacion_lineas");

    // 3. cierres_financieros
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "cierres_financieros" (
        "id" TEXT NOT NULL,
        "proyectoId" TEXT NOT NULL,
        "granTotalEstimado" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "costoEstimado" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "utilidadEstimada" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalCobrado" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalGastado" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "utilidadReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "margenReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "desgloseCostos" TEXT,
        "notas" TEXT,
        "cerradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "cerradoPorId" TEXT,
        CONSTRAINT "cierres_financieros_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "cierres_financieros_proyectoId_key" UNIQUE ("proyectoId"),
        CONSTRAINT "cierres_financieros_proyectoId_fkey"
          FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE
      );
    `);
    results.push("✅ cierres_financieros");

    // 4. portalToken column on proyectos
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "proyectos" ADD COLUMN IF NOT EXISTS "portalToken" TEXT UNIQUE;
    `);
    results.push("✅ proyectos.portalToken");

    // 5. notasPortal column on proyectos
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "proyectos" ADD COLUMN IF NOT EXISTS "notasPortal" TEXT;
    `);
    results.push("✅ proyectos.notasPortal");

    // 6. onboarding_planes
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "onboarding_planes" (
        "id" TEXT NOT NULL,
        "nombre" TEXT NOT NULL,
        "puesto" TEXT NOT NULL,
        "area" TEXT,
        "fecha_ingreso" TIMESTAMP(3),
        "estado" TEXT NOT NULL DEFAULT 'EN_CURSO',
        "notas" TEXT,
        "postulacion_id" TEXT UNIQUE,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "onboarding_planes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "onboarding_planes_postulacion_fkey"
          FOREIGN KEY ("postulacion_id") REFERENCES "postulaciones"("id") ON DELETE SET NULL
      );
    `);
    results.push("✅ onboarding_planes");

    // 7. onboarding_modulos
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "onboarding_modulos" (
        "id" TEXT NOT NULL,
        "plan_id" TEXT NOT NULL,
        "nombre" TEXT NOT NULL,
        "descripcion" TEXT,
        "tipo" TEXT NOT NULL DEFAULT 'ALINEACION',
        "orden" INTEGER NOT NULL DEFAULT 0,
        "duracion_dias" INTEGER,
        "completado" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "onboarding_modulos_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "onboarding_modulos_plan_fkey"
          FOREIGN KEY ("plan_id") REFERENCES "onboarding_planes"("id") ON DELETE CASCADE
      );
    `);
    results.push("✅ onboarding_modulos");

    // 8. onboarding_tareas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "onboarding_tareas" (
        "id" TEXT NOT NULL,
        "modulo_id" TEXT NOT NULL,
        "titulo" TEXT NOT NULL,
        "descripcion" TEXT,
        "tipo" TEXT NOT NULL DEFAULT 'LECTURA',
        "orden" INTEGER NOT NULL DEFAULT 0,
        "completada" BOOLEAN NOT NULL DEFAULT false,
        "completada_en" TIMESTAMP(3),
        "recurso" TEXT,
        "notas" TEXT,
        CONSTRAINT "onboarding_tareas_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "onboarding_tareas_modulo_fkey"
          FOREIGN KEY ("modulo_id") REFERENCES "onboarding_modulos"("id") ON DELETE CASCADE
      );
    `);
    results.push("✅ onboarding_tareas");

    // 9. opcion_letra + grupo_id on cotizaciones
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "opcion_letra" TEXT NOT NULL DEFAULT 'A';
    `);
    results.push("✅ cotizaciones.opcion_letra");

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "grupo_id" TEXT;
    `);
    results.push("✅ cotizaciones.grupo_id");

    // 10. portal_token on proveedores
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "proveedores" ADD COLUMN IF NOT EXISTS "portal_token" TEXT UNIQUE;
    `);
    results.push("✅ proveedores.portal_token");

    // 10. equipos_proveedor
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "equipos_proveedor" (
        "id" TEXT NOT NULL,
        "proveedor_id" TEXT NOT NULL,
        "categoria" TEXT NOT NULL DEFAULT 'OTRO',
        "descripcion" TEXT NOT NULL,
        "marca" TEXT,
        "modelo" TEXT,
        "serial_num" TEXT,
        "anio_fabricacion" INTEGER,
        "cantidad" INTEGER NOT NULL DEFAULT 1,
        "condicion" TEXT NOT NULL DEFAULT 'BUENO',
        "disponibilidad" TEXT NOT NULL DEFAULT 'DISPONIBLE',
        "potencia_w" DOUBLE PRECISION,
        "voltaje" TEXT,
        "amperaje" DOUBLE PRECISION,
        "peso_kg" DOUBLE PRECISION,
        "dimensiones" TEXT,
        "incluye_case" BOOLEAN NOT NULL DEFAULT false,
        "tiempo_setup_min" INTEGER,
        "precio_dia" DOUBLE PRECISION,
        "precio_evento_full" DOUBLE PRECISION,
        "precio_minimo_event" DOUBLE PRECISION,
        "notas" TEXT,
        "fotos_urls" TEXT,
        "ficha_tecnica_url" TEXT,
        "aprobado" BOOLEAN NOT NULL DEFAULT false,
        "importado_equipo_id" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "equipos_proveedor_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "equipos_proveedor_proveedor_fkey"
          FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE CASCADE
      );
    `);
    results.push("✅ equipos_proveedor");

    // 11. precio_publico + precio_mainstage on equipos_proveedor
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "equipos_proveedor" ADD COLUMN IF NOT EXISTS "precio_publico" DOUBLE PRECISION;
    `);
    results.push("✅ equipos_proveedor.precio_publico");

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "equipos_proveedor" ADD COLUMN IF NOT EXISTS "precio_mainstage" DOUBLE PRECISION;
    `);
    results.push("✅ equipos_proveedor.precio_mainstage");

    // 12. columnas faltantes en tecnicos
    await prisma.$executeRawUnsafe(`ALTER TABLE "tecnicos" ADD COLUMN IF NOT EXISTS "habilidades" TEXT;`);
    results.push("✅ tecnicos.habilidades");

    await prisma.$executeRawUnsafe(`ALTER TABLE "tecnicos" ADD COLUMN IF NOT EXISTS "comentarios" TEXT;`);
    results.push("✅ tecnicos.comentarios");

    await prisma.$executeRawUnsafe(`ALTER TABLE "tecnicos" ADD COLUMN IF NOT EXISTS "zona_habitual" TEXT;`);
    results.push("✅ tecnicos.zona_habitual");

    await prisma.$executeRawUnsafe(`ALTER TABLE "tecnicos" ADD COLUMN IF NOT EXISTS "evaluacion_promedio" DOUBLE PRECISION;`);
    results.push("✅ tecnicos.evaluacion_promedio");

    await prisma.$executeRawUnsafe(`ALTER TABLE "tecnicos" ADD COLUMN IF NOT EXISTS "datos_fiscales" TEXT;`);
    results.push("✅ tecnicos.datos_fiscales");

    await prisma.$executeRawUnsafe(`ALTER TABLE "tecnicos" ADD COLUMN IF NOT EXISTS "rol_id" TEXT;`);
    results.push("✅ tecnicos.rol_id");

    // 13. Asignar roles a técnicos importados
    await prisma.$executeRawUnsafe(`
      UPDATE "tecnicos" SET "rol_id" = CASE "id"
        WHEN 'tec-001' THEN 'rol-produccion'
        WHEN 'tec-002' THEN 'rol-coordinacion'
        WHEN 'tec-003' THEN 'rol-coordinacion'
        WHEN 'tec-004' THEN 'rol-dj'
        WHEN 'tec-005' THEN 'rol-audio'
        WHEN 'tec-006' THEN 'rol-video'
        WHEN 'tec-007' THEN 'rol-audio'
        WHEN 'tec-008' THEN 'rol-audio'
        WHEN 'tec-009' THEN 'rol-audio'
        WHEN 'tec-010' THEN 'rol-audio'
        WHEN 'tec-011' THEN 'rol-audio'
        WHEN 'tec-012' THEN 'rol-audio'
        WHEN 'tec-013' THEN 'rol-audio'
        WHEN 'tec-014' THEN 'rol-audio'
        WHEN 'tec-015' THEN 'rol-iluminacion'
        WHEN 'tec-016' THEN 'rol-iluminacion'
        WHEN 'tec-017' THEN 'rol-iluminacion'
        WHEN 'tec-018' THEN 'rol-iluminacion'
        WHEN 'tec-019' THEN 'rol-iluminacion'
        WHEN 'tec-020' THEN 'rol-iluminacion'
        WHEN 'tec-021' THEN 'rol-iluminacion'
        WHEN 'tec-022' THEN 'rol-iluminacion'
        WHEN 'tec-023' THEN 'rol-iluminacion'
        WHEN 'tec-024' THEN 'rol-iluminacion'
        WHEN 'tec-025' THEN 'rol-rigging'
        WHEN 'tec-026' THEN 'rol-stagehand'
        WHEN 'tec-027' THEN 'rol-stagehand'
        WHEN 'tec-028' THEN 'rol-stagehand'
        WHEN 'tec-029' THEN 'rol-stagehand'
        WHEN 'tec-030' THEN 'rol-stagehand'
        WHEN 'tec-031' THEN 'rol-stagehand'
        WHEN 'tec-032' THEN 'rol-stagehand'
        WHEN 'tec-033' THEN 'rol-stagehand'
        WHEN 'tec-034' THEN 'rol-stagehand'
        WHEN 'tec-035' THEN 'rol-stagehand'
        WHEN 'tec-036' THEN 'rol-stagehand'
        WHEN 'tec-037' THEN 'rol-stagehand'
        WHEN 'tec-038' THEN 'rol-stagehand'
        WHEN 'tec-039' THEN 'rol-stagehand'
        WHEN 'tec-040' THEN 'rol-stagehand'
        WHEN 'tec-041' THEN 'rol-stagehand'
        WHEN 'tec-042' THEN 'rol-stagehand'
        WHEN 'tec-043' THEN 'rol-dj'
        WHEN 'tec-044' THEN 'rol-dj'
        WHEN 'tec-045' THEN 'rol-dj'
        WHEN 'tec-046' THEN 'rol-dj'
        WHEN 'tec-047' THEN 'rol-dj'
        WHEN 'tec-048' THEN 'rol-dj'
        WHEN 'tec-049' THEN 'rol-dj'
        WHEN 'tec-050' THEN 'rol-dj'
        WHEN 'tec-051' THEN 'rol-dj'
        WHEN 'tec-052' THEN 'rol-dj'
        WHEN 'tec-053' THEN 'rol-dj'
        ELSE "rol_id"
      END
      WHERE "id" LIKE 'tec-%';
    `);
    results.push("✅ tecnicos — roles asignados");

    // 14. Asignar comentarios a técnicos
    await prisma.$executeRawUnsafe(`
      UPDATE "tecnicos" SET "comentarios" = CASE "id"
        WHEN 'tec-002' THEN 'Coordinador de eventos musicales principalmente, puede realizar coordinación de sociales y empresariales. También: Operador de Iluminación AAA, Stagehand.'
        WHEN 'tec-003' THEN 'También: Supervisión AAA, Operador de Video AA, Stagehand.'
        WHEN 'tec-004' THEN 'Especialidad: Social. También: Coordinación A, Supervisión AA.'
        WHEN 'tec-006' THEN 'También: Operador de Audio A, Stagehand.'
        WHEN 'tec-007' THEN 'También: Operador de Iluminación AA, Stagehand.'
        WHEN 'tec-008' THEN 'También: Stagehand.'
        WHEN 'tec-011' THEN 'También: Stagehand AA.'
        WHEN 'tec-017' THEN 'También: Stagehand.'
        WHEN 'tec-019' THEN 'También: DJ Open Format AA.'
        WHEN 'tec-021' THEN 'También: Stagehand.'
        WHEN 'tec-022' THEN 'También: Stagehand.'
        WHEN 'tec-023' THEN 'También: Stagehand.'
        WHEN 'tec-025' THEN 'También: Stagehand AA.'
        WHEN 'tec-033' THEN 'Conocido como Sock.'
        WHEN 'tec-034' THEN 'Amigo de Roy.'
        WHEN 'tec-041' THEN 'Papá de Luna.'
        WHEN 'tec-043' THEN 'Especialidad: Social. También: Stagehand.'
        WHEN 'tec-044' THEN 'Especialidad: Open Format.'
        WHEN 'tec-045' THEN 'Especialidad: Open Format.'
        WHEN 'tec-046' THEN 'Especialidad: Social.'
        WHEN 'tec-047' THEN 'Especialidad: Open Format.'
        WHEN 'tec-048' THEN 'Especialidad: Social.'
        WHEN 'tec-049' THEN 'Especialidad: Open Format.'
        WHEN 'tec-050' THEN 'Especialidad: Open Format.'
        WHEN 'tec-051' THEN 'Especialidad: Social.'
        WHEN 'tec-052' THEN 'Especialidad: Open Format.'
        WHEN 'tec-053' THEN 'Especialidad: Social.'
        ELSE "comentarios"
      END
      WHERE "id" LIKE 'tec-%';
    `);
    results.push("✅ tecnicos — comentarios asignados");

    // 15. hervam_activos
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "hervam_activos" (
        "id" TEXT NOT NULL,
        "nombre" TEXT NOT NULL,
        "descripcion" TEXT,
        "categoria" TEXT NOT NULL DEFAULT 'EQUIPO',
        "valorAdquisicion" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "valorActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "fechaAdquisicion" TIMESTAMP(3),
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "notas" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "hervam_activos_pkey" PRIMARY KEY ("id")
      );
    `);
    results.push("✅ hervam_activos");

    // 16. hervam_config
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "hervam_config" (
        "id" TEXT NOT NULL,
        "valorTotalActivos" DOUBLE PRECISION NOT NULL DEFAULT 5000000,
        "tasaAnualRendimiento" DOUBLE PRECISION NOT NULL DEFAULT 15,
        "usarSumaActivos" BOOLEAN NOT NULL DEFAULT false,
        "modoActivo" TEXT NOT NULL DEFAULT 'HIBRIDO',
        "porcentajeVariable" DOUBLE PRECISION NOT NULL DEFAULT 25,
        "pisoMinimoFijo" DOUBLE PRECISION NOT NULL DEFAULT 50,
        "creditoSaldoInicial" DOUBLE PRECISION NOT NULL DEFAULT 800000,
        "creditoSaldoActual" DOUBLE PRECISION NOT NULL DEFAULT 800000,
        "creditoCuotaMensual" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "creditoPlazoMeses" INTEGER NOT NULL DEFAULT 48,
        "creditoFechaInicio" TIMESTAMP(3),
        "notas" TEXT,
        "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "hervam_config_pkey" PRIMARY KEY ("id")
      );
    `);
    results.push("✅ hervam_config");

    // 17. hervam_pagos
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "hervam_pagos" (
        "id" TEXT NOT NULL,
        "mes" INTEGER NOT NULL,
        "anio" INTEGER NOT NULL,
        "montoFijo" DOUBLE PRECISION NOT NULL,
        "utilidadMes" DOUBLE PRECISION,
        "montoVariable" DOUBLE PRECISION,
        "montoAcordado" DOUBLE PRECISION NOT NULL,
        "montoPagado" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
        "modoPago" TEXT,
        "notas" TEXT,
        "pagadoEn" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "hervam_pagos_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "hervam_pagos_mes_anio_key" UNIQUE ("mes", "anio")
      );
    `);
    results.push("✅ hervam_pagos");

    // 18. socios
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "socios" (
        "id" TEXT NOT NULL,
        "nombre" TEXT NOT NULL,
        "tipo" TEXT NOT NULL DEFAULT 'FISICA',
        "rfc" TEXT,
        "curp" TEXT,
        "telefono" TEXT,
        "email" TEXT,
        "domicilio" TEXT,
        "colonia" TEXT,
        "ciudad" TEXT,
        "estado" TEXT,
        "cp" TEXT,
        "status" TEXT NOT NULL DEFAULT 'EN_REVISION',
        "notas" TEXT,
        "contratoInicio" TIMESTAMP(3),
        "contratoFin" TIMESTAMP(3),
        "pctSocio" DOUBLE PRECISION NOT NULL DEFAULT 70,
        "pctMainstage" DOUBLE PRECISION NOT NULL DEFAULT 30,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "socios_pkey" PRIMARY KEY ("id")
      );
    `);
    results.push("✅ socios");

    // 19. socios_requisitos
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "socios_requisitos" (
        "id" TEXT NOT NULL,
        "socioId" TEXT NOT NULL,
        "requisito" TEXT NOT NULL,
        "completado" BOOLEAN NOT NULL DEFAULT false,
        "notas" TEXT,
        "orden" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "socios_requisitos_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "socios_requisitos_socioId_fkey"
          FOREIGN KEY ("socioId") REFERENCES "socios"("id") ON DELETE CASCADE
      );
    `);
    results.push("✅ socios_requisitos");

    // 20. socios_activos
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "socios_activos" (
        "id" TEXT NOT NULL,
        "socioId" TEXT NOT NULL,
        "codigoInventario" TEXT NOT NULL,
        "nombre" TEXT NOT NULL,
        "marca" TEXT,
        "modelo" TEXT,
        "serial" TEXT,
        "categoria" TEXT NOT NULL DEFAULT 'AUDIO',
        "condicion" TEXT NOT NULL DEFAULT 'BUENO',
        "valorDeclarado" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "precioDia" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "pctSocioOverride" DOUBLE PRECISION,
        "pctMainstageOverride" DOUBLE PRECISION,
        "fotosUrls" TEXT NOT NULL DEFAULT '[]',
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "notas" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "socios_activos_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "socios_activos_codigoInventario_key" UNIQUE ("codigoInventario"),
        CONSTRAINT "socios_activos_socioId_fkey"
          FOREIGN KEY ("socioId") REFERENCES "socios"("id") ON DELETE CASCADE
      );
    `);
    results.push("✅ socios_activos");

    // 21. socios_mantenimientos
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "socios_mantenimientos" (
        "id" TEXT NOT NULL,
        "activoId" TEXT NOT NULL,
        "tipo" TEXT NOT NULL,
        "descripcion" TEXT NOT NULL,
        "fechaEjecucion" TIMESTAMP(3),
        "costoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "costoSocio" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "costoMainstage" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "realizadoPor" TEXT,
        "notas" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "socios_mantenimientos_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "socios_mantenimientos_activoId_fkey"
          FOREIGN KEY ("activoId") REFERENCES "socios_activos"("id") ON DELETE CASCADE
      );
    `);
    results.push("✅ socios_mantenimientos");

    // 22. socios_rentas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "socios_rentas" (
        "id" TEXT NOT NULL,
        "activoId" TEXT NOT NULL,
        "descripcion" TEXT NOT NULL,
        "proyectoId" TEXT,
        "mes" INTEGER NOT NULL,
        "anio" INTEGER NOT NULL,
        "fechaInicio" TIMESTAMP(3),
        "fechaFin" TIMESTAMP(3),
        "dias" INTEGER NOT NULL DEFAULT 1,
        "precioDia" DOUBLE PRECISION NOT NULL,
        "subtotal" DOUBLE PRECISION NOT NULL,
        "pctSocio" DOUBLE PRECISION NOT NULL,
        "pctMainstage" DOUBLE PRECISION NOT NULL,
        "montoSocio" DOUBLE PRECISION NOT NULL,
        "montoMainstage" DOUBLE PRECISION NOT NULL,
        "notas" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "socios_rentas_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "socios_rentas_activoId_fkey"
          FOREIGN KEY ("activoId") REFERENCES "socios_activos"("id") ON DELETE CASCADE
      );
    `);
    results.push("✅ socios_rentas");

    // 23. socios_reportes
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "socios_reportes" (
        "id" TEXT NOT NULL,
        "socioId" TEXT NOT NULL,
        "mes" INTEGER NOT NULL,
        "anio" INTEGER NOT NULL,
        "totalEventos" INTEGER NOT NULL DEFAULT 0,
        "totalDias" INTEGER NOT NULL DEFAULT 0,
        "totalFacturado" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalSocio" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalMainstage" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
        "pagadoEn" TIMESTAMP(3),
        "notas" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "socios_reportes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "socios_reportes_socioId_mes_anio_key" UNIQUE ("socioId", "mes", "anio"),
        CONSTRAINT "socios_reportes_socioId_fkey"
          FOREIGN KEY ("socioId") REFERENCES "socios"("id") ON DELETE CASCADE
      );
    `);
    results.push("✅ socios_reportes");

    // 24. reportes_semanales
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "reportes_semanales" (
        "id"          TEXT NOT NULL,
        "semana"      TIMESTAMP(3) NOT NULL,
        "fechaInicio" TIMESTAMP(3) NOT NULL,
        "fechaFin"    TIMESTAMP(3) NOT NULL,
        "datos"       TEXT NOT NULL,
        "score"       INTEGER NOT NULL DEFAULT 0,
        "notas"       TEXT,
        "generadoEn"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "reportes_semanales_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "reportes_semanales_semana_key" UNIQUE ("semana")
      );
    `);
    results.push("✅ reportes_semanales");

    // 25. Nuevos campos Trato: contacto venue + horario desmontaje + camposCliente
    await prisma.$executeRawUnsafe(`ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "horaTerminoMontaje" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "contactoVenueNombre" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "contactoVenueTelefono" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "camposCliente" TEXT`);
    results.push("✅ tratos — nuevos campos venue/desmontaje");

    // 26. Campos de ajuste en CxC y CxP
    await prisma.$executeRawUnsafe(`ALTER TABLE "cuentas_cobrar" ADD COLUMN IF NOT EXISTS "montoOriginal" DOUBLE PRECISION`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "cuentas_cobrar" ADD COLUMN IF NOT EXISTS "ajustesLog" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "cuentas_pagar" ADD COLUMN IF NOT EXISTS "montoOriginal" DOUBLE PRECISION`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "cuentas_pagar" ADD COLUMN IF NOT EXISTS "ajustesLog" TEXT`);
    results.push("✅ cxc/cxp — campos de ajuste de monto");

    // 27. Imágenes de equipos propios
    await prisma.$executeRawUnsafe(`ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "imagenUrl" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "imagenesUrls" TEXT`);
    results.push("✅ equipos — campos de imágenes");

    // 28. Mainstage Trade token
    await prisma.$executeRawUnsafe(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "trade_token" TEXT UNIQUE`);
    results.push("✅ cotizaciones — trade_token");

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error), results }, { status: 500 });
  }
}
