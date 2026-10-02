import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ventana } from "@/lib/resumen/base";
import { Badge, EncabezadoResumen, Fila, Kpi, Panel, Vacio, type Tono } from "@/components/resumen/ui";
import {
  ESTADO_SHOW_LABEL,
  SEMAFORO_LABEL,
  diasRestantes,
  fmtDiasRestantes,
  fmtFechaCorta,
  resumirAdvance,
} from "@/lib/giras";

export const dynamic = "force-dynamic";

const SEMAFORO_TONO: Record<string, Tono> = {
  LISTO: "verde",
  EN_PROCESO: "ambar",
  RIESGO: "rojo",
  SIN_ARMAR: "neutro",
};

export default async function GirasResumenPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { hoy } = ventana();

  const shows = await prisma.giraShow.findMany({
    where: {
      estado: { not: "CANCELADO" },
      gira: { activo: true, estado: { notIn: ["CANCELADA", "CERRADA"] } },
    },
    orderBy: { fecha: "asc" },
    select: {
      id: true,
      fecha: true,
      ciudad: true,
      estado: true,
      riderEnviadoEn: true,
      advanceCerradoEn: true,
      venue: { select: { id: true, nombre: true } },
      gira: { select: { id: true, nombre: true, artista: { select: { nombre: true } } } },
      riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
      _count: { select: { crew: true } },
    },
  });

  const vista = shows.map((s) => {
    const resumen = resumirAdvance(s.riderLineas);
    return {
      ...s,
      resumen,
      dias: diasRestantes(s.fecha),
      lugar: [s.ciudad, s.venue?.nombre].filter(Boolean).join(" · ") || "Sin ciudad ni venue",
      href: `/giras/${s.gira.id}/show/${s.id}`,
    };
  });

  const proximos = vista.filter((s) => s.fecha >= hoy);
  const pasadosAbiertos = vista.filter((s) => s.fecha < hoy && s.estado !== "EJECUTADO");

  const sinVenue = proximos.filter((s) => !s.venue);
  const conIndispensablesAbiertos = proximos.filter(
    (s) => s.resumen.indispensablesTotal > 0 && s.resumen.indispensablesResueltas < s.resumen.indispensablesTotal,
  );
  const sinAdvance = proximos.filter((s) => s.resumen.total === 0);
  const sinRiderEnviado = proximos.filter((s) => !s.riderEnviadoEn);
  const sinCrew = proximos.filter((s) => s._count.crew === 0);

  const girasActivas = new Set(vista.map((s) => s.gira.id)).size;
  const conAdvance = proximos.filter((s) => s.resumen.total > 0);
  const avancePromedio = conAdvance.length
    ? Math.round(conAdvance.reduce((acc, s) => acc + s.resumen.avance, 0) / conAdvance.length)
    : 0;
  const enRiesgo = proximos.filter((s) => s.resumen.semaforo === "RIESGO" || s.resumen.semaforo === "SIN_ARMAR").length;
  const siguiente = proximos[0];

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Resumen de giras"
        subtitulo="Las plazas que vienen y lo que todavía le falta a cada una para poder suceder"
        acciones={
          <Link href="/giras/lista" className="ms-btn-secondary">
            Ver giras
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi label="Giras en curso" valor={girasActivas} nota={`${proximos.length} plazas por delante`} href="/giras/lista" />
        <Kpi
          label="Siguiente plaza"
          valor={siguiente ? fmtDiasRestantes(siguiente.dias) : "—"}
          nota={siguiente ? `${fmtFechaCorta(siguiente.fecha)} · ${siguiente.lugar}` : "Sin plazas agendadas"}
          tono={siguiente && siguiente.dias !== null && siguiente.dias <= 7 ? "oro" : "neutro"}
          href={siguiente?.href}
        />
        <Kpi
          label="Advance promedio"
          valor={`${avancePromedio}%`}
          nota="Sobre los renglones indispensables"
          tono={avancePromedio >= 100 ? "verde" : avancePromedio >= 60 ? "ambar" : "rojo"}
        />
        <Kpi
          label="Plazas sin resolver"
          valor={enRiesgo}
          nota="En riesgo o sin advance armado"
          tono={enRiesgo > 0 ? "rojo" : "verde"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          titulo="Próximas plazas"
          nota="Ordenadas por fecha; el porcentaje es de los renglones indispensables"
          href="/giras/lista"
          hrefLabel="Ver giras"
          className="lg:col-span-2"
        >
          {proximos.length === 0 ? (
            <Vacio texto="No hay plazas por delante." />
          ) : (
            proximos.map((s) => (
              <Fila
                key={s.id}
                href={s.href}
                titulo={`${fmtFechaCorta(s.fecha)} · ${s.lugar}`}
                meta={`${s.gira.artista.nombre} — ${s.gira.nombre} · ${ESTADO_SHOW_LABEL[s.estado] ?? s.estado} · ${fmtDiasRestantes(s.dias)}`}
                tono={SEMAFORO_TONO[s.resumen.semaforo] ?? "neutro"}
                valor={s.resumen.total ? `${s.resumen.avance}%` : "—"}
                valorNota={
                  s.resumen.total
                    ? `${s.resumen.indispensablesResueltas}/${s.resumen.indispensablesTotal} indispensables`
                    : "Advance sin armar"
                }
                badge={<Badge tono={SEMAFORO_TONO[s.resumen.semaforo] ?? "neutro"}>{SEMAFORO_LABEL[s.resumen.semaforo]}</Badge>}
              />
            ))
          )}
        </Panel>

        <Panel titulo="Plazas sin venue" nota="Sin foro no hay ficha técnica contra la que cotejar el rider">
          {sinVenue.length === 0 ? (
            <Vacio texto="Todas las plazas tienen venue." />
          ) : (
            sinVenue.map((s) => (
              <Fila
                key={s.id}
                href={`/giras/${s.gira.id}/shows`}
                titulo={`${fmtFechaCorta(s.fecha)} · ${s.ciudad ?? "Sin ciudad"}`}
                meta={`${s.gira.nombre} · ${fmtDiasRestantes(s.dias)}`}
                tono="rojo"
                valor="Elegir venue"
              />
            ))
          )}
        </Panel>

        <Panel titulo="Advance sin armar" nota="La plaza no tiene ni un renglón derivado del rider">
          {sinAdvance.length === 0 ? (
            <Vacio texto="Todas las plazas tienen su advance armado." />
          ) : (
            sinAdvance.map((s) => (
              <Fila
                key={s.id}
                href={`${s.href}/advance`}
                titulo={`${fmtFechaCorta(s.fecha)} · ${s.lugar}`}
                meta={`${s.gira.nombre} · ${fmtDiasRestantes(s.dias)}`}
                tono="rojo"
                valor="Armar advance"
              />
            ))
          )}
        </Panel>

        <Panel
          titulo="Indispensables sin resolver"
          nota="Lo que decide si la plaza va o no va"
          className="lg:col-span-2"
        >
          {conIndispensablesAbiertos.length === 0 ? (
            <Vacio texto="Ningún renglón indispensable abierto." />
          ) : (
            conIndispensablesAbiertos.map((s) => (
              <Fila
                key={s.id}
                href={`${s.href}/advance`}
                titulo={`${fmtFechaCorta(s.fecha)} · ${s.lugar}`}
                meta={`${s.gira.nombre} · ${fmtDiasRestantes(s.dias)}`}
                tono={SEMAFORO_TONO[s.resumen.semaforo] ?? "neutro"}
                valor={s.resumen.indispensablesTotal - s.resumen.indispensablesResueltas}
                valorNota="renglones abiertos"
              />
            ))
          )}
        </Panel>

        <Panel titulo="Rider sin enviar a la casa" nota="Mientras el foro no tenga el rider, no hay contra-rider que cotejar">
          {sinRiderEnviado.length === 0 ? (
            <Vacio texto="El rider ya salió a todas las casas." />
          ) : (
            sinRiderEnviado.map((s) => (
              <Fila
                key={s.id}
                href={s.href}
                titulo={`${fmtFechaCorta(s.fecha)} · ${s.lugar}`}
                meta={`${s.gira.nombre} · ${fmtDiasRestantes(s.dias)}`}
                tono={s.dias !== null && s.dias <= 10 ? "rojo" : "ambar"}
                valor="Enviar rider"
              />
            ))
          )}
        </Panel>

        <Panel titulo="Plazas sin crew" nota="Nadie asignado todavía, ni de Mainstage ni de la casa">
          {sinCrew.length === 0 ? (
            <Vacio texto="Todas las plazas tienen crew." />
          ) : (
            sinCrew.map((s) => (
              <Fila
                key={s.id}
                href={`/giras/${s.gira.id}/crew`}
                titulo={`${fmtFechaCorta(s.fecha)} · ${s.lugar}`}
                meta={`${s.gira.nombre} · ${fmtDiasRestantes(s.dias)}`}
                tono={s.dias !== null && s.dias <= 10 ? "rojo" : "ambar"}
                valor="Asignar crew"
              />
            ))
          )}
        </Panel>

        {pasadosAbiertos.length > 0 && (
          <Panel
            titulo="Plazas que ya pasaron sin cerrar"
            nota="Quedaron sin marcar como ejecutadas"
            className="lg:col-span-2"
          >
            {pasadosAbiertos.map((s) => (
              <Fila
                key={s.id}
                href={s.href}
                titulo={`${fmtFechaCorta(s.fecha)} · ${s.lugar}`}
                meta={`${s.gira.nombre} · ${ESTADO_SHOW_LABEL[s.estado] ?? s.estado} · ${fmtDiasRestantes(s.dias)}`}
                tono="ambar"
                valor="Marcar ejecutada"
              />
            ))}
          </Panel>
        )}
      </div>
    </div>
  );
}
