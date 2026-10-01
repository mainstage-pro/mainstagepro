/**
 * El layout de producción: la versión FINAL del plano de un escenario.
 *
 * Lo que el editor guarda es un borrador operativo; esto lo convierte en un
 * documento cerrado y serializable —plano, zonas, configuraciones y la lista de
 * todo lo que se instala— que alimenta por igual el PDF y la vista pública.
 * Ambos salen de aquí para que nunca digan cosas distintas.
 */

import { prisma } from "@/lib/prisma";
import type { Carga } from "@/lib/consumo-electrico";
import { medidasEscenario, parsearLayout, type Area, type Pieza } from "@/lib/layout-escenario";
import {
  SIN_ZONA,
  agruparPorZona,
  type EquipoDelRider,
  type ItemDeZona,
} from "@/lib/layout-zonas";

export type FilaEquipo = {
  clave: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
  cantidad: number;
  categoria: string | null;
  disciplina: string | null;
  configuracion: string;
  /** Soporte y altura ya legibles: "Truss volada · 6 m". */
  montaje: string;
  notas: string | null;
  colgado: boolean;
  pesoKg: number;
  /** "12.0 A @ 110 V", o vacío si al modelo le falta el amperaje. */
  carga: string;
};

export type SubzonaDoc = {
  clave: string;
  etiqueta: string;
  disciplina: string | null;
  color: string;
  unidades: number;
  pesoKg: number;
  carga: Carga;
  equipos: FilaEquipo[];
};

export type ZonaDoc = {
  clave: string;
  zonaId: string;
  etiqueta: string;
  color: string;
  unidades: number;
  pesoKg: number;
  carga: Carga;
  /** Dónde quedó dibujada en el plano, si alguien la dibujó. */
  area: Area | null;
  subzonas: SubzonaDoc[];
};

export type DocumentoLayout = {
  proyecto: {
    id: string;
    numero: string;
    nombre: string;
    cliente: string;
    tipoEvento: string;
    fechaEvento: string;
    lugar: string | null;
    direccion: string | null;
  };
  escenario: { id: string; nombre: string; notas: string | null };
  plano: { anchoM: number; largoM: number; areas: Area[]; piezas: Pieza[] };
  zonas: ZonaDoc[];
  totales: {
    unidades: number;
    modelos: number;
    pesoKg: number;
    pesoColgadoKg: number;
    pesoPisoKg: number;
    carga: Carga;
    zonas: number;
    configuraciones: number;
  };
  /** Cuánto pesa y consume cada disciplina: el reparto que pide el jefe de piso. */
  porDisciplina: { disciplina: string; unidades: number; pesoKg: number; carga: Carga }[];
  generadoEn: string;
};

function montajeDe(i: ItemDeZona): string {
  return [i.soporteLabel || null, i.alturaM != null ? `${i.alturaM} m` : null]
    .filter(Boolean)
    .join(" · ");
}

function cargaDe(i: ItemDeZona): string {
  if (i.amperajeUnitario == null) return "";
  return `${i.amperajeTotal.toFixed(1)} A @ ${i.voltaje} V`;
}

const CARGA_CERO = (): Carga => ({ amperaje110: 0, amperaje220: 0, watts: 0, sinDato: 0 });

function acumular(destino: Carga, origen: Carga): void {
  destino.amperaje110 += origen.amperaje110;
  destino.amperaje220 += origen.amperaje220;
  destino.watts += origen.watts;
  destino.sinDato += origen.sinDato;
}

/**
 * Carga el escenario y lo arma como documento. Devuelve `null` si no existe, para
 * que cada ruta decida si eso es un 404 público o uno autenticado.
 */
export async function construirDocumentoLayout(escenarioId: string): Promise<DocumentoLayout | null> {
  const escenario = await prisma.proyectoEscenario.findUnique({
    where: { id: escenarioId },
    select: {
      id: true,
      nombre: true,
      notas: true,
      anchoM: true,
      largoM: true,
      layout: true,
      proyectoId: true,
      proyecto: {
        select: {
          id: true,
          numeroProyecto: true,
          nombre: true,
          tipoEvento: true,
          fechaEvento: true,
          lugarEvento: true,
          direccionVenue: true,
          cliente: { select: { nombre: true } },
        },
      },
    },
  });
  if (!escenario) return null;

  // Mismo criterio que el editor: entra el equipo de ESTE escenario más el que
  // todavía no tiene escenario asignado.
  const equipos = (await prisma.proyectoEquipo.findMany({
    where: { proyectoId: escenario.proyectoId, OR: [{ escenarioId }, { escenarioId: null }] },
    include: {
      equipo: {
        select: {
          id: true, marca: true, modelo: true, descripcion: true, pesoKg: true,
          imagenUrl: true, huellaAnchoM: true, huellaLargoM: true,
          amperajeRequerido: true, amperajeRequerido220: true, voltajeRequerido: true,
          categoria: { select: { nombre: true, disciplina: true } },
        },
      },
      posiciones: { orderBy: { orden: "asc" } },
    },
    orderBy: { id: "asc" },
  })) as unknown as EquipoDelRider[];

  const { piezas, areas } = parsearLayout(escenario.layout);
  const medidas = medidasEscenario(escenario.anchoM, escenario.largoM);
  const agrupadas = agruparPorZona(equipos);
  const areaPorClave = new Map(areas.map(a => [a.clave, a]));

  const zonas: ZonaDoc[] = agrupadas.map(z => ({
    clave: z.clave,
    zonaId: z.zonaId,
    etiqueta: z.etiqueta,
    color: z.color,
    unidades: z.unidades,
    pesoKg: z.pesoKg,
    carga: z.carga,
    area: areaPorClave.get(z.clave) ?? null,
    subzonas: z.subzonas.map(s => ({
      clave: s.clave,
      etiqueta: s.etiqueta,
      disciplina: s.disciplina,
      color: s.color,
      unidades: s.unidades,
      pesoKg: s.pesoKg,
      carga: s.carga,
      equipos: s.items.map(i => ({
        clave: i.clave,
        nombre: i.nombre,
        descripcion: i.descripcion,
        imagenUrl: i.imagenUrl,
        cantidad: i.cantidad,
        categoria: i.categoria,
        disciplina: i.disciplina,
        configuracion: s.etiqueta,
        montaje: montajeDe(i),
        notas: i.notas,
        colgado: i.colgado,
        pesoKg: i.pesoKg,
        carga: cargaDe(i),
      })),
    })),
  }));

  const carga = CARGA_CERO();
  const porDisciplina = new Map<string, { disciplina: string; unidades: number; pesoKg: number; carga: Carga }>();
  const modelos = new Set<string>();
  let unidades = 0;
  let pesoKg = 0;
  let pesoColgadoKg = 0;
  let configuraciones = 0;

  for (const z of zonas) {
    acumular(carga, z.carga);
    unidades += z.unidades;
    pesoKg += z.pesoKg;
    configuraciones += z.subzonas.length;
    for (const s of z.subzonas) {
      const llave = s.disciplina ?? "Sin disciplina";
      let d = porDisciplina.get(llave);
      if (!d) {
        d = { disciplina: llave, unidades: 0, pesoKg: 0, carga: CARGA_CERO() };
        porDisciplina.set(llave, d);
      }
      d.unidades += s.unidades;
      d.pesoKg += s.pesoKg;
      acumular(d.carga, s.carga);
      for (const e of s.equipos) {
        modelos.add(e.nombre);
        if (e.colgado) pesoColgadoKg += e.pesoKg;
      }
    }
  }

  // El peso colgado sale del rider, no del plano: cuenta el equipo que va volado
  // aunque todavía no lo hayan dibujado como pieza.
  return {
    proyecto: {
      id: escenario.proyecto.id,
      numero: escenario.proyecto.numeroProyecto,
      nombre: escenario.proyecto.nombre,
      cliente: escenario.proyecto.cliente.nombre,
      tipoEvento: escenario.proyecto.tipoEvento,
      fechaEvento: escenario.proyecto.fechaEvento.toISOString(),
      lugar: escenario.proyecto.lugarEvento,
      direccion: escenario.proyecto.direccionVenue,
    },
    escenario: { id: escenario.id, nombre: escenario.nombre, notas: escenario.notas },
    plano: { anchoM: medidas.anchoM, largoM: medidas.largoM, areas, piezas },
    zonas,
    totales: {
      unidades,
      modelos: modelos.size,
      pesoKg,
      pesoColgadoKg,
      pesoPisoKg: pesoKg - pesoColgadoKg,
      carga,
      zonas: zonas.filter(z => z.zonaId !== SIN_ZONA).length,
      configuraciones,
    },
    porDisciplina: [...porDisciplina.values()].sort((a, b) => b.pesoKg - a.pesoKg),
    generadoEn: new Date().toISOString(),
  };
}

/** Nombre del archivo que se descarga. Palabras de producción, no de software. */
export function nombreArchivoLayout(doc: DocumentoLayout): string {
  const limpio = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `Layout-de-Produccion-${doc.proyecto.numero}-${limpio(doc.escenario.nombre)}.pdf`;
}
