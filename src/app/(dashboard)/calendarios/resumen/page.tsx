import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { normalizarVista, resumenCalendario } from "@/lib/resumen/calendario";
import { fmtDia, relativo } from "@/lib/resumen/base";
import { EncabezadoResumen, Fila, Kpi, Panel, Badge, Vacio, type Tono } from "@/components/resumen/ui";

export const dynamic = "force-dynamic";

const VISTAS = [
  { key: "semana", label: "Semana" },
  { key: "quincena", label: "Quincena" },
  { key: "mes", label: "Mes" },
] as const;

const ESTADO_TONO: Record<string, Tono> = {
  PLANEACION: "azul",
  CONFIRMADO: "verde",
  EN_CURSO: "oro",
};

export default async function ResumenCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { vista: vistaParam } = await searchParams;
  const vista = normalizarVista(vistaParam);
  const r = await resumenCalendario(vista);

  const hoyKey = r.hoy.toISOString().slice(0, 10);
  const rango = `${fmtDia(r.desde)} — ${fmtDia(r.hasta)}`;

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Resumen de calendario"
        subtitulo={`${rango} · ${r.total} eventos`}
        acciones={
          <div className="ms-tabs">
            {VISTAS.map(v => (
              <Link
                key={v.key}
                href={`/calendarios/resumen?vista=${v.key}`}
                className={vista === v.key ? "ms-tab ms-tab-active" : "ms-tab"}
              >
                {v.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi label="Eventos en el periodo" valor={r.total} nota={rango} tono={r.total > 0 ? "oro" : "neutro"} />
        <Kpi
          label="Días con evento"
          valor={`${r.diasConEvento}/${r.dias.length}`}
          nota={r.diaMasCargado && r.diaMasCargado.eventos.length > 1 ? `pico: ${r.diaMasCargado.eventos.length} el ${fmtDia(r.diaMasCargado.fecha)}` : "sin encimes"}
        />
        <Kpi
          label="Personal incompleto"
          valor={r.sinPersonalCompleto}
          nota="eventos sin confirmar equipo"
          tono={r.sinPersonalCompleto > 0 ? "rojo" : "verde"}
        />
        <Kpi
          label="Temporada actual"
          valor={r.temporadaActual?.titulo ?? "Sin definir"}
          nota={r.temporadaActual?.diasRestantes != null ? `termina en ${r.temporadaActual.diasRestantes} días` : undefined}
          tono="oro"
          href="/calendarios/administrativo"
        />
        <Kpi
          label="Próximo festivo"
          valor={r.festivos[0]?.titulo ?? "—"}
          nota={r.festivos[0] ? relativo(r.festivos[0].dias) : undefined}
          tono="azul"
          href="/calendarios/festividades"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel titulo={`Agenda — ${VISTAS.find(v => v.key === vista)!.label.toLowerCase()}`} nota={rango} href="/calendarios/eventos" className="lg:col-span-2">
          {r.total === 0 ? (
            <Vacio texto="No hay eventos en este periodo" />
          ) : (
            <div className="max-h-[460px] overflow-y-auto ms-no-scrollbar">
              {r.dias
                .filter(d => d.eventos.length > 0)
                .map(d => {
                  const esHoy = d.fecha.toISOString().slice(0, 10) === hoyKey;
                  return (
                    <div key={d.fecha.toISOString()}>
                      <div className={`px-4 py-1.5 border-t border-[#1a1a1a] flex items-center gap-2 ${esHoy ? "bg-[#B3985B]/10" : "bg-[#0d0d0d]"}`}>
                        <span className={`ms-micro uppercase tracking-wider ${esHoy ? "text-[#B3985B] font-semibold" : "text-[#666]"}`}>
                          {d.fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}
                          {esHoy && " · hoy"}
                        </span>
                        {d.eventos.length > 1 && <Badge tono="ambar">{d.eventos.length} eventos</Badge>}
                      </div>
                      {d.eventos.map(e => (
                        <Fila
                          key={e.id}
                          href={`/proyectos/${e.id}`}
                          tono={
                            e.personal === 0 || e.personalConfirmado < e.personal
                              ? "rojo"
                              : ESTADO_TONO[e.estado] ?? "neutro"
                          }
                          titulo={`${e.numero} · ${e.nombre}`}
                          meta={[e.cliente, e.hora, e.lugar, e.zona !== "LOCAL" ? e.zona : null].filter(Boolean).join(" · ")}
                          badge={e.tipoEvento ? <Badge tono="neutro">{e.tipoEvento}</Badge> : undefined}
                          valor={`${e.personalConfirmado}/${e.personal}`}
                          valorNota="personal"
                        />
                      ))}
                    </div>
                  );
                })}
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel titulo="Temporada" nota="ciclo comercial del año" href="/calendarios/administrativo">
            {!r.temporadaActual && !r.proximaTemporada ? (
              <Vacio texto="Sin temporadas configuradas" />
            ) : (
              <>
                {r.temporadaActual && (
                  <Fila
                    titulo={r.temporadaActual.titulo}
                    meta="en curso"
                    tono="oro"
                    valor={r.temporadaActual.diasRestantes != null ? `${r.temporadaActual.diasRestantes}d` : undefined}
                    valorNota="restantes"
                  />
                )}
                {r.proximaTemporada && (
                  <Fila
                    titulo={r.proximaTemporada.titulo}
                    meta={`inicia ${fmtDia(r.proximaTemporada.inicia)}`}
                    tono="azul"
                    valor={relativo(r.proximaTemporada.dias)}
                  />
                )}
              </>
            )}
          </Panel>

          <Panel titulo="Próximas fechas clave" nota="festivos y fechas especiales" href="/calendarios/festividades">
            {r.festivos.length === 0 ? (
              <Vacio texto="Sin fechas registradas" />
            ) : (
              r.festivos.map(f => (
                <Fila
                  key={f.id}
                  tono={f.dias <= 7 ? "ambar" : "neutro"}
                  titulo={f.titulo}
                  meta={fmtDia(f.fecha)}
                  badge={f.tipo.startsWith("ASUETO") ? <Badge tono="ambar">Asueto</Badge> : undefined}
                  valor={relativo(f.dias)}
                />
              ))
            )}
          </Panel>

          <Panel titulo="Lo que viene después" nota="siguientes eventos fuera del periodo" href="/proyectos">
            {r.siguientes.length === 0 ? (
              <Vacio texto="Sin eventos posteriores agendados" />
            ) : (
              r.siguientes.map(e => (
                <Fila
                  key={e.id}
                  href={`/proyectos/${e.id}`}
                  tono="neutro"
                  titulo={`${e.numero} · ${e.cliente}`}
                  meta={fmtDia(e.fecha)}
                  valor={relativo(e.dias)}
                />
              ))
            )}
          </Panel>
        </div>
      </div>

      {r.foraneos > 0 && (
        <p className="ms-meta mt-3">
          {r.foraneos} de {r.total} eventos son foráneos: considerar tiempos de traslado y hospedaje.
        </p>
      )}
    </div>
  );
}
