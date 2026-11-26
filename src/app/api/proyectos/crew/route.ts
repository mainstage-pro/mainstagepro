import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { diasEvento, fechaISOaDia } from "@/lib/fechas-evento";
import { disciplinaDePuesto } from "@/lib/disciplinaColors";
import { ensureOperacionTecnicaColumns } from "@/lib/migraciones-lazy";
import { nivelEfectivo, rolUsaJornada, tarifaRol } from "@/lib/rolesTecnicos";

/**
 * GET /api/proyectos/crew?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 *
 * Mesa de crew: todos los puestos de operación técnica de los proyectos vivos
 * en el rango, con el día en que trabaja cada puesto, para asignar técnicos sin
 * entrar proyecto por proyecto. La asignación en sí usa el mismo PATCH de
 * /api/proyectos/[id]/personal/[personalId] que la página del proyecto.
 *
 * El día de un puesto es su `fechaJornada` (montaje en otro día, jornada 2…);
 * si no la trae, es el día 1 del proyecto.
 */
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function sumarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const qDesde = req.nextUrl.searchParams.get("desde");
  const qHasta = req.nextUrl.searchParams.get("hasta");
  const hoy = fechaISOaDia(new Date(Date.now() - 6 * 3600 * 1000)); // hora de México
  const desde = qDesde && RE_FECHA.test(qDesde) ? qDesde : hoy;
  const hasta = qHasta && RE_FECHA.test(qHasta) ? qHasta : sumarDias(desde, 21);

  // Un proyecto de varios días puede arrancar antes del rango y seguir dentro;
  // se trae con holgura y se recorta por día más abajo.
  const proyectos = await prisma.proyecto.findMany({
    where: {
      estado: { notIn: ["COMPLETADO", "CANCELADO"] },
      fechaEvento: {
        gte: new Date(`${sumarDias(desde, -15)}T00:00:00.000Z`),
        lte: new Date(`${hasta}T23:59:59.999Z`),
      },
    },
    select: {
      id: true,
      numeroProyecto: true,
      nombre: true,
      estado: true,
      fechaEvento: true,
      fechasEvento: true,
      lugarEvento: true,
      horaInicioEvento: true,
      horaFinEvento: true,
      tipoServicio: true,
      trato: { select: { tipoServicio: true } },
      cliente: { select: { nombre: true, empresa: true } },
      personal: {
        select: {
          id: true,
          tecnicoId: true,
          tecnico: { select: { id: true, nombre: true, nivel: true, celular: true } },
          rolTecnico: { select: { id: true, nombre: true, disciplina: true } },
          rolEnEvento: true,
          participacion: true,
          fechaJornada: true,
          nivel: true,
          confirmado: true,
          confirmRespuesta: true,
          confirmToken: true,
          necesitaRevision: true,
          coordinaEnSitio: true,
          esAdicional: true,
        },
      },
    },
    orderBy: { fechaEvento: "asc" },
  });

  const enRango = (d: string) => d >= desde && d <= hasta;

  const salida = proyectos
    .map((p) => {
      const dia1 = fechaISOaDia(p.fechaEvento);
      const puestos = p.personal
        .map((x) => {
          const dia = x.fechaJornada && RE_FECHA.test(x.fechaJornada) ? x.fechaJornada : dia1;
          return {
            id: x.id,
            dia,
            rol: x.rolTecnico ? { id: x.rolTecnico.id, nombre: x.rolTecnico.nombre } : null,
            disciplina: disciplinaDePuesto(x.rolTecnico?.disciplina, x.rolTecnico?.nombre, x.rolEnEvento),
            participacion: x.participacion ?? "OPERACION",
            nivel: x.nivel,
            tecnico: x.tecnico,
            confirmado: x.confirmado,
            confirmRespuesta: x.confirmRespuesta,
            invitado: !!x.confirmToken,
            necesitaRevision: x.necesitaRevision,
            coordinaEnSitio: x.coordinaEnSitio,
            esAdicional: x.esAdicional,
          };
        })
        .filter((x) => enRango(x.dia));
      const dias = Array.from(
        new Set([...diasEvento(p.fechaEvento, p.fechasEvento), ...puestos.map((x) => x.dia)]),
      )
        .filter(enRango)
        .sort();
      // Mismo candado que la operación del proyecto: sin hora y lugar no se invita.
      const esRenta = p.tipoServicio === "RENTA" || p.trato?.tipoServicio === "RENTA";
      const fichaFaltantes: string[] = [];
      if (!esRenta && !p.horaInicioEvento) fichaFaltantes.push("hora inicio del evento");
      if (!esRenta && !p.horaFinEvento) fichaFaltantes.push("hora fin del evento");
      if (!p.lugarEvento) fichaFaltantes.push("lugar del evento");
      return {
        id: p.id,
        numeroProyecto: p.numeroProyecto,
        nombre: p.nombre,
        estado: p.estado,
        cliente: p.cliente.empresa || p.cliente.nombre,
        lugar: p.lugarEvento,
        horaInicio: p.horaInicioEvento,
        fichaFaltantes,
        dias,
        puestos,
      };
    })
    .filter((p) => p.dias.length > 0);

  const [tecnicos, roles] = await Promise.all([
    prisma.tecnico.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        nivel: true,
        prioridad: true,
        disciplina: true,
        rol: { select: { nombre: true } },
        roles: { select: { rolTecnicoId: true } },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.rolTecnico.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, disciplina: true, tipoPago: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    }),
  ]);

  return NextResponse.json({
    desde,
    hasta,
    proyectos: salida,
    tecnicos: tecnicos.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      nivel: t.nivel,
      prioridad: t.prioridad,
      disciplina: t.disciplina,
      especialidad: t.rol?.nombre ?? null,
      rolIds: t.roles.map((r) => r.rolTecnicoId),
    })),
    roles,
  });
}

/**
 * POST /api/proyectos/crew — agrega un puesto adicional (fuera de lo cotizado)
 * a un proyecto, en un día, sin técnico. La tarifa sale del tabulador del rol
 * aquí en el servidor, para que la Mesa no tenga que ver montos.
 * Body: { proyectoId, rolTecnicoId, fechaJornada, participacion?, jornada?, nivel? }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role === "READONLY") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await ensureOperacionTecnicaColumns();

  const body = await req.json().catch(() => ({}));
  const { proyectoId, rolTecnicoId, fechaJornada } = body as Record<string, string | undefined>;
  const participacion = ["OPERACION", "MONTAJE", "DESMONTAJE", "TRANSPORTE"].includes(body.participacion)
    ? body.participacion
    : "OPERACION";
  if (!proyectoId || !rolTecnicoId || !fechaJornada || !RE_FECHA.test(fechaJornada)) {
    return NextResponse.json({ error: "Falta el proyecto, el rol o el día" }, { status: 400 });
  }

  const [proyecto, rol] = await Promise.all([
    prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true, estado: true } }),
    prisma.rolTecnico.findUnique({ where: { id: rolTecnicoId } }),
  ]);
  if (!proyecto || ["COMPLETADO", "CANCELADO"].includes(proyecto.estado)) {
    return NextResponse.json({ error: "Proyecto no disponible" }, { status: 404 });
  }
  if (!rol) return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });

  const jornada = rolUsaJornada(rol.tipoPago) && ["CORTA", "MEDIA", "LARGA"].includes(body.jornada) ? body.jornada : "CORTA";
  const nivel = nivelEfectivo(rol.tipoPago, ["AAA", "AA", "A"].includes(body.nivel) ? body.nivel : "AAA");
  const tarifa = tarifaRol(rol, nivel, jornada);

  const personal = await prisma.proyectoPersonal.create({
    data: {
      proyectoId,
      rolTecnicoId,
      participacion,
      fechaJornada,
      nivel,
      jornada,
      tarifaAcordada: tarifa > 0 ? tarifa : null,
      esAdicional: true,
      confirmado: false,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: personal.id });
}
