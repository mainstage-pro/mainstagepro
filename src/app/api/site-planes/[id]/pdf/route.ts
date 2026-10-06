import { NextRequest, NextResponse } from "next/server";
import path from "path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SitePlanPDF, { type DatosSitePlanPDF } from "@/components/SitePlanPDF";
import { logoBase64, resolvePdfImage } from "@/components/pdf/PdfShared";
import { LIENZO_SIN_FONDO, parsearContenido } from "@/lib/site-plan";
import { validarTokenSitePlan } from "@/lib/site-plan-token";
import { fmtFechaLarga } from "@/lib/giras";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;

  // El mismo PDF sirve adentro y afuera: con sesión para producción, con token
  // para el promotor o el venue que recibe el link público.
  const token = req.nextUrl.searchParams.get("token");
  if (!validarTokenSitePlan(id, token)) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const plan = await prisma.sitePlan.findFirst({
    where: { id, activo: true },
    include: {
      venue: { select: { nombre: true, ciudad: true, direccion: true } },
      show: {
        select: {
          fecha: true,
          ciudad: true,
          gira: { select: { nombre: true } },
          venue: { select: { nombre: true, direccion: true } },
        },
      },
      // El mismo plano puede ser de un proyecto de eventos: el encabezado se arma
      // con lo que tenga el dueño que sea, sin dos PDF distintos.
      proyecto: {
        select: {
          nombre: true,
          fechaEvento: true,
          lugarEvento: true,
          direccionVenue: true,
          venue: { select: { nombre: true, direccion: true, ciudad: true } },
        },
      },
    },
  });
  if (!plan) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // El plano se emite por variante: el croquis eléctrico y el de evacuación son
  // documentos distintos del mismo dibujo, cada uno con su revisión en el pie.
  const varianteId = req.nextUrl.searchParams.get("variante");
  const variante = varianteId
    ? await prisma.sitePlanVariante.findFirst({ where: { id: varianteId, planId: id, activo: true } })
    : null;

  const publicDir = path.join(process.cwd(), "public");
  const fondoBase64 = await resolvePdfImage(plan.fondoUrl, publicDir);

  const { capas, objetos } = parsearContenido(plan.contenido);

  const partes = (
    plan.proyecto
      ? [
          plan.proyecto.nombre,
          plan.proyecto.venue?.nombre ?? plan.proyecto.lugarEvento ?? plan.venue?.nombre,
          plan.proyecto.venue?.ciudad ?? plan.venue?.ciudad,
          plan.proyecto.fechaEvento ? fmtFechaLarga(plan.proyecto.fechaEvento) : null,
        ]
      : [
          plan.show?.gira.nombre,
          plan.show?.venue?.nombre ?? plan.venue?.nombre,
          plan.show?.ciudad ?? plan.venue?.ciudad,
          plan.show ? fmtFechaLarga(plan.show.fecha) : null,
        ]
  ).filter(Boolean) as string[];

  const d: DatosSitePlanPDF = {
    nombre: plan.nombre,
    subtitulo: partes.join(" · "),
    fecha: fmtFechaLarga(new Date()),
    fondoBase64,
    fondoAncho: plan.fondoAncho ?? LIENZO_SIN_FONDO.ancho,
    fondoAlto: plan.fondoAlto ?? LIENZO_SIN_FONDO.alto,
    escala: plan.escalaMPorPx,
    capas,
    objetos,
    notas: variante?.notas ?? plan.notas,
    logoBase64: logoBase64(publicDir),
    cuadro: {
      direccionSitio:
        plan.direccionSitio ??
        plan.show?.venue?.direccion ??
        plan.proyecto?.direccionVenue ??
        plan.proyecto?.venue?.direccion ??
        plan.venue?.direccion ??
        null,
      norteGrados: plan.norteGrados,
      dibujadoPor: plan.dibujadoPor,
      responsableSitio: plan.responsableSitio,
      clienteOPromotor: plan.clienteOPromotor,
      capacidadSitio: plan.capacidadSitio,
      capacidadEvacuacion: plan.capacidadEvacuacion,
    },
    variante: variante
      ? {
          nombre: variante.nombre,
          revision: variante.revision,
          estado: variante.estado,
          capasIds: variante.capasIds,
          soloElectrico: variante.soloElectrico,
          soloEmergencia: variante.soloEmergencia,
        }
      : null,
  };

  const buffer = await renderToBuffer(
    React.createElement(SitePlanPDF, { d }) as Parameters<typeof renderToBuffer>[0],
  );

  const base = variante ? `${plan.nombre} ${variante.nombre} Rev ${variante.revision}` : plan.nombre;
  const archivo = `Site-plan-${base.replace(/[^a-zA-Z0-9]+/g, "-")}.pdf`;
  const enLinea = req.nextUrl.searchParams.get("preview") === "1";
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${enLinea ? "inline" : "attachment"}; filename="${archivo}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
