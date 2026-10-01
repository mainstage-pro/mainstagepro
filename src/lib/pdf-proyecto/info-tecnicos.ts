import { prisma } from "@/lib/prisma";
import { Document } from "@react-pdf/renderer";
import { BriefTecnico } from "@/components/pdf/BriefTecnico";
import { logoBase64 } from "@/components/pdf/PdfShared";
import { bufferDePdf, type PdfProyecto } from "./render";
import React from "react";
import path from "path";

export async function generarInfoTecnicos(id: string): Promise<PdfProyecto | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proyecto = await (prisma.proyecto.findUnique as any)({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true } },
      encargado: { select: { name: true } },
      proveedoresEvento: { select: { id: true, nombreProveedor: true } },
      bloquesTiempo: { orderBy: { orden: "asc" } },
    },
  });

  if (!proyecto) return null;

  const logoSrc = logoBase64(path.join(process.cwd(), "public"));

  const buf = await bufferDePdf(
    React.createElement(BriefTecnico, {
      proyecto: {
        id: proyecto.id,
        nombre: proyecto.nombre,
        numeroProyecto: proyecto.numeroProyecto,
        tipoEvento: proyecto.tipoEvento,
        tipoServicio: proyecto.tipoServicio ?? null,
        fechaEvento: proyecto.fechaEvento?.toISOString() ?? "",
        fechasEvento: proyecto.fechasEvento ?? null,
        horariosEvento: proyecto.horariosEvento ?? null,
        horaInicioEvento: proyecto.horaInicioEvento ?? null,
        horaFinEvento: proyecto.horaFinEvento ?? null,
        fechaMontaje: proyecto.fechaMontaje?.toISOString() ?? null,
        horaMontaje: proyecto.horaMontaje ?? null,
        horaInicioMontaje: proyecto.horaInicioMontaje ?? null,
        duracionMontajeHrs: proyecto.duracionMontajeHrs ?? null,
        montajeDiaAparte: proyecto.montajeDiaAparte ?? null,
        desmontajeDiaAparte: proyecto.desmontajeDiaAparte ?? null,
        fechaDesmontaje: proyecto.fechaDesmontaje?.toISOString() ?? null,
        duracionDesmontajeHrs: proyecto.duracionDesmontajeHrs ?? null,
        horaSalidaBodega: proyecto.horaSalidaBodega ?? null,
        puntoSalidaBodega: proyecto.puntoSalidaBodega ?? null,
        horaDesmontaje: proyecto.horaDesmontaje ?? null,
        llamadoBodega: proyecto.llamadoBodega?.toISOString() ?? null,
        lugarLlamado: proyecto.lugarLlamado ?? null,
        lugarEvento: proyecto.lugarEvento ?? null,
        direccionVenue: proyecto.direccionVenue ?? null,
        linkMaps: proyecto.linkMaps ?? null,
        indicacionesAcceso: proyecto.indicacionesAcceso ?? null,
        encargadoLugar: proyecto.encargadoLugar ?? null,
        encargadoLugarContacto: proyecto.encargadoLugarContacto ?? null,
        encargadoCliente: proyecto.encargadoCliente ?? null,
        encargadoClienteContacto: proyecto.encargadoClienteContacto ?? null,
        contactosEmergencia: proyecto.contactosEmergencia ?? null,
        transportes: proyecto.transportes ?? null,
        choferNombre: proyecto.choferNombre ?? null,
        comentariosFinales: proyecto.comentariosFinales ?? null,
        notasBriefTecnico: proyecto.notasBriefTecnico ?? null,
        briefObjetivo: proyecto.briefObjetivo ?? null,
        briefAcomodo: proyecto.briefAcomodo ?? null,
        briefRestricciones: proyecto.briefRestricciones ?? null,
        cliente: {
          nombre: proyecto.cliente.nombre,
          empresa: proyecto.cliente.empresa ?? null,
        },
        encargado: proyecto.encargado ? { name: proyecto.encargado.name } : null,
        bloquesTiempo: proyecto.bloquesTiempo ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nombresProveedor: Object.fromEntries((proyecto.proveedoresEvento ?? []).map((p: any) => [p.id, p.nombreProveedor])),
      },
      logoSrc,
    }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  return { buf, filename: `info-tecnicos-${proyecto.numeroProyecto}.pdf` };
}
