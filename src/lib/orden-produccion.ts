/**
 * orden-produccion.ts — Datos de la Orden de Producción servida por token.
 *
 * Misma información que el PDF de la orden, pero armada para consumo web: las
 * tres cronologías ya construidas y el avance de los pases de carga resuelto,
 * para que la página solo pinte.
 */
import { prisma } from "@/lib/prisma";
import {
  construirCronologia,
  VISTAS_CRONOLOGIA,
  type BloqueCronologia,
  type BloqueTiempo,
  type ProyectoCronologia,
  type VistaCronologia,
} from "@/lib/cronologia-evento";
import { resumenMontaje } from "@/lib/montaje-reportes";
import { avanceCarga, type AvanceCarga } from "@/lib/control-carga";

export type OrdenEquipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  categoria: string;
  cantidad: number;
  tipo: string;
  confirmado: boolean;
  proveedor: string | null;
  notas: string | null;
  montaje: string | null;
  accesorios: { nombre: string; cantidad: number }[];
};

export type OrdenPase = {
  id: string;
  tipo: string;
  etiqueta: string | null;
  estado: string;
  cerradaEn: string | null;
  notaCierre: string | null;
  abiertoPor: string | null;
  cerradaPor: string | null;
  createdAt: string;
  avance: AvanceCarga;
};

export type OrdenCronologia = { vista: VistaCronologia; titulo: string; descripcion: string; bloques: BloqueCronologia[] };

export type OrdenPersonal = {
  id: string;
  tecnicoId: string;
  nombre: string;
  celular: string | null;
  rol: string | null;
  participacion: string | null;
  fechaJornada: string | null;
  confirmado: boolean;
};

export type OrdenProveedor = {
  nombre: string;
  servicio: string | null;
  telefono: string | null;
  responsable: string | null;
};

export type OrdenArchivo = { tipo: string; nombre: string; url: string };

/** Resuelve el proyecto dueño del token. Null = token desconocido. */
export async function proyectoIdPorToken(token: string): Promise<string | null> {
  const p = await prisma.proyecto.findUnique({
    where: { ordenToken: token },
    select: { id: true },
  });
  return p?.id ?? null;
}

export async function ordenPorToken(token: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = await (prisma.proyecto.findUnique as any)({
    where: { ordenToken: token },
    include: {
      cliente: { select: { nombre: true, empresa: true } },
      encargado: { select: { name: true } },
      personal: {
        include: {
          tecnico: { select: { id: true, nombre: true, celular: true } },
          rolTecnico: { select: { nombre: true } },
        },
        orderBy: { id: "asc" },
      },
      equipos: {
        include: {
          equipo: {
            select: {
              descripcion: true, marca: true, modelo: true,
              categoria: { select: { nombre: true, disciplina: true } },
            },
          },
          proveedor: { select: { nombre: true, telefono: true } },
          riderAccesorios: { orderBy: { orden: "asc" } },
          posiciones: { orderBy: { orden: "asc" } },
        },
        orderBy: { id: "asc" },
      },
      archivos: { orderBy: { createdAt: "desc" } },
      proveedoresEvento: { orderBy: { createdAt: "asc" } },
      bloquesTiempo: { orderBy: { orden: "asc" } },
      cargas: {
        orderBy: { createdAt: "asc" },
        include: {
          items: { select: { estado: true } },
          abiertoPor: { select: { nombre: true } },
          cerradaPor: { select: { nombre: true } },
        },
      },
    },
  });

  if (!p) return null;

  const cronoInput: ProyectoCronologia = {
    fechaEvento: p.fechaEvento,
    fechasEvento: p.fechasEvento ?? null,
    horariosEvento: p.horariosEvento ?? null,
    horaInicioEvento: p.horaInicioEvento ?? null,
    horaFinEvento: p.horaFinEvento ?? null,
    fechaMontaje: p.fechaMontaje ?? null,
    horaMontaje: p.horaMontaje ?? null,
    horaInicioMontaje: p.horaInicioMontaje ?? null,
    duracionMontajeHrs: p.duracionMontajeHrs ?? null,
    montajeDiaAparte: p.montajeDiaAparte ?? null,
    horaSalidaBodega: p.horaSalidaBodega ?? null,
    horaDesmontaje: p.horaDesmontaje ?? null,
    duracionDesmontajeHrs: p.duracionDesmontajeHrs ?? null,
    desmontajeDiaAparte: p.desmontajeDiaAparte ?? null,
    fechaDesmontaje: p.fechaDesmontaje ?? null,
    llamadoBodega: p.llamadoBodega ?? null,
    lugarLlamado: p.lugarLlamado ?? null,
    lugarEvento: p.lugarEvento ?? null,
  };

  const bloques = (p.bloquesTiempo ?? []) as BloqueTiempo[];
  const nombresProveedor = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p.proveedoresEvento ?? []).map((pv: any) => [pv.id, pv.nombreProveedor])
  ) as Record<string, string>;

  const cronologias: OrdenCronologia[] = (Object.keys(VISTAS_CRONOLOGIA) as VistaCronologia[]).map((vista) => {
    const cfg = VISTAS_CRONOLOGIA[vista];
    return {
      vista,
      titulo: cfg.titulo,
      descripcion: cfg.descripcion,
      bloques: construirCronologia(cronoInput, {
        bloques,
        tipos: cfg.tipos,
        base: cfg.base,
        nombresProveedor,
      }),
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipos: OrdenEquipo[] = (p.equipos ?? []).map((e: any) => ({
    id: e.id,
    descripcion: e.equipo?.descripcion ?? "",
    marca: e.equipo?.marca ?? null,
    modelo: e.equipo?.modelo ?? null,
    categoria: e.equipo?.categoria?.nombre ?? "General",
    cantidad: e.cantidad,
    tipo: e.tipo,
    confirmado: e.confirmado,
    proveedor: e.proveedor?.nombre ?? null,
    notas: e.notas ?? null,
    montaje: resumenMontaje(e.posiciones, e.equipo?.categoria?.nombre, e.equipo?.categoria?.disciplina),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accesorios: (e.riderAccesorios ?? []).map((a: any) => ({ nombre: a.nombre, cantidad: a.cantidad })),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pases: OrdenPase[] = (p.cargas ?? []).map((c: any) => ({
    id: c.id,
    tipo: c.tipo,
    etiqueta: c.etiqueta ?? null,
    estado: c.estado,
    cerradaEn: c.cerradaEn?.toISOString() ?? null,
    notaCierre: c.notaCierre ?? null,
    abiertoPor: c.abiertoPor?.nombre ?? null,
    cerradaPor: c.cerradaPor?.nombre ?? null,
    createdAt: c.createdAt.toISOString(),
    avance: avanceCarga(c.items ?? []),
  }));

  // Se tipan aquí y no en el objeto de retorno: `p` es `any` (el cliente Prisma
  // aún no conoce las relaciones nuevas) y sin esto el `any` se filtra al payload.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const personal: OrdenPersonal[] = (p.personal ?? []).filter((x: any) => x.tecnico).map((x: any) => ({
    id: x.id,
    tecnicoId: x.tecnico.id,
    nombre: x.tecnico.nombre,
    celular: x.tecnico.celular ?? null,
    rol: x.rolTecnico?.nombre ?? x.rolEnEvento ?? null,
    participacion: x.participacion ?? null,
    fechaJornada: x.fechaJornada ?? null,
    confirmado: !!x.confirmado,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proveedores: OrdenProveedor[] = (p.proveedoresEvento ?? []).map((pv: any) => ({
    nombre: pv.nombreProveedor,
    servicio: pv.servicioEquipo ?? null,
    telefono: pv.telefonoProveedor ?? null,
    responsable: pv.responsable ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const archivos: OrdenArchivo[] = (p.archivos ?? []).map((a: any) => ({
    tipo: a.tipo, nombre: a.nombre, url: a.url,
  }));

  let transportes: { vehiculoNombre?: string; choferNombre?: string; horaSalida?: string }[] = [];
  try {
    const raw = p.transportes ? JSON.parse(p.transportes) : [];
    if (Array.isArray(raw)) transportes = raw;
  } catch { /* JSON capturado a mano — se ignora si viene roto */ }

  return {
    id: p.id,
    nombre: p.nombre,
    numeroProyecto: p.numeroProyecto,
    estado: p.estado,
    tipoEvento: p.tipoEvento,
    tipoServicio: p.tipoServicio ?? null,
    zona: p.zona ?? "LOCAL",
    actualizadoEn: p.updatedAt.toISOString(),
    cliente: { nombre: p.cliente.nombre, empresa: p.cliente.empresa ?? null },
    fechaEvento: p.fechaEvento?.toISOString() ?? null,
    horaInicioEvento: p.horaInicioEvento ?? null,
    horaFinEvento: p.horaFinEvento ?? null,
    fechaMontaje: p.fechaMontaje?.toISOString() ?? null,
    horaInicioMontaje: p.horaInicioMontaje ?? null,
    llamadoBodega: p.llamadoBodega?.toISOString() ?? null,
    lugarLlamado: p.lugarLlamado ?? null,
    puntoSalidaBodega: p.puntoSalidaBodega ?? null,
    horaSalidaBodega: p.horaSalidaBodega ?? null,
    choferNombre: p.choferNombre ?? null,
    lugarEvento: p.lugarEvento ?? null,
    direccionVenue: p.direccionVenue ?? null,
    linkMaps: p.linkMaps ?? null,
    indicacionesAcceso: p.indicacionesAcceso ?? null,
    indicacionesCliente: p.indicacionesCliente ?? null,
    briefObjetivo: p.briefObjetivo ?? null,
    briefAcomodo: p.briefAcomodo ?? null,
    briefRestricciones: p.briefRestricciones ?? null,
    encargadoNombre: p.encargado?.name ?? null,
    encargadoCliente: p.encargadoCliente ?? null,
    encargadoClienteContacto: p.encargadoClienteContacto ?? null,
    encargadoLugar: p.encargadoLugar ?? null,
    encargadoLugarContacto: p.encargadoLugarContacto ?? null,
    contactosEmergencia: p.contactosEmergencia ?? null,
    aplicaCatering: p.aplicaCatering ?? false,
    proveedorCatering: p.proveedorCatering ?? null,
    transportes,
    cronologias,
    equipos,
    personal,
    proveedores,
    archivos,
    pases,
  };
}

export type OrdenProduccion = NonNullable<Awaited<ReturnType<typeof ordenPorToken>>>;
