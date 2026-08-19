// Migración lazy YA APLICADA en prod (verificado 2026-08-19: todas las columnas
// e índices de "tareas" listados abajo ya existen). No-op: aunque el DDL se
// aplicaba con el driver HTTP de Neon (no el pooler de Prisma), el lock
// ACCESS EXCLUSIVE que toma ALTER TABLE ... ADD COLUMN IF NOT EXISTS es una
// propiedad del servidor de Postgres, no del driver — corría en CADA request
// de ~10 endpoints del hub de Tareas (uno de los módulos más visitados de
// Operaciones), bloqueando lecturas concurrentes de la tabla aunque las
// columnas ya existieran.
//
// Columnas que ya están en prod: proyectoEventoId, evidenciaEnviadaAt,
// evidenciaEnviadaPorId, evidenciaEnviadaCanal, tratoId, clienteId, enBandeja,
// noRealizada, motivoNoRealizada, justificacionNoRealizada, evidenciasHistorial
// + índices tareas_proyectoEventoId_idx, tareas_tratoId_idx, tareas_clienteId_idx,
// tareas_enBandeja_idx.
export async function ensureTareaColumns(): Promise<void> {}
