import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const SEED: {
  nombre: string;
  tipoServicio: string;
  tipoEvento: string;
  capacidadMin: number;
  capacidadMax: number;
  descripcion: string;
  items: { descripcion: string; cantidad: number; esOpcional: boolean; notas: string | null; orden: number }[];
}[] = [
  // ── SOCIAL ──────────────────────────────────────────────────────────────────
  {
    nombre: "Social pequeño · hasta 100 pax",
    tipoServicio: "PRODUCCION_TECNICA", tipoEvento: "SOCIAL",
    capacidadMin: 0, capacidadMax: 100,
    descripcion: "Bodas, XV años, cenas privadas. Audio ambiente + iluminación decorativa + soporte DJ.",
    items: [
      { descripcion: "EKX 12P", cantidad: 2, esOpcional: false, notas: null, orden: 0 },
      { descripcion: "EKX 18P", cantidad: 1, esOpcional: false, notas: "2 si el espacio lo requiere", orden: 1 },
      { descripcion: "Inalámbrico", cantidad: 2, esOpcional: false, notas: "brindis o protocolo", orden: 2 },
      { descripcion: "SQ5", cantidad: 1, esOpcional: true, notas: "si hay múltiples micrófonos", orden: 3 },
      { descripcion: "Par led inalámbrico", cantidad: 10, esOpcional: false, notas: "8-12 para ambientación", orden: 4 },
      { descripcion: "Par led", cantidad: 6, esOpcional: false, notas: "baño de color", orden: 5 },
      { descripcion: "Barra led", cantidad: 3, esOpcional: true, notas: "mesa principal o detalles", orden: 6 },
      { descripcion: "Haze", cantidad: 1, esOpcional: true, notas: "si quieren ambiente de fiesta", orden: 7 },
      { descripcion: "CDJ 3000", cantidad: 2, esOpcional: true, notas: "si hay DJ profesional", orden: 8 },
      { descripcion: "DJM A9", cantidad: 1, esOpcional: true, notas: "mixer DJ", orden: 9 },
      { descripcion: "Booth DJ", cantidad: 1, esOpcional: true, notas: null, orden: 10 },
    ],
  },
  {
    nombre: "Social mediano · 101–200 pax",
    tipoServicio: "PRODUCCION_TECNICA", tipoEvento: "SOCIAL",
    capacidadMin: 101, capacidadMax: 200,
    descripcion: "Bodas y sociales medianos con pista de baile activa.",
    items: [
      { descripcion: "EKX 12P", cantidad: 4, esOpcional: false, notas: null, orden: 0 },
      { descripcion: "EKX 18P", cantidad: 3, esOpcional: false, notas: "2-4 según pista", orden: 1 },
      { descripcion: "SQ5", cantidad: 1, esOpcional: false, notas: "protocolo + DJ + mezcla completa", orden: 2 },
      { descripcion: "Inalámbrico", cantidad: 2, esOpcional: false, notas: null, orden: 3 },
      { descripcion: "Par led inalámbrico", cantidad: 14, esOpcional: false, notas: "12-16 piezas", orden: 4 },
      { descripcion: "Spot", cantidad: 5, esOpcional: false, notas: null, orden: 5 },
      { descripcion: "Barra led", cantidad: 4, esOpcional: false, notas: "apoyo decorativo", orden: 6 },
      { descripcion: "Blinder", cantidad: 4, esOpcional: true, notas: "más energía en pista", orden: 7 },
      { descripcion: "Haze", cantidad: 1, esOpcional: true, notas: null, orden: 8 },
      { descripcion: "CDJ 3000", cantidad: 2, esOpcional: false, notas: null, orden: 9 },
      { descripcion: "DJM A9", cantidad: 1, esOpcional: false, notas: "mixer DJ", orden: 10 },
      { descripcion: "Booth DJ", cantidad: 1, esOpcional: false, notas: null, orden: 11 },
      { descripcion: "Tarima DJ", cantidad: 1, esOpcional: true, notas: null, orden: 12 },
    ],
  },
  {
    nombre: "Social grande · 201–350 pax",
    tipoServicio: "PRODUCCION_TECNICA", tipoEvento: "SOCIAL",
    capacidadMin: 201, capacidadMax: 350,
    descripcion: "Bodas y sociales grandes con producción completa.",
    items: [
      { descripcion: "HDL 6A", cantidad: 8, esOpcional: false, notas: "premium — base: 4 EKX 12P + 4 EKX 18P", orden: 0 },
      { descripcion: "SUB 8006 AS", cantidad: 2, esOpcional: false, notas: "4 si exterior o pista intensa", orden: 1 },
      { descripcion: "SQ5", cantidad: 1, esOpcional: false, notas: null, orden: 2 },
      { descripcion: "Inalámbrico", cantidad: 3, esOpcional: false, notas: null, orden: 3 },
      { descripcion: "Par led inalámbrico", cantidad: 18, esOpcional: false, notas: "16-20 piezas", orden: 4 },
      { descripcion: "Spot", cantidad: 7, esOpcional: false, notas: null, orden: 5 },
      { descripcion: "Beam", cantidad: 7, esOpcional: false, notas: null, orden: 6 },
      { descripcion: "Blinder", cantidad: 6, esOpcional: false, notas: null, orden: 7 },
      { descripcion: "Strobe", cantidad: 10, esOpcional: false, notas: null, orden: 8 },
      { descripcion: "Haze", cantidad: 2, esOpcional: false, notas: null, orden: 9 },
      { descripcion: "Torre truss", cantidad: 2, esOpcional: false, notas: null, orden: 10 },
      { descripcion: "CDJ 3000", cantidad: 3, esOpcional: false, notas: "2-4 según evento", orden: 11 },
      { descripcion: "DJM A9", cantidad: 1, esOpcional: false, notas: null, orden: 12 },
      { descripcion: "Booth DJ", cantidad: 1, esOpcional: false, notas: "premium o riser", orden: 13 },
    ],
  },

  // ── EMPRESARIAL ──────────────────────────────────────────────────────────────
  {
    nombre: "Empresarial pequeño · hasta 100 pax",
    tipoServicio: "PRODUCCION_TECNICA", tipoEvento: "EMPRESARIAL",
    capacidadMin: 0, capacidadMax: 100,
    descripcion: "Conferencias, juntas, presentaciones de producto.",
    items: [
      { descripcion: "EKX 12P", cantidad: 2, esOpcional: false, notas: null, orden: 0 },
      { descripcion: "EKX 18P", cantidad: 1, esOpcional: true, notas: "si hay video o entrada musical", orden: 1 },
      { descripcion: "SQ5", cantidad: 1, esOpcional: false, notas: "o MG10XUF para setup más simple", orden: 2 },
      { descripcion: "Inalámbrico", cantidad: 2, esOpcional: false, notas: null, orden: 3 },
      { descripcion: "Diadema", cantidad: 1, esOpcional: true, notas: "si hay presentador o conferenciante", orden: 4 },
      { descripcion: "Par led", cantidad: 8, esOpcional: false, notas: "6-10 para ambientación", orden: 5 },
      { descripcion: "Barra led", cantidad: 3, esOpcional: false, notas: "RGBW para escenario o back", orden: 6 },
      { descripcion: "Pinspot", cantidad: 4, esOpcional: true, notas: "branding o decoración puntual", orden: 7 },
      { descripcion: "Pantalla LED", cantidad: 1, esOpcional: true, notas: "3-6 m² según venue", orden: 8 },
      { descripcion: "Novastar", cantidad: 1, esOpcional: true, notas: "si hay pantalla LED", orden: 9 },
      { descripcion: "Atem Mini Pro", cantidad: 1, esOpcional: true, notas: "si hay cambio de fuentes", orden: 10 },
    ],
  },
  {
    nombre: "Empresarial mediano · 101–250 pax",
    tipoServicio: "PRODUCCION_TECNICA", tipoEvento: "EMPRESARIAL",
    capacidadMin: 101, capacidadMax: 250,
    descripcion: "Congresos, lanzamientos, convenciones medianas.",
    items: [
      { descripcion: "HDL 6A", cantidad: 7, esOpcional: false, notas: "6-8 — o 4 EKX 12P si setup más simple", orden: 0 },
      { descripcion: "SUB 8006 AS", cantidad: 2, esOpcional: false, notas: "o 2 EKX 18P", orden: 1 },
      { descripcion: "SQ5", cantidad: 1, esOpcional: false, notas: null, orden: 2 },
      { descripcion: "Inalámbrico", cantidad: 3, esOpcional: false, notas: null, orden: 3 },
      { descripcion: "Diadema", cantidad: 1, esOpcional: true, notas: "conductor principal", orden: 4 },
      { descripcion: "Par led", cantidad: 13, esOpcional: false, notas: "10-16 piezas", orden: 5 },
      { descripcion: "Barra led", cantidad: 5, esOpcional: false, notas: "RGBW / lineales para escenario", orden: 6 },
      { descripcion: "Spot", cantidad: 3, esOpcional: true, notas: "más presencia visual", orden: 7 },
      { descripcion: "Haze", cantidad: 1, esOpcional: true, notas: "solo si hay show, no conferencia", orden: 8 },
      { descripcion: "Pantalla LED", cantidad: 1, esOpcional: false, notas: "6-9 m²", orden: 9 },
      { descripcion: "Novastar", cantidad: 1, esOpcional: false, notas: null, orden: 10 },
      { descripcion: "Atem Mini Pro", cantidad: 1, esOpcional: false, notas: null, orden: 11 },
    ],
  },
  {
    nombre: "Empresarial grande · 251–500 pax",
    tipoServicio: "PRODUCCION_TECNICA", tipoEvento: "EMPRESARIAL",
    capacidadMin: 251, capacidadMax: 500,
    descripcion: "Congresos y convenciones grandes con producción AV completa.",
    items: [
      { descripcion: "HDL 6A", cantidad: 10, esOpcional: false, notas: "8-12 según venue", orden: 0 },
      { descripcion: "SUB 8006 AS", cantidad: 3, esOpcional: false, notas: "2-4 según contenido musical", orden: 1 },
      { descripcion: "SQ5", cantidad: 1, esOpcional: false, notas: null, orden: 2 },
      { descripcion: "Inalámbrico", cantidad: 4, esOpcional: false, notas: null, orden: 3 },
      { descripcion: "IEM G4", cantidad: 1, esOpcional: true, notas: "si hay panel, músicos o playback", orden: 4 },
      { descripcion: "Par led", cantidad: 20, esOpcional: false, notas: "16-24 piezas", orden: 5 },
      { descripcion: "Spot", cantidad: 7, esOpcional: false, notas: null, orden: 6 },
      { descripcion: "Beam", cantidad: 7, esOpcional: true, notas: "si hay show de apertura", orden: 7 },
      { descripcion: "Blinder", cantidad: 4, esOpcional: false, notas: null, orden: 8 },
      { descripcion: "Haze", cantidad: 2, esOpcional: false, notas: null, orden: 9 },
      { descripcion: "Torre truss", cantidad: 2, esOpcional: false, notas: null, orden: 10 },
      { descripcion: "Pantalla LED", cantidad: 1, esOpcional: false, notas: "9-12 m²", orden: 11 },
      { descripcion: "Novastar", cantidad: 1, esOpcional: false, notas: null, orden: 12 },
      { descripcion: "Atem Mini Pro", cantidad: 1, esOpcional: false, notas: null, orden: 13 },
    ],
  },

  // ── MUSICAL ──────────────────────────────────────────────────────────────────
  {
    nombre: "Musical pequeño · hasta 150 pax",
    tipoServicio: "PRODUCCION_TECNICA", tipoEvento: "MUSICAL",
    capacidadMin: 0, capacidadMax: 150,
    descripcion: "Festivales y eventos DJ en foros pequeños o bares.",
    items: [
      { descripcion: "EKX 12P", cantidad: 4, esOpcional: false, notas: "o 6-8 HDL 6A para más presión", orden: 0 },
      { descripcion: "EKX 18P", cantidad: 3, esOpcional: false, notas: "2-4 — o 2 SUB 8006 AS para más punch", orden: 1 },
      { descripcion: "CDJ 3000", cantidad: 2, esOpcional: false, notas: null, orden: 2 },
      { descripcion: "DJM A9", cantidad: 1, esOpcional: false, notas: "o 900 NXS2 / V10", orden: 3 },
      { descripcion: "Booth DJ", cantidad: 1, esOpcional: false, notas: null, orden: 4 },
      { descripcion: "Spot", cantidad: 4, esOpcional: false, notas: null, orden: 5 },
      { descripcion: "Beam", cantidad: 4, esOpcional: false, notas: null, orden: 6 },
      { descripcion: "Strobe", cantidad: 4, esOpcional: false, notas: null, orden: 7 },
      { descripcion: "Blinder", cantidad: 2, esOpcional: false, notas: null, orden: 8 },
      { descripcion: "Haze", cantidad: 1, esOpcional: false, notas: null, orden: 9 },
      { descripcion: "Barra led", cantidad: 2, esOpcional: true, notas: null, orden: 10 },
      { descripcion: "Láser", cantidad: 1, esOpcional: true, notas: null, orden: 11 },
    ],
  },
  {
    nombre: "Musical mediano · 151–300 pax",
    tipoServicio: "PRODUCCION_TECNICA", tipoEvento: "MUSICAL",
    capacidadMin: 151, capacidadMax: 300,
    descripcion: "Festivales y eventos DJ medianos con producción de foro.",
    items: [
      { descripcion: "HDL 6A", cantidad: 8, esOpcional: false, notas: "12 si exterior o más presión", orden: 0 },
      { descripcion: "SUB 8006 AS", cantidad: 3, esOpcional: false, notas: "2-4 según intensidad", orden: 1 },
      { descripcion: "CDJ 3000", cantidad: 3, esOpcional: false, notas: "3-4", orden: 2 },
      { descripcion: "DJM V10", cantidad: 1, esOpcional: false, notas: "o A9", orden: 3 },
      { descripcion: "RMX 1000", cantidad: 1, esOpcional: true, notas: null, orden: 4 },
      { descripcion: "Booth DJ", cantidad: 1, esOpcional: false, notas: "premium o riser", orden: 5 },
      { descripcion: "Beam", cantidad: 7, esOpcional: false, notas: "6-8", orden: 6 },
      { descripcion: "Spot", cantidad: 5, esOpcional: false, notas: "4-6", orden: 7 },
      { descripcion: "Strobe", cantidad: 10, esOpcional: false, notas: "8-12", orden: 8 },
      { descripcion: "Blinder", cantidad: 4, esOpcional: false, notas: null, orden: 9 },
      { descripcion: "Haze", cantidad: 2, esOpcional: false, notas: null, orden: 10 },
      { descripcion: "Torre truss", cantidad: 2, esOpcional: false, notas: null, orden: 11 },
      { descripcion: "Láser", cantidad: 3, esOpcional: true, notas: null, orden: 12 },
      { descripcion: "Pantalla LED", cantidad: 1, esOpcional: true, notas: "6-12 m² si el evento lo requiere", orden: 13 },
      { descripcion: "Novastar", cantidad: 1, esOpcional: true, notas: null, orden: 14 },
    ],
  },
  {
    nombre: "Musical grande · 301–600 pax",
    tipoServicio: "PRODUCCION_TECNICA", tipoEvento: "MUSICAL",
    capacidadMin: 301, capacidadMax: 600,
    descripcion: "Festivales y eventos DJ grandes con producción full.",
    items: [
      { descripcion: "HDL 6A", cantidad: 14, esOpcional: false, notas: "12-16 — considerar flybar si se cuelga", orden: 0 },
      { descripcion: "SUB 8006 AS", cantidad: 4, esOpcional: false, notas: null, orden: 1 },
      { descripcion: "SQ5", cantidad: 1, esOpcional: true, notas: "si hay voces, instrumentos o playback", orden: 2 },
      { descripcion: "IEM G4", cantidad: 1, esOpcional: true, notas: "show híbrido", orden: 3 },
      { descripcion: "CDJ 3000", cantidad: 4, esOpcional: false, notas: null, orden: 4 },
      { descripcion: "DJM V10", cantidad: 1, esOpcional: false, notas: null, orden: 5 },
      { descripcion: "RMX 1000", cantidad: 1, esOpcional: true, notas: null, orden: 6 },
      { descripcion: "Booth DJ", cantidad: 1, esOpcional: false, notas: "premium", orden: 7 },
      { descripcion: "Beam", cantidad: 10, esOpcional: false, notas: "8-12", orden: 8 },
      { descripcion: "Spot", cantidad: 7, esOpcional: false, notas: "6-8", orden: 9 },
      { descripcion: "Strobe", cantidad: 16, esOpcional: false, notas: "12-20", orden: 10 },
      { descripcion: "Blinder", cantidad: 7, esOpcional: false, notas: "6-8", orden: 11 },
      { descripcion: "Haze", cantidad: 2, esOpcional: false, notas: null, orden: 12 },
      { descripcion: "Torre truss", cantidad: 2, esOpcional: false, notas: "más torres y nodo DMX según complejidad", orden: 13 },
      { descripcion: "Pantalla LED", cantidad: 1, esOpcional: false, notas: "9-12 m²", orden: 14 },
      { descripcion: "Novastar", cantidad: 1, esOpcional: false, notas: null, orden: 15 },
    ],
  },
];

export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Verificar si ya hay plantillas
  const existing = await prisma.plantillaEquipo.count();
  if (existing > 0) {
    return NextResponse.json({ error: "Ya existen plantillas. Elimínalas primero si quieres recargar." }, { status: 400 });
  }

  let creadas = 0;
  for (const p of SEED) {
    await prisma.plantillaEquipo.create({
      data: {
        nombre: p.nombre,
        tipoServicio: p.tipoServicio,
        tipoEvento: p.tipoEvento,
        capacidadMin: p.capacidadMin,
        capacidadMax: p.capacidadMax,
        descripcion: p.descripcion,
        activo: true,
        items: {
          create: p.items,
        },
      },
    });
    creadas++;
  }

  return NextResponse.json({ ok: true, creadas });
}
