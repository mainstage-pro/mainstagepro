"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

interface CuentaCobrar {
  concepto: string;
  monto: number;
  montoCobrado: number | null;
  estado: string;
  fechaCompromiso: string | null;
  tipoPago: string | null;
}

interface Proyecto {
  id: string;
  nombre: string;
  numeroProyecto: string;
  estado: string;
  tipoEvento: string | null;
  fechaEvento: string | null;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
  lugarEvento: string | null;
  descripcionGeneral: string | null;
  cliente: { nombre: string; empresa: string | null; telefono: string | null; correo: string | null };
  personal: { tecnico: { nombre: string } | null; rolTecnico: { nombre: string } | null }[];
  cotizacion: { numeroCotizacion: string; granTotal: number; estado: string } | null;
  cuentasCobrar: CuentaCobrar[];
}

const ESTADO_LABEL: Record<string, string> = {
  PROSPECTO: "En evaluación",
  PLANEACION: "En planeación",
  CONFIRMADO: "Confirmado",
  EN_CURSO: "En curso",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

const ESTADO_COLOR: Record<string, string> = {
  PROSPECTO: "bg-gray-700 text-gray-300",
  PLANEACION: "bg-blue-900/50 text-blue-300",
  CONFIRMADO: "bg-[#B3985B]/20 text-[#B3985B]",
  EN_CURSO: "bg-green-900/50 text-green-300",
  COMPLETADO: "bg-purple-900/50 text-purple-300",
  CANCELADO: "bg-red-900/50 text-red-400",
};

const PAGO_ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "text-yellow-400",
  PARCIAL: "text-blue-400",
  PAGADO: "text-green-400",
  CANCELADO: "text-red-400",
};

export default function PortalCliente() {
  const { token } = useParams<{ token: string }>();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setProyecto(d.proyecto);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !proyecto) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-4">
      <Image src="/logo-white.png" alt="Mainstage Pro" width={140} height={36} className="object-contain opacity-60" />
      <p className="text-gray-500 text-sm mt-4">Este enlace no es válido o ha expirado.</p>
      <p className="text-gray-700 text-xs">Contacta a tu coordinador para obtener un nuevo enlace.</p>
    </div>
  );

  const totalCobrado = proyecto.cuentasCobrar.reduce((s, c) => s + Number(c.montoCobrado ?? 0), 0);
  const totalPorCobrar = proyecto.cuentasCobrar.reduce((s, c) => s + Number(c.monto), 0);
  const porcentajePagado = totalPorCobrar > 0 ? (totalCobrado / totalPorCobrar) * 100 : 0;

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }
  function formatMXN(n: number) {
    return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });
  }

  const tieneEquipo = proyecto.personal.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] bg-[#0d0d0d] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Image src="/logo-white.png" alt="Mainstage Pro" width={120} height={32} className="object-contain" />
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLOR[proyecto.estado] ?? "bg-gray-800 text-gray-400"}`}>
            {ESTADO_LABEL[proyecto.estado] ?? proyecto.estado}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Bienvenida */}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Portal de cliente · {proyecto.numeroProyecto}</p>
          <h1 className="text-2xl font-bold text-white">{proyecto.nombre}</h1>
          {proyecto.cliente.empresa && (
            <p className="text-gray-500 text-sm mt-0.5">{proyecto.cliente.empresa}</p>
          )}
        </div>

        {/* Detalles del evento */}
        <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Detalles del evento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">Fecha</p>
              <p className="text-sm text-white capitalize">{formatDate(proyecto.fechaEvento)}</p>
            </div>
            {(proyecto.horaInicioEvento || proyecto.horaFinEvento) && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">Horario</p>
                <p className="text-sm text-white">{proyecto.horaInicioEvento ?? "—"}{proyecto.horaFinEvento ? ` – ${proyecto.horaFinEvento}` : ""}</p>
              </div>
            )}
            {proyecto.lugarEvento && (
              <div className="sm:col-span-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">Lugar</p>
                <p className="text-sm text-white">{proyecto.lugarEvento}</p>
              </div>
            )}
            {proyecto.tipoEvento && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">Tipo de evento</p>
                <p className="text-sm text-white">{proyecto.tipoEvento}</p>
              </div>
            )}
          </div>
          {proyecto.descripcionGeneral && (
            <div className="pt-3 border-t border-[#1e1e1e]">
              <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Descripción</p>
              <p className="text-sm text-gray-300 whitespace-pre-line">{proyecto.descripcionGeneral}</p>
            </div>
          )}
        </section>

        {/* Estado de pagos */}
        {proyecto.cuentasCobrar.length > 0 && (
          <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Estado de pagos</h2>

            {/* Barra de progreso */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">Pagado</span>
                <span className="text-xs font-semibold text-[#B3985B]">{porcentajePagado.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B3985B] rounded-full transition-all"
                  style={{ width: `${Math.min(porcentajePagado, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-gray-600">{formatMXN(totalCobrado)} cobrado</span>
                <span className="text-[11px] text-gray-600">Total: {formatMXN(totalPorCobrar)}</span>
              </div>
            </div>

            {/* Lista de conceptos */}
            <div className="divide-y divide-[#1a1a1a]">
              {proyecto.cuentasCobrar.map((c, i) => (
                <div key={i} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{c.concepto}</p>
                    {c.tipoPago && <p className="text-[10px] text-gray-600">{c.tipoPago}</p>}
                    {c.fechaCompromiso && (
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        Vence: {new Date(c.fechaCompromiso).toLocaleDateString("es-MX")}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatMXN(c.monto)}</p>
                    <p className={`text-[10px] font-semibold ${PAGO_ESTADO_COLOR[c.estado] ?? "text-gray-400"}`}>
                      {c.estado === "PARCIAL" ? `${formatMXN(Number(c.montoCobrado ?? 0))} pagado` : c.estado}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Equipo confirmado */}
        {tieneEquipo && (
          <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Equipo asignado</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {proyecto.personal.map((p, i) => {
                const nombre = p.tecnico?.nombre ?? "Técnico";
                return (
                  <div key={i} className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-3 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1e1e1e] flex items-center justify-center shrink-0">
                      <span className="text-[#B3985B] text-xs font-semibold">{nombre.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{nombre}</p>
                      {p.rolTecnico && <p className="text-[10px] text-gray-600">{p.rolTecnico.nombre}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Cotización */}
        {proyecto.cotizacion && (
          <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Cotización</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">{proyecto.cotizacion.numeroCotizacion}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">Estado: {proyecto.cotizacion.estado}</p>
              </div>
              <p className="text-xl font-bold text-[#B3985B]">{formatMXN(Number(proyecto.cotizacion.granTotal))}</p>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center py-6 space-y-1">
          <p className="text-gray-700 text-xs">Portal generado por Mainstage Pro</p>
          <p className="text-gray-800 text-[10px]">Este enlace es confidencial — no lo compartas</p>
        </div>
      </main>
    </div>
  );
}
