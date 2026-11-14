// src/lib/pdf-proyecto/itinerario.ts
//
// El itinerario de operaciones de UN proyecto: el mismo PDF que sale desde
// /proyectos/itinerario, pero con todos los días del proyecto (llamado,
// montaje, evento, desmontaje) y sin los demás eventos ni actividades sueltas.

import React from "react";
import { Document } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { ItinerarioOperacionesPDF } from "@/components/ItinerarioOperacionesPDF";
import { SELECT_ITINERARIO } from "@/app/api/proyectos/itinerario/route";
import { checkpointsDeProyecto, responsableDeProyecto, type ItinerarioEvento } from "@/lib/itinerario-operaciones";
import { bufferDePdf, type PdfProyecto } from "./render";

export async function generarItinerarioProyecto(id: string): Promise<PdfProyecto | null> {
  const p = await prisma.proyecto.findUnique({ where: { id }, select: SELECT_ITINERARIO });
  if (!p) return null;

  const checkpoints = checkpointsDeProyecto(p, p.bloquesTiempo);
  const fechas = checkpoints.map((c) => c.fecha).sort();
  const hoy = new Date().toISOString().slice(0, 10);
  const inicio = fechas[0] ?? p.fechaEvento?.toISOString().slice(0, 10) ?? hoy;
  const fin = fechas[fechas.length - 1] ?? inicio;

  const evento: ItinerarioEvento = {
    proyectoId: p.id,
    numeroProyecto: p.numeroProyecto,
    nombre: p.nombre,
    estado: p.estado,
    clienteNombre: p.cliente.nombre,
    lugarEvento: p.lugarEvento,
    responsable: responsableDeProyecto(p),
    notasOperativas: p.notasOperativas,
    checkpoints,
  };

  const buf = await bufferDePdf(
    React.createElement(ItinerarioOperacionesPDF, {
      data: {
        eventos: [evento],
        inicio,
        fin,
        proyecto: { numeroProyecto: p.numeroProyecto, nombre: p.nombre, clienteNombre: p.cliente.nombre },
      },
    }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  return { buf, filename: `itinerario-${p.numeroProyecto}.pdf` };
}
