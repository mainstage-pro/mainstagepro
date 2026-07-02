// Script para insertar inventario de activos de oficina Mainstage
// Ejecutar: npx ts-node --project tsconfig.json scripts/seed-activos-oficina.ts
// O mejor: npx tsx scripts/seed-activos-oficina.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Función: primera letra mayúscula, resto minúscula
function titleCase(str: string | null | undefined): string | null {
  if (!str) return null;
  const s = str.trim().replace(/\s+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Datos del inventario: [cantidad, artículo, marca?, modelo?]
const inventario: [number, string, string?, string?][] = [
  [1, "REFRIGERADOR"],
  [1, "HORNO DE MICRO ONDAS", "BLACK AND DECKER"],
  [1, "SMART TV 42\"", "HISENSE"],
  [1, "SMART TV 85\"", "HISENSE"],
  [2, "GARRAFONES DE AGUA", "CIEL"],
  [1, "BOCINA", "BOSE"],
  [1, "IMPRESORA", "CANON"],
  [6, "SILLAS DE OFICINA CON RUEDAS"],
  [6, "SILLAS DE ACRILICO NEGRAS"],
  [1, "MESA DE MELAMINA (SALA DE JUNTAS)"],
  [1, "LIBRERO DE MELAMINA"],
  [1, "ESCRITORIO DE VIDRIO"],
  [1, "ESCRITORIO DE MELAMINA"],
  [1, "VENTILADOR DE TORRE NEGRO", "LASKO"],
  [1, "VENTILADOR DE PISO NEGRO"],
  [3, "VENTILADORES BLANCOS", "VORTEX"],
  [1, "VENTILADOR DE METAL NEGRO", "Comercial Electric"],
  [3, "MESAS PLEGABLES NEGRAS"],
  [1, "CAMARA FOTOGRAFICA", "SONY", "Ilce-6700"],
  [3, "BATERIAS CAMARA", "NP-F2100"],
  [1, "LUZ LED PARA CAMARA", "ULANZI"],
  [3, "ROUTER", "TP-Link", "Deco"],
  [1, "MACBOOK AIR 13\"", "APPLE"],
  [1, "VENTILADOR PARA LAPTOP", "STEREN"],
  [1, "GO PRO", "GoPro", "Hero 13"],
  [2, "TECLADO INALAMBRICO", "STEREN"],
  [1, "ESTUCHE CON 2 MICROFONOS RECARGABLES", "STEREN"],
  [1, "DECODIFICADOR", "MEGACABLE", "Xview"],
  [1, "RELOJ CHECADOR"],
  [1, "BOMBA DE AGUA"],
  [1, "MESA DE JARDIN (COCINA)"],
  [1, "CAFETERA", "T-Fal"],
  [1, "ESCALERA DE ALUMINIO"],
  [2, "ANAQUEL DE ACERO NEGRO"],
  [2, "ANAQUEL DE ACERO GRIS"],
  [2, "ANAQUEL DE PLASTICO NEGRO"],
  [1, "MONITOR TOUCH PORTATIL", "ROHS"],
  [1, "LAPTOP", "HP", "Victus"],
  [5, "EXTINTOR 2KG", "MIKELS"],
  [1, "EXTINTOR 1KG", "MIKELS"],
  [1, "TABLET", "SAMSUNG", "Galaxy Tab A9+"],
  [4, "TARIMAS DE PLASTICO NEGRAS"],
  [2, "TRIPIES PARA CAMARA"],
  [1, "LENTE DE CAMARA", "SONY", "E Pz 16-50mm F3.5-5.6 Oss II"],
  [1, "DRONE", "DJI", "Avata 2"],
  [4, "BASES MICROFONO DE ESCRITORIO"],
  [1, "MOCHILA PARA CAMARA Y LENTES"],
  [1, "CARGADOR CAMARA", "SONY", "SmallRig"],
  [1, "ARNES GOPRO", "GoPro", "Chesty"],
  [1, "HAND STAND GOPRO", "GoPro"],
  [1, "MESA AUXILIAR 3 PATAS"],
  [4, "SILLAS DE JARDIN"],
  [1, "ARRANCADOR DE BATERIA", "DURALAST"],
  [1, "CARGADOR DE BATERIA", "DURALAST"],
  [1, "COMPRESORA DE AIRE 20LT", "PETRUL"],
  [1, "LETRERO NEON FLEX MAINSTAGE"],
  [1, "HIELERA", "COLEMAN"],
];

async function main() {
  console.log(`\nInsertando ${inventario.length} tipos de activos de oficina…\n`);
  let insertados = 0;
  let errores = 0;

  for (const [cantidad, articulo, marca, modelo] of inventario) {
    const nombre = titleCase(articulo)!;
    const marcaFmt = titleCase(marca);
    const modeloFmt = modelo ? (modelo.charAt(0).toUpperCase() + modelo.slice(1)) : null;
    const notas = cantidad > 1 ? `Cantidad: ${cantidad} unidades` : null;

    // Crear una entrada por unidad para items individuales valiosos,
    // o una entrada con nota de cantidad para consumibles/muebles
    const iteraciones = cantidad <= 1 ? 1 : 1; // una entrada por tipo, cantidad en notas

    for (let i = 0; i < iteraciones; i++) {
      try {
        const activo = await prisma.hervamActivo.create({
          data: {
            nombre,
            descripcion: modeloFmt,
            categoria: "OFICINA",
            propietario: "MAINSTAGE",
            valorAdquisicion: 0,
            valorActual: 0,
            precioRenta: 0,
            notas: [
              marcaFmt ? `Marca: ${marcaFmt}` : null,
              notas,
            ].filter(Boolean).join(" · ") || null,
          },
        });
        console.log(`✓ ${nombre}${marcaFmt ? ` · ${marcaFmt}` : ""}${cantidad > 1 ? ` (×${cantidad})` : ""} — id: ${activo.id}`);
        insertados++;
      } catch (e) {
        console.error(`✗ Error al insertar "${nombre}":`, e);
        errores++;
      }
    }
  }

  console.log(`\n✅ Completado: ${insertados} insertados, ${errores} errores`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
