import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoResumen, Fila, Kpi, Panel, Vacio, type Tono } from "@/components/resumen/ui";
import { diasRestantes, fmtDiasRestantes, fmtFechaCorta } from "@/lib/giras";

export const dynamic = "force-dynamic";

const ESTADO_LABELS: Record<string, string> = {
  BRIEF: "Brief", EN_PROCESO: "En proceso", REVISION: "Revisión", ENTREGADO: "Entregado", CANCELADO: "Cancelado",
};

/**
 * Dashboard de resumen de Mainstage Creative — clon del patrón de
 * giras/(hub)/resumen/page.tsx (Fila/Panel/Kpi de @/components/resumen/ui).
 * Live y Creative no tienen tablero nuevo (§4.6 del doc de Fase 4): el
 * "proyecto" que se opera aquí es `ProyectoCreativo`, filtrado y agrupado,
 * no un modelo distinto.
 */
export default async function CreativeResumenPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const proyectos = await prisma.proyectoCreativo.findMany({
    where: { activo: true, estado: { not: "CANCELADO" } },
    orderBy: { fechaEntrega: "asc" },
    select: {
      id: true,
      numero: true,
      nombre: true,
      estado: true,
      briefing: true,
      urgente: true,
      fechaEntrega: true,
      revisionesIncluidas: true,
      revisionesUsadas: true,
      cliente: { select: { nombre: true, empresa: true } },
      artista: { select: { nombre: true } },
      propuestas: { select: { estado: true } },
    },
  });

  const vista = proyectos.map((p) => ({
    ...p,
    dias: diasRestantes(p.fechaEntrega),
    contexto: [p.cliente?.empresa || p.cliente?.nombre, p.artista?.nombre].filter(Boolean).join(" · ") || "Sin cliente capturado",
    tieneAprobada: p.propuestas.some((pr) => pr.estado === "APROBADA"),
    href: `/creative/${p.id}`,
  }));

  const activos = vista.filter((p) => p.estado === "EN_PROCESO" || p.estado === "REVISION");
  const briefSinPropuesta = vista.filter((p) => p.estado === "BRIEF" && !p.tieneAprobada);
  const urgentesSinResolver = vista.filter((p) => p.urgente && p.estado !== "ENTREGADO");
  const proximasEntregas = vista.filter((p) => p.fechaEntrega && p.estado !== "ENTREGADO");
  const sinBrief = vista.filter((p) => !p.briefing?.trim() && p.estado !== "ENTREGADO");
  const revisionesAgotadas = vista.filter((p) => p.revisionesUsadas >= p.revisionesIncluidas && p.estado !== "ENTREGADO");

  const siguiente = proximasEntregas[0];

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Resumen de Creative"
        subtitulo="Los proyectos de diseño y render que vienen y lo que les falta para entregarse"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi
          label="Proyectos activos"
          valor={activos.length}
          nota="En proceso o en revisión"
          href="/creative/proyectos"
        />
        <Kpi
          label="Próxima entrega"
          valor={siguiente ? fmtDiasRestantes(siguiente.dias) : "—"}
          nota={siguiente ? `${fmtFechaCorta(siguiente.fechaEntrega)} · ${siguiente.nombre}` : "Sin entregas agendadas"}
          tono={siguiente && siguiente.dias !== null && siguiente.dias <= 3 ? "rojo" : "neutro"}
          href={siguiente?.href}
        />
        <Kpi
          label="Brief sin propuesta"
          valor={briefSinPropuesta.length}
          nota="Capturado pero sin honorarios aprobados"
          tono={briefSinPropuesta.length > 0 ? "ambar" : "verde"}
        />
        <Kpi
          label="Urgentes sin resolver"
          valor={urgentesSinResolver.length}
          nota="Marcados como entrega urgente"
          tono={urgentesSinResolver.length > 0 ? "rojo" : "verde"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          titulo="Próximas entregas"
          nota="Ordenadas por fecha de entrega"
          href="/creative/proyectos"
          hrefLabel="Ver proyectos"
          className="lg:col-span-2"
        >
          {proximasEntregas.length === 0 ? (
            <Vacio texto="No hay entregas agendadas." />
          ) : (
            proximasEntregas.map((p) => (
              <Fila
                key={p.id}
                href={p.href}
                titulo={`${fmtFechaCorta(p.fechaEntrega)} · ${p.nombre}`}
                meta={`${p.contexto} · ${ESTADO_LABELS[p.estado] ?? p.estado}`}
                tono={(p.dias !== null && p.dias <= 3 ? "rojo" : p.dias !== null && p.dias <= 10 ? "ambar" : "neutro") as Tono}
                valor={fmtDiasRestantes(p.dias)}
              />
            ))
          )}
        </Panel>

        <Panel titulo="Sin brief capturado" nota="No se sabe todavía qué se necesita diseñar/renderizar">
          {sinBrief.length === 0 ? (
            <Vacio texto="Todos los proyectos tienen briefing." />
          ) : (
            sinBrief.map((p) => (
              <Fila
                key={p.id}
                href={p.href}
                titulo={p.nombre}
                meta={`${p.contexto} · ${ESTADO_LABELS[p.estado] ?? p.estado}`}
                tono="ambar"
                valor="Capturar brief"
              />
            ))
          )}
        </Panel>

        <Panel titulo="Revisiones agotadas" nota="Ya se pasó de las incluidas en el trato — toca cobrar cambio extra">
          {revisionesAgotadas.length === 0 ? (
            <Vacio texto="Ningún proyecto se ha pasado de sus revisiones." />
          ) : (
            revisionesAgotadas.map((p) => (
              <Fila
                key={p.id}
                href={p.href}
                titulo={p.nombre}
                meta={`${p.contexto} · ${ESTADO_LABELS[p.estado] ?? p.estado}`}
                tono="rojo"
                valor={`${p.revisionesUsadas}/${p.revisionesIncluidas}`}
                valorNota="usadas"
              />
            ))
          )}
        </Panel>

        <Panel
          titulo="Brief sin propuesta"
          nota="Capturado pero todavía sin honorarios aprobados"
          className="lg:col-span-2"
        >
          {briefSinPropuesta.length === 0 ? (
            <Vacio texto="Todo brief capturado ya tiene propuesta aprobada." />
          ) : (
            briefSinPropuesta.map((p) => (
              <Fila
                key={p.id}
                href={p.href}
                titulo={p.nombre}
                meta={`${p.contexto} · ${p.propuestas.length} propuesta${p.propuestas.length !== 1 ? "s" : ""}`}
                tono="ambar"
                valor="Armar propuesta"
              />
            ))
          )}
        </Panel>

        {urgentesSinResolver.length > 0 && (
          <Panel
            titulo="Urgentes sin resolver"
            nota="Entrega marcada como urgente (Nivel A, URGENCIA_RENDER)"
            className="lg:col-span-2"
          >
            {urgentesSinResolver.map((p) => (
              <Fila
                key={p.id}
                href={p.href}
                titulo={p.nombre}
                meta={`${p.contexto} · ${ESTADO_LABELS[p.estado] ?? p.estado} · ${fmtDiasRestantes(p.dias)}`}
                tono="rojo"
                valor="Revisar"
              />
            ))}
          </Panel>
        )}
      </div>
    </div>
  );
}
