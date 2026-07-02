// Re-seed con datos correctos de la imagen del inventario de activos
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Función: primera letra mayúscula, resto minúscula
function tc(str: string | null | undefined): string | null {
  if (!str?.trim()) return null;
  const s = str.trim().replace(/\s+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// [cantidad, artículo, marca?, modelo?]  — exactamente como aparece en el documento
const inventario: [number, string, string?, string?][] = [
  [1,  "REFRIGERADOR"],
  [1,  "HORNO DE MICRO ONDAS",                  "BLACK AND DECKER"],
  [1,  "SMART TV 50\"",                          "HISENSE"],
  [1,  "SMART TV 85\"",                          "HISENSE"],
  [2,  "GARRAFONES DE AGUA",                     "CIEL"],
  [1,  "BOCINA",                                 "BOSÉ"],
  [1,  "IMPRESORA",                              "CANON"],
  [6,  "SILLAS DE OFICINA (CON RUEDAS)"],
  [6,  "SILLAS DE ACRILICO NEGRAS"],
  [1,  "MESA DE MELAMINA (SALA DE JUNTAS)"],
  [1,  "LIBRERO DE MELAMINA"],
  [1,  "ESCRITORIO DE VIDRIO"],
  [1,  "ESCRITORIO DE MELAMINA"],
  [1,  "VENTILADOR DE TORRE NEGRO",              "LASKO"],
  [1,  "VENTILADOR DE PISO NEGRO"],
  [3,  "VENTILADORES BLANCOS",                   "VORTEX"],
  [1,  "VENTILADOR DE METAL NEGRO",              "COMERCIAL ELECTRIC"],
  [3,  "MESAS PLEGABLES NEGRAS"],
  [1,  "CAMARA FOTO FIJA",                       "SONY",      "Aps-c Ilce-6700 Premium Con Montura E"],
  [3,  "BATERIAS",                               "NP F2100"],
  [1,  "LUZ LED PARA CAMARA",                    "NP VLANZI", "NP ULANZI"],
  [3,  "ROUTER",                                 "DECO",      "TP LINK"],
  [1,  "MACBOOK AIR 13\"",                       "APPLE"],
  [1,  "VENTILADOR PARA LAP",                    "STEREN"],
  [1,  "GO PRO",                                 "GO PRO",    "HERO 13"],
  [2,  "TECLADO INALAMBRICO",                    "STEREN"],
  [1,  "ESTUCHE CON 2 MICROFONOS RECARGABLES",   "STEREN"],
  [1,  "DECODIFICADOR XVIEW",                    "MEGACABLE"],
  [1,  "RELOJ CHECADOR"],
  [1,  "BOMBA DE AGUA"],
  [1,  "MESA DE JARDIN (COCINA)"],
  [1,  "CAFETERA",                               "T FAL"],
  [1,  "ESCALERA DE ALUMINIO"],
  [2,  "ANAQUEL DE ACERO NEGRO"],
  [2,  "ANAQUEL DE ACERO GRIS"],
  [2,  "ANAQUEL DE PLASTICO NEGRO"],
  [1,  "MONITOR TOUCH PORTATIL",                 "ROHS"],
  [1,  "LAPTOP",                                 "HP",        "VICTUS"],
  [5,  "EXTINTOR 2KG",                           "MIKELS"],
  [1,  "EXTINTOR 1KG",                           "MIKELS"],
  [1,  "TABLET",                                 "SAMSUNG",   "GALAXY TAB A9+"],
  [4,  "TARIMAS DE PLASTICO NEGRAS"],
  [2,  "TRIPIES PARA CAMARA"],
  [1,  "LENTE",                                  "SONY",      "E Pz 16-50 Mm F3.5-5.6 Oss Ii Selp16502"],
  [1,  "DRONE",                                  "DJI",       "AVATA 2"],
  [4,  "BASES MICROFONO DE ESCRITORIO"],
  [1,  "MOCHILA NEGRA PARA CAMARA Y LENTES"],
  [1,  "CARGADOR",                               "SONY",      "SMALLRIG"],
  [1,  "ARNES",                                  "GO PRO",    "CHESTY"],
  [1,  "HAND STAND",                             "GO PRO"],
  [1,  "MESA AUXILIAR 3 PATAS"],
  [4,  "SILLAS DE JARDIN"],
  [1,  "ARRANCADOR DE BATERIA",                  "DURALAST"],
  [1,  "CARGADOR DE BATERIA",                    "DURALAST"],
  [1,  "COMPRESORA DE AIRE 20LT",                "PETRUL"],
  [1,  "LETRERO NEON FLEX MAINSTAGE"],
  [1,  "HIELERA",                                "COLEMAN"],
];

async function main() {
  // Borrar todos los registros de OFICINA existentes
  const del = await prisma.hervamActivo.deleteMany({ where: { categoria: "OFICINA" } });
  console.log(`🗑  Eliminados ${del.count} registros anteriores\n`);

  let ok = 0, err = 0;
  for (const [cantidad, articulo, marca, modelo] of inventario) {
    try {
      await prisma.hervamActivo.create({
        data: {
          nombre:    tc(articulo)!,
          marca:     tc(marca),
          modelo:    tc(modelo),
          cantidad,
          categoria: "OFICINA",
          propietario: "MAINSTAGE",
          valorAdquisicion: 0,
          valorActual: 0,
        },
      });
      const tag = [tc(marca), tc(modelo)].filter(Boolean).join(" · ");
      console.log(`✓ [×${cantidad}] ${tc(articulo)}${tag ? "  —  " + tag : ""}`);
      ok++;
    } catch (e) {
      console.error(`✗ ${articulo}:`, e);
      err++;
    }
  }
  console.log(`\n✅ ${ok} insertados, ${err} errores`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
