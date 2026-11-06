import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { cierreDiarioEnVivo, historialCierres } from "@/lib/resumen/cierre-diario";
import { fmtMoneda, fmtMonedaCorta } from "@/lib/resumen/base";
import { EncabezadoResumen, Kpi, Panel, Fila, Vacio, type Tono } from "@/components/resumen/ui";

export const dynamic = "force-dynamic";

const CAT_LABELS: Record<string, string> = {
  PROVEEDOR: "Proveedor",
  BANCARIO: "Bancario",
  FISCAL: "Fiscal",
  SOCIO: "Socio / préstamo",
  OTRO: "Otro",
};

const DIA_LABELS: Record<string, string> = {
  DOMINGO: "Dom", LUNES: "Lun", MARTES: "Mar", MIERCOLES: "Mié",
  JUEVES: "Jue", VIERNES: "Vie", SABADO: "Sáb",
};

function fmtFecha(f: Date) {
  return f.toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export default async function CierreDiarioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/finanzas/resumen");

  const [c, historial] = await Promise.all([cierreDiarioEnVivo(), historialCierres()]);

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Cierre diario"
        subtitulo="Foto de caja al momento — se guarda automático lunes, miércoles y viernes"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi label="En bancos" valor={fmtMonedaCorta(c.totalBancos)} tono={c.totalBancos >= 0 ? "verde" : "rojo"} href="/finanzas/cuentas" />
        <Kpi label="Cobrado hoy" valor={fmtMonedaCorta(c.cobradoHoy)} tono="verde" nota="abonos con fecha de hoy" />
        <Kpi label="Pagado hoy" valor={fmtMonedaCorta(c.pagadoHoy)} tono="ambar" nota="abonos con fecha de hoy" />
        <Kpi label="Por cobrar" valor={fmtMonedaCorta(c.porCobrar)} tono="azul" href="/finanzas/cobros-pagos?tab=cobrar" />
        <Kpi label="Por pagar" valor={fmtMonedaCorta(c.porPagar)} tono="ambar" href="/finanzas/cobros-pagos?tab=pagar" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi
          label="Posición neta"
          valor={fmtMonedaCorta(c.posicion)}
          nota="bancos + CxC − CxP"
          tono={c.posicion >= 0 ? "oro" : "rojo"}
        />
        <Kpi
          label="Vencido por cobrar"
          valor={fmtMonedaCorta(c.cxcVencida.total)}
          nota={`${c.cxcVencida.n} documentos`}
          tono={c.cxcVencida.total > 0 ? "rojo" : "verde"}
          href="/finanzas/cobros-pagos?tab=cobrar"
        />
        <Kpi
          label="Vencido por pagar"
          valor={fmtMonedaCorta(c.cxpVencida.total)}
          nota={`${c.cxpVencida.n} documentos`}
          tono={c.cxpVencida.total > 0 ? "rojo" : "verde"}
          href="/finanzas/cobros-pagos?tab=pagar"
        />
        <Kpi
          label="Nómina pendiente"
          valor={fmtMonedaCorta(c.nominaPendienteTotal)}
          tono={c.nominaPendienteTotal > 0 ? "ambar" : "verde"}
          href="/finanzas/pagos-personal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
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
                <Fila
                  key={`${p.nombre}-${i}`}
                  titulo={p.nombre}
                  meta={CAT_LABELS[p.categoria] ?? p.categoria}
                  valor={fmtMoneda(p.saldo)}
                  tono="ambar"
                />
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
              <Fila
                key={`${g.nombre}-${g.periodo}-${i}`}
                titulo={g.nombre}
                meta={g.periodo}
                valor={fmtMoneda(g.monto)}
                tono={g.estado === "VENCIDO" ? "rojo" : "ambar"}
              />
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
                <Fila
                  key={cu.id}
                  titulo={cu.nombre}
                  meta={cu.banco ?? undefined}
                  tono={cu.saldo < 0 ? "rojo" : cu.saldo === 0 ? "neutro" : "verde"}
                  valor={fmtMoneda(cu.saldo)}
                />
              ))
          )}
        </Panel>
      </div>

      <Panel titulo="Historial de cierres" nota="Foto guardada cada lunes, miércoles y viernes — no se recalcula hacia atrás">
        {historial.length === 0 ? (
          <Vacio texto="Aún no hay cierres guardados. El primero lo genera el cron del próximo lunes/miércoles/viernes, o dispáralo a mano." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-t border-[#1a1a1a] text-left ms-meta">
                  <th className="px-4 py-2">Día</th>
                  <th className="px-2 py-2 text-right">Bancos</th>
                  <th className="px-2 py-2 text-right">Cobrado</th>
                  <th className="px-2 py-2 text-right">Pagado</th>
                  <th className="px-2 py-2 text-right">Por cobrar</th>
                  <th className="px-2 py-2 text-right">Por pagar</th>
                  <th className="px-2 py-2 text-right pr-4">Posición</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(h => {
                  const tono: Tono = h.posicion >= 0 ? "verde" : "rojo";
                  return (
                    <tr key={h.id} className="border-t border-[#1a1a1a] hover:bg-[#161616] transition-colors">
                      <td className="px-4 py-2 text-white whitespace-nowrap">
                        {DIA_LABELS[h.diaSemana] ?? h.diaSemana} {fmtFecha(h.fecha)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-white">{fmtMoneda(h.totalBancos)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-green-400">{fmtMoneda(h.cobradoHoy)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-amber-400">{fmtMoneda(h.pagadoHoy)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-blue-400">{fmtMoneda(h.porCobrar)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-amber-400">{fmtMoneda(h.porPagar)}</td>
                      <td className={`px-2 py-2 pr-4 text-right tabular-nums font-semibold ${tono === "verde" ? "text-[#B3985B]" : "text-red-400"}`}>
                        {fmtMoneda(h.posicion)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
