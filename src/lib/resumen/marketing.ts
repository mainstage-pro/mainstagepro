import { prisma } from "@/lib/prisma";
import { diasEntre, num, sumarDias, ventana } from "./base";

const NO_PUBLICADA = ["PENDIENTE", "EN_PROCESO", "LISTO"];

function redes(p: { enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean }): string[] {
  const r: string[] = [];
  if (p.enInstagram) r.push("IG");
  if (p.enFacebook) r.push("FB");
  if (p.enTiktok) r.push("TT");
  if (p.enYoutube) r.push("YT");
  return r;
}

export async function resumenMarketing() {
  const { hoy, finDeHoy } = ventana();
  const en14 = sumarDias(hoy, 14);
  const hace60 = sumarDias(hoy, -60);

  const [proximas, atrasadas, publicadas30, campanas, resultadosMes] = await Promise.all([
    prisma.publicacion.findMany({
      where: { oculta: false, fecha: { gte: hoy, lte: en14 }, estado: { in: NO_PUBLICADA } },
      select: {
        id: true, fecha: true, descripcion: true, formato: true, estado: true,
        enFacebook: true, enInstagram: true, enTiktok: true, enYoutube: true,
        tipo: { select: { nombre: true } },
      },
      orderBy: { fecha: "asc" },
    }),
    prisma.publicacion.findMany({
      where: { oculta: false, fecha: { gte: hace60, lt: hoy }, estado: { in: NO_PUBLICADA } },
      select: {
        id: true, fecha: true, descripcion: true, formato: true, estado: true,
        enFacebook: true, enInstagram: true, enTiktok: true, enYoutube: true,
        tipo: { select: { nombre: true } },
      },
      orderBy: { fecha: "asc" },
    }),
    prisma.publicacion.findMany({
      where: { oculta: false, estado: "PUBLICADO", fecha: { gte: sumarDias(hoy, -30), lte: finDeHoy } },
      select: { alcance: true, impresiones: true, interacciones: true, seguidoresGanados: true },
    }),
    prisma.ejecucionCampana.findMany({
      where: { estado: { in: ["PLANIFICADA", "EN_EJECUCION"] } },
      select: {
        id: true, nombre: true, estado: true, canal: true, objetivo: true,
        fechaInicio: true, fechaFin: true, presupuesto: true, briefCompleto: true,
      },
      orderBy: { fechaInicio: "asc" },
    }),
    prisma.resultadoCampana.findMany({
      where: { fecha: { gte: sumarDias(hoy, -30), lte: finDeHoy } },
      select: { ejecucionId: true, gastado: true, leads: true, clics: true, impresiones: true },
    }),
  ]);

  const dia = (f: Date) => new Date(f.toISOString().slice(0, 10));

  const mapa = (p: (typeof proximas)[number]) => ({
    id: p.id,
    titulo: p.tipo?.nombre || p.descripcion?.slice(0, 60) || "Publicación",
    detalle: p.formato || p.descripcion?.slice(0, 50) || "",
    estado: p.estado,
    redes: redes(p),
    dias: diasEntre(hoy, dia(p.fecha)),
  });

  const alcance30 = publicadas30.reduce((s, p) => s + num(p.alcance), 0);
  const interacciones30 = publicadas30.reduce((s, p) => s + num(p.interacciones), 0);
  const seguidores30 = publicadas30.reduce((s, p) => s + num(p.seguidoresGanados), 0);

  const gastoPorCampana = new Map<string, { gastado: number; leads: number }>();
  for (const r of resultadosMes) {
    const acc = gastoPorCampana.get(r.ejecucionId) ?? { gastado: 0, leads: 0 };
    acc.gastado += num(r.gastado);
    acc.leads += num(r.leads);
    gastoPorCampana.set(r.ejecucionId, acc);
  }

  const campanasVista = campanas.map(c => {
    const real = gastoPorCampana.get(c.id) ?? { gastado: 0, leads: 0 };
    const activa = dia(c.fechaInicio) <= hoy && dia(c.fechaFin) >= hoy;
    return {
      id: c.id,
      nombre: c.nombre,
      canal: c.canal,
      estado: c.estado,
      activa,
      diasRestantes: diasEntre(hoy, dia(c.fechaFin)),
      arranca: diasEntre(hoy, dia(c.fechaInicio)),
      presupuesto: num(c.presupuesto),
      gastado: real.gastado,
      leads: real.leads,
      briefCompleto: c.briefCompleto,
    };
  });

  const activas = campanasVista.filter(c => c.activa);

  return {
    proximas: proximas.map(mapa),
    atrasadas: atrasadas.map(mapa).sort((a, b) => a.dias - b.dias),
    estaSemana: proximas.filter(p => diasEntre(hoy, dia(p.fecha)) <= 7).length,
    listasParaSalir: proximas.filter(p => p.estado === "LISTO").length,
    sinProducir: proximas.filter(p => p.estado === "PENDIENTE").length,
    alcance30,
    interacciones30,
    seguidores30,
    publicadas30: publicadas30.length,
    campanas: campanasVista,
    activas,
    // Sin presupuesto no hay control de gasto; es el hueco que más caro sale.
    sinPresupuesto: campanasVista.filter(c => c.presupuesto === 0),
    sinBrief: campanasVista.filter(c => !c.briefCompleto && c.arranca <= 7),
    gasto30: resultadosMes.reduce((s, r) => s + num(r.gastado), 0),
    leads30: resultadosMes.reduce((s, r) => s + num(r.leads), 0),
  };
}
