import { prisma } from "@/lib/prisma";
import { capacidadOperativa, ESTADO_EQUIPO_LABEL } from "@/lib/equipo-estado";
import { diasEntre, num, sumarDias, ventana } from "./base";

const PROYECTO_VIVO = ["PLANEACION", "CONFIRMADO", "EN_CURSO"];

export async function resumenEquipos() {
  const { hoy, finDeHoy } = ventana();
  const en21 = sumarDias(hoy, 21);

  const [equipos, fallas, mantenimientos, recolecciones, comprometidos, vehiculos] = await Promise.all([
    prisma.equipo.findMany({
      where: { activo: true },
      select: {
        id: true, descripcion: true, marca: true, modelo: true, estado: true,
        cantidadTotal: true, tipo: true, fechaBaja: true,
        categoria: { select: { nombre: true } },
        unidades: { where: { activo: true }, select: { estado: true } },
      },
    }),
    prisma.fallaEquipo.findMany({
      where: { estado: { in: ["REPORTADA", "EN_ATENCION"] } },
      select: {
        id: true, fecha: true, descripcion: true, severidad: true, estado: true,
        equipo: { select: { id: true, descripcion: true, marca: true } },
      },
      orderBy: { fecha: "asc" },
      take: 40,
    }),
    prisma.mantenimientoEquipo.findMany({
      where: { proximoMantenimiento: { not: null, lte: en21 } },
      select: {
        id: true, proximoMantenimiento: true, tipo: true,
        equipo: { select: { id: true, descripcion: true, marca: true } },
      },
      orderBy: { proximoMantenimiento: "asc" },
      take: 20,
    }),
    prisma.proyecto.findMany({
      where: { recoleccionStatus: { in: ["PENDIENTE", "EN_CAMINO"] }, fechaEvento: { lte: finDeHoy } },
      select: {
        id: true, numeroProyecto: true, nombre: true, fechaEvento: true, recoleccionStatus: true,
        cliente: { select: { nombre: true, empresa: true } },
      },
      orderBy: { fechaEvento: "asc" },
      take: 20,
    }),
    // Lo que ya está apalabrado en eventos próximos: sin esto, "disponible" miente.
    prisma.proyectoEquipo.findMany({
      where: { proyecto: { estado: { in: PROYECTO_VIVO }, fechaEvento: { gte: hoy, lte: en21 } } },
      select: {
        equipoId: true, cantidad: true, tipo: true,
        proyecto: { select: { id: true, numeroProyecto: true, fechaEvento: true } },
      },
    }),
    prisma.vehiculo.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, proximoServicioFecha: true, proximoServicioKm: true, kilometraje: true },
    }),
  ]);

  const dia = (f: Date) => new Date(f.toISOString().slice(0, 10));

  const fueraDeServicio = equipos
    .filter(e => e.estado !== "ACTIVO")
    .map(e => ({
      id: e.id,
      nombre: [e.marca, e.descripcion].filter(Boolean).join(" "),
      categoria: e.categoria?.nombre ?? "—",
      estado: e.estado,
      estadoLabel: ESTADO_EQUIPO_LABEL[e.estado] ?? e.estado,
      dias: e.fechaBaja ? diasEntre(dia(e.fechaBaja), hoy) : null,
    }));

  // Unidades sueltas averiadas de un equipo que en conjunto sigue "ACTIVO":
  // no aparecen en ningún listado de estado y son merma invisible.
  const unidadesCaidas = equipos
    .filter(e => e.estado === "ACTIVO" && e.unidades.some(u => u.estado !== "ACTIVO"))
    .map(e => ({
      id: e.id,
      nombre: [e.marca, e.descripcion].filter(Boolean).join(" "),
      caidas: e.unidades.filter(u => u.estado !== "ACTIVO").length,
      total: e.cantidadTotal,
      operativas: capacidadOperativa(e.cantidadTotal, e.estado, e.unidades),
    }));

  const capacidadPorEquipo = new Map(
    equipos.map(e => [e.id, capacidadOperativa(e.cantidadTotal, e.estado, e.unidades)]),
  );

  // Pico de demanda por equipo: el día peor, no la suma del periodo. Dos eventos
  // en días distintos usan el mismo equipo sin conflicto; el mismo día, no.
  const porEquipoFecha = new Map<string, Map<string, number>>();
  for (const pe of comprometidos) {
    if (pe.tipo !== "PROPIO") continue;
    const f = pe.proyecto.fechaEvento.toISOString().slice(0, 10);
    const m = porEquipoFecha.get(pe.equipoId) ?? new Map<string, number>();
    m.set(f, (m.get(f) ?? 0) + num(pe.cantidad));
    porEquipoFecha.set(pe.equipoId, m);
  }

  const conflictos: { id: string; nombre: string; fecha: string; requerido: number; disponible: number }[] = [];
  const tension: { id: string; nombre: string; fecha: string; requerido: number; disponible: number }[] = [];
  for (const [equipoId, porFecha] of porEquipoFecha) {
    const disponible = capacidadPorEquipo.get(equipoId) ?? 0;
    const eq = equipos.find(e => e.id === equipoId);
    if (!eq) continue;
    for (const [fecha, requerido] of porFecha) {
      const fila = {
        id: equipoId,
        nombre: [eq.marca, eq.descripcion].filter(Boolean).join(" "),
        fecha,
        requerido,
        disponible,
      };
      if (requerido > disponible) conflictos.push(fila);
      else if (disponible > 0 && requerido / disponible >= 0.8) tension.push(fila);
    }
  }

  const serviciosVehiculo = vehiculos
    .filter(v => v.proximoServicioFecha && dia(v.proximoServicioFecha) <= en21)
    .map(v => ({
      id: v.id,
      nombre: v.nombre,
      dias: diasEntre(hoy, dia(v.proximoServicioFecha!)),
    }))
    .sort((a, b) => a.dias - b.dias);

  const totalUnidades = equipos.reduce((s, e) => s + e.cantidadTotal, 0);
  const operativas = equipos.reduce((s, e) => s + capacidadOperativa(e.cantidadTotal, e.estado, e.unidades), 0);

  return {
    totalEquipos: equipos.length,
    totalUnidades,
    operativas,
    fueraDeServicio,
    enMantenimiento: fueraDeServicio.filter(e => e.estado === "EN_MANTENIMIENTO" || e.estado === "EN_REPARACION"),
    dadosDeBaja: fueraDeServicio.filter(e => e.estado === "DADO_DE_BAJA"),
    unidadesCaidas,
    fallas: fallas.map(f => ({
      id: f.id,
      equipoId: f.equipo.id,
      nombre: [f.equipo.marca, f.equipo.descripcion].filter(Boolean).join(" "),
      descripcion: f.descripcion,
      severidad: f.severidad,
      estado: f.estado,
      dias: diasEntre(dia(f.fecha), hoy),
    })),
    mantenimientos: mantenimientos.map(m => ({
      id: m.id,
      equipoId: m.equipo.id,
      nombre: [m.equipo.marca, m.equipo.descripcion].filter(Boolean).join(" "),
      tipo: m.tipo,
      dias: diasEntre(hoy, dia(m.proximoMantenimiento!)),
    })),
    recolecciones: recolecciones.map(p => ({
      id: p.id,
      numero: p.numeroProyecto,
      nombre: p.nombre,
      cliente: p.cliente?.empresa || p.cliente?.nombre || "—",
      estado: p.recoleccionStatus,
      dias: diasEntre(dia(p.fechaEvento), hoy),
    })),
    conflictos: conflictos.sort((a, b) => b.requerido - b.disponible - (a.requerido - a.disponible)).slice(0, 8),
    tension: tension.sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 6),
    serviciosVehiculo,
    equiposExternosProximos: comprometidos.filter(c => c.tipo === "EXTERNO").length,
  };
}
