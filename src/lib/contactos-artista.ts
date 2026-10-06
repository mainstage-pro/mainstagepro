// Las personas alrededor del artista se dan de alta una vez en `ArtistaPersona` y
// desde ahí las usan el rider, el crew de la gira, el rooming y el promotor del
// show. Una fila ligada (con `personaId`) NO guarda sus datos de contacto: los lee
// de la persona, y al editarlos escribe sobre la persona. Así el celular del FOH se
// corrige en cualquier pantalla y queda corregido en todas.
//
// Las columnas locales (`nombre`, `nombreLibre`, `telefono`, `email`) sobreviven
// para el contacto suelto: el ingeniero que contrataron para una fecha y que nadie
// va a dar de alta a media captura. Ese se puede promover al directorio después.
//
// Lo que NO se resuelve desde la persona es el rol del contexto —`funcion` del crew,
// `rol` del contacto del rider—: alguien que es FOH de planta puede entrar a una
// gira como stage manager, y eso es del renglón, no de la persona.

import type { Prisma, PrismaClient } from "@prisma/client";

export const SELECT_PERSONA = {
  id: true,
  nombre: true,
  rol: true,
  telefono: true,
  email: true,
} as const;

export interface PersonaLigada {
  id: string;
  nombre: string;
  rol: string;
  telefono: string | null;
  email: string | null;
}

export interface TecnicoLigado {
  id: string;
  nombre: string;
  celular: string | null;
}

/// Cualquier renglón que pueda venir ligado. Acepta las dos grafías del nombre
/// local porque el rider lo llama `nombre` y el crew `nombreLibre`.
export interface FilaContacto {
  personaId?: string | null;
  persona?: PersonaLigada | null;
  tecnicoId?: string | null;
  tecnico?: TecnicoLigado | null;
  nombre?: string | null;
  nombreLibre?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export type OrigenContacto = "PERSONA" | "TECNICO" | "SUELTO";

export interface ContactoResuelto {
  nombre: string;
  telefono: string | null;
  email: string | null;
  personaId: string | null;
  tecnicoId: string | null;
  origen: OrigenContacto;
  /// Un contacto ligado se edita en cualquier pantalla y se propaga; uno suelto
  /// vive solo en su renglón hasta que se dé de alta en el directorio.
  ligado: boolean;
}

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/// La verdad de un renglón de contacto. Úsala en TODA lectura —UI, PDF, export—
/// para que nadie imprima la copia vieja.
export function resolverContacto(fila: FilaContacto): ContactoResuelto {
  const local = texto(fila.nombre) ?? texto(fila.nombreLibre);

  if (fila.persona) {
    return {
      nombre: fila.persona.nombre,
      telefono: fila.persona.telefono ?? null,
      email: fila.persona.email ?? null,
      personaId: fila.persona.id,
      tecnicoId: null,
      origen: "PERSONA",
      ligado: true,
    };
  }

  // El técnico es de la casa y su ficha vive en RRHH: aquí se lee, no se reescribe.
  // Lo capturado en el renglón gana como dato de esta gira (el celular prestado).
  if (fila.tecnico) {
    return {
      nombre: fila.tecnico.nombre,
      telefono: texto(fila.telefono) ?? fila.tecnico.celular ?? null,
      email: texto(fila.email),
      personaId: null,
      tecnicoId: fila.tecnico.id,
      origen: "TECNICO",
      ligado: true,
    };
  }

  return {
    nombre: local ?? "Sin nombre",
    telefono: texto(fila.telefono),
    email: texto(fila.email),
    personaId: null,
    tecnicoId: null,
    origen: "SUELTO",
    ligado: false,
  };
}

/// Los tres campos que son de la persona y no del renglón.
export const CAMPOS_DE_PERSONA = ["nombre", "telefono", "email"] as const;

export interface EdicionPartida {
  /// Lo que hay que escribir en `ArtistaPersona` (vacío si no hay nada que mover).
  persona: { nombre?: string; telefono?: string | null; email?: string | null };
  /// Lo que se queda en el renglón.
  local: Record<string, string | null>;
}

/// Parte un PATCH en dos: lo que pertenece a la persona y lo que es del renglón.
/// `nombreLocal` es cómo se llama la columna del nombre en ese modelo.
export function partirEdicion(
  body: Record<string, unknown>,
  opciones: { ligado: boolean; nombreLocal?: "nombre" | "nombreLibre" },
): EdicionPartida {
  const nombreLocal = opciones.nombreLocal ?? "nombre";
  const persona: EdicionPartida["persona"] = {};
  const local: Record<string, string | null> = {};

  for (const campo of CAMPOS_DE_PERSONA) {
    if (!(campo in body)) continue;
    const valor = texto(body[campo]);

    if (opciones.ligado) {
      if (campo === "nombre") {
        // El nombre de una persona dada de alta no se borra desde un renglón.
        if (valor) persona.nombre = valor;
      } else {
        persona[campo] = valor;
      }
      continue;
    }

    local[campo === "nombre" ? nombreLocal : campo] = valor;
  }

  return { persona, local };
}

type ClientePrisma = PrismaClient | Prisma.TransactionClient;

/// Escribe sobre la persona los campos que le tocan y refresca la copia que cada
/// renglón ligado guarda. La copia existe porque `nombre` es obligatorio en esas
/// tablas; refrescarla aquí evita que un export o un query crudo imprima el dato
/// viejo. Devuelve true si movió algo.
///
/// Este es el ÚNICO lugar donde se editan los datos de contacto de una persona:
/// si aparece otra ruta de escritura, la propagación se rompe en silencio.
export async function propagarAPersona(
  db: ClientePrisma,
  personaId: string,
  datos: EdicionPartida["persona"],
): Promise<boolean> {
  if (Object.keys(datos).length === 0) return false;

  await db.artistaPersona.update({ where: { id: personaId }, data: datos });

  const copia: { nombre?: string; telefono?: string | null; email?: string | null } = {};
  if (datos.nombre) copia.nombre = datos.nombre;
  if ("telefono" in datos) copia.telefono = datos.telefono ?? null;
  if ("email" in datos) copia.email = datos.email ?? null;

  await db.artistaRiderContacto.updateMany({ where: { personaId }, data: copia });

  // El crew no copia el nombre (lo resuelve de la persona); solo los medios de contacto.
  const medios: { telefono?: string | null; email?: string | null } = {};
  if ("telefono" in copia) medios.telefono = copia.telefono ?? null;
  if ("email" in copia) medios.email = copia.email ?? null;
  if (Object.keys(medios).length > 0) {
    await db.giraCrew.updateMany({ where: { personaId }, data: medios });
  }

  // En el show, `promotorNombre` es la empresa que promueve y `promotorContacto`
  // la persona con la que se habla: la ligada es la segunda.
  await db.giraShow.updateMany({
    where: { promotorPersonaId: personaId },
    data: {
      ...(copia.nombre ? { promotorContacto: copia.nombre } : {}),
      ...("telefono" in copia ? { promotorTelefono: copia.telefono ?? null } : {}),
      ...("email" in copia ? { promotorEmail: copia.email ?? null } : {}),
    },
  });

  return true;
}

/// Da de alta en el directorio del artista un contacto que estaba suelto, con los
/// datos que ya tenía capturados. No liga nada: el que llama decide a qué renglón
/// apuntar la persona recién creada.
export async function altaEnDirectorio(
  db: ClientePrisma,
  artistaId: string,
  datos: { nombre: string; rol?: string | null; telefono?: string | null; email?: string | null },
): Promise<PersonaLigada> {
  const ultima = await db.artistaPersona.findFirst({
    where: { artistaId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  return db.artistaPersona.create({
    data: {
      artistaId,
      nombre: datos.nombre,
      rol: datos.rol ?? "OTRO",
      telefono: datos.telefono ?? null,
      email: datos.email ?? null,
      orden: (ultima?.orden ?? -1) + 1,
    },
    select: SELECT_PERSONA,
  });
}

/// Busca en el directorio a alguien que ya sea esta persona, para no duplicarla
/// cuando el nombre se capturó suelto. Compara sin acentos ni mayúsculas.
export function mismaPersona(a: string, b: string): boolean {
  const normaliza = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  return normaliza(a) === normaliza(b);
}
