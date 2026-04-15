import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Campañas Meta Ads 2026 — basado en documento "CALENDARIO CAMPAÑAS META ADS 2026 - INFO"
const TIPOS = [
  // ── INFORMATIVAS (Mensuales) ───────────────────────────────────────────────
  {
    nombre: "Servicios Mainstage 1",
    objetivo: "INFORMATIVO",
    objetivoMeta: "RECONOCIMIENTO",
    formato: "IMAGEN",
    recurrencia: "MENSUAL",
    canal: "META",
    duracionDias: 14,
    ubicaciones: "FEED_IG,FEED_FB,STORIES_IG",
    cta: "MAS_INFORMACION",
    descripcion: "Campaña informativa mensual sobre los servicios de Mainstage Pro. Serie 1 de 3: presentación general de la empresa y propuesta de valor.",
    color: "#3B82F6",
    orden: 1,
  },
  {
    nombre: "Servicios Mainstage 2",
    objetivo: "INFORMATIVO",
    objetivoMeta: "RECONOCIMIENTO",
    formato: "CARRUSEL",
    recurrencia: "MENSUAL",
    canal: "META",
    duracionDias: 14,
    ubicaciones: "FEED_IG,FEED_FB,STORIES_IG",
    cta: "MAS_INFORMACION",
    descripcion: "Campaña informativa mensual sobre los servicios de Mainstage Pro. Serie 2 de 3: servicios específicos (renta, producción, dirección técnica).",
    color: "#3B82F6",
    orden: 2,
  },
  {
    nombre: "Servicios Mainstage 3",
    objetivo: "INFORMATIVO",
    objetivoMeta: "RECONOCIMIENTO",
    formato: "VIDEO",
    recurrencia: "MENSUAL",
    canal: "META",
    duracionDias: 14,
    ubicaciones: "FEED_IG,REELS_IG,FEED_FB",
    cta: "MAS_INFORMACION",
    descripcion: "Campaña informativa mensual sobre los servicios de Mainstage Pro. Serie 3 de 3: casos de éxito, testimoniales y diferenciadores.",
    color: "#3B82F6",
    orden: 3,
  },
  {
    nombre: "Renta de equipo",
    objetivo: "INFORMATIVO",
    objetivoMeta: "TRAFICO",
    formato: "IMAGEN",
    recurrencia: "MENSUAL",
    canal: "META",
    duracionDias: 14,
    ubicaciones: "FEED_IG,FEED_FB,STORIES_IG",
    cta: "MAS_INFORMACION",
    descripcion: "Campaña mensual informativa enfocada en el servicio de renta de equipo: audio, iluminación, video y LED. Dirigida a productores, organizadores de eventos y DJ sets.",
    color: "#6366F1",
    orden: 4,
  },
  {
    nombre: "Producción técnica",
    objetivo: "INFORMATIVO",
    objetivoMeta: "TRAFICO",
    formato: "VIDEO",
    recurrencia: "MENSUAL",
    canal: "META",
    duracionDias: 14,
    ubicaciones: "FEED_IG,REELS_IG,FEED_FB",
    cta: "MAS_INFORMACION",
    descripcion: "Campaña mensual informativa sobre el servicio de producción técnica integral: operación de equipos, montaje, soundcheck y ejecución en vivo.",
    color: "#6366F1",
    orden: 5,
  },
  {
    nombre: "Dirección técnica integral",
    objetivo: "INFORMATIVO",
    objetivoMeta: "TRAFICO",
    formato: "VIDEO",
    recurrencia: "MENSUAL",
    canal: "META",
    duracionDias: 14,
    ubicaciones: "FEED_IG,REELS_IG,FEED_FB",
    cta: "MAS_INFORMACION",
    descripcion: "Campaña mensual sobre el servicio premium de dirección técnica integral: coordinación completa de audio, iluminación y video con director técnico dedicado.",
    color: "#6366F1",
    orden: 6,
  },
  // ── VENTA (Quincenales) ────────────────────────────────────────────────────
  {
    nombre: "Eventos musicales",
    objetivo: "VENTA",
    objetivoMeta: "LEADS",
    formato: "REEL",
    recurrencia: "QUINCENAL",
    canal: "META",
    duracionDias: 7,
    ubicaciones: "REELS_IG,FEED_IG,REELS_FB",
    cta: "CONTACTAR",
    descripcion: "Campaña quincenal de conversión para eventos musicales: festivales, conciertos, DJ sets, showcases y fiestas privadas. Imágenes y video de producciones reales.",
    color: "#EF4444",
    orden: 7,
  },
  {
    nombre: "Eventos sociales",
    objetivo: "VENTA",
    objetivoMeta: "LEADS",
    formato: "REEL",
    recurrencia: "QUINCENAL",
    canal: "META",
    duracionDias: 7,
    ubicaciones: "REELS_IG,FEED_IG,REELS_FB",
    cta: "CONTACTAR",
    descripcion: "Campaña quincenal de conversión para eventos sociales: bodas, XV años, graduaciones y celebraciones privadas. Mostrar calidad y versatilidad del servicio.",
    color: "#EF4444",
    orden: 8,
  },
  {
    nombre: "Eventos empresariales",
    objetivo: "VENTA",
    objetivoMeta: "LEADS",
    formato: "VIDEO",
    recurrencia: "QUINCENAL",
    canal: "META",
    duracionDias: 7,
    ubicaciones: "FEED_IG,FEED_FB,STORIES_IG",
    cta: "CONTACTAR",
    descripcion: "Campaña quincenal de conversión para eventos empresariales: convenciones, lanzamientos de producto, conferencias y eventos corporativos.",
    color: "#EF4444",
    orden: 9,
  },
  // ── ENTRETENIMIENTO (Quincenales) ──────────────────────────────────────────
  {
    nombre: "Eventos reel tipo TikTok musicales",
    objetivo: "ENTRETENIMIENTO",
    objetivoMeta: "INTERACCION",
    formato: "REEL",
    recurrencia: "QUINCENAL",
    canal: "META",
    duracionDias: 7,
    ubicaciones: "REELS_IG,STORIES_IG",
    cta: "VER_MAS",
    descripcion: "Reel quincenal estilo TikTok de eventos musicales: clips dinámicos con música, efectos y texto. Edición ágil, tono informal pero profesional. Aumentar alcance orgánico.",
    color: "#F59E0B",
    orden: 10,
  },
  {
    nombre: "Eventos reel tipo TikTok sociales",
    objetivo: "ENTRETENIMIENTO",
    objetivoMeta: "INTERACCION",
    formato: "REEL",
    recurrencia: "QUINCENAL",
    canal: "META",
    duracionDias: 7,
    ubicaciones: "REELS_IG,STORIES_IG",
    cta: "VER_MAS",
    descripcion: "Reel quincenal estilo TikTok de eventos sociales: momentos especiales, reacciones, montajes. Conectar emocionalmente con la audiencia.",
    color: "#F59E0B",
    orden: 11,
  },
  {
    nombre: "Eventos reel tipo TikTok empresariales",
    objetivo: "ENTRETENIMIENTO",
    objetivoMeta: "INTERACCION",
    formato: "REEL",
    recurrencia: "QUINCENAL",
    canal: "META",
    duracionDias: 7,
    ubicaciones: "REELS_IG,STORIES_IG",
    cta: "VER_MAS",
    descripcion: "Reel quincenal estilo TikTok de eventos empresariales: behind the scenes, montaje, operación en vivo. Mostrar profesionalismo de forma entretenida.",
    color: "#F59E0B",
    orden: 12,
  },
  // ── POSICIONAMIENTO (Semanales) ────────────────────────────────────────────
  {
    nombre: "Post de la semana",
    objetivo: "POSICIONAMIENTO",
    objetivoMeta: "INTERACCION",
    formato: "IMAGEN",
    recurrencia: "SEMANAL",
    canal: "META",
    duracionDias: 5,
    ubicaciones: "FEED_IG,FEED_FB",
    cta: "MAS_INFORMACION",
    descripcion: "Post semanal de posicionamiento de marca: mejores fotos del evento de la semana, copy profesional, listado de equipo utilizado y agradecimiento al cliente. Mantiene presencia constante en feed.",
    color: "#10B981",
    orden: 13,
  },
  {
    nombre: "Reel de la semana",
    objetivo: "POSICIONAMIENTO",
    objetivoMeta: "INTERACCION",
    formato: "REEL",
    recurrencia: "SEMANAL",
    canal: "META",
    duracionDias: 5,
    ubicaciones: "REELS_IG,REELS_FB",
    cta: "MAS_INFORMACION",
    descripcion: "Reel semanal de posicionamiento: aftermovie o compilado del evento de la semana. Copy emocional y profesional. Mantener estética del feed — la portada debe coincidir con los posts de la semana.",
    color: "#10B981",
    orden: 14,
  },
];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existentes = await prisma.tipoCampana.count();
  if (existentes > 0) {
    return NextResponse.json({
      error: `Ya existen ${existentes} tipos de campaña. Usa PUT para reemplazarlos.`,
      existentes,
    }, { status: 409 });
  }

  await prisma.tipoCampana.createMany({ data: TIPOS });
  return NextResponse.json({ ok: true, creados: TIPOS.length });
}

// PUT: elimina todo y recrea (útil para actualizar)
export async function PUT() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.tipoCampana.deleteMany({});
  await prisma.tipoCampana.createMany({ data: TIPOS });
  return NextResponse.json({ ok: true, creados: TIPOS.length });
}
