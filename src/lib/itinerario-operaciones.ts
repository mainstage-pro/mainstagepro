/**
 * itinerario-operaciones.ts — Itinerario multi-evento de montaje/operación/desmontaje.
 *
 * A diferencia de cronologia-evento.ts (minuto a minuto, un proyecto), esto agrega
 * VARIOS proyectos en un rango de fechas a nivel jornada: un renglón por día en que
 * un proyecto tiene montaje, evento o desmontaje. Usa los mismos horarios resumidos
 * (horariosResumen) para no desincronizarse de la Logística general del proyecto.
 */
import { diasEvento, horarioDeDia, fechaISOaDia } from "./fechas-evento";
import { fmt24to12 } from "./hora";
import { horariosResumen, type ProyectoCronologia } from "./cronologia-evento";

export type TipoJornada = "MONTAJE" | "EVENTO" | "DESMONTAJE";

export type ItinerarioJornada = {
  fecha: string; // YYYY-MM-DD
  tipo: TipoJornada;
  /** "Día 2 de 3" — solo en eventos de varios días. */
  diaLabel: string | null;
  horaInicio: string | null; // 12h con AM/PM
  horaFin: string | null;
  nota: string | null;
};

function h12(hhmm: string | null | undefined): string | null {
  if (!hhmm) return null;
  return fmt24to12(hhmm) || null;
}

/** Jornadas (montaje/evento/desmontaje) de un proyecto, en orden cronológico. */
export function jornadasDeProyecto(p: ProyectoCronologia): ItinerarioJornada[] {
  const dias = diasEvento(p.fechaEvento, p.fechasEvento);
  const h = horariosResumen(p);
  const jornadas: ItinerarioJornada[] = [];

  const llamadoFecha = p.llamadoBodega ? fechaISOaDia(p.llamadoBodega) : null;
  const montajeFecha = p.fechaMontaje ? fechaISOaDia(p.fechaMontaje) : llamadoFecha;
  const montajeDiaAparte = p.montajeDiaAparte === true && !!montajeFecha && montajeFecha !== dias[0];
  const tieneMontaje = h.llamadoBodega || h.salidaBodega || h.llegadaVenue || h.inicioMontaje || h.finMontaje;
  if (montajeDiaAparte && tieneMontaje) {
    jornadas.push({
      fecha: montajeFecha!,
      tipo: "MONTAJE",
      diaLabel: null,
      horaInicio: h12(h.inicioMontaje ?? h.llegadaVenue ?? h.salidaBodega ?? h.llamadoBodega),
      horaFin: h12(h.finMontaje),
      nota: p.lugarLlamado ?? null,
    });
  }

  dias.forEach((fecha, i) => {
    const hd = horarioDeDia(fecha, i, dias, p.horariosEvento, {
      inicio: p.horaInicioEvento,
      fin: p.horaFinEvento,
      llamado: null,
      montaje: null,
    });
    jornadas.push({
      fecha,
      tipo: "EVENTO",
      diaLabel: dias.length > 1 ? `Día ${i + 1} de ${dias.length}` : null,
      horaInicio: h12(hd.inicio),
      horaFin: h12(hd.fin),
      nota: p.lugarEvento ?? null,
    });
  });

  const desmontajeFecha = p.fechaDesmontaje ? fechaISOaDia(p.fechaDesmontaje) : null;
  const desmontajeDiaAparte =
    p.desmontajeDiaAparte === true && !!desmontajeFecha && desmontajeFecha !== dias[dias.length - 1];
  const tieneDesmontaje = h.inicioDesmontaje || h.finDesmontaje;
  if (tieneDesmontaje) {
    jornadas.push({
      fecha: desmontajeDiaAparte ? desmontajeFecha! : dias[dias.length - 1],
      tipo: "DESMONTAJE",
      diaLabel: null,
      horaInicio: h12(h.inicioDesmontaje),
      horaFin: h12(h.finDesmontaje),
      nota: null,
    });
  }

  return jornadas;
}

/** Primer y último día en que el proyecto ocupa la agenda (monta, opera o desmonta). */
export function ventanaProyecto(p: ProyectoCronologia): { inicio: string; fin: string } | null {
  const fechas = jornadasDeProyecto(p)
    .map((j) => j.fecha)
    .sort();
  if (!fechas.length) return null;
  return { inicio: fechas[0], fin: fechas[fechas.length - 1] };
}

export type ResponsableFuente = { personal: { coordinaEnSitio: boolean; tecnico: { nombre: string } | null }[]; responsables: string | null; encargado: { name: string } | null };

/** Responsable en sitio → responsable de producción del proyecto → encargado administrativo. */
export function responsableDeProyecto(p: ResponsableFuente): string | null {
  const coordinador = p.personal.find((pp) => pp.coordinaEnSitio && pp.tecnico?.nombre);
  if (coordinador?.tecnico?.nombre) return coordinador.tecnico.nombre;
  if (p.responsables) {
    try {
      const resp = JSON.parse(p.responsables) as { produccion?: { nombre?: string } };
      if (resp.produccion?.nombre) return resp.produccion.nombre;
    } catch {
      /* ignore */
    }
  }
  return p.encargado?.name ?? null;
}

export type ItinerarioEvento = {
  proyectoId: string;
  numeroProyecto: string;
  nombre: string;
  estado: string;
  clienteNombre: string;
  lugarEvento: string | null;
  responsable: string | null;
  notasOperativas: string | null;
  jornadas: ItinerarioJornada[];
};

/** Un renglón del itinerario: una jornada de un evento, ya aplanado para agrupar por fecha. */
export type ItinerarioRenglon = ItinerarioJornada & {
  proyectoId: string;
  numeroProyecto: string;
  nombre: string;
  estado: string;
  clienteNombre: string;
  responsable: string | null;
  notasOperativas: string | null;
};

/** Aplana los eventos a renglones y los deja agrupables/ordenables por fecha. */
export function renglonesDeItinerario(eventos: ItinerarioEvento[]): ItinerarioRenglon[] {
  const renglones = eventos.flatMap((ev) =>
    ev.jornadas.map((j) => ({
      ...j,
      proyectoId: ev.proyectoId,
      numeroProyecto: ev.numeroProyecto,
      nombre: ev.nombre,
      estado: ev.estado,
      clienteNombre: ev.clienteNombre,
      responsable: ev.responsable,
      notasOperativas: ev.notasOperativas,
    })),
  );
  return renglones.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre));
}

/** Agrupa renglones por fecha (YYYY-MM-DD), en orden. */
export function porDia(renglones: ItinerarioRenglon[]): { fecha: string; renglones: ItinerarioRenglon[] }[] {
  const mapa = new Map<string, ItinerarioRenglon[]>();
  renglones.forEach((r) => {
    mapa.set(r.fecha, [...(mapa.get(r.fecha) ?? []), r]);
  });
  return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, renglones]) => ({ fecha, renglones }));
}
