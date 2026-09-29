import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const SEED: [string, string, string, string, string, string, number, number, string][] = [
  // nombre, categoria, unidad, descripcion, usoPrincipal, porQueNecesario, minimo, costoAprox, dondeSeCompra
  ["Cinta de aislar negra", "CINTAS", "rollo", "Cinta vinílica de 3/4\" color negro.", "Aislar empalmes eléctricos y sujetar cableado suelto.", "Sin ella no se puede cerrar ni asegurar una conexión eléctrica en sitio.", 6, 25, "Ferretería"],
  ["Gaffer negro", "CINTAS", "rollo", "Cinta de tela mate, no deja residuo.", "Fijar cables al piso y al escenario sin que brille en cámara ni con luz.", "Es la única cinta que sostiene cable en piso sin dañar acabados ni reflejar.", 6, 280, "Proveedor de escenografía"],
  ["Gaffer neón", "CINTAS", "rollo", "Cinta de tela fluorescente (verde/naranja).", "Marcar bordes de escenario, escalones y posiciones en oscuro.", "Es la señalización de seguridad del staff y los artistas cuando baja la luz.", 3, 320, "Proveedor de escenografía"],
  ["Líquido de humo haze", "MÁQUINAS", "litro", "Base agua/aceite para máquina de haze.", "Generar neblina fina y uniforme que revela los haces de luz.", "Sin haze el diseño de iluminación no se ve; los beams quedan invisibles.", 4, 650, "Proveedor de iluminación"],
  ["Líquido de humo fog", "MÁQUINAS", "litro", "Base agua para máquina de humo denso.", "Efectos de humo denso en entradas, cortinillas y momentos clave.", "Se consume mucho más rápido que el haze y no es intercambiable con él.", 4, 450, "Proveedor de iluminación"],
  ["Baterías AA", "ENERGÍA", "paquete", "Alcalinas AA, paquete de 4 o más.", "Micrófonos inalámbricos, bodypacks, lámparas y controles.", "Una batería agotada a mitad de evento tumba un micrófono en vivo.", 24, 120, "Supermercado"],
  ["Grapas", "PAPELERÍA", "caja", "Grapas estándar para engrapadora.", "Armar y cerrar paquetes de documentos de producción en sitio.", "Las fichas y órdenes impresas se entregan engrapadas por área.", 2, 30, "Papelería"],
  ["Plumones Sharpie", "PAPELERÍA", "pieza", "Marcador permanente punta fina/media, negro.", "Rotular cases, cables, canales y cinta de identificación.", "Sin rotulación el desmontaje se vuelve adivinanza y se pierde material.", 6, 45, "Papelería"],
  ["Cinchos de plástico", "SUJECIÓN", "paquete", "Cinchos (cintillos) de nylon, varias medidas.", "Amarrar cableado, sujetar accesorios a truss y ordenar ramales.", "Es la sujeción rápida y desechable que reemplaza amarres improvisados.", 4, 90, "Ferretería"],
  ["Espuma para limpieza", "LIMPIEZA", "pieza", "Espuma limpiadora en aerosol.", "Limpiar gabinetes, consolas y superficies antes de montar.", "El equipo se entrega al cliente presentable; también evita acumulación de mugre.", 2, 110, "Autoservicio"],
  ["Trapos para limpieza", "LIMPIEZA", "pieza", "Franelas y microfibra.", "Limpiar lentes, gabinetes y cases durante montaje y desmontaje.", "Es lo que permite limpiar sin rayar ópticas ni acabados.", 10, 20, "Autoservicio"],
  ["Botiquín básico", "SEGURIDAD", "pieza", "Botiquín con curaciones, antisépticos y analgésicos básicos.", "Atender cortadas, raspones y golpes menores del staff en montaje.", "El montaje es trabajo físico con riesgo real; no puede faltar en la unidad.", 1, 400, "Farmacia"],
];

async function main() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS insumos (
      id TEXT PRIMARY KEY,
      "nombre" TEXT NOT NULL,
      "descripcion" TEXT,
      "usoPrincipal" TEXT,
      "porQueNecesario" TEXT,
      "categoria" TEXT NOT NULL DEFAULT 'GENERAL',
      "unidad" TEXT NOT NULL DEFAULT 'pieza',
      "cantidadActual" INTEGER NOT NULL DEFAULT 0,
      "minimo" INTEGER NOT NULL DEFAULT 1,
      "dondeSeCompra" TEXT,
      "costoAprox" DOUBLE PRECISION,
      "notas" TEXT,
      "orden" INTEGER NOT NULL DEFAULT 0,
      "activo" BOOLEAN NOT NULL DEFAULT true,
      "revisadoEn" TIMESTAMP(3),
      "revisadoPor" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existentes = await sql.query(`SELECT COUNT(*)::int AS n FROM insumos`);
  if (existentes[0].n > 0) {
    console.log(`Tabla insumos ya tiene ${existentes[0].n} filas — no se siembra.`);
    return;
  }

  let orden = 0;
  for (const [nombre, categoria, unidad, descripcion, usoPrincipal, porQue, minimo, costo, donde] of SEED) {
    await sql.query(
      `INSERT INTO insumos (id, "nombre", "categoria", "unidad", "descripcion", "usoPrincipal", "porQueNecesario", "minimo", "costoAprox", "dondeSeCompra", "orden")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [nombre, categoria, unidad, descripcion, usoPrincipal, porQue, minimo, costo, donde, orden++],
    );
  }
  console.log(`OK insumos: tabla creada y ${SEED.length} insumos sembrados.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
