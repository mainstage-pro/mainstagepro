import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { diasEvento, fechaISOaDia } from "@/lib/fechas-evento";
import { disciplinaDePuesto } from "@/lib/disciplinaColors";

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
      return {
        id: p.id,
        numeroProyecto: p.numeroProyecto,
        nombre: p.nombre,
        estado: p.estado,
        cliente: p.cliente.empresa || p.cliente.nombre,
        lugar: p.lugarEvento,
        horaInicio: p.horaInicioEvento,
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
      select: { id: true, nombre: true, disciplina: true },
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
