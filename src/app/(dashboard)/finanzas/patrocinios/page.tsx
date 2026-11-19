import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { reportePatrocinios, type PatrocinioFila } from "@/lib/patrocinios-reporte";
import { MODALIDADES_PATROCINIO, MODALIDAD_PATROCINIO_LABEL } from "@/lib/patrocinio";
import { fmtMoneda, fmtMonedaCorta } from "@/lib/resumen/base";
import { EncabezadoResumen, Kpi, Panel, Badge, Vacio, type Tono } from "@/components/resumen/ui";

export const dynamic = "force-dynamic";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const TONO_MODALIDAD: Record<string, Tono> = {
  TOTAL: "oro",
  COSTO_OPERATIVO: "azul",
  INTERCAMBIO: "verde",
};

function fmtFecha(f: string | null) {
  if (!f) return "Sin fecha";
  const [y, m, d] = f.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

function TablaPatrocinios({ filas }: { filas: PatrocinioFila[] }) {
  if (filas.length === 0) return <Vacio texto="Sin patrocinios en este periodo" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left ms-label border-b border-[#1e1e1e]">
            <th className="px-4 py-2 font-medium">Evento</th>
            <th className="px-4 py-2 font-medium">Modalidad</th>
            <th className="px-4 py-2 font-medium text-right">Valor patrocinado</th>
            <th className="px-4 py-2 font-medium text-right">Cobrado</th>
            <th className="px-4 py-2 font-medium text-right">Costo absorbido</th>
            <th className="px-4 py-2 font-medium text-right">Recibido en especie</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.cotizacionId} className="border-b border-[#161616] align-top">
              <td className="px-4 py-2.5">
                <Link
                  href={f.proyectoId ? `/proyectos/${f.proyectoId}` : `/cotizaciones/${f.cotizacionId}`}
                  className="text-white hover:text-[#B3985B] transition-colors"
                >
                  {f.evento}
                </Link>
                <p className="ms-meta">
                  {f.numeroCotizacion} · {f.cliente} · {fmtFecha(f.fechaEvento)}
                </p>
                {f.contraprestacion && <p className="ms-meta text-gray-400 mt-0.5">A cambio: {f.contraprestacion}</p>}
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <Badge tono={TONO_MODALIDAD[f.modalidad] ?? "neutro"}>{MODALIDAD_PATROCINIO_LABEL[f.modalidad]}</Badge>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[#B3985B]">{fmtMoneda(f.valorPatrocinado)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-300">{fmtMoneda(f.cobrado)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-red-300">
                {fmtMoneda(f.costoAbsorbido)}
                {f.costoEsEstimado && <span className="block ms-micro">estimado</span>}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-300">
                {f.valorRecibido > 0 ? fmtMoneda(f.valorRecibido) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PatrociniosPage({ searchParams }: { searchParams: Promise<{ anio?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { anio: anioParam } = await searchParams;
  const anioActual = new Date().getFullYear();
  const anio = Number(anioParam) >= 2020 && Number(anioParam) <= anioActual + 1 ? Number(anioParam) : anioActual;
  const r = await reportePatrocinios(anio);
  const maxMes = Math.max(1, ...r.porMes.map((m) => m.valorPatrocinado));

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Patrocinios"
        subtitulo="Lo que se regaló en eventos patrocinados, en qué modalidad y cuánto dinero puso la casa"
        acciones={
          <div className="flex items-center gap-1">
            {[anio - 1, anio, anio + 1].filter((a) => a <= anioActual + 1).map((a) => (
              <Link
                key={a}
                href={`/finanzas/patrocinios?anio=${a}`}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${a === anio ? "bg-[#B3985B] border-[#B3985B] text-black font-semibold" : "border-[#333] text-gray-400 hover:text-white"}`}
              >
                {a}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi label={`Eventos patrocinados ${anio}`} valor={r.total.eventos} nota={r.enPropuesta.length ? `+${r.enPropuesta.length} en propuesta` : undefined} />
        <Kpi label="Valor patrocinado" valor={fmtMonedaCorta(r.total.valorPatrocinado)} tono="oro" nota="precio de lista no cobrado" />
        <Kpi label="Costo absorbido" valor={fmtMonedaCorta(r.total.costoAbsorbido)} tono="rojo" nota="dinero que puso la casa" />
        <Kpi label="Recibido en especie" valor={fmtMonedaCorta(r.total.valorRecibido)} tono="verde" nota="intercambios" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Panel titulo="Por mes" nota="valor patrocinado · costo absorbido" className="lg:col-span-2">
          <div className="px-4 pb-4 space-y-1.5">
            {r.porMes.map((m, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="w-8 text-gray-500 shrink-0">{MESES[i]}</span>
                <div className="flex-1 h-3 bg-[#1a1a1a] rounded overflow-hidden">
                  <div className="h-full bg-[#B3985B]/70" style={{ width: `${(m.valorPatrocinado / maxMes) * 100}%` }} />
                </div>
                <span className="w-20 text-right tabular-nums text-white shrink-0">{m.eventos ? fmtMonedaCorta(m.valorPatrocinado) : "—"}</span>
                <span className="w-16 text-right tabular-nums text-red-300 shrink-0">{m.eventos ? fmtMonedaCorta(m.costoAbsorbido) : ""}</span>
                <span className="w-6 text-right text-gray-500 shrink-0">{m.eventos || ""}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel titulo="Por modalidad">
          <div className="px-4 pb-4 space-y-3">
            {MODALIDADES_PATROCINIO.map((m) => {
              const t = r.porModalidad[m];
              return (
                <div key={m} className="flex items-start justify-between gap-2">
                  <div>
                    <Badge tono={TONO_MODALIDAD[m]}>{MODALIDAD_PATROCINIO_LABEL[m]}</Badge>
                    <p className="ms-meta mt-1">{t.eventos} evento{t.eventos === 1 ? "" : "s"}</p>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    <p className="text-[#B3985B]">{fmtMoneda(t.valorPatrocinado)}</p>
                    <p className="text-red-300">{fmtMoneda(t.costoAbsorbido)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel titulo="Eventos patrocinados" nota="Confirmados: aprobada, evento confirmado o con proyecto">
        <TablaPatrocinios filas={r.confirmadas} />
      </Panel>

      {r.enPropuesta.length > 0 && (
        <div className="mt-4">
          <Panel titulo="En propuesta" nota="Patrocinios aún no confirmados; no cuentan en los totales">
            <TablaPatrocinios filas={r.enPropuesta} />
          </Panel>
        </div>
      )}
    </div>
  );
}
