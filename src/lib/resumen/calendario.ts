import { prisma } from "@/lib/prisma";
import { colorTemporada } from "@/lib/calendarios";
import { diasEntre, finDeMes, inicioDeSemana, sumarDias, ventana } from "./base";

export type Vista = "semana" | "quincena" | "mes";

export function normalizarVista(v: string | undefined): Vista {
  return v === "quincena" || v === "mes" ? v : "semana";
}

const PROYECTO_VIVO = ["PLANEACION", "CONFIRMADO", "EN_CURSO"];

/**
 * Una entrada de calendario es un día del año sin año: "15 de septiembre"
 * se repite siempre. Para poder compararla contra hoy hay que aterrizarla en
 * un año concreto, y si ya pasó en éste, en el siguiente.
 */
function proximaOcurrencia(mes: number, dia: number, hoy: Date): Date {
  const esteAnio = new Date(Date.UTC(hoy.getUTCFullYear(), mes - 1, dia));
  if (esteAnio >= hoy) return esteAnio;
  return new Date(Date.UTC(hoy.getUTCFullYear() + 1, mes - 1, dia));
}

/** Un rango mes/día contiene a hoy, considerando temporadas que cruzan el año. */
function rangoContiene(mesIni: number, diaIni: number, mesFin: number, diaFin: number, hoy: Date): boolean {
  const md = (m: number, d: number) => m * 100 + d;
  const ahora = md(hoy.getUTCMonth() + 1, hoy.getUTCDate());
  const ini = md(mesIni, diaIni);
  const fin = md(mesFin, diaFin);
  return ini <= fin ? ahora >= ini && ahora <= fin : ahora >= ini || ahora <= fin;
}

export async function resumenCalendario(vista: Vista) {
  const { hoy } = ventana();

  const desde = vista === "mes" ? new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1)) : inicioDeSemana(hoy);
  const hasta =
    vista === "semana" ? sumarDias(desde, 6) : vista === "quincena" ? sumarDias(desde, 13) : finDeMes(hoy);

  const [eventos, entradas, siguientes] = await Promise.all([
    prisma.proyecto.findMany({
      where: { estado: { in: PROYECTO_VIVO }, fechaEvento: { gte: desde, lte: hasta } },
      select: {
        id: true, numeroProyecto: true, nombre: true, estado: true, fechaEvento: true,
        tipoEvento: true, lugarEvento: true, zona: true, horaInicioEvento: true,
        montajeDiaAparte: true, desmontajeDiaAparte: true, fechaMontaje: true, fechaDesmontaje: true,
        cliente: { select: { nombre: true, empresa: true } },
        personal: { select: { confirmado: true } },
      },
      orderBy: { fechaEvento: "asc" },
    }),
    prisma.calendario_entradas.findMany({
      where: { activo: true, calendario: { in: ["ADMINISTRATIVO", "FESTIVIDADES", "FECHAS_ESPECIALES"] } },
      select: {
        id: true, calendario: true, tipo: true, titulo: true, descripcion: true,
        mes_inicio: true, dia_inicio: true, mes_fin: true, dia_fin: true, color: true,
      },
    }),
    prisma.proyecto.findMany({
      where: { estado: { in: PROYECTO_VIVO }, fechaEvento: { gt: hasta } },
      select: { id: true, numeroProyecto: true, nombre: true, fechaEvento: true, cliente: { select: { nombre: true, empresa: true } } },
      orderBy: { fechaEvento: "asc" },
    }),
  ]);

  const dia = (f: Date) => new Date(f.toISOString().slice(0, 10));

  const lista = eventos.map(p => ({
    id: p.id,
    numero: p.numeroProyecto,
    nombre: p.nombre,
    cliente: p.cliente?.empresa || p.cliente?.nombre || "—",
    estado: p.estado,
    fecha: dia(p.fechaEvento),
    dias: diasEntre(hoy, dia(p.fechaEvento)),
    tipoEvento: p.tipoEvento,
    lugar: p.lugarEvento,
    zona: p.zona,
    hora: p.horaInicioEvento,
    personal: p.personal.length,
    personalConfirmado: p.personal.filter(x => x.confirmado).length,
    montajeAparte: p.montajeDiaAparte ? (p.fechaMontaje ? dia(p.fechaMontaje) : null) : null,
    desmontajeAparte: p.desmontajeDiaAparte ? (p.fechaDesmontaje ? dia(p.fechaDesmontaje) : null) : null,
  }));

  // Rejilla día por día: un resumen de calendario sin huecos visibles no deja
  // ver dónde hay respiro y dónde se encima todo.
  const dias: { fecha: Date; eventos: typeof lista }[] = [];
  for (let d = new Date(desde); d <= hasta; d = sumarDias(d, 1)) {
    const key = d.toISOString().slice(0, 10);
    dias.push({ fecha: new Date(d), eventos: lista.filter(e => e.fecha.toISOString().slice(0, 10) === key) });
  }

  const temporadas = entradas.filter(e => e.calendario === "ADMINISTRATIVO" && e.tipo.startsWith("TEMPORADA"));

  const temporadaActual = temporadas.find(t =>
    rangoContiene(t.mes_inicio, t.dia_inicio ?? 1, t.mes_fin ?? t.mes_inicio, t.dia_fin ?? 28, hoy),
  );

  const temporadasOrdenadas = temporadas
    .map(t => ({ t, inicio: proximaOcurrencia(t.mes_inicio, t.dia_inicio ?? 1, hoy) }))
    .filter(x => x.t.id !== temporadaActual?.id)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const proximaTemporada = temporadasOrdenadas[0];

  const festivos = entradas
    .filter(e => e.calendario === "FESTIVIDADES" || e.calendario === "FECHAS_ESPECIALES")
    .map(e => ({
      id: e.id,
      titulo: e.titulo,
      tipo: e.tipo,
      descripcion: e.descripcion,
      calendario: e.calendario,
      fecha: proximaOcurrencia(e.mes_inicio, e.dia_inicio ?? 1, hoy),
    }))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .map(e => ({ ...e, dias: diasEntre(hoy, e.fecha) }));

  const finTemporada = temporadaActual
    ? proximaOcurrencia(
        temporadaActual.mes_fin ?? temporadaActual.mes_inicio,
        temporadaActual.dia_fin ?? 28,
        hoy,
      )
    : null;

  return {
    vista,
    desde,
    hasta,
    dias,
    lista,
    siguientes: siguientes.map(p => ({
      id: p.id,
      numero: p.numeroProyecto,
      nombre: p.nombre,
      cliente: p.cliente?.empresa || p.cliente?.nombre || "—",
      dias: diasEntre(hoy, dia(p.fechaEvento)),
      fecha: dia(p.fechaEvento),
    })),
    total: lista.length,
    sinPersonalCompleto: lista.filter(e => e.personal === 0 || e.personalConfirmado < e.personal).length,
    diasConEvento: dias.filter(d => d.eventos.length > 0).length,
    diaMasCargado: dias.reduce((a, b) => (b.eventos.length > a.eventos.length ? b : a), dias[0] ?? null),
    foraneos: lista.filter(e => e.zona !== "LOCAL").length,
    temporadaActual: temporadaActual
      ? {
          titulo: temporadaActual.titulo,
          tipo: temporadaActual.tipo,
          color: temporadaActual.color || colorTemporada(temporadaActual.titulo),
          termina: finTemporada,
          diasRestantes: finTemporada ? diasEntre(hoy, finTemporada) : null,
        }
      : null,
    proximaTemporada: proximaTemporada
      ? {
          titulo: proximaTemporada.t.titulo,
          tipo: proximaTemporada.t.tipo,
          color: proximaTemporada.t.color || colorTemporada(proximaTemporada.t.titulo),
          inicia: proximaTemporada.inicio,
          dias: diasEntre(hoy, proximaTemporada.inicio),
        }
      : null,
    festivos,
    hoy,
  };
}
