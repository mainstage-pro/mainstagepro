/**
 * Búsqueda insensible a acentos, para filtros en pantalla.
 *
 * Los datos se guardan y se muestran con sus acentos intactos; sólo la
 * comparación los ignora, para que "jose ramirez" encuentre a "José Ramírez".
 *
 * Este módulo corre igual en cliente y servidor: no importes nada de la BD aquí
 * (la variante que consulta Postgres vive en `@/lib/buscar-servidor`).
 */

export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** ¿Alguno de los campos contiene el término, ignorando acentos y mayúsculas? */
export function coincide(termino: string, ...campos: (string | null | undefined)[]): boolean {
  const t = normalizar(termino).trim();
  if (!t) return true;
  return campos.some((campo) => campo != null && normalizar(campo).includes(t));
}
