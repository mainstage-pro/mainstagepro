import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Obtener categorías existentes
    const cats = await prisma.categoriaEquipo.findMany();
    const cat = (nombre: string) => cats.find((c) => c.nombre === nombre)?.id ?? "";

    // Actualizar tarifas de DJ (AAA=600, AA=500, A=400 por hora)
    await prisma.rolTecnico.updateMany({
      where: { nombre: "DJ" },
      data: { tarifaHoraAAA: 600, tarifaHoraAA: 500, tarifaHoraA: 400 },
    });

    // Eliminar equipos existentes para re-sembrar
    await prisma.equipo.deleteMany({});

    const equipos: Array<{
      categoriaId: string;
      descripcion: string;
      marca?: string;
      modelo?: string;
      precioRenta: number;
      tipo: string;
      cantidadTotal: number;
    }> = [
      // ── EQUIPO DE AUDIO ──────────────────────────────────────────────
      { categoriaId: cat("Equipo de Audio"), descripcion: "Bocina line array activa", marca: "RCF", modelo: "HDL 30A", precioRenta: 2000, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Equipo de Audio"), descripcion: "Bocina line array activa", marca: "RCF", modelo: "HDL 6A", precioRenta: 1250, tipo: "PROPIO", cantidadTotal: 8 },
      { categoriaId: cat("Equipo de Audio"), descripcion: "Subwoofer activo", marca: "RCF", modelo: "SUB 8006 AS", precioRenta: 3500, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Equipo de Audio"), descripcion: "Bocina activa tipo full range", marca: "Electro Voice", modelo: "EKX 12P", precioRenta: 1000, tipo: "PROPIO", cantidadTotal: 6 },
      { categoriaId: cat("Equipo de Audio"), descripcion: "Subwoofer activo", marca: "Electro Voice", modelo: "EKX 18P", precioRenta: 1250, tipo: "PROPIO", cantidadTotal: 4 },

      // ── MICROFONÍA ───────────────────────────────────────────────────
      { categoriaId: cat("Sistemas de Microfonía"), descripcion: "Micrófono inalámbrico digital", marca: "Shure", modelo: "AXIENT B58/SM58", precioRenta: 2000, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Sistemas de Microfonía"), descripcion: "Micrófono inalámbrico digital", marca: "Shure", modelo: "SLXD B58", precioRenta: 800, tipo: "PROPIO", cantidadTotal: 8 },
      { categoriaId: cat("Sistemas de Microfonía"), descripcion: "Micrófono inalámbrico", marca: "Shure", modelo: "BLX24 SM58", precioRenta: 300, tipo: "PROPIO", cantidadTotal: 6 },
      { categoriaId: cat("Sistemas de Microfonía"), descripcion: "Micrófono dinámico", marca: "Shure", modelo: "SM58", precioRenta: 200, tipo: "PROPIO", cantidadTotal: 10 },
      { categoriaId: cat("Sistemas de Microfonía"), descripcion: "Micrófono dinámico", marca: "Shure", modelo: "SM57", precioRenta: 200, tipo: "PROPIO", cantidadTotal: 6 },
      { categoriaId: cat("Sistemas de Microfonía"), descripcion: "Micrófono dinámico para bombo", marca: "Shure", modelo: "BETA 52A", precioRenta: 300, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Sistemas de Microfonía"), descripcion: "Micrófono de diadema", marca: "Shure", modelo: "SM31", precioRenta: 300, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Sistemas de Microfonía"), descripcion: "Micrófono condensador", marca: "Shure", modelo: "SM81", precioRenta: 400, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Sistemas de Microfonía"), descripcion: "Micrófono boundary para bombo", marca: "Shure", modelo: "BETA91A", precioRenta: 400, tipo: "PROPIO", cantidadTotal: 2 },
      { categoriaId: cat("Sistemas de Microfonía"), descripcion: "Micrófonos condensador (par)", marca: "Rode", modelo: "M5", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 2 },

      // ── MONITOREO IN-EAR ──────────────────────────────────────────────
      { categoriaId: cat("Monitoreo In-Ear"), descripcion: "Sistema in-ear profesional", marca: "Shure", modelo: "PSM1000", precioRenta: 2000, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Monitoreo In-Ear"), descripcion: "Sistema in-ear (transmisor + bodypack)", marca: "Sennheiser", modelo: "IEM G4", precioRenta: 800, tipo: "PROPIO", cantidadTotal: 8 },
      { categoriaId: cat("Monitoreo In-Ear"), descripcion: "Receptor bodypack in-ear", marca: "Sennheiser", modelo: "EK IEM G4", precioRenta: 400, tipo: "PROPIO", cantidadTotal: 6 },

      // ── CONSOLAS DE AUDIO ────────────────────────────────────────────
      { categoriaId: cat("Consolas de Audio"), descripcion: "Consola digital de audio", marca: "Allen & Heath", modelo: "DLive CTI 1500", precioRenta: 9000, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("Consolas de Audio"), descripcion: "Consola digital de audio", marca: "Midas", modelo: "M32", precioRenta: 2500, tipo: "PROPIO", cantidadTotal: 2 },
      { categoriaId: cat("Consolas de Audio"), descripcion: "Consola digital de audio", marca: "Allen & Heath", modelo: "SQ5", precioRenta: 2500, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("Consolas de Audio"), descripcion: "Stagebox / expansor", marca: "Allen & Heath", modelo: "AR24/12", precioRenta: 2000, tipo: "PROPIO", cantidadTotal: 2 },
      { categoriaId: cat("Consolas de Audio"), descripcion: "Multicore / snake 16 entradas - 4 salidas 15m", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 2 },

      // ── ILUMINACIÓN ──────────────────────────────────────────────────
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Cabeza móvil tipo beam", marca: "Lite Tek", modelo: "BEAM 280", precioRenta: 750, tipo: "PROPIO", cantidadTotal: 12 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Efecto de iluminación", marca: "Sun Star", modelo: "KALEIDOS", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 6 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Cabeza móvil tipo spot", marca: "Chauvet", modelo: "Int SPOT 260", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 8 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Luminaria LED RGBW", marca: "Sun Star", modelo: "SOUL RGBW", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 8 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Luz estroboscópica", marca: "Lite Tek", modelo: "FLASHER 200", precioRenta: 300, tipo: "PROPIO", cantidadTotal: 6 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Luz tipo blinder", marca: "Lite Tek", modelo: "BLINDER 200", precioRenta: 300, tipo: "PROPIO", cantidadTotal: 6 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Láser LED 6 watts", precioRenta: 1500, tipo: "PROPIO", cantidadTotal: 2 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Barra láser", marca: "Steel Pro", modelo: "Razor", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Barra led", marca: "Lite Tek", modelo: "BAR 824i", precioRenta: 300, tipo: "PROPIO", cantidadTotal: 12 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Par led con control BT", marca: "Chauvet", modelo: "Slimpar Q12 BT", precioRenta: 300, tipo: "PROPIO", cantidadTotal: 12 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Par led ámbar", marca: "Lite Tek", modelo: "18X10 Ambar", precioRenta: 300, tipo: "PROPIO", cantidadTotal: 8 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Par led inalámbrico (7-8 hrs batería)", precioRenta: 400, tipo: "PROPIO", cantidadTotal: 8 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Par led", marca: "Chauvet", modelo: "Slimpar 56", precioRenta: 200, tipo: "PROPIO", cantidadTotal: 16 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Barra de pinspots (6 unidades)", marca: "Chauvet", modelo: "Pinspot Bar", precioRenta: 1500, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Tubo led pixel", marca: "Astera", modelo: "AX1 Pixel Tube", precioRenta: 600, tipo: "PROPIO", cantidadTotal: 8 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Seguidor tipo followspot", precioRenta: 1000, tipo: "PROPIO", cantidadTotal: 2 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Luminaria lineal", marca: "Lumos", modelo: "Sixaline", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 6 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Luminaria", marca: "Lumos", modelo: "L7", precioRenta: 1000, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Máquina de humo", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 2 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Luminaria decorativa", marca: "Lumos", modelo: "L1 Retro", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Equipo de Iluminación"), descripcion: "Lámpara decorativa", marca: "Lumos", modelo: "Maple Lamp", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 4 },

      // ── CONSOLAS DE ILUMINACIÓN ──────────────────────────────────────
      { categoriaId: cat("Consolas de Iluminación"), descripcion: "Consola de iluminación", marca: "Grand MA", modelo: "MA3 Compact XT", precioRenta: 9000, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("Consolas de Iluminación"), descripcion: "Controlador/wing de iluminación", marca: "MA", modelo: "Command Wing", precioRenta: 1000, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("Consolas de Iluminación"), descripcion: "Máquina de haze", marca: "Lite Tek", modelo: "Fazer 1500", precioRenta: 1000, tipo: "PROPIO", cantidadTotal: 2 },

      // ── RIGGING Y ESTRUCTURAS ────────────────────────────────────────
      { categoriaId: cat("Rigging y Estructuras"), descripcion: "Elevadores de audio 6 metros de altura", precioRenta: 2000, tipo: "PROPIO", cantidadTotal: 2 },
      { categoriaId: cat("Rigging y Estructuras"), descripcion: "Motores de rigging 1 tonelada y 10m de cadena", precioRenta: 3000, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Rigging y Estructuras"), descripcion: "Colocación de puntos de colgado/anclaje en alturas", precioRenta: 1000, tipo: "PROPIO", cantidadTotal: 1 },

      // ── EQUIPO PARA DJ ───────────────────────────────────────────────
      { categoriaId: cat("Consolas/Equipo para DJ"), descripcion: "Reproductor profesional", marca: "Pioneer", modelo: "CDJ 3000 X", precioRenta: 2000, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Consolas/Equipo para DJ"), descripcion: "Reproductor profesional", marca: "Pioneer", modelo: "CDJ 3000", precioRenta: 1750, tipo: "PROPIO", cantidadTotal: 4 },
      { categoriaId: cat("Consolas/Equipo para DJ"), descripcion: "Mezcladora DJ profesional", marca: "Pioneer", modelo: "DJM V10", precioRenta: 3000, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("Consolas/Equipo para DJ"), descripcion: "Mezcladora DJ profesional", marca: "Pioneer", modelo: "DJM A9", precioRenta: 2000, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("Consolas/Equipo para DJ"), descripcion: "Mezcladora DJ profesional", marca: "Pioneer", modelo: "DJM 900 NXS2", precioRenta: 1750, tipo: "PROPIO", cantidadTotal: 2 },
      { categoriaId: cat("Consolas/Equipo para DJ"), descripcion: "Mezcladora DJ profesional", marca: "Pioneer", modelo: "DJM S11", precioRenta: 2500, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("Consolas/Equipo para DJ"), descripcion: "Procesador de efectos DJ", marca: "Pioneer", modelo: "RMX 1000", precioRenta: 2000, tipo: "PROPIO", cantidadTotal: 2 },

      // ── PANTALLA / VIDEO ─────────────────────────────────────────────
      { categoriaId: cat("Pantalla / Video"), descripcion: "Pantalla LED pitch 3.9mm (por m²)", precioRenta: 1250, tipo: "PROPIO", cantidadTotal: 50 },
      { categoriaId: cat("Pantalla / Video"), descripcion: "Switcher de video", marca: "Blackmagic", modelo: "Atem Mini Pro", precioRenta: 1000, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("Pantalla / Video"), descripcion: "Pantalla Smart TV 50 pulgadas", precioRenta: 1000, tipo: "PROPIO", cantidadTotal: 4 },

      // ── DJ BOOTHS ────────────────────────────────────────────────────
      { categoriaId: cat("DJ Booths"), descripcion: "Booth tipo riser 2.44 x 1.22 metros", precioRenta: 1500, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("DJ Booths"), descripcion: "Booth decorativo acabado tipo mármol", precioRenta: 1000, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("DJ Booths"), descripcion: "Back decorativo acabado tipo mármol", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("DJ Booths"), descripcion: "Booth decorativo premium color blanco", precioRenta: 1000, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("DJ Booths"), descripcion: "Torre decorativa premium blanco 2 metros", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 2 },
      { categoriaId: cat("DJ Booths"), descripcion: "Torre decorativa premium blanco 2.5 metros", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 2 },

      // ── ENTARIMADO ───────────────────────────────────────────────────
      { categoriaId: cat("Entarimado"), descripcion: "Tarima 1.25 x 1.25 metros", precioRenta: 250, tipo: "PROPIO", cantidadTotal: 20 },

      // ── CORRIENTE ELÉCTRICA ──────────────────────────────────────────
      { categoriaId: cat("Corriente Eléctrica"), descripcion: "Planta eléctrica portátil 9.5KW", marca: "Predator", modelo: "9500", precioRenta: 2500, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("Corriente Eléctrica"), descripcion: "Centro de carga 3 fases con distribución eléctrica", marca: "Lite Tek", precioRenta: 2500, tipo: "PROPIO", cantidadTotal: 1 },
      { categoriaId: cat("Corriente Eléctrica"), descripcion: "Centro de carga 2 fases 63A por fase", marca: "Lite Tek", precioRenta: 500, tipo: "PROPIO", cantidadTotal: 2 },
      { categoriaId: cat("Corriente Eléctrica"), descripcion: "Generador de luz 15KW por 8 horas", precioRenta: 4000, tipo: "EXTERNO", cantidadTotal: 1 },
      { categoriaId: cat("Corriente Eléctrica"), descripcion: "Generador de luz 20KW por 8 horas", precioRenta: 5000, tipo: "EXTERNO", cantidadTotal: 1 },
      { categoriaId: cat("Corriente Eléctrica"), descripcion: "Generador de luz 25KW por 8 horas", precioRenta: 6000, tipo: "EXTERNO", cantidadTotal: 1 },
      { categoriaId: cat("Corriente Eléctrica"), descripcion: "Generador de luz 30KW por 8 horas", precioRenta: 7000, tipo: "EXTERNO", cantidadTotal: 1 },
      { categoriaId: cat("Corriente Eléctrica"), descripcion: "Generador de luz 40KW por 8 horas", precioRenta: 8000, tipo: "EXTERNO", cantidadTotal: 1 },
    ];

    // Filtrar equipos sin categoría válida
    const equiposValidos = equipos.filter((e) => e.categoriaId !== "");

    for (const eq of equiposValidos) {
      await prisma.equipo.create({ data: eq });
    }

    return NextResponse.json({
      ok: true,
      message: `${equiposValidos.length} equipos cargados correctamente. Tarifas DJ actualizadas.`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
