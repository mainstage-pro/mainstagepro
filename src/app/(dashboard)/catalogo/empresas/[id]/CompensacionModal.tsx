"use client";

import { useState } from "react";

function fmt(monto: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(monto);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export default function CompensacionModal({
  empresaId, cxcPendientes, cxpPendientes, onClose, onSuccess
}: {
  empresaId: string, cxcPendientes: any[], cxpPendientes: any[], onClose: () => void, onSuccess: () => void
}) {
  const [aplicacionesCxc, setAplicacionesCxc] = useState<Record<string, number>>({});
  const [aplicacionesCxp, setAplicacionesCxp] = useState<Record<string, number>>({});
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [fechaLimite, setFechaLimite] = useState("");
  const [loading, setLoading] = useState(false);

  const cxcMostradas = cxcPendientes.filter(c => !fechaLimite || new Date(c.fechaFiltro) <= new Date(fechaLimite + "T23:59:59"));
  const cxpMostradas = cxpPendientes.filter(c => !fechaLimite || new Date(c.fechaFiltro) <= new Date(fechaLimite + "T23:59:59"));

  const totalCxc = Object.values(aplicacionesCxc).reduce((a, b) => a + (b || 0), 0);
  const totalCxp = Object.values(aplicacionesCxp).reduce((a, b) => a + (b || 0), 0);

  const handleSubmit = async () => {
    if (totalCxc === 0 || totalCxp === 0) return alert("Debe seleccionar al menos un documento de cada lado.");
    if (Math.abs(totalCxc - totalCxp) > 0.01) return alert("Los importes a compensar no cuadran.");

    setLoading(true);
    
    const aplicaciones = [];
    // Unir CxC y CxP. Para simplificar, emparejaremos 1 a 1 o N a M si cuadran.
    // La API espera { cuentaCobrarId, cuentaPagarId, montoAplicado }
    // En un escenario real esto requiere una distribución iterativa si hay N a M.
    // Distribución Simple:
    const tempCxc = Object.entries(aplicacionesCxc).filter(x => (x[1] || 0) > 0).map(x => ({ id: x[0], val: x[1] }));
    const tempCxp = Object.entries(aplicacionesCxp).filter(x => (x[1] || 0) > 0).map(x => ({ id: x[0], val: x[1] }));

    for (const cx of tempCxc) {
      let restanteCx = cx.val;
      for (const px of tempCxp) {
        if (restanteCx <= 0) break;
        if (px.val <= 0) continue;

        const aplicado = Math.min(restanteCx, px.val);
        aplicaciones.push({
          cuentaCobrarId: cx.id,
          cuentaPagarId: px.id,
          montoAplicado: aplicado
        });
        restanteCx -= aplicado;
        px.val -= aplicado;
      }
    }

    try {
      const res = await fetch("/api/finanzas/compensaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          importeCompensado: totalCxc,
          fecha,
          aplicaciones
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Compensación registrada");
      onSuccess();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="bg-[#111] border border-[#2a2a2a] w-full max-w-4xl p-6 rounded-xl space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Nueva Compensación</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-gray-400 uppercase">Documentos hasta:</label>
              <input 
                type="date" 
                value={fechaLimite} 
                onChange={e => setFechaLimite(e.target.value)} 
                className="ms-input text-sm px-2 py-1" 
              />
            </div>
            <div className="flex items-center gap-2 border-l border-[#333] pl-4">
              <label className="text-[10px] text-[#B3985B] uppercase">Fecha de corte (cruce):</label>
              <input 
                type="date" 
                value={fecha} 
                onChange={e => setFecha(e.target.value)} 
                className="ms-input text-sm px-2 py-1 border-[#B3985B]/50" 
              />
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* LADO CxC */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-gray-400 font-semibold">Cuentas por Cobrar (A favor)</h3>
              <button 
                onClick={() => {
                  const obj: any = {};
                  cxcMostradas.forEach(c => obj[c.id] = c.saldoPendiente);
                  setAplicacionesCxc(obj);
                }}
                className="text-xs text-[#B3985B] hover:underline"
              >
                Seleccionar todo
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {cxcMostradas.length === 0 && <p className="text-xs text-gray-500">No hay documentos en este rango</p>}
              {cxcMostradas.map((c: any) => (
                <div key={c.id} className="ms-card p-3 flex justify-between items-center text-sm gap-2">
                  <div className="min-w-0">
                    <p className="text-xs truncate">{c.concepto}</p>
                    <p className="text-[10px] text-gray-500">{fmt(c.saldoPendiente)} disp. (Generado: {fmtDate(c.fechaFiltro)})</p>
                  </div>
                  <input type="number" 
                    className="w-24 ms-input text-right"
                    placeholder="0.00"
                    max={c.saldoPendiente}
                    value={aplicacionesCxc[c.id] || ""}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (v > c.saldoPendiente) return;
                      setAplicacionesCxc(p => ({ ...p, [c.id]: v }));
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="text-right mt-2 text-green-400 font-mono">Total CxC: {fmt(totalCxc)}</div>
          </div>

          {/* LADO CxP */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-gray-400 font-semibold">Cuentas por Pagar (En contra)</h3>
              <button 
                onClick={() => {
                  const obj: any = {};
                  cxpMostradas.forEach(c => obj[c.id] = c.saldoPendiente);
                  setAplicacionesCxp(obj);
                }}
                className="text-xs text-[#B3985B] hover:underline"
              >
                Seleccionar todo
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {cxpMostradas.length === 0 && <p className="text-xs text-gray-500">No hay documentos en este rango</p>}
              {cxpMostradas.map((c: any) => (
                <div key={c.id} className="ms-card p-3 flex justify-between items-center text-sm gap-2">
                  <div className="min-w-0">
                    <p className="text-xs truncate">{c.concepto}</p>
                    <p className="text-[10px] text-gray-500">{fmt(c.saldoPendiente)} disp. (Generado: {fmtDate(c.fechaFiltro)})</p>
                  </div>
                  <input type="number" 
                    className="w-24 ms-input text-right"
                    placeholder="0.00"
                    max={c.saldoPendiente}
                    value={aplicacionesCxp[c.id] || ""}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (v > c.saldoPendiente) return;
                      setAplicacionesCxp(p => ({ ...p, [c.id]: v }));
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="text-right mt-2 text-red-400 font-mono">Total CxP: {fmt(totalCxp)}</div>
          </div>
        </div>

        <div className="flex gap-4 items-center justify-between pt-4 border-t border-[#1a1a1a]">
          <p className={`text-sm font-semibold ${Math.abs(totalCxc - totalCxp) > 0.01 ? "text-yellow-500" : "text-green-500"}`}>
            {Math.abs(totalCxc - totalCxp) > 0.01 ? "Descuadre: Los totales deben coincidir" : "Montos balanceados"}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancelar</button>
            <button 
              onClick={handleSubmit} 
              disabled={loading || totalCxc === 0 || Math.abs(totalCxc - totalCxp) > 0.01}
              className="px-6 py-2 bg-[#B3985B] text-black font-semibold text-sm rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition"
            >
              {loading ? "Procesando..." : "Confirmar Compensación"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
