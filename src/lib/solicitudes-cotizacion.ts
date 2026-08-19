// Migración lazy YA APLICADA en prod (verificado 2026-08-19: la tabla
// solicitudes_cotizacion y sus columnas contactoTelefono, clienteId,
// equiposDescripcion y observaciones ya existen). No-op: antes corría
// CREATE TABLE + ALTER TABLE incondicional en cada cold start, y ALTER TABLE
// ... ADD COLUMN IF NOT EXISTS toma un lock ACCESS EXCLUSIVE aunque la columna
// ya exista, bloqueando lecturas concurrentes de la tabla.
export async function ensureSolicitudTables() {}
