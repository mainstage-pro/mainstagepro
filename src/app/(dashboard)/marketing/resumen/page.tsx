import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resumenMarketing } from "@/lib/resumen/marketing";
import { fmtMoneda, fmtMonedaCorta, relativo } from "@/lib/resumen/base";
import { EncabezadoResumen, Fila, Kpi, Panel, Badge, Vacio, type Tono } from "@/components/resumen/ui";

export const dynamic = "force-dynamic";

const ESTADO_TONO: Record<string, Tono> = {
  PENDIENTE: "ambar",
  EN_PROCESO: "azul",
  LISTO: "verde",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Por producir",
  EN_PROCESO: "En proceso",
  LISTO: "Listo",
};

function miles(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default async function ResumenMarketingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const r = await resumenMarketing();
  const cpl = r.leads30 > 0 ? r.gasto30 / r.leads30 : 0;

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Resumen de marketing"
        subtitulo="Lo que sale esta quincena, lo que se quedó atrás y lo que está costando dinero"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi
          label="Próximas publicaciones"
          valor={r.proximas.length}
          nota={`${r.estaSemana} en los próximos 7 días`}
          tono="oro"
          href="/marketing/contenido/parrilla"
        />
        <Kpi
          label="Atrasadas"
          valor={r.atrasadas.length}
          nota="con fecha pasada, sin publicar"
          tono={r.atrasadas.length > 0 ? "rojo" : "verde"}
          href="/marketing/contenido/parrilla"
        />
        <Kpi
          label="Campañas activas"
          valor={r.activas.length}
          nota={`${r.campanas.length - r.activas.length} programadas`}
          tono={r.activas.length > 0 ? "azul" : "neutro"}
          href="/marketing/publicidad/campanas"
        />
        <Kpi label="Gasto en pauta" valor={fmtMonedaCorta(r.gasto30)} nota="últimos 30 días" tono="ambar" />
        <Kpi
          label="Costo por lead"
          valor={cpl > 0 ? fmtMoneda(cpl) : "—"}
          nota={`${r.leads30} leads en 30 días`}
          tono={cpl > 0 ? "verde" : "neutro"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          titulo="Próximas publicaciones"
          nota={`${r.listasParaSalir} listas · ${r.sinProducir} sin producir`}
          href="/marketing/contenido/parrilla"
        >
          {r.proximas.length === 0 ? (
            <Vacio texto="Nada programado en los próximos 14 días" />
          ) : (
            r.proximas.slice(0, 8).map(p => (
              <Fila
                key={p.id}
                href="/marketing/contenido/parrilla"
                tono={p.estado === "LISTO" ? "verde" : p.dias <= 2 ? "ambar" : "neutro"}
                titulo={p.titulo}
                meta={[p.detalle, p.redes.join(" · ")].filter(Boolean).join(" — ")}
                badge={<Badge tono={ESTADO_TONO[p.estado] ?? "neutro"}>{ESTADO_LABEL[p.estado] ?? p.estado}</Badge>}
                valor={relativo(p.dias)}
              />
            ))
          )}
        </Panel>

        <Panel
          titulo="Publicaciones no realizadas"
          nota="fecha pasada y siguen sin publicarse"
          href="/marketing/contenido/parrilla"
        >
          {r.atrasadas.length === 0 ? (
            <Vacio texto="La parrilla está al día" />
          ) : (
            r.atrasadas.slice(0, 8).map(p => (
              <Fila
                key={p.id}
                href="/marketing/contenido/parrilla"
                tono={-p.dias >= 14 ? "rojo" : "ambar"}
                titulo={p.titulo}
                meta={[p.detalle, p.redes.join(" · ")].filter(Boolean).join(" — ")}
                badge={<Badge tono={ESTADO_TONO[p.estado] ?? "neutro"}>{ESTADO_LABEL[p.estado] ?? p.estado}</Badge>}
                valor={`${-p.dias}d`}
                valorNota="de atraso"
              />
            ))
          )}
        </Panel>

        <Panel
          titulo="Campañas"
          nota={`${r.activas.length} en el aire · ${r.campanas.length} vivas`}
          href="/marketing/publicidad/campanas"
        >
          {r.campanas.length === 0 ? (
            <Vacio texto="Sin campañas programadas" />
          ) : (
            r.campanas.slice(0, 8).map(c => (
              <Fila
                key={c.id}
                href="/marketing/publicidad/campanas"
                tono={c.activa ? "verde" : c.arranca <= 7 ? "azul" : "neutro"}
                titulo={c.nombre}
                meta={[
                  c.canal,
                  c.presupuesto > 0 ? `${fmtMonedaCorta(c.gastado)} de ${fmtMonedaCorta(c.presupuesto)}` : "sin presupuesto",
                  c.leads > 0 ? `${c.leads} leads` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                badge={c.activa ? <Badge tono="verde">Activa</Badge> : undefined}
                valor={c.activa ? `${c.diasRestantes}d` : relativo(c.arranca)}
                valorNota={c.activa ? "restantes" : undefined}
              />
            ))
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel titulo="Alcance de los últimos 30 días" nota={`${r.publicadas30} publicaciones salieron`}>
            <div className="grid grid-cols-3 divide-x divide-[#1a1a1a] border-t border-[#1a1a1a]">
              <div className="px-4 py-3">
                <p className="ms-label">Alcance</p>
                <p className="text-lg font-bold text-white tabular-nums mt-1">{miles(r.alcance30)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="ms-label">Interacción</p>
                <p className="text-lg font-bold text-[#B3985B] tabular-nums mt-1">{miles(r.interacciones30)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="ms-label">Seguidores</p>
                <p className="text-lg font-bold text-green-400 tabular-nums mt-1">
                  {r.seguidores30 >= 0 ? "+" : ""}
                  {miles(r.seguidores30)}
                </p>
              </div>
            </div>
          </Panel>

          <Panel titulo="Huecos que cuestan dinero" nota="campañas sin control de gasto o sin brief">
            {r.sinPresupuesto.length === 0 && r.sinBrief.length === 0 ? (
              <Vacio texto="Todas las campañas están completas" />
            ) : (
              <>
                {r.sinPresupuesto.slice(0, 4).map(c => (
                  <Fila key={`p-${c.id}`} href="/marketing/publicidad/campanas" tono="ambar" titulo={c.nombre} meta="Sin presupuesto definido" />
                ))}
                {r.sinBrief.slice(0, 4).map(c => (
                  <Fila
                    key={`b-${c.id}`}
                    href="/marketing/publicidad/campanas"
                    tono="rojo"
                    titulo={c.nombre}
                    meta={`Brief incompleto · arranca ${relativo(c.arranca)}`}
                  />
                ))}
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
