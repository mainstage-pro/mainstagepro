import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

type Q = {
  ref: string; texto: string; tipoRespuesta: string; opciones?: string[];
  alcance: "general" | "tipo"; tipoEventoSlug?: string; bloque?: string;
  obligatoria?: boolean; padreRef?: string; condicionValor?: string;
};

const GENERALES: Q[] = [
  { ref: "a1", texto: "¿El evento es en interior, exterior o mixto?", tipoRespuesta: "OPCION_UNICA", opciones: ["Interior", "Exterior", "Mixto"], alcance: "general", bloque: "A", obligatoria: true },
  { ref: "a2", texto: "¿Hay riesgo de lluvia o sol directo sobre el área del equipo?", tipoRespuesta: "SI_NO", alcance: "general", bloque: "A", padreRef: "a1", condicionValor: "Exterior|Mixto" },
  { ref: "a3", texto: "¿El piso del área de montaje es firme y nivelado?", tipoRespuesta: "SI_NO", alcance: "general", bloque: "A", padreRef: "a1", condicionValor: "Exterior|Mixto" },
  { ref: "a4", texto: "¿El lugar tiene energía eléctrica suficiente y contactos cerca del escenario?", tipoRespuesta: "SI_NO", alcance: "general", bloque: "A", obligatoria: true },
  { ref: "a5", texto: "¿Hay acceso vehicular para carga y descarga cerca del área de montaje?", tipoRespuesta: "SI_NO", alcance: "general", bloque: "A", obligatoria: true },
  { ref: "a6", texto: "¿Hay escaleras o se requiere subir equipo a otro nivel?", tipoRespuesta: "SI_NO", alcance: "general", bloque: "A", obligatoria: true },
  { ref: "a7", texto: "¿A qué hora podemos entrar a montar y hasta qué hora se puede desmontar?", tipoRespuesta: "TEXTO", alcance: "general", bloque: "A", obligatoria: true },
  { ref: "b8", texto: "¿Qué necesitas para tu evento?", tipoRespuesta: "OPCION_MULTIPLE", opciones: ["Audio", "Iluminación", "Micrófonos", "Pantalla o video", "Escenario/entarimado", "Estructura o rigging", "Energía/planta de luz", "Aún no lo sé"], alcance: "general", bloque: "B", obligatoria: true },
  { ref: "b9", texto: "¿Cuánta gente esperas y en qué horario se concentra?", tipoRespuesta: "TEXTO", alcance: "general", bloque: "B", obligatoria: true },
  { ref: "b10", texto: "¿Habrá micrófonos para hablar (presentador, discursos, ceremonia)?", tipoRespuesta: "SI_NO", alcance: "general", bloque: "B", obligatoria: true },
  { ref: "b11", texto: "¿Habrá música en vivo (banda, grupo, DJ, mariachi)?", tipoRespuesta: "SI_NO", alcance: "general", bloque: "B", obligatoria: true },
  { ref: "c12", texto: "¿Quién opera el equipo durante el evento?", tipoRespuesta: "OPCION_UNICA", opciones: ["Solo renta", "Con técnico", "Producción completa"], alcance: "general", bloque: "C", obligatoria: true },
  { ref: "c13", texto: "¿Cuánto dura el evento y se requiere prueba de sonido o ensayo previo?", tipoRespuesta: "TEXTO", alcance: "general", bloque: "C", obligatoria: true },
  { ref: "c14", texto: "¿Qué otros proveedores participan? (DJ, banda, AV, foto y video, planner, salón)", tipoRespuesta: "TEXTO", alcance: "general", bloque: "C" },
  { ref: "c15", texto: "¿Ya tienes un presupuesto asignado para esta parte del evento?", tipoRespuesta: "TEXTO", alcance: "general", bloque: "C" },
  { ref: "c16", texto: "¿Para cuándo necesitas la propuesta y cuándo tomas la decisión?", tipoRespuesta: "TEXTO", alcance: "general", bloque: "C" },
  { ref: "c17", texto: "¿Hay algo que salió mal en un evento anterior que quieras evitar?", tipoRespuesta: "TEXTO", alcance: "general", bloque: "C" },
];

const OTROS: Q[] = [
  { ref: "o1", texto: "Descríbenos el evento en una frase: ¿qué es y qué se va a hacer ahí?", tipoRespuesta: "TEXTO", alcance: "tipo", tipoEventoSlug: "otro" },
  { ref: "o2", texto: "¿Es un evento público, privado o corporativo?", tipoRespuesta: "OPCION_UNICA", opciones: ["Público", "Privado", "Corporativo"], alcance: "tipo", tipoEventoSlug: "otro" },
  { ref: "o3", texto: "¿Hay presentaciones, discursos o contenido desde escenario?", tipoRespuesta: "SI_NO", alcance: "tipo", tipoEventoSlug: "otro" },
  { ref: "o4", texto: "¿Se transmite en vivo o se graba?", tipoRespuesta: "SI_NO", alcance: "tipo", tipoEventoSlug: "otro" },
  { ref: "o5", texto: "¿Es de un solo día o de varios días?", tipoRespuesta: "OPCION_UNICA", opciones: ["Un día", "Varios días"], alcance: "tipo", tipoEventoSlug: "otro" },
  { ref: "o6", texto: "¿Hay montaje o escenografía de otro proveedor con la que debamos convivir?", tipoRespuesta: "SI_NO", alcance: "tipo", tipoEventoSlug: "otro" },
  { ref: "o7", texto: "¿Se repite este evento (es recurrente) o es único?", tipoRespuesta: "OPCION_UNICA", opciones: ["Recurrente", "Único"], alcance: "tipo", tipoEventoSlug: "otro" },
];

async function main() {
  const todas = [...GENERALES, ...OTROS];
  const maxRow = await sql.query(`SELECT COALESCE(MAX("orden"),0) AS m FROM "preguntas_descubrimiento"`);
  let orden = Number(maxRow[0].m) + 1;
  let creadas = 0, actualizadas = 0;

  for (const q of todas) {
    const opciones = q.opciones ? JSON.stringify(q.opciones) : null;
    const tipoEventoSlug = q.alcance === "tipo" ? (q.tipoEventoSlug ?? null) : null;
    const bloque = q.alcance === "general" ? (q.bloque ?? null) : null;
    const existe = await sql.query(`SELECT "id" FROM "preguntas_descubrimiento" WHERE "texto"=$1 LIMIT 1`, [q.texto]);
    if (existe.length) {
      await sql.query(
        `UPDATE "preguntas_descubrimiento"
           SET "tipoRespuesta"=$2, "opciones"=$3, "nichos"=NULL, "alcance"=$4,
               "tipoEventoSlug"=$5, "bloque"=$6, "obligatoria"=$7, "activa"=true, "updatedAt"=NOW()
         WHERE "texto"=$1`,
        [q.texto, q.tipoRespuesta, opciones, q.alcance, tipoEventoSlug, bloque, !!q.obligatoria]
      );
      actualizadas++;
    } else {
      await sql.query(
        `INSERT INTO "preguntas_descubrimiento"
           ("id","texto","tipoRespuesta","opciones","nichos","alcance","tipoEventoSlug","bloque","obligatoria","activa","orden","createdAt","updatedAt")
         VALUES (gen_random_uuid()::text,$1,$2,$3,NULL,$4,$5,$6,$7,true,$8,NOW(),NOW())`,
        [q.texto, q.tipoRespuesta, opciones, q.alcance, tipoEventoSlug, bloque, !!q.obligatoria, orden++]
      );
      creadas++;
    }
  }

  // Enlace de condicionales por texto de padre.
  const porRef = new Map(todas.map(q => [q.ref, q.texto]));
  for (const q of todas) {
    if (!q.padreRef) continue;
    const padreTexto = porRef.get(q.padreRef);
    await sql.query(
      `UPDATE "preguntas_descubrimiento"
         SET "preguntaPadreId" = (SELECT "id" FROM "preguntas_descubrimiento" WHERE "texto"=$2 LIMIT 1),
             "condicionValor" = $3, "updatedAt"=NOW()
       WHERE "texto"=$1`,
      [q.texto, padreTexto, q.condicionValor ?? null]
    );
  }

  console.log(`preguntas base: creadas=${creadas} actualizadas=${actualizadas} (generales=${GENERALES.length}, otros=${OTROS.length})`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
