import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { validarTokenPresentacion } from "@/lib/presentacion-token";
import { getConfigJSON } from "@/lib/config";
import PresentacionClient from "./PresentacionClient";
import PresentacionRentaClient from "./PresentacionRentaClient";
import { getPresentationMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ cotizacionId: string }>;
  searchParams: Promise<{ token?: string }>;
}): Promise<Metadata> {
  const { cotizacionId } = await params;
  const { token } = await searchParams;

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    select: {
      nombreEvento: true,
      nombreCotizacion: true,
      numeroCotizacion: true,
      tipoServicio: true,
      cliente: { select: { nombre: true } },
    },
  });

  if (!cotizacion) {
    return getPresentationMetadata({
      title: "Propuesta de Producción",
      description: "Propuesta de producción y cotización de servicios para tu evento.",
      path: `/presentacion/${cotizacionId}${token ? `?token=${token}` : ""}`,
    });
  }

  const name = cotizacion.nombreEvento || cotizacion.nombreCotizacion || `Cotización ${cotizacion.numeroCotizacion}`;
  const serviceType = cotizacion.tipoServicio === "RENTA" ? "Renta de Equipo" : "Producción Técnica";
  const title = `Propuesta: ${name}`;
  const description = `Propuesta personalizada de ${serviceType} para ${cotizacion.cliente.nombre}. Consulta el equipamiento y diseño propuesto por Mainstage Pro.`;

  return getPresentationMetadata({
    title,
    description,
    path: `/presentacion/${cotizacionId}${token ? `?token=${token}` : ""}`,
  });
}

export default async function PresentacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ cotizacionId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { cotizacionId } = await params;
  const { token } = await searchParams;

  if (!validarTokenPresentacion(cotizacionId, token)) notFound();

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      cliente: {
        select: { nombre: true, empresa: true, telefono: true, correo: true },
      },
      trato: { select: { tipoEvento: true, ideasReferencias: true, tradeCalificado: true } },
      paquete: {
        select: {
          nombre: true,
          resumen: true,
          imagenes: { orderBy: { orden: "asc" }, select: { id: true, url: true } },
        },
      },
      lineas: {
        orderBy: { orden: "asc" },
        include: {
          equipo: {
            select: {
              categoria: { select: { nombre: true } },
              imagenUrl: true,
              imagenesUrls: true,
            },
          },
        },
      },
    },
  });

  if (!cotizacion) notFound();

  // Las líneas PAQUETE (productos armados) no tienen equipo asociado, así que la
  // presentación no les muestra miniatura ni cantidad. Como el producto está
  // compuesto de equipos con cantidades exactas (guardadas en notasInternas),
  // las expandimos en líneas sintéticas por equipo — sumando cantidades entre
  // productos — para que se rendericen igual que una cotización de equipos.
  const parseComponentes = (notasInternas: string | null): { equipoId: string; cantidad: number }[] => {
    if (!notasInternas) return [];
    try {
      const arr = JSON.parse(notasInternas).componentes;
      return Array.isArray(arr) ? arr.filter((c: { equipoId?: string }) => c?.equipoId) : [];
    } catch {
      return [];
    }
  };
  const paqueteLineas = cotizacion.lineas.filter((l) => l.tipo === "PAQUETE");
  let lineasExpandidas = cotizacion.lineas;
  if (paqueteLineas.length > 0) {
    const equipoIds = [
      ...new Set(paqueteLineas.flatMap((l) => parseComponentes(l.notasInternas).map((c) => c.equipoId))),
    ];
    const equipos = equipoIds.length
      ? await prisma.equipo.findMany({
          where: { id: { in: equipoIds } },
          select: {
            id: true,
            marca: true,
            modelo: true,
            descripcion: true,
            imagenUrl: true,
            imagenesUrls: true,
            categoria: { select: { nombre: true } },
          },
        })
      : [];
    const equipoMap = new Map(equipos.map((e) => [e.id, e]));

    const acumulado = new Map<string, number>();
    for (const l of paqueteLineas) {
      for (const c of parseComponentes(l.notasInternas)) {
        acumulado.set(c.equipoId, (acumulado.get(c.equipoId) ?? 0) + c.cantidad * l.cantidad);
      }
    }

    const base = paqueteLineas[0];
    const sinteticas = [...acumulado.entries()]
      .filter(([equipoId]) => equipoMap.has(equipoId))
      .map(([equipoId, cantidad], idx) => {
        const e = equipoMap.get(equipoId)!;
        return {
          ...base,
          id: `paq-${equipoId}`,
          tipo: "EQUIPO_PROPIO",
          equipoId,
          marca: e.marca,
          modelo: e.modelo,
          descripcion: e.descripcion,
          cantidad,
          subtotal: 0,
          esIncluido: false,
          notas: null,
          notasInternas: null,
          orden: (base.orden ?? 0) + idx,
          equipo: { categoria: e.categoria, imagenUrl: e.imagenUrl, imagenesUrls: e.imagenesUrls },
        };
      });

    const firstPaqIdx = cotizacion.lineas.findIndex((l) => l.tipo === "PAQUETE");
    lineasExpandidas = [
      ...cotizacion.lineas.slice(0, firstPaqIdx),
      ...sinteticas,
      ...cotizacion.lineas.slice(firstPaqIdx + 1).filter((l) => l.tipo !== "PAQUETE"),
    ] as typeof cotizacion.lineas;
  }

  const data = {
    ...cotizacion,
    lineas: lineasExpandidas,
    fechaEvento: cotizacion.fechaEvento?.toISOString() ?? null,
    createdAt: cotizacion.createdAt.toISOString(),
    updatedAt: cotizacion.updatedAt.toISOString(),
    fechaEnvio: cotizacion.fechaEnvio?.toISOString() ?? null,
    fechaVencimiento: cotizacion.fechaVencimiento?.toISOString() ?? null,
  };

  // Galerías vivas por tipo de evento (FotoTipoEvento, gestionables por UI).
  // El tipoEvento viene en MAYÚSCULAS; TipoEvento.slug en minúsculas.
  const slug = (cotizacion.trato?.tipoEvento ?? cotizacion.tipoEvento ?? "").toLowerCase().trim();
  const tipoEvento = slug
    ? await prisma.tipoEvento.findUnique({
        where: { slug },
        include: { fotos: { orderBy: { orden: "asc" } } },
      })
    : null;
  const galeriaFotos = (tipoEvento?.fotos ?? []).map((f) => ({
    id: f.id,
    url: f.url,
    caption: f.caption,
    orden: f.orden,
    destacada: f.destacada,
  }));
  const heroFotos = galeriaFotos.filter((f) => f.destacada);

  // Renders del paquete comercial base — SOLO si la cotización se desglosó de un paquete.
  // Si se armó a mano (paqueteId null), cotizacion.paquete es null → no se muestran renders.
  const renderFotos = (cotizacion.paquete?.imagenes ?? []).map((img) => ({ id: img.id, url: img.url }));
  const paqueteNombre = cotizacion.paquete?.nombre ?? null;

  // Descripción amigable por categoría según el tipo de evento del trato/cotización.
  const eventoUpper = (cotizacion.trato?.tipoEvento ?? cotizacion.tipoEvento ?? "MUSICAL").toUpperCase();
  const campoDesc = eventoUpper === "SOCIAL" ? "descSocial" : eventoUpper === "EMPRESARIAL" ? "descEmpresarial" : "descMusical";
  const catRows = await prisma.categoriaEquipo.findMany({
    select: { nombre: true, descMusical: true, descSocial: true, descEmpresarial: true },
  });
  const descCategorias: Record<string, string> = {};
  for (const cat of catRows) {
    const txt = (cat as Record<string, string | null>)[campoDesc];
    if (txt) descCategorias[cat.nombre] = txt;
  }

  const defaultNiveles = [
    { nivel: 1, nombre: "Base",        tagline: "Visibilidad esencial",  pct: 5,  destacado: false, beneficios: ["Logo en materiales digitales del evento","1 mención en redes sociales","2 a 4 accesos al evento","Acceso a métricas de alcance post-evento"] },
    { nivel: 2, nombre: "Estratégico", tagline: "Máximo alcance",        pct: 10, destacado: true,  beneficios: ["Logo en materiales digitales y físicos","3 menciones en redes + etiqueta en contenido","4 a 8 accesos al evento","Repost en @mainstagepro","Reporte de métricas detallado"] },
    { nivel: 3, nombre: "Premium",     tagline: "Presencia total",       pct: 12, destacado: false, beneficios: ["Logo destacado en todos los materiales","Cobertura completa en redes sociales","6 a 12 accesos al evento","Video recap con branding","Reporte ejecutivo de impacto"] },
  ];
  const tradeNiveles = await getConfigJSON("trade.niveles", defaultNiveles);

  if (cotizacion.tipoServicio === "RENTA") {
    return <PresentacionRentaClient cotizacion={data} token={token} galeriaFotos={galeriaFotos} heroFotos={heroFotos} renderFotos={renderFotos} paqueteNombre={paqueteNombre} descCategorias={descCategorias} />;
  }

  return <PresentacionClient cotizacion={data} tradeNiveles={tradeNiveles} token={token} galeriaFotos={galeriaFotos} heroFotos={heroFotos} renderFotos={renderFotos} paqueteNombre={paqueteNombre} descCategorias={descCategorias} />;
}
