"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { tipoAcreedorLabel } from "@/lib/proveedor-evento";

type Solicitud = {
  id: string;
  imprevisto: boolean;
  proyectoId: string;
  numeroProyecto: string;
  evento: string;
  cliente: string;
  fechaEvento: string;
  venue: string | null;
  coordinador: string | null;
  proveedor: string;
  tipoAcreedor: string;
  telefono: string | null;
  enCatalogo: boolean;
  detalle: string | null;
  unidades: number | null;
  costo: number | null;
  solicitadoPor: string | null;
  fechaSolicitud: string | null;
  cuentaPagar: { id: string; monto: number; montoPagado: number; estado: string; fechaCompromiso: string } | null;
};

const money = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const diaISO = (d: Date) => d.toISOString().slice(0, 10);

const etiquetaDia = (v: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
};

/** Viernes del fin de semana en curso, o el más reciente si ya pasó. */
function viernesDeLaSemana(): Date {
  const hoy = new Date();
  const d = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  // getUTCDay: 0 domingo … 5 viernes. El sábado y el domingo pertenecen al viernes previo.
  const dow = d.getUTCDay();
  const atras = dow === 0 ? 2 : dow === 6 ? 1 : (dow + 2) % 7;
  d.setUTCDate(d.getUTCDate() - atras);
  return d;
}

export default function SolicitudesProveedorPage() {
  const viernes = useMemo(viernesDeLaSemana, []);
  const domingo = useMemo(() => {
    const d = new Date(viernes);
    d.setUTCDate(d.getUTCDate() + 2);
    return d;
  }, [viernes]);

  const [desde, setDesde] = useState(diaISO(viernes));
  const [hasta, setHasta] = useState(diaISO(domingo));
  const [soloImprevistos, setSoloImprevistos] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    (async () => {
      const res = await fetch(`/api/proyectos/solicitudes-proveedor?desde=${desde}&hasta=${hasta}`);
      if (!vigente) return;
      if (res.ok) {
        setSolicitudes((await res.json()).solicitudes ?? []);
        setError(false);
      } else {
        setSolicitudes([]);
        setError(true);
      }
      setCargando(false);
    })();
    return () => { vigente = false; };
  }, [desde, hasta]);

  const filas = soloImprevistos ? solicitudes.filter((s) => s.imprevisto) : solicitudes;
  const total = filas.reduce((s, f) => s + (f.costo ?? 0), 0);
  const porPagar = filas.reduce(
    (s, f) => s + (f.cuentaPagar ? f.cuentaPagar.monto - f.cuentaPagar.montoPagado : 0),
    0,
  );
  const sinCxP = filas.filter((f) => !f.cuentaPagar && (f.costo ?? 0) > 0).length;

  function descargarCSV() {
    const cols = [
      "Tipo", "Proyecto", "Evento", "Cliente", "Fecha evento", "Venue", "Coordinador",
      "Proveedor", "Teléfono", "Qué se pidió", "Unidades", "Costo",
      "Lo pidió", "Fecha solicitud", "CxP", "Estado CxP", "Pagado", "Vence",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lineas = filas.map((f) => [
      f.imprevisto ? "Imprevisto" : "Coordinado",
      f.numeroProyecto, f.evento, f.cliente, diaISO(new Date(f.fechaEvento)), f.venue ?? "", f.coordinador ?? "",
      f.proveedor, f.telefono ?? "", f.detalle ?? "", f.unidades ?? "", f.costo ?? "",
      f.solicitadoPor ?? "", f.fechaSolicitud ? diaISO(new Date(f.fechaSolicitud)) : "",
      f.cuentaPagar ? "Sí" : "No", f.cuentaPagar?.estado ?? "", f.cuentaPagar?.montoPagado ?? "",
      f.cuentaPagar?.fechaCompromiso ? diaISO(new Date(f.cuentaPagar.fechaCompromiso)) : "",
    ].map(esc).join(","));
    // BOM para que Excel en español abra los acentos bien.
    const csv = "\uFEFF" + [cols.map(esc).join(","), ...lineas].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `solicitudes-proveedor-${desde}-a-${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-white">Solicitudes a proveedores</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lo que se le pidió a proveedores en los eventos del rango: lo coordinado antes y lo que salió de imprevisto.
        </p>
      </div>

      <div className="ms-stat-card">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-[#0d0d0d] border border-[#333] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="bg-[#0d0d0d] border border-[#333] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400 pb-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={soloImprevistos}
              onChange={(e) => setSoloImprevistos(e.target.checked)}
              className="accent-[#B3985B]"
            />
            Solo imprevistos
          </label>
          <button
            onClick={descargarCSV}
            disabled={!filas.length}
            className="ml-auto bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            Descargar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Solicitudes", valor: String(filas.length) },
          { label: "Costo total", valor: money(total) },
          { label: "Por pagar", valor: money(porPagar) },
          { label: "Sin cuenta por pagar", valor: String(sinCxP) },
        ].map((k) => (
          <div key={k.label} className="ms-stat-card">
            <p className="text-[10.5px] text-gray-600 font-semibold uppercase tracking-[0.09em]">{k.label}</p>
            <p className="text-lg text-white font-semibold mt-1">{k.valor}</p>
          </div>
        ))}
      </div>

      {cargando ? (
        <div className="ms-stat-card text-gray-600 text-xs">Cargando…</div>
      ) : error ? (
        <div className="ms-stat-card text-amber-600 text-xs">No se pudieron cargar las solicitudes.</div>
      ) : !filas.length ? (
        <div className="ms-stat-card text-gray-600 text-xs">
          No hay solicitudes a proveedores con eventos entre esas fechas.
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-600 border-b border-[#1a1a1a]">
                <th className="px-3 py-2 font-medium">Evento</th>
                <th className="px-3 py-2 font-medium">Proveedor</th>
                <th className="px-3 py-2 font-medium">Qué se pidió</th>
                <th className="px-3 py-2 font-medium text-right">Uds.</th>
                <th className="px-3 py-2 font-medium text-right">Costo</th>
                <th className="px-3 py-2 font-medium">Lo pidió</th>
                <th className="px-3 py-2 font-medium">Cuenta por pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filas.map((f) => (
                <tr key={f.id} className="align-top">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/proyectos/${f.proyectoId}`}
                      className="text-white hover:text-[#B3985B] transition-colors font-medium"
                    >
                      {f.numeroProyecto}
                    </Link>
                    <p className="text-gray-500 mt-0.5">{f.evento}</p>
                    <p className="text-gray-600 text-[11px]">
                      {etiquetaDia(f.fechaEvento)}
                      {f.coordinador ? ` · ${f.coordinador}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white">{f.proveedor}</span>
                      {f.tipoAcreedor !== "PROVEEDOR" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f1f1f] text-gray-400">
                          {tipoAcreedorLabel(f.tipoAcreedor)}
                        </span>
                      )}
                      {f.imprevisto && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-500">imprevisto</span>
                      )}
                    </div>
                    {f.telefono && <p className="text-gray-600 text-[11px] mt-0.5">{f.telefono}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-400 max-w-[280px]">{f.detalle ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right text-gray-400">{f.unidades ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right text-white font-medium">
                    {f.costo != null ? money(f.costo) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-gray-400">
                    {f.solicitadoPor ?? "—"}
                    {f.fechaSolicitud && (
                      <p className="text-gray-600 text-[11px]">{etiquetaDia(f.fechaSolicitud)}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {f.cuentaPagar ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">
                        {f.cuentaPagar.estado.toLowerCase()} · vence {etiquetaDia(f.cuentaPagar.fechaCompromiso)}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-500">
                        pendiente de generar
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
