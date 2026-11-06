import { fmtMoneda, fmtMonedaCorta } from "@/lib/resumen/base";
import { Kpi, Panel, Fila, Vacio } from "@/components/resumen/ui";
import { CarteraPanel, type BucketCartera } from "./CarteraPanel";

const CAT_LABELS: Record<string, string> = {
  PROVEEDOR: "Proveedor",
  BANCARIO: "Bancario",
  FISCAL: "Fiscal",
  SOCIO: "Socio / préstamo",
  OTRO: "Otro",
};

export type CierreSnapshotData = {
  cuentas: { id: string; nombre: string; banco: string | null; saldo: number }[];
  totalBancos: number;
  porCobrar: number;
  porPagar: number;
  posicion: number;
  cobradoHoy: number;
  pagadoHoy: number;
  cxcPasado: BucketCartera;
  cxpPasado: BucketCartera;
  cxcProximo: BucketCartera;
  cxpProximo: BucketCartera;
  pasivosDetalle: { nombre: string; categoria: string; saldo: number }[];
  pasivosExternosTotal: number;
  gastosDetalle: { nombre: string; periodo: string; monto: number; estado: string }[];
  gastosRecurrentesPendientesTotal: number;
  nominaPendienteTotal: number;
};

/** KPIs + carteras + pasivos/gastos de una foto de cierre — se usa en vivo y para el histórico. */
export function CierreSnapshot({ c, cobradoLabel = "Cobrado hoy", pagadoLabel = "Pagado hoy" }: {
  c: CierreSnapshotData;
  cobradoLabel?: string;
  pagadoLabel?: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi label="En bancos" valor={fmtMonedaCorta(c.totalBancos)} tono={c.totalBancos >= 0 ? "verde" : "rojo"} href="/finanzas/cuentas" />
        <Kpi label={cobradoLabel} valor={fmtMonedaCorta(c.cobradoHoy)} tono="verde" />
        <Kpi label={pagadoLabel} valor={fmtMonedaCorta(c.pagadoHoy)} tono="ambar" />
        <Kpi label="Por cobrar" valor={fmtMonedaCorta(c.porCobrar)} tono="azul" href="/finanzas/cobros-pagos?tab=cobrar" />
        <Kpi label="Por pagar" valor={fmtMonedaCorta(c.porPagar)} tono="ambar" href="/finanzas/cobros-pagos?tab=pagar" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi label="Posición neta" valor={fmtMonedaCorta(c.posicion)} nota="bancos + CxC − CxP" tono={c.posicion >= 0 ? "oro" : "rojo"} />
        <Kpi
          label="Por cobrar — ejecutado"
          valor={fmtMonedaCorta(c.cxcPasado.total)}
          nota={`${c.cxcPasado.n} documentos · servicio ya prestado`}
          tono={c.cxcPasado.total > 0 ? "rojo" : "verde"}
          href="/finanzas/cobros-pagos?tab=cobrar"
        />
        <Kpi
          label="Por pagar — ejecutado"
          valor={fmtMonedaCorta(c.cxpPasado.total)}
          nota={`${c.cxpPasado.n} documentos · servicio ya recibido`}
          tono={c.cxpPasado.total > 0 ? "rojo" : "verde"}
          href="/finanzas/cobros-pagos?tab=pagar"
        />
        <Kpi
          label="Nómina pendiente"
          valor={fmtMonedaCorta(c.nominaPendienteTotal)}
          tono={c.nominaPendienteTotal > 0 ? "ambar" : "verde"}
          href="/finanzas/pagos-personal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <CarteraPanel
          titulo="Por cobrar — servicio ya ejecutado"
          bucket={c.cxcPasado}
          tipo="cobrar"
          pasado
          vacio="Nada pendiente de cobro con servicio ya prestado"
          href="/finanzas/cobros-pagos?tab=cobrar"
        />
        <CarteraPanel
          titulo="Por pagar — servicio ya ejecutado"
          bucket={c.cxpPasado}
          tipo="pagar"
          pasado
          vacio="Nada pendiente de pago con servicio ya recibido"
          href="/finanzas/cobros-pagos?tab=pagar"
        />
        <CarteraPanel
          titulo="Por cobrar — servicio aún no ejecutado"
          bucket={c.cxcProximo}
          tipo="cobrar"
          pasado={false}
          vacio="Sin anticipos pendientes"
          href="/finanzas/cobros-pagos?tab=cobrar"
        />
        <CarteraPanel
          titulo="Por pagar — servicio aún no ejecutado"
          bucket={c.cxpProximo}
          tipo="pagar"
          pasado={false}
          vacio="Sin pagos anticipados pendientes"
          href="/finanzas/cobros-pagos?tab=pagar"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel
          titulo="Pasivos externos"
          nota={`${fmtMoneda(c.pasivosExternosTotal)} — Actinver, bodega, préstamos de socio y proveedores fuera de operación`}
          href="/finanzas/pasivos"
        >
          {c.pasivosDetalle.length === 0 ? (
            <Vacio texto="Sin pasivos activos" />
          ) : (
            c.pasivosDetalle
              .slice()
              .sort((a, b) => b.saldo - a.saldo)
              .map((p, i) => (
                <Fila key={`${p.nombre}-${i}`} titulo={p.nombre} meta={CAT_LABELS[p.categoria] ?? p.categoria} valor={fmtMoneda(p.saldo)} tono="ambar" />
              ))
          )}
        </Panel>

        <Panel
          titulo="Renta y servicios pendientes"
          nota={`${fmtMoneda(c.gastosRecurrentesPendientesTotal)} — gastos fijos sin confirmar o sin pagar`}
          href="/finanzas/gastos-recurrentes"
        >
          {c.gastosDetalle.length === 0 ? (
            <Vacio texto="Nada pendiente" />
          ) : (
            c.gastosDetalle.map((g, i) => (
              <Fila key={`${g.nombre}-${g.periodo}-${i}`} titulo={g.nombre} meta={g.periodo} valor={fmtMoneda(g.monto)} tono={g.estado === "VENCIDO" ? "rojo" : "ambar"} />
            ))
          )}
        </Panel>

        <Panel titulo="Saldo por cuenta" nota={fmtMoneda(c.totalBancos)} href="/finanzas/cuentas">
          {c.cuentas.length === 0 ? (
            <Vacio texto="Sin cuentas activas" />
          ) : (
            c.cuentas
              .slice()
              .sort((a, b) => b.saldo - a.saldo)
              .map(cu => (
                <Fila key={cu.id} titulo={cu.nombre} meta={cu.banco ?? undefined} tono={cu.saldo < 0 ? "rojo" : cu.saldo === 0 ? "neutro" : "verde"} valor={fmtMoneda(cu.saldo)} />
              ))
          )}
        </Panel>
      </div>
    </>
  );
}
