import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resumenVentas } from "@/lib/resumen/ventas";
import { fmtMoneda, fmtMonedaCorta, relativo } from "@/lib/resumen/base";
import { BarraDistribucion, EncabezadoResumen, Fila, Kpi, Panel, Badge, Vacio } from "@/components/resumen/ui";

export const dynamic = "force-dynamic";

export default async function ResumenVentasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const r = await resumenVentas();
  const vencidas = r.cotizPorVencer.filter(c => c.dias < 0);
  const porVencer = r.cotizPorVencer.filter(c => c.dias >= 0);
  const urgenteSinProyecto = r.sinProyecto.filter(c => c.dias <= 14);

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Resumen de ventas"
        subtitulo="Qué hay en juego, qué se está enfriando y qué ya se ganó pero no se aterrizó"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi label="Pipeline abierto" valor={fmtMonedaCorta(r.pipeline)} nota={`${r.abiertos} tratos vivos`} tono="oro" href="/crm/tratos/lista" />
        <Kpi label="Cerrado este mes" valor={fmtMonedaCorta(r.cerradasMes.monto)} nota={`${r.cerradasMes.n} ventas`} tono="verde" />
        <Kpi
          label="Acciones vencidas"
          valor={r.accionVencida.length}
          nota="compromisos no cumplidos"
          tono={r.accionVencida.length > 0 ? "rojo" : "verde"}
          href="/crm/tratos/lista"
        />
        <Kpi
          label="Aprobadas sin proyecto"
          valor={r.sinProyecto.length}
          nota={urgenteSinProyecto.length > 0 ? `${urgenteSinProyecto.length} con evento a ≤14 días` : "ninguna urgente"}
          tono={urgenteSinProyecto.length > 0 ? "rojo" : r.sinProyecto.length > 0 ? "ambar" : "verde"}
          href="/cotizaciones"
        />
        <Kpi label="Tasa de cierre" valor={`${r.tasaGanadas}%`} nota="últimos 90 días" tono={r.tasaGanadas >= 50 ? "verde" : "ambar"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          titulo="Acciones vencidas"
          nota={`${r.accionVencida.length} tratos · ${r.sinAccion} más sin próxima acción definida`}
          href="/crm/tratos/lista"
        >
          {r.accionVencida.length === 0 ? (
            <Vacio texto="Ningún compromiso atrasado" />
          ) : (
            r.accionVencida.slice(0, 7).map(t => (
              <Fila
                key={t.id}
                href={`/crm/tratos/${t.id}`}
                tono={t.dias >= 7 ? "rojo" : "ambar"}
                titulo={t.cliente}
                meta={t.accion}
                badge={<Badge tono={t.dias >= 7 ? "rojo" : "ambar"}>{t.dias}d</Badge>}
                valor={t.monto > 0 ? fmtMonedaCorta(t.monto) : "—"}
              />
            ))
          )}
        </Panel>

        <Panel
          titulo="Cotizaciones por vencer"
          nota={`${vencidas.length} ya vencidas · ${porVencer.length} en 15 días`}
          href="/cotizaciones"
        >
          {r.cotizPorVencer.length === 0 ? (
            <Vacio texto="Sin cotizaciones próximas a vencer" />
          ) : (
            r.cotizPorVencer.slice(0, 7).map(c => (
              <Fila
                key={c.id}
                href={`/cotizaciones/${c.id}`}
                tono={c.dias < 0 ? "rojo" : c.dias <= 3 ? "ambar" : "neutro"}
                titulo={c.cliente}
                meta={`${c.numero} · ${c.estado.toLowerCase()}`}
                valor={fmtMonedaCorta(c.monto)}
                valorNota={c.dias < 0 ? `venció hace ${-c.dias}d` : relativo(c.dias)}
              />
            ))
          )}
        </Panel>

        <Panel
          titulo="Ventas cerradas sin proyecto"
          nota="aprobadas que nadie ha aterrizado en producción"
          href="/cotizaciones"
        >
          {r.sinProyecto.length === 0 ? (
            <Vacio texto="Todo lo aprobado tiene proyecto" />
          ) : (
            r.sinProyecto.slice(0, 7).map(c => (
              <Fila
                key={c.id}
                href={`/cotizaciones/${c.id}`}
                tono={c.dias <= 14 ? "rojo" : c.dias === 999 ? "neutro" : "ambar"}
                titulo={c.cliente}
                meta={c.numero}
                valor={fmtMonedaCorta(c.monto)}
                valorNota={c.dias === 999 ? "sin fecha" : c.dias < 0 ? `evento hace ${-c.dias}d` : relativo(c.dias)}
              />
            ))
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel titulo="Últimas ventas cerradas" nota={`${fmtMoneda(r.ganado90)} en 90 días`} href="/crm/tratos/lista">
            {r.ultimasCerradas.length === 0 ? (
              <Vacio texto="Sin ventas cerradas recientes" />
            ) : (
              r.ultimasCerradas.map(t => (
                <Fila
                  key={t.id}
                  href={`/crm/tratos/${t.id}`}
                  tono="verde"
                  titulo={t.cliente}
                  meta={t.titulo}
                  valor={fmtMonedaCorta(t.monto)}
                  valorNota={relativo(-t.dias)}
                />
              ))
            )}
          </Panel>

          <Panel titulo="Embudo abierto" nota={`ganado ${fmtMonedaCorta(r.ganado90)} · perdido ${fmtMonedaCorta(r.perdido90)} en 90d`}>
            <BarraDistribucion
              segmentos={[
                { label: "Prospección", valor: r.etapas.prospeccion, tono: "neutro" },
                { label: "Descubrimiento", valor: r.etapas.descubrimiento, tono: "azul" },
                { label: "Oportunidad", valor: r.etapas.oportunidad, tono: "oro" },
              ]}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
