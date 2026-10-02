-- AlterTable
ALTER TABLE "proveedores" ADD COLUMN IF NOT EXISTS "ciudades" TEXT,
ADD COLUMN IF NOT EXISTS "disciplinas" TEXT;

-- AlterTable
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "accesoEscenario" TEXT,
ADD COLUMN IF NOT EXISTS "alturaRejaM" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "camerinos" TEXT,
ADD COLUMN IF NOT EXISTS "contactoTecnicoEmail" TEXT,
ADD COLUMN IF NOT EXISTS "contactoTecnicoNombre" TEXT,
ADD COLUMN IF NOT EXISTS "contactoTecnicoTelefono" TEXT,
ADD COLUMN IF NOT EXISTS "horarioCarga" TEXT,
ADD COLUMN IF NOT EXISTS "medidasEscenario" TEXT,
ADD COLUMN IF NOT EXISTS "notasTecnicas" TEXT,
ADD COLUMN IF NOT EXISTS "riderCasaUrl" TEXT;

-- AlterTable
ALTER TABLE "artistas" ADD COLUMN IF NOT EXISTS "clienteId" TEXT,
ADD COLUMN IF NOT EXISTS "integrantesNum" INTEGER,
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "tipoFormacion" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "artista_personas" (
    "id" TEXT NOT NULL,
    "artistaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "instrumento" TEXT,
    "esIntegrante" BOOLEAN NOT NULL DEFAULT false,
    "esContactoClave" BOOLEAN NOT NULL DEFAULT false,
    "telefono" TEXT,
    "email" TEXT,
    "tallaPlayera" TEXT,
    "notasHospitalidad" TEXT,
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artista_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "artista_riders" (
    "id" TEXT NOT NULL,
    "artistaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "esActivo" BOOLEAN NOT NULL DEFAULT true,
    "formacion" TEXT,
    "requerimientosGenerales" TEXT,
    "notasFoh" TEXT,
    "notasMonitoreo" TEXT,
    "notasBackline" TEXT,
    "notasIluminacion" TEXT,
    "notasVideo" TEXT,
    "notasEnergia" TEXT,
    "notasEscenario" TEXT,
    "notasHospitalidad" TEXT,
    "notasCrewRequerido" TEXT,
    "escenarioAnchoM" DOUBLE PRECISION,
    "escenarioProfundoM" DOUBLE PRECISION,
    "escenarioAlturaM" DOUBLE PRECISION,
    "stagePlotUrl" TEXT,
    "canalesMinimos" INTEGER,
    "mixesMonitor" INTEGER,
    "tiempoSoundcheckMin" INTEGER,
    "tiempoCambioMin" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artista_riders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "artista_rider_canales" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "instrumento" TEXT,
    "microfono" TEXT,
    "alternativas" TEXT,
    "soporte" TEXT,
    "phantom" BOOLEAN NOT NULL DEFAULT false,
    "inserto" TEXT,
    "tipoSalida" TEXT,
    "estereo" BOOLEAN NOT NULL DEFAULT false,
    "personaId" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artista_rider_canales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "artista_rider_lineas" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "unidad" TEXT,
    "equipoId" TEXT,
    "preferido" TEXT,
    "aceptables" TEXT,
    "noAceptable" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'INDISPENSABLE',
    "provistoPor" TEXT NOT NULL DEFAULT 'CASA',
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artista_rider_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "giras" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT,
    "artistaId" TEXT NOT NULL,
    "clienteId" TEXT,
    "tratoId" TEXT,
    "riderId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PLANEACION',
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "rolMainstage" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "contactoPrincipalId" TEXT,
    "notas" TEXT,
    "portalToken" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "giras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gira_shows" (
    "id" TEXT NOT NULL,
    "giraId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fecha" TIMESTAMP(3) NOT NULL,
    "ciudad" TEXT,
    "venueId" TEXT,
    "proyectoId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'POR_CONFIRMAR',
    "tipoShow" TEXT,
    "promotorNombre" TEXT,
    "promotorContacto" TEXT,
    "promotorTelefono" TEXT,
    "promotorEmail" TEXT,
    "aforoEsperado" INTEGER,
    "horaLoadIn" TEXT,
    "horaMontaje" TEXT,
    "horaLineCheck" TEXT,
    "horaSoundcheck" TEXT,
    "horaDoors" TEXT,
    "horaShow" TEXT,
    "horaFin" TEXT,
    "horaLoadOut" TEXT,
    "curfew" TEXT,
    "contactoCasaNombre" TEXT,
    "contactoCasaTelefono" TEXT,
    "contactoCasaEmail" TEXT,
    "riderEnviadoEn" TIMESTAMP(3),
    "advanceCerradoEn" TIMESTAMP(3),
    "notas" TEXT,
    "docsToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gira_shows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "show_rider_lineas" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "riderLineaId" TEXT,
    "disciplina" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "cantidadPedida" INTEGER NOT NULL DEFAULT 1,
    "prioridad" TEXT NOT NULL DEFAULT 'INDISPENSABLE',
    "ofrecidoCasa" TEXT,
    "cantidadCasa" INTEGER NOT NULL DEFAULT 0,
    "cubiertoPor" TEXT NOT NULL DEFAULT 'POR_DEFINIR',
    "cantidadCubierta" INTEGER NOT NULL DEFAULT 0,
    "equipoId" TEXT,
    "proveedorId" TEXT,
    "costoEstimado" DOUBLE PRECISION,
    "costoConfirmado" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "aprobadoPorArtista" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "show_rider_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gira_show_bloques" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "hora" TEXT,
    "horaFin" TEXT,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PROGRAMA',
    "responsable" TEXT,
    "lugar" TEXT,
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gira_show_bloques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gira_crew" (
    "id" TEXT NOT NULL,
    "giraId" TEXT NOT NULL,
    "showId" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'MAINSTAGE',
    "tecnicoId" TEXT,
    "personaId" TEXT,
    "nombreLibre" TEXT,
    "funcion" TEXT NOT NULL,
    "rolTecnicoId" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "llamado" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gira_crew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gira_hospedajes" (
    "id" TEXT NOT NULL,
    "giraId" TEXT NOT NULL,
    "ciudad" TEXT,
    "hotelNombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "linkMaps" TEXT,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "confirmacion" TEXT,
    "costoTotal" DOUBLE PRECISION,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gira_hospedajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gira_roomings" (
    "id" TEXT NOT NULL,
    "giraId" TEXT NOT NULL,
    "hospedajeId" TEXT,
    "showId" TEXT,
    "crewId" TEXT,
    "personaId" TEXT,
    "nombreLibre" TEXT,
    "habitacion" TEXT,
    "tipoHabitacion" TEXT,
    "comparteCon" TEXT,
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gira_roomings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gira_viajes" (
    "id" TEXT NOT NULL,
    "giraId" TEXT NOT NULL,
    "showId" TEXT,
    "crewId" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'VUELO',
    "concepto" TEXT,
    "origen" TEXT,
    "destino" TEXT,
    "salida" TIMESTAMP(3),
    "llegada" TIMESTAMP(3),
    "operador" TEXT,
    "identificador" TEXT,
    "reserva" TEXT,
    "costo" DOUBLE PRECISION,
    "esGrupal" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gira_viajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gira_setlists" (
    "id" TEXT NOT NULL,
    "giraId" TEXT NOT NULL,
    "showId" TEXT,
    "nombre" TEXT NOT NULL,
    "esBase" BOOLEAN NOT NULL DEFAULT false,
    "duracionMin" INTEGER,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gira_setlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gira_setlist_canciones" (
    "id" TEXT NOT NULL,
    "setlistId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "titulo" TEXT NOT NULL,
    "duracionSeg" INTEGER,
    "tonalidad" TEXT,
    "bpm" INTEGER,
    "conTrack" BOOLEAN NOT NULL DEFAULT false,
    "notasAudio" TEXT,
    "notasLuces" TEXT,
    "notasVideo" TEXT,
    "cambioInstrumento" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gira_setlist_canciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gira_archivos" (
    "id" TEXT NOT NULL,
    "giraId" TEXT NOT NULL,
    "showId" TEXT,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "tamanoBytes" INTEGER,
    "subidoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gira_archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "servicios_pm" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "descripcion" TEXT,
    "entregables" TEXT,
    "incluye" TEXT,
    "noIncluye" TEXT,
    "unidadDefault" TEXT NOT NULL DEFAULT 'SHOW',
    "tipoLinea" TEXT NOT NULL DEFAULT 'HONORARIO',
    "precioSugerido" DOUBLE PRECISION,
    "costoSugerido" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicios_pm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "propuestas_servicio" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "clienteId" TEXT,
    "artistaId" TEXT,
    "giraId" TEXT,
    "tratoId" TEXT,
    "creadaPorId" TEXT,
    "titulo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "modeloCobro" TEXT NOT NULL DEFAULT 'POR_SHOW',
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "vigenciaHasta" TIMESTAMP(3),
    "alcance" TEXT,
    "exclusiones" TEXT,
    "supuestos" TEXT,
    "condicionesPago" TEXT,
    "notasInternas" TEXT,
    "aplicaIva" BOOLEAN NOT NULL DEFAULT true,
    "subtotalHonorarios" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotalEquipo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotalLogistica" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotalReembolsables" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuentoMonto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuentoRazon" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montoIva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "granTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoEstimado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aprobacionToken" TEXT,
    "aprobacionFecha" TIMESTAMP(3),
    "aprobacionNombre" TEXT,
    "enviadaEn" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propuestas_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "propuesta_servicio_lineas" (
    "id" TEXT NOT NULL,
    "propuestaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidad" TEXT NOT NULL DEFAULT 'SHOW',
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "precioUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esIncluido" BOOLEAN NOT NULL DEFAULT false,
    "esReembolsable" BOOLEAN NOT NULL DEFAULT false,
    "servicioId" TEXT,
    "equipoId" TEXT,
    "rolTecnicoId" TEXT,
    "showId" TEXT,
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propuesta_servicio_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "venue_inventario" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "marca" TEXT,
    "modelo" TEXT,
    "condicion" TEXT,
    "incluidoEnRenta" BOOLEAN NOT NULL DEFAULT true,
    "costoExtra" DOUBLE PRECISION,
    "verificadoEn" TIMESTAMP(3),
    "verificadoPor" TEXT,
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "artista_personas_artistaId_idx" ON "artista_personas"("artistaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "artista_riders_artistaId_idx" ON "artista_riders"("artistaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "artista_rider_canales_riderId_tipo_numero_idx" ON "artista_rider_canales"("riderId", "tipo", "numero");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "artista_rider_lineas_riderId_idx" ON "artista_rider_lineas"("riderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "giras_slug_key" ON "giras"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "giras_portalToken_key" ON "giras"("portalToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "giras_artistaId_idx" ON "giras"("artistaId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "gira_shows_proyectoId_key" ON "gira_shows"("proyectoId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "gira_shows_docsToken_key" ON "gira_shows"("docsToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gira_shows_giraId_fecha_idx" ON "gira_shows"("giraId", "fecha");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "show_rider_lineas_showId_idx" ON "show_rider_lineas"("showId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gira_show_bloques_showId_idx" ON "gira_show_bloques"("showId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gira_crew_giraId_idx" ON "gira_crew"("giraId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gira_hospedajes_giraId_idx" ON "gira_hospedajes"("giraId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gira_roomings_giraId_idx" ON "gira_roomings"("giraId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gira_viajes_giraId_idx" ON "gira_viajes"("giraId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gira_setlists_giraId_idx" ON "gira_setlists"("giraId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gira_setlist_canciones_setlistId_idx" ON "gira_setlist_canciones"("setlistId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gira_archivos_giraId_idx" ON "gira_archivos"("giraId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "servicios_pm_clave_key" ON "servicios_pm"("clave");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "propuestas_servicio_numero_key" ON "propuestas_servicio"("numero");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "propuestas_servicio_aprobacionToken_key" ON "propuestas_servicio"("aprobacionToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "propuesta_servicio_lineas_propuestaId_idx" ON "propuesta_servicio_lineas"("propuestaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "venue_inventario_venueId_disciplina_idx" ON "venue_inventario"("venueId", "disciplina");

-- AddForeignKey
ALTER TABLE "artistas" ADD CONSTRAINT "artistas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artista_personas" ADD CONSTRAINT "artista_personas_artistaId_fkey" FOREIGN KEY ("artistaId") REFERENCES "artistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artista_riders" ADD CONSTRAINT "artista_riders_artistaId_fkey" FOREIGN KEY ("artistaId") REFERENCES "artistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artista_rider_canales" ADD CONSTRAINT "artista_rider_canales_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "artista_riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artista_rider_canales" ADD CONSTRAINT "artista_rider_canales_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "artista_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artista_rider_lineas" ADD CONSTRAINT "artista_rider_lineas_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "artista_riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artista_rider_lineas" ADD CONSTRAINT "artista_rider_lineas_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giras" ADD CONSTRAINT "giras_artistaId_fkey" FOREIGN KEY ("artistaId") REFERENCES "artistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giras" ADD CONSTRAINT "giras_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giras" ADD CONSTRAINT "giras_tratoId_fkey" FOREIGN KEY ("tratoId") REFERENCES "tratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giras" ADD CONSTRAINT "giras_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "artista_riders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giras" ADD CONSTRAINT "giras_contactoPrincipalId_fkey" FOREIGN KEY ("contactoPrincipalId") REFERENCES "artista_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_shows" ADD CONSTRAINT "gira_shows_giraId_fkey" FOREIGN KEY ("giraId") REFERENCES "giras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_shows" ADD CONSTRAINT "gira_shows_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_shows" ADD CONSTRAINT "gira_shows_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_rider_lineas" ADD CONSTRAINT "show_rider_lineas_showId_fkey" FOREIGN KEY ("showId") REFERENCES "gira_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_rider_lineas" ADD CONSTRAINT "show_rider_lineas_riderLineaId_fkey" FOREIGN KEY ("riderLineaId") REFERENCES "artista_rider_lineas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_rider_lineas" ADD CONSTRAINT "show_rider_lineas_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_rider_lineas" ADD CONSTRAINT "show_rider_lineas_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_show_bloques" ADD CONSTRAINT "gira_show_bloques_showId_fkey" FOREIGN KEY ("showId") REFERENCES "gira_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_crew" ADD CONSTRAINT "gira_crew_giraId_fkey" FOREIGN KEY ("giraId") REFERENCES "giras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_crew" ADD CONSTRAINT "gira_crew_showId_fkey" FOREIGN KEY ("showId") REFERENCES "gira_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_crew" ADD CONSTRAINT "gira_crew_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_crew" ADD CONSTRAINT "gira_crew_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "artista_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_crew" ADD CONSTRAINT "gira_crew_rolTecnicoId_fkey" FOREIGN KEY ("rolTecnicoId") REFERENCES "roles_tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_hospedajes" ADD CONSTRAINT "gira_hospedajes_giraId_fkey" FOREIGN KEY ("giraId") REFERENCES "giras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_roomings" ADD CONSTRAINT "gira_roomings_giraId_fkey" FOREIGN KEY ("giraId") REFERENCES "giras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_roomings" ADD CONSTRAINT "gira_roomings_hospedajeId_fkey" FOREIGN KEY ("hospedajeId") REFERENCES "gira_hospedajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_roomings" ADD CONSTRAINT "gira_roomings_showId_fkey" FOREIGN KEY ("showId") REFERENCES "gira_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_roomings" ADD CONSTRAINT "gira_roomings_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "gira_crew"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_roomings" ADD CONSTRAINT "gira_roomings_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "artista_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_viajes" ADD CONSTRAINT "gira_viajes_giraId_fkey" FOREIGN KEY ("giraId") REFERENCES "giras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_viajes" ADD CONSTRAINT "gira_viajes_showId_fkey" FOREIGN KEY ("showId") REFERENCES "gira_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_viajes" ADD CONSTRAINT "gira_viajes_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "gira_crew"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_setlists" ADD CONSTRAINT "gira_setlists_giraId_fkey" FOREIGN KEY ("giraId") REFERENCES "giras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_setlists" ADD CONSTRAINT "gira_setlists_showId_fkey" FOREIGN KEY ("showId") REFERENCES "gira_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_setlist_canciones" ADD CONSTRAINT "gira_setlist_canciones_setlistId_fkey" FOREIGN KEY ("setlistId") REFERENCES "gira_setlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_archivos" ADD CONSTRAINT "gira_archivos_giraId_fkey" FOREIGN KEY ("giraId") REFERENCES "giras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gira_archivos" ADD CONSTRAINT "gira_archivos_showId_fkey" FOREIGN KEY ("showId") REFERENCES "gira_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_servicio" ADD CONSTRAINT "propuestas_servicio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_servicio" ADD CONSTRAINT "propuestas_servicio_artistaId_fkey" FOREIGN KEY ("artistaId") REFERENCES "artistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_servicio" ADD CONSTRAINT "propuestas_servicio_giraId_fkey" FOREIGN KEY ("giraId") REFERENCES "giras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_servicio" ADD CONSTRAINT "propuestas_servicio_tratoId_fkey" FOREIGN KEY ("tratoId") REFERENCES "tratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuesta_servicio_lineas" ADD CONSTRAINT "propuesta_servicio_lineas_propuestaId_fkey" FOREIGN KEY ("propuestaId") REFERENCES "propuestas_servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuesta_servicio_lineas" ADD CONSTRAINT "propuesta_servicio_lineas_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios_pm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuesta_servicio_lineas" ADD CONSTRAINT "propuesta_servicio_lineas_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuesta_servicio_lineas" ADD CONSTRAINT "propuesta_servicio_lineas_rolTecnicoId_fkey" FOREIGN KEY ("rolTecnicoId") REFERENCES "roles_tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuesta_servicio_lineas" ADD CONSTRAINT "propuesta_servicio_lineas_showId_fkey" FOREIGN KEY ("showId") REFERENCES "gira_shows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_inventario" ADD CONSTRAINT "venue_inventario_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

