import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const TIPOS = [
  {
    nombre: "Carrusel de fotos",
    formato: "POST",
    objetivo: "POSICIONAMIENTO",
    diaSemana: "LUNES,VIERNES",
    semanaDelMes: null,
    recurrencia: "SEMANAL",
    cantMes: 8,
    enFacebook: true,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 1,
    descripcion: "2 veces por semana (lunes y viernes). Mejores fotos del evento: producción, equipos, montaje, momentos importantes. Copy: descripción breve del servicio, agradecimiento al cliente (opcional), listado del equipo utilizado y call to action. Seleccionar 3 fotos wide que muestren la producción completa.",
  },
  {
    nombre: "Aftermovie",
    formato: "REEL",
    objetivo: "POSICIONAMIENTO",
    diaSemana: "MIÉRCOLES",
    semanaDelMes: null,
    recurrencia: "SEMANAL",
    cantMes: 4,
    enFacebook: true,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 2,
    descripcion: "Video del evento de la semana. Copy más emocional pero en línea profesional. Cambiar foto de portada del reel por una de las fotos seleccionadas para el feed (post 1, aftermovie/reel y post 3 deben mantener estética del feed).",
  },
  {
    nombre: "Contenido informativo",
    formato: "STORIE",
    objetivo: "INFORMATIVO",
    diaSemana: "MARTES",
    semanaDelMes: null,
    recurrencia: "SEMANAL",
    cantMes: 4,
    enFacebook: false,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 3,
    descripcion: "Diseño gráfico informativo: cuestiones técnicas, funcionamiento de equipos, tips. Ej: '3 cosas que debes tener en cuenta para la iluminación de tu evento'. Pilares: tipo de evento (musicales, sociales, empresariales) + tipo de servicio (renta, producción técnica, dirección técnica).",
  },
  {
    nombre: "Fechas especiales",
    formato: "STORIE",
    objetivo: "POSICIONAMIENTO",
    diaSemana: null,
    semanaDelMes: null,
    recurrencia: "MENSUAL",
    cantMes: 1,
    enFacebook: false,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 4,
    descripcion: "Día del DJ, día de las madres, 15 de septiembre, Navidad, cumpleaños del equipo Mainstage, etc. Investigar una semana antes del mes siguiente. Debe tener relación con el trabajo salvo fechas generales.",
  },
  {
    nombre: "Videos tipo TikTok",
    formato: "TIK_TOK",
    objetivo: "ENTRETENIMIENTO",
    diaSemana: "JUEVES",
    semanaDelMes: null,
    recurrencia: "SEMANAL",
    cantMes: 4,
    enFacebook: false,
    enInstagram: true,
    enTiktok: true,
    enYoutube: false,
    orden: 5,
    descripcion: "Videos informales, grabados con celular, edición básica. Compilación de clips de eventos con texto chistoso sin salirse de lo profesional, o videos de procesos en bodega. Solo en reels de Instagram y TikTok (no en feed). Se puede intercalar semana sí/semana no.",
  },
  {
    nombre: "Eventos de la semana",
    formato: "STORIE",
    objetivo: "VENTA",
    diaSemana: "LUNES",
    semanaDelMes: null,
    recurrencia: "SEMANAL",
    cantMes: 4,
    enFacebook: false,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 6,
    descripcion: "Compilado de clips de eventos del fin de semana. Edición básica con logo de Mainstage como presencia de marca y texto: 'Agradecemos a nuestros clientes por la confianza en nuestro servicio'.",
  },
  {
    nombre: "Servicios Mainstage",
    formato: "STORIE",
    objetivo: "VENTA",
    diaSemana: "LUNES",
    semanaDelMes: 1,
    recurrencia: "MENSUAL",
    cantMes: 1,
    enFacebook: false,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 7,
    descripcion: "1er lunes del mes. Serie de stories de los servicios que ofrecemos: Renta de equipo, Producción técnica y Dirección técnica. Diseño base reutilizable. Importante para nuevos seguidores.",
  },
  {
    nombre: "Eventos Mainstage",
    formato: "STORIE",
    objetivo: "VENTA",
    diaSemana: "LUNES",
    semanaDelMes: 2,
    recurrencia: "MENSUAL",
    cantMes: 1,
    enFacebook: false,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 8,
    descripcion: "2do lunes del mes. Serie de stories de los tipos de eventos: musicales, sociales y empresariales. Con descripción y fotos de cada tipo. Diseño base reutilizable. Importante para nuevos seguidores.",
  },
  {
    nombre: "¿Cómo contratarnos?",
    formato: "STORIE",
    objetivo: "VENTA",
    diaSemana: "LUNES",
    semanaDelMes: 3,
    recurrencia: "MENSUAL",
    cantMes: 1,
    enFacebook: false,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 9,
    descripcion: "3er lunes del mes. Story con pasos sencillos para contratar nuestros servicios. Hacerle ver al cliente que es muy fácil. Call to action con enlace al WhatsApp.",
  },
  {
    nombre: "Inventario Mainstage",
    formato: "STORIE",
    objetivo: "VENTA",
    diaSemana: "MIÉRCOLES",
    semanaDelMes: null,
    recurrencia: "SEMANAL",
    cantMes: 4,
    enFacebook: false,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 10,
    descripcion: "Cada miércoles. Mostrar por categorías el inventario disponible: audio, iluminación, consolas, micrófonos, pantallas, etc. Ciclo de 2 meses (8 publicaciones) para dar la vuelta al inventario. Dirigido a proveedores que pueden necesitar equipo para sus eventos.",
  },
  {
    nombre: "Interacción comunidad",
    formato: "STORIE",
    objetivo: "POSICIONAMIENTO",
    diaSemana: "VIERNES",
    semanaDelMes: null,
    recurrencia: "SEMANAL",
    cantMes: 4,
    enFacebook: false,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 11,
    descripcion: "Cada viernes. Story interactiva con herramientas de Instagram: encuesta, caja de preguntas, etc. Referente a servicios, dudas de producción técnica o eventos del fin de semana (conciertos, festivales relevantes).",
  },
  {
    nombre: "Contenido grabado",
    formato: "REEL",
    objetivo: "POSICIONAMIENTO",
    diaSemana: "SÁBADO",
    semanaDelMes: null,
    recurrencia: "SEMANAL",
    cantMes: 4,
    enFacebook: true,
    enInstagram: true,
    enTiktok: false,
    enYoutube: false,
    orden: 12,
    descripcion: "Cada sábado. Miembros del equipo hablando sobre cuestiones técnicas, operativas o estratégicas del negocio. Puede grabarse en evento, montaje o bodega. *En desarrollo.",
  },
];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Eliminar tipos existentes y volver a crear
  const existentes = await prisma.tipoContenido.count();
  if (existentes > 0) {
    return NextResponse.json({
      error: `Ya existen ${existentes} tipos. Elimínalos primero desde la página de Tipos de contenido si quieres reiniciar.`,
      existentes,
    }, { status: 409 });
  }

  await prisma.tipoContenido.createMany({ data: TIPOS });

  return NextResponse.json({ ok: true, creados: TIPOS.length });
}

// Forzar recarga (eliminar todos y recrear)
export async function PUT() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.tipoContenido.deleteMany({});
  await prisma.tipoContenido.createMany({ data: TIPOS });

  return NextResponse.json({ ok: true, creados: TIPOS.length });
}
