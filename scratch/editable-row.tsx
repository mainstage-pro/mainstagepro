function EditableGastoRow({
  gasto,
  proveedores,
  proyectoId,
  onUpdate
}: {
  gasto: Gasto;
  proveedores: { id: string; nombre: string; empresa: string | null }[];
  proyectoId: string;
  onUpdate: () => void;
}) {
  const [editingAcreedor, setEditingAcreedor] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState(false);
  const [editingMonto, setEditingMonto] = useState(false);

  const [acreedorVal, setAcreedorVal] = useState(gasto.acreedorId || "");
  const [conceptoVal, setConceptoVal] = useState(gasto.concepto || "");
  const [montoVal, setMontoVal] = useState(gasto.monto?.toString() || "");

  const [saving, setSaving] = useState(false);

  async function saveAcreedor(provId: string) {
    if (provId === gasto.acreedorId) { setEditingAcreedor(false); return; }
    setSaving(true);
    try {
      if (gasto.proveedorEventoId) {
        await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${gasto.proveedorEventoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proveedorId: provId || null }),
        });
      } else if (gasto.cuentaPagarId) {
        await fetch(`/api/cuentas-pagar/${gasto.cuentaPagarId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proveedorId: provId || null }),
        });
      }
      onUpdate();
    } finally {
      setSaving(false);
      setEditingAcreedor(false);
    }
  }

  async function saveConcepto() {
    const val = conceptoVal.trim();
    if (val === gasto.concepto) { setEditingConcepto(false); return; }
    setSaving(true);
    try {
      if (gasto.proveedorEventoId) {
        await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${gasto.proveedorEventoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ servicioEquipo: val }),
        });
      } else if (gasto.cuentaPagarId) {
        await fetch(`/api/cuentas-pagar/${gasto.cuentaPagarId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concepto: val }),
        });
      }
      onUpdate();
    } finally {
      setSaving(false);
      setEditingConcepto(false);
    }
  }

  async function saveMonto() {
    const num = parseFloat(montoVal);
    if (isNaN(num) || num === gasto.monto) { setEditingMonto(false); return; }
    setSaving(true);
    try {
      if (gasto.proveedorEventoId) {
        await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${gasto.proveedorEventoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ costoAcordado: num }),
        });
      } else if (gasto.cuentaPagarId) {
        await fetch(`/api/cuentas-pagar/${gasto.cuentaPagarId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monto: num, motivo: "Ajuste directo desde tabla de finanzas" }),
        });
      }
      onUpdate();
    } finally {
      setSaving(false);
      setEditingMonto(false);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_1fr_60px_100px_72px] gap-2 px-4 py-2 border-b border-[#0d0d0d] last:border-0 items-center hover:bg-[#111] transition-colors">
      <div 
        className={`min-w-0 -mx-1 px-1 py-0.5 rounded ${gasto.estado !== "PAGADO" ? "cursor-pointer hover:bg-[#222]" : ""}`}
        onClick={() => { if (!editingAcreedor && gasto.estado !== "PAGADO") setEditingAcreedor(true); }}
      >
        {editingAcreedor ? (
          <select
            autoFocus
            value={acreedorVal}
            onChange={(e) => {
              setAcreedorVal(e.target.value);
              saveAcreedor(e.target.value);
            }}
            onBlur={() => setEditingAcreedor(false)}
            disabled={saving}
            className="w-full bg-[#1a1a1a] border border-[#222] rounded px-1.5 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
          >
            <option value="">Sin proveedor</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>{p.empresa || p.nombre}</option>
            ))}
          </select>
        ) : (
          <>
            <p className="text-sm text-white truncate">{gasto.acreedorNombre}</p>
            <p className="text-[10px] text-gray-600">
              {TIPO_ACREEDOR_LABEL[gasto.tipoAcreedor] ?? gasto.tipoAcreedor}
            </p>
          </>
        )}
      </div>

      <div 
        className={`min-w-0 -mx-1 px-1 py-0.5 rounded ${gasto.estado !== "PAGADO" ? "cursor-pointer hover:bg-[#222]" : ""}`}
        onClick={() => { if (!editingConcepto && gasto.estado !== "PAGADO") setEditingConcepto(true); }}
      >
        {editingConcepto ? (
          <input
            autoFocus
            type="text"
            value={conceptoVal}
            onChange={(e) => setConceptoVal(e.target.value)}
            onBlur={saveConcepto}
            onKeyDown={e => e.key === "Enter" && saveConcepto()}
            disabled={saving}
            className="w-full bg-[#1a1a1a] border border-[#222] rounded px-1.5 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
          />
        ) : (
          <>
            <p className="text-xs text-gray-400 truncate">{gasto.concepto}</p>
            {gasto.solicitadoPor && (
              <p className="text-[10px] text-gray-600 truncate">pidió {gasto.solicitadoPor}</p>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-gray-500">{gasto.unidades ?? "—"}</p>

      <div 
        className={`text-right -mx-1 px-1 py-0.5 rounded ${gasto.estado !== "PAGADO" ? "cursor-pointer hover:bg-[#222]" : ""}`}
        onClick={() => { if (!editingMonto && gasto.estado !== "PAGADO") setEditingMonto(true); }}
      >
        {editingMonto ? (
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            value={montoVal}
            onChange={(e) => setMontoVal(e.target.value)}
            onBlur={saveMonto}
            onKeyDown={e => e.key === "Enter" && saveMonto()}
            disabled={saving}
            className="w-full text-right bg-[#1a1a1a] border border-[#222] rounded px-1.5 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
          />
        ) : (
          <>
            <p className={`text-sm font-medium ${gasto.monto > 0 ? "text-white" : "text-gray-600"}`}>
              {gasto.monto > 0 ? fmt(gasto.monto) : "—"}
            </p>
            {gasto.estado === "PARCIAL" && (
              <p className="text-[10px] text-yellow-500">resta {fmt(gasto.saldo)}</p>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            gasto.estado === "PAGADO"
              ? "bg-green-900/40 text-green-400"
              : gasto.estado === "PARCIAL"
                ? "bg-yellow-900/30 text-yellow-400"
                : gasto.estado === "PENDIENTE"
                  ? "bg-yellow-900/20 text-yellow-500"
                  : gasto.monto > 0
                    ? "bg-orange-900/20 text-orange-400"
                    : "text-gray-700"
          }`}
        >
          {gasto.estado === "PAGADO"
            ? "Pagado"
            : gasto.estado === "PARCIAL"
              ? "Parcial"
              : gasto.estado === "PENDIENTE"
                ? "Pend."
                : gasto.monto > 0
                  ? "Sin CxP"
                  : "—"}
        </span>
      </div>
    </div>
  );
}
