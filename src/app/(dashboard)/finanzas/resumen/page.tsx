import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resumenFinanzas } from "@/lib/resumen/finanzas";
import { fmtMoneda, fmtMonedaCorta, relativo } from "@/lib/resumen/base";
import { EncabezadoResumen, Fila, Kpi, Panel, Badge, Vacio, MiniBarras } from "@/components/resumen/ui";

export const dynamic = "force-dynamic";

export default async function ResumenFinanzasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const r = await resumenFinanzas();
  const ultimoMes = r.meses[r.meses.length - 1];
  const resultadoMes = ultimoMes ? ultimoMes.ingreso - ultimoMes.gasto : 0;

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Resumen financiero"
        subtitulo="Lo que hay, lo que entra y lo que ya debía haber salido"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi
          label="En bancos"
          valor={fmtMonedaCorta(r.totalBancos)}
          nota={`${r.cuentas.length} cuentas activas`}
          tono={r.totalBancos >= 0 ? "verde" : "rojo"}
          href="/finanzas/cuentas"
        />
        <Kpi label="Por cobrar" valor={fmtMonedaCorta(r.porCobrar)} nota="saldo abierto de CxC" tono="azul" href="/finanzas/cobros-pagos" />
        <Kpi label="Por pagar" valor={fmtMonedaCorta(r.porPagar)} nota="saldo abierto de CxP" tono="ambar" href="/finanzas/cobros-pagos" />
        <Kpi
          label="Posición neta"
          valor={fmtMonedaCorta(r.posicion)}
          nota="bancos + CxC − CxP"
          tono={r.posicion >= 0 ? "oro" : "rojo"}
        />
        <Kpi
          label="Resultado del mes"
          valor={fmtMonedaCorta(resultadoMes)}
          nota="ingreso − gasto"
          tono={resultadoMes >= 0 ? "verde" : "rojo"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel titulo="Saldo por cuenta" nota={fmtMoneda(r.totalBancos)} href="/finanzas/cuentas">
          {r.cuentas.length === 0 ? (
            <Vacio texto="Sin cuentas activas" />
          ) : (
            r.cuentas
              .slice()
              .sort((a, b) => b.saldo - a.saldo)
              .map(c => (
                <Fila
                  key={c.id}
                  titulo={c.nombre}
                  meta={c.banco ?? undefined}
                  tono={c.saldo < 0 ? "rojo" : c.saldo === 0 ? "neutro" : "verde"}
                  valor={fmtMoneda(c.saldo)}
                />
              ))
          )}
        </Panel>

        <Panel titulo="Ingreso vs gasto — 6 meses" nota="movimiento real registrado" href="/finanzas/movimientos" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-0">
            <div>
              <p className="ms-micro px-4 pt-1 text-green-400">Ingreso</p>
              <MiniBarras datos={r.meses.map(m => ({ label: m.label, valor: m.ingreso }))} formato={fmtMonedaCorta} tono="verde" />
            </div>
            <div>
              <p className="ms-micro px-4 pt-1 text-red-400">Gasto</p>
              <MiniBarras datos={r.meses.map(m => ({ label: m.label, valor: m.gasto }))} formato={fmtMonedaCorta} tono="rojo" />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Panel
          titulo="Cobranza vencida"
          nota={`${r.cxcVencida.n} documentos · ${fmtMoneda(r.cxcVencida.total)}`}
          href="/finanzas/cobros-pagos"
        >
          {r.cxcVencida.top.length === 0 ? (
            <Vacio texto="Nada vencido por cobrar" />
          ) : (
            r.cxcVencida.top.map(c => (
              <Fila
                key={c.id}
                href="/finanzas/cobros-pagos"
                tono={c.dias >= 30 ? "rojo" : "ambar"}
                titulo={c.quien}
                meta={`${c.concepto}${c.proyecto ? ` · ${c.proyecto}` : ""}`}
                badge={<Badge tono={c.dias >= 30 ? "rojo" : "ambar"}>{c.dias}d</Badge>}
                valor={fmtMoneda(c.saldo)}
              />
            ))
          )}
        </Panel>

        <Panel
          titulo="Pagos vencidos"
          nota={`${r.cxpVencida.n} documentos · ${fmtMoneda(r.cxpVencida.total)}`}
          href="/finanzas/cobros-pagos"
        >
          {r.cxpVencida.top.length === 0 ? (
            <Vacio texto="Nada vencido por pagar" />
          ) : (
            r.cxpVencida.top.map(c => (
              <Fila
                key={c.id}
                href="/finanzas/cobros-pagos"
                tono={c.dias >= 30 ? "rojo" : "ambar"}
                titulo={c.quien}
                meta={`${c.concepto}${c.proyecto ? ` · ${c.proyecto}` : ""}`}
                badge={<Badge tono={c.dias >= 30 ? "rojo" : "ambar"}>{c.dias}d</Badge>}
                valor={fmtMoneda(c.saldo)}
              />
            ))
          )}
        </Panel>

        <Panel
          titulo="Por cobrar — próximos 15 días"
          nota={`${r.cxcPorCobrar15.n} · ${fmtMoneda(r.cxcPorCobrar15.total)}`}
          href="/finanzas/cobros-pagos"
        >
          {r.cxcPorCobrar15.top.length === 0 ? (
            <Vacio texto="Sin cobros programados" />
          ) : (
            r.cxcPorCobrar15.top.map(c => (
              <Fila
                key={c.id}
                href="/finanzas/cobros-pagos"
                tono="azul"
                titulo={c.quien}
                meta={c.concepto}
                valor={fmtMoneda(c.saldo)}
                valorNota={relativo(-c.dias)}
              />
            ))
          )}
        </Panel>

        <Panel
          titulo="Por pagar — próximos 15 días"
          nota={`${r.cxpPorVencer.n} · ${fmtMoneda(r.cxpPorVencer.total)}`}
          href="/finanzas/cobros-pagos"
        >
          {r.cxpPorVencer.top.length === 0 ? (
            <Vacio texto="Sin pagos programados" />
          ) : (
            r.cxpPorVencer.top.map(c => (
              <Fila
                key={c.id}
                href="/finanzas/cobros-pagos"
                tono={-c.dias <= 3 ? "ambar" : "neutro"}
                titulo={c.quien}
                meta={c.concepto}
                valor={fmtMoneda(c.saldo)}
                valorNota={relativo(-c.dias)}
              />
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}
