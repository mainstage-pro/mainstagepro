import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ensurePaquetesTables, PAQUETE_INCLUDE } from "@/lib/paquetes";
import { getGaleriaData } from "@/lib/tipos-evento";
import { familiaTipo, categoriasConRespaldo } from "@/lib/galeria-shared";
import { getPresentationMetadata } from "@/lib/metadata";
import PaqueteDetalleClient from "./PaqueteDetalleClient";

export const dynamic = "force-dynamic";

async function getPaquete(id: string) {
  await ensurePaquetesTables();
  const p = await prisma.paquete.findFirst({
    where: { id, activo: true },
    include: PAQUETE_INCLUDE,
  });
  return p;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPaquete(id);
  if (!p) return getPresentationMetadata({ title: "Paquete", description: "Paquete de producción técnica", path: `/presentacion/paquete/${id}` });
  const portada = p.imagenes.find((im) => im.tipo !== "RENDER")?.url ?? p.imagenes[0]?.url ?? null;
  return getPresentationMetadata({
    title: p.nombre,
    description: p.resumen || p.propuestaValor || "Paquete de producción técnica para tu evento.",
    path: `/presentacion/paquete/${id}`,
    image: portada,
  });
}

export default async function PaqueteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPaquete(id);
  if (!p) notFound();

  const familia = familiaTipo(p.tipoEvento);
  const { categorias } = await getGaleriaData(familia);
  const conRespaldo = categoriasConRespaldo(categorias, familia);
  const galeria = conRespaldo[0]?.fotos ?? [];

  const paquete = {
    id: p.id,
    nombre: p.nombre,
    tipoEvento: p.tipoEvento,
    rangoPersonas: p.rangoPersonas,
    subtiposEvento: p.subtiposEvento,
    resumen: p.resumen,
    descripcion: p.descripcion,
    propuestaValor: p.propuestaValor,
    imagenes: p.imagenes.map((im) => ({ url: im.url, tipo: im.tipo })),
    items: p.items.map((it) => ({
      tipo: it.tipo,
      cantidad: it.cantidad,
      equipo: it.equipo
        ? {
            descripcion: it.equipo.descripcion,
            marca: it.equipo.marca,
            modelo: it.equipo.modelo,
            imagenUrl: it.equipo.imagenUrl ?? null,
            categoria: it.equipo.categoria?.nombre ?? null,
          }
        : null,
      producto: it.producto
        ? { nombre: it.producto.nombre, imagenUrl: it.producto.imagenUrl ?? null, categoria: it.producto.categoria ?? null }
        : null,
    })),
    conceptos: p.conceptos.map((c) => ({ tipo: c.tipo, descripcion: c.descripcion })),
  };

  return <PaqueteDetalleClient paquete={paquete} galeria={galeria} />;
}
