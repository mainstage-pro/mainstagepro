import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizar } from "@/lib/buscar";

/**
 * Búsqueda insensible a acentos contra Postgres.
 *
 * Prisma traduce `contains` a ILIKE, que sí ignora mayúsculas pero no acentos:
 * por eso "jose" nunca encontraba a "José". Aquí la comparación se hace sobre
 * el texto traducido a ASCII. Se usa `translate()` —no la extensión unaccent—
 * para que funcione en cualquier branch de la BD sin instalar nada.
 */
const ACENTOS = "áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ";
const SIN_ACENTOS = "aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC";

function resolver(modelo: string, campos: string[]) {
  const m = Prisma.dmmf.datamodel.models.find((x) => x.name === modelo);
  if (!m) throw new Error(`buscar: modelo desconocido "${modelo}"`);
  const id = m.fields.find((f) => f.isId);
  if (!id) throw new Error(`buscar: el modelo "${modelo}" no tiene id simple`);
  const columnas = campos.map((nombre) => {
    const f = m.fields.find((x) => x.name === nombre);
    if (!f) throw new Error(`buscar: campo desconocido "${modelo}.${nombre}"`);
    return f.dbName ?? f.name;
  });
  return { tabla: m.dbName ?? m.name, pk: id.dbName ?? id.name, columnas };
}

/**
 * Ids de los registros cuyo texto coincide. Se compone con Prisma normal
 * (`where: { id: { in: ids } }`), conservando select, filtros y orderBy.
 */
export async function idsPorTexto(
  modelo: string,
  campos: string[],
  termino: string,
  limite = 500,
): Promise<string[]> {
  const t = normalizar(termino).trim();
  if (!t) return [];
  const { tabla, pk, columnas } = resolver(modelo, campos);
  const patron = `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const condiciones = columnas
    .map((c) => `lower(translate("${c}", $1, $2)) LIKE $3`)
    .join(" OR ");
  const filas = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
    `SELECT "${pk}" FROM "${tabla}" WHERE ${condiciones} LIMIT ${Math.trunc(limite)}`,
    ACENTOS,
    SIN_ACENTOS,
    patron,
  );
  return filas.map((f) => f[pk]);
}
