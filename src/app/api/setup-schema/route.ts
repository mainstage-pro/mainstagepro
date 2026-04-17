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

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error), results }, { status: 500 });
  }
}
