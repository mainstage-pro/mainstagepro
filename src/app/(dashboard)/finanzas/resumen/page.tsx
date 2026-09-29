import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resumenFinanzas } from "@/lib/resumen/finanzas";
import { fmtMoneda, fmtMonedaCorta, relativo } from "@/lib/resumen/base";
import {
  EncabezadoResumen,
  Fila,
  Kpi,
  Panel,
  Badge,
  Vacio,
  BarrasPareadas,
  Grupo,
  type Tono,
} from "@/components/resumen/ui";
import { FilaOperable, type Accion } from "@/components/resumen/acciones";

export const dynamic = "force-dynamic";

const METODOS = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "CHEQUE", label: "Cheque" },
];

/**
 * Cobrar, pagar y reprogramar desde el propio renglón. El monto arranca en el
 * saldo: lo normal es liquidar completo y el abono parcial solo lo corrige.
 */
function accionesDoc(
  id: string,
  saldo: number,
  destino: "cobrar" | "pagar",
  cuentas: { value: string; label: string }[],
  hoy: string,
): Accion[] {
  const esCobro = destino === "cobrar";
  const base = `/api/cuentas-${esCobro ? "cobrar" : "pagar"}/${id}`;
  return [
    {
      clave: "abonar",
      label: esCobro ? "Registrar cobro" : "Registrar pago",
      endpoint: `${base}/pagar`,
      metodo: "POST",
      tono: esCobro ? "verde" : "ambar",
      hecho: esCobro ? "Cobro registrado" : "Pago registrado",
      campos: [
        { nombre: "monto", etiqueta: "Monto", tipo: "monto", requerido: true, inicial: String(saldo) },
        { nombre: "fecha", etiqueta: "Fecha", tipo: "fecha", inicial: hoy },
        {
          nombre: "cuentaId",
          etiqueta: esCobro ? "Cuenta destino" : "Cuenta origen",
          tipo: "opcion",
          opciones: cuentas,
        },
        { nombre: "metodoPago", etiqueta: "Método", tipo: "opcion", inicial: "TRANSFERENCIA", opciones: METODOS },
      ],
    },
    {
      clave: "reprogramar",
      label: "Reprogramar",
      endpoint: base,
      metodo: "PATCH",
      tono: "neutro",
      hecho: "Fecha compromiso actualizada",
      campos: [{ nombre: "fechaCompromiso", etiqueta: "Nueva fecha", tipo: "fecha", requerido: true, inicial: hoy }],
    },
  ];
}

type Bucket = {
  total: number;
  n: number;
  grupos: {
    quien: string;
    total: number;
    n: number;
    diasMax: number;
    docs: {
      id: string;
      concepto: string;
      proyecto: string | null;
      proyectoFecha: string | null;
      fecha: string;
      saldo: number;
      dias: number;
    }[];
  }[];
};

/**
 * Un panel de cartera: agrupado por contraparte y con alto fijo. El "Ver todo"
 * y cada documento apuntan a su pestaña y a su cuenta, no al listado entero.
 */
function PanelAgrupado({
  titulo,
  bucket,
  destino,
  vacio,
  cuentas,
  hoy,
  vencido = false,
}: {
  titulo: string;
  bucket: Bucket;
  destino: "cobrar" | "pagar";
  vacio: string;
  cuentas: { value: string; label: string }[];
  hoy: string;
  vencido?: boolean;
}) {
  return (
    <Panel
      titulo={titulo}
      nota={`${bucket.n} documentos · ${bucket.grupos.length} ${destino === "cobrar" ? "clientes" : "acreedores"} · ${fmtMoneda(bucket.total)}`}
      href={`/finanzas/cobros-pagos?tab=${destino}`}
      scroll
    >
      {bucket.grupos.length === 0 ? (
        <Vacio texto={vacio} />
      ) : (
        bucket.grupos.map(g => {
          const tonoGrupo: Tono = vencido ? (g.diasMax >= 30 ? "rojo" : "ambar") : destino === "cobrar" ? "azul" : "neutro";
          return (
            <Grupo
              key={g.quien}
              titulo={g.quien}
              meta={`${g.n} ${g.n === 1 ? "documento" : "documentos"}`}
              valor={fmtMoneda(g.total)}
              tono={tonoGrupo}
            >
              {g.docs.map(d => (
                <FilaOperable
                  key={d.id}
                  href={`/finanzas/cobros-pagos?tab=${destino}&id=${d.id}`}
                  tono={tonoGrupo}
                  titulo={d.concepto}
                  meta={
                    [d.proyecto, d.proyectoFecha && `evento ${d.proyectoFecha}`]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                  badge={vencido ? <Badge tono={d.dias >= 30 ? "rojo" : "ambar"}>{d.dias}d</Badge> : undefined}
                  valor={fmtMoneda(d.saldo)}
                  valorNota={vencido ? d.fecha : `${d.fecha} · ${relativo(-d.dias)}`}
                  acciones={accionesDoc(d.id, d.saldo, destino, cuentas, hoy)}
                />
              ))}
            </Grupo>
          );
        })
      )}
    </Panel>
  );
}

export default async function ResumenFinanzasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const r = await resumenFinanzas();
  const ultimoMes = r.meses[r.meses.length - 1];
  const resultadoMes = ultimoMes ? ultimoMes.ingreso - ultimoMes.gasto : 0;
  const hoy = new Date().toISOString().slice(0, 10);
  const opcionesCuenta = r.cuentas.map(c => ({ value: c.id, label: c.nombre }));

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
          <BarrasPareadas
            datos={r.meses.map(m => ({ label: m.label, a: m.ingreso, b: m.gasto }))}
            formato={fmtMonedaCorta}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <PanelAgrupado
          titulo="Cobranza vencida"
          bucket={r.cxcVencida}
          destino="cobrar"
          vacio="Nada vencido por cobrar"
          cuentas={opcionesCuenta}
          hoy={hoy}
          vencido
        />

        <PanelAgrupado
          titulo="Pagos vencidos"
          bucket={r.cxpVencida}
          destino="pagar"
          vacio="Nada vencido por pagar"
          cuentas={opcionesCuenta}
          hoy={hoy}
          vencido
        />

        <PanelAgrupado
          titulo="Por cobrar — próximos 15 días"
          bucket={r.cxcPorCobrar15}
          destino="cobrar"
          vacio="Sin cobros programados"
          cuentas={opcionesCuenta}
          hoy={hoy}
        />

        <PanelAgrupado
          titulo="Por pagar — próximos 15 días"
          bucket={r.cxpPorVencer}
          destino="pagar"
          vacio="Sin pagos programados"
          cuentas={opcionesCuenta}
          hoy={hoy}
        />
      </div>
    </div>
  );
}
