import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resumenProyectos } from "@/lib/resumen/proyectos";
import { fmtDiaSemana, relativo } from "@/lib/resumen/base";
import { BarraDistribucion, EncabezadoResumen, Fila, Kpi, Panel, Badge, Vacio, type Tono } from "@/components/resumen/ui";
import { FilaOperable, type Accion } from "@/components/resumen/acciones";

export const dynamic = "force-dynamic";

const ESTADO_TONO: Record<string, Tono> = {
  PLANEACION: "azul",
  CONFIRMADO: "verde",
  EN_CURSO: "oro",
  COMPLETADO: "neutro",
};

/**
 * Sólo el siguiente paso del proyecto, no el menú completo de estados: desde la
 * agenda lo que se hace es empujar el evento adelante. El cierre financiero no
 * está aquí porque necesita los números calculados de la ficha.
 */
function accionesProyecto(id: string, estado: string): Accion[] {
  const paso = (label: string, siguiente: string, tono: Tono, confirmar: string): Accion => ({
    clave: siguiente,
    label,
    endpoint: `/api/proyectos/${id}`,
    metodo: "PATCH",
    tono,
    hecho: "Proyecto actualizado",
    confirmar,
    cuerpo: { estado: siguiente },
  });

  if (estado === "PLANEACION") {
    return [paso("Confirmar", "CONFIRMADO", "verde", "El cliente ya confirmó y el evento va.")];
  }
  if (estado === "CONFIRMADO") {
    return [
      paso("Arrancar", "EN_CURSO", "oro", "El montaje ya empezó."),
      paso("Volver a planeación", "PLANEACION", "neutro", "Regresa el proyecto a planeación."),
    ];
  }
  if (estado === "EN_CURSO") {
    return [paso("Marcar terminado", "COMPLETADO", "neutro", "El evento ya terminó; queda pendiente el cierre financiero.")];
  }
  return [];
}

export default async function ResumenProyectosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const r = await resumenProyectos();

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Resumen de proyectos"
        subtitulo="Lo que está por suceder y lo que todavía le falta para poder suceder"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi label="Esta semana" valor={r.estaSemana} nota="eventos en 7 días" tono={r.estaSemana > 0 ? "oro" : "neutro"} href="/calendarios/resumen" />
        <Kpi label="En riesgo" valor={r.enRiesgo.length} nota="a ≤7 días, incompletos" tono={r.enRiesgo.length > 0 ? "rojo" : "verde"} />
        <Kpi label="Próximos 30 días" valor={r.lista.length} nota="eventos agendados" />
        <Kpi label="Recolecciones" valor={r.recolecciones} nota="equipo por regresar" tono={r.recolecciones > 0 ? "ambar" : "neutro"} href="/equipos/recolecciones" />
        <Kpi label="Sin cierre financiero" valor={r.sinCierre.length} nota="eventos ya realizados" tono={r.sinCierre.length > 0 ? "ambar" : "neutro"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel
          titulo="Agenda de los próximos 30 días"
          nota={`${r.lista.length} eventos`}
          href="/proyectos"
          className="lg:col-span-2"
          scroll="alto"
        >
          {r.lista.length === 0 ? (
            <Vacio texto="No hay eventos agendados en los próximos 30 días" />
          ) : (
            <>
              {r.lista.map(p => {
                const faltaPersonal = p.personal === 0 || p.personalConfirmado < p.personal;
                const faltaExterno = p.equiposExternosConfirmados < p.equiposExternos;
                const enRiesgo = p.dias <= 7 && (faltaPersonal || faltaExterno || !p.planAprobado);
                return (
                  <FilaOperable
                    key={p.id}
                    href={`/proyectos/${p.id}`}
                    tono={enRiesgo ? "rojo" : ESTADO_TONO[p.estado] ?? "neutro"}
                    titulo={`${p.numero} · ${p.nombre}`}
                    meta={
                      <>
                        {p.cliente} · {fmtDiaSemana(p.fechaEvento)}
                        {p.encargado ? ` · ${p.encargado}` : " · sin encargado"}
                        {p.zona !== "LOCAL" ? ` · ${p.zona}` : ""}
                      </>
                    }
                    badge={
                      enRiesgo ? (
                        <Badge tono="rojo">
                          {!p.planAprobado ? "Sin plan" : faltaPersonal ? "Personal" : "Externos"}
                        </Badge>
                      ) : undefined
                    }
                    valor={relativo(p.dias)}
                    tonoValor={p.dias <= 7 ? "verde" : undefined}
                    valorNota={`${p.personalConfirmado}/${p.personal} pers.`}
                    acciones={accionesProyecto(p.id, p.estado)}
                  />
                );
              })}
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel titulo="Cartera por estado" nota={`${r.cerradosMes} completados este mes`}>
            <BarraDistribucion
              segmentos={[
                { label: "Planeación", valor: r.estados.planeacion, tono: "azul" },
                { label: "Confirmado", valor: r.estados.confirmado, tono: "verde" },
                { label: "En curso", valor: r.estados.enCurso, tono: "oro" },
                { label: "Completado", valor: r.estados.completado, tono: "neutro" },
              ]}
            />
          </Panel>

          <Panel titulo="Riesgos con fecha" nota="eventos a ≤7 días con huecos" scroll>
            {r.enRiesgo.length === 0 ? (
              <Vacio texto="Todo lo inmediato está completo" />
            ) : (
              r.enRiesgo.map(p => (
                <Fila
                  key={p.id}
                  href={`/proyectos/${p.id}`}
                  tono="rojo"
                  titulo={p.nombre}
                  meta={
                    [
                      !p.planAprobado && "plan sin aprobar",
                      p.personal === 0
                        ? "sin personal"
                        : p.personalConfirmado < p.personal && `${p.personal - p.personalConfirmado} sin confirmar`,
                      p.equiposExternosConfirmados < p.equiposExternos && "externos sin confirmar",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  }
                  valor={relativo(p.dias)}
                  tonoValor="verde"
                />
              ))
            )}
          </Panel>

          <Panel titulo="Cierre financiero pendiente" nota="eventos realizados sin cerrar" href="/finanzas/resumen" scroll>
            {r.sinCierre.length === 0 ? (
              <Vacio texto="Sin eventos por cerrar" />
            ) : (
              r.sinCierre.map(p => (
                <Fila
                  key={p.id}
                  href={`/proyectos/${p.id}`}
                  tono="ambar"
                  titulo={`${p.numeroProyecto} · ${p.nombre}`}
                  meta={fmtDiaSemana(new Date(p.fechaEvento.toISOString().slice(0, 10)))}
                />
              ))
            )}
          </Panel>
        </div>
      </div>

      {r.pendientes.length > 0 && (
        <Panel
          titulo="Lo que falta por hacer"
          nota={`${r.pendientes.length} pendientes derivados de la operación, no de una bandeja`}
          className="mt-4"
          scroll="alto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {r.pendientes.map(p => (
              <Fila
                key={p.id}
                href={p.href}
                tono={p.severidad === "URGENTE" ? "rojo" : p.severidad === "ALTA" ? "ambar" : "neutro"}
                titulo={p.titulo}
                meta={p.descripcion}
                badge={<Badge tono={p.severidad === "URGENTE" ? "rojo" : p.severidad === "ALTA" ? "ambar" : "neutro"}>{p.etiqueta}</Badge>}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
