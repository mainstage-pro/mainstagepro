import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Datos iniciales tomados de las galerías/presentaciones hardcodeadas actuales
// (GaleriaClient.tsx + EventoClient.tsx). Idempotente: no duplica fotos.
const SEED = [
  {
    slug: "musical",
    nombre: "Eventos Musicales",
    emoji: "🎵",
    subtitulo: "Conciertos · Festivales · DJ Sets · Shows en vivo",
    descripcion: "Desde el rider hasta el último beat — audio, luz y video operados por gente que vive el escenario.",
    orden: 0,
    fotos: [
      { url: "/images/presentacion/musicales/Musicales-076.jpg", caption: "DJ Set · Equipo profesional", destacada: true },
      { url: "/images/presentacion/musicales/Musicales-016.jpg", caption: "Producción completa en vivo", destacada: true },
      { url: "/images/presentacion/musicales/Musicales-037.jpg", caption: "Iluminación · Show en escenario" },
      { url: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", caption: "Festival · Guanajuato" },
      { url: "/images/presentacion/musicales/Musicales-055.jpg", caption: "Producción de luz · Efectos especiales" },
      { url: "/images/presentacion/musicales/Afrodise-59.jpg", caption: "Stage completo · Noche" },
      { url: "/images/presentacion/musicales/DSC07491.jpg", caption: "En vivo · Operación técnica" },
      { url: "/images/presentacion/musicales/Musicales-126.jpg", caption: "Show · Producción audiovisual" },
    ],
  },
  {
    slug: "social",
    nombre: "Eventos Sociales",
    emoji: "🥂",
    subtitulo: "Bodas · XV Años · Celebraciones privadas",
    descripcion: "Primer baile, brindis, pista — cada instante con el sonido y la luz que merece, sin que notes que estamos ahí.",
    orden: 1,
    fotos: [
      { url: "/images/presentacion/sociales/s-boda-elegante.jpg", caption: "Boda · Producción exterior elegante", destacada: true },
      { url: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", caption: "Hacienda · Iluminación dramática", destacada: true },
      { url: "/images/presentacion/sociales/s-dj-salon.png", caption: "DJ · Ambiente de salón" },
      { url: "/images/presentacion/sociales/s-boda-colonial.jpg", caption: "Boda · Venue colonial" },
      { url: "/images/presentacion/sociales/s-piano-pista.jpg", caption: "Piano · Pista espejada" },
      { url: "/images/presentacion/sociales/s-hacienda-aerea.jpg", caption: "Vista aérea · Iluminación completa" },
    ],
  },
  {
    slug: "empresarial",
    nombre: "Eventos Empresariales",
    emoji: "🏢",
    subtitulo: "Conferencias · Lanzamientos · Corporativos",
    descripcion: "Audio claro para cada presentador, pantallas que no fallan, producción que no interrumpe.",
    orden: 2,
    fotos: [
      { url: "/images/presentacion/empresariales/e-auditorio.jpg", caption: "Auditorio · Producción completa", destacada: true },
      { url: "/images/presentacion/empresariales/e-sala-pantallas.jpg", caption: "Sala · Conferencia profesional", destacada: true },
      { url: "/images/presentacion/empresariales/e-carpa-led.jpg", caption: "Carpa · Pantalla LED exterior" },
      { url: "/images/presentacion/empresariales/e-networking.jpg", caption: "Networking · Ambiente corporativo" },
      { url: "/images/presentacion/empresariales/e-edificio-azul.jpg", caption: "Inauguración · Iluminación arquitectónica" },
      { url: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Proyección artística · Evento exclusivo" },
    ],
  },
  {
    slug: "otro",
    nombre: "Otros eventos",
    emoji: "✨",
    subtitulo: "Deportivos · Teatro · Comedia · Ruedas de prensa",
    descripcion: "Producción técnica para todo lo demás: deporte, artes escénicas, comedia, cultura y medios.",
    orden: 3,
    fotos: [
      { url: "/images/presentacion/empresariales/e-auditorio.jpg", caption: "Auditorio · Producción completa", destacada: true },
      { url: "/images/presentacion/musicales/Musicales-037.jpg", caption: "Iluminación escénica", destacada: true },
      { url: "/images/presentacion/empresariales/e-carpa-led.jpg", caption: "Exterior · Pantalla LED" },
      { url: "/images/presentacion/musicales/DSC07491.jpg", caption: "Operación técnica en vivo" },
      { url: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Proyección de gran formato" },
      { url: "/images/presentacion/musicales/Musicales-016.jpg", caption: "Escenario montado y probado" },
    ],
  },
];

export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const results: string[] = [];

  for (const t of SEED) {
    const tipo = await prisma.tipoEvento.upsert({
      where: { slug: t.slug },
      update: {
        nombre: t.nombre,
        emoji: t.emoji,
        subtitulo: t.subtitulo,
        descripcion: t.descripcion,
        orden: t.orden,
      },
      create: {
        slug: t.slug,
        nombre: t.nombre,
        emoji: t.emoji,
        subtitulo: t.subtitulo,
        descripcion: t.descripcion,
        orden: t.orden,
      },
    });

    const existentes = await prisma.fotoTipoEvento.count({ where: { tipoEventoId: tipo.id } });
    if (existentes === 0 && t.fotos.length > 0) {
      await prisma.fotoTipoEvento.createMany({
        data: t.fotos.map((f, i) => ({
          tipoEventoId: tipo.id,
          url: f.url,
          caption: f.caption,
          orden: i,
          destacada: f.destacada ?? false,
        })),
      });
      results.push(`✅ ${t.slug}: creado + ${t.fotos.length} fotos`);
    } else {
      results.push(`✅ ${t.slug}: actualizado (fotos existentes: ${existentes})`);
    }
  }

  return NextResponse.json({ ok: true, results });
}
