import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { getTablero } from "@/lib/tablero";

const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export default async function TableroDireccion() {
  const { semaforo, pendientes, pulso, eventos, mes } = await getTablero();

  return (
    <div className="space-y-6">
      {/* ── Semáforo del negocio ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Numero label="En bancos" valor={mxn(semaforo.bancos)} nota="disponible hoy" />
        <Numero
          label="Por cobrar vencido"
          valor={mxn(semaforo.cxcVencido)}
          nota={semaforo.cxcVencidoCount > 0 ? `${semaforo.cxcVencidoCount} cuentas` : "al corriente"}
          tono={semaforo.cxcVencido > 0 ? "rojo" : "ok"}
          href="/finanzas/cobros-pagos"
        />
        <Numero
          label={`Vendido en ${mes.split(" ")[0]}`}
          valor={mxn(semaforo.vendidoMes)}
          nota={`${semaforo.vendidoMesCount} cotizaciones aprobadas`}
          href="/cotizaciones"
        />
        <Numero
          label="Flujo del mes"
          valor={mxn(semaforo.flujoMes)}
          nota={`${mxn(semaforo.ingresosMes)} entró · ${mxn(semaforo.egresosMes)} salió`}
          tono={semaforo.flujoMes < 0 ? "rojo" : "ok"}
          href="/finanzas/movimientos"
        />
      </section>

      <div className="grid lg:grid-cols-5 gap-3">
        {/* ── Requiere tu decisión hoy ── */}
        <section className="lg:col-span-3 rounded-2xl border border-[#1f1f1f] bg-[#0e0e0e] p-5">
          <h2 className="text-sm font-semibold tracking-wide mb-4">Requiere tu decisión hoy</h2>

          {pendientes.length === 0 ? (
            <div className="flex items-center gap-2.5 py-6 text-sm text-white/45">
              <Check className="w-4 h-4 text-emerald-400" />
              Nada urgente. El negocio va al corriente.
            </div>
          ) : (
            <ul className="divide-y divide-[#171717]">
              {pendientes.map((p) => (
                <li key={p.id}>
                  <Link href={p.href} className="group flex items-center gap-3 py-3 -mx-1 px-1 rounded-lg hover:bg-[#141414]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.nivel === "rojo" ? "bg-red-500" : "bg-amber-400"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-100 leading-tight">{p.label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{p.detalle}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#B3985B] shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Próximos 14 días ── */}
        <section className="lg:col-span-2 rounded-2xl border border-[#1f1f1f] bg-[#0e0e0e] p-5">
          <h2 className="text-sm font-semibold tracking-wide mb-4">Próximos 14 días</h2>

          {eventos.length === 0 ? (
            <p className="py-6 text-sm text-white/40">Sin eventos agendados.</p>
          ) : (
            <ul className="space-y-2.5">
              {eventos.map((e) => (
                <li key={e.id}>
                  <Link href={e.href} className="group flex items-start gap-3">
                    <span className="text-[11px] font-semibold text-[#B3985B] uppercase w-12 shrink-0 pt-0.5 tabular-nums">
                      {e.fecha.toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short" })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-200 truncate group-hover:text-white">{e.nombre}</p>
                      <p className="text-xs text-white/35 truncate">{e.cliente}</p>
                    </div>
                    {e.alerta && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 shrink-0">
                        {e.alerta}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Pulso del equipo ── */}
      <section className="rounded-2xl border border-[#1f1f1f] bg-[#0e0e0e] p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wide">Pulso del equipo</h2>
          <span className="text-xs text-white/35">tareas cerradas este mes</span>
        </div>

        <div className="space-y-3">
          {pulso.map((a) => (
            <div key={a.area} className="flex items-center gap-3">
              <span className="text-xs text-gray-300 w-28 shrink-0 truncate">{a.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${a.cumplimiento}%`, backgroundColor: a.color }}
                />
              </div>
              <span className="text-xs text-white/50 w-10 text-right tabular-nums shrink-0">{a.cumplimiento}%</span>
              <span className="text-[11px] w-24 text-right shrink-0 tabular-nums">
                {a.vencidas > 0 ? (
                  <span className="text-red-400">{a.vencidas} vencidas</span>
                ) : (
                  <span className="text-white/25">{a.activas} activas</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Numero({
  label,
  valor,
  nota,
  tono = "neutro",
  href,
}: {
  label: string;
  valor: string;
  nota: string;
  tono?: "neutro" | "rojo" | "ok";
  href?: string;
}) {
  const color = tono === "rojo" ? "text-red-400" : "text-white";
  const contenido = (
    <>
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-semibold mt-1.5 tabular-nums ${color}`}>{valor}</p>
      <p className="text-[11px] text-white/30 mt-1 truncate">{nota}</p>
    </>
  );

  const clases = "block rounded-2xl border border-[#1f1f1f] bg-[#0e0e0e] p-4";
  return href ? (
    <Link href={href} className={`${clases} transition-colors hover:border-[#B3985B]/40`}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}
