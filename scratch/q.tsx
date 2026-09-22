function PagarCuotaModal({
  cuota, beneficiario, cuentas, onClose, onSaved
}: {
  cuota: CuotaReparto; beneficiario: string; cuentas: CuentaBancaria[]; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cuentaId: "",
    metodoPago: "TRANSFERENCIA",
    fecha: new Date().toISOString().split("T")[0]
  });

  async function pagar() {
    if (!form.cuentaId || !form.fecha) { toast.error("Completa la fecha y cuenta"); return; }
    setSaving(true);
    const res = await fetch(`/api/finanzas/repartos/cuotas/${cuota.id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Cuota pagada correctamente");
      onSaved();
      onClose();
    } else {
      const data = await res.json();
      toast.error(data.error || "Error al pagar la cuota");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="p-5 border-b border-[#1e1e1e]">
          <h2 className="text-white font-semibold text-base">Pagar Cuota</h2>
          <p className="text-gray-500 text-xs mt-1">{beneficiario} · {cuota.periodo}</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-gray-500 text-xs block mb-1">Monto a pagar</label>
            <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white font-semibold">
              {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cuota.monto)}
            </div>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Cuenta de origen</label>
            <select value={form.cuentaId} onChange={e => setForm(p => ({ ...p, cuentaId: e.target.value }))}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none">
              <option value="">Seleccionar cuenta...</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.banco} {c.moneda})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Método</label>
              <select value={form.metodoPago} onChange={e => setForm(p => ({ ...p, metodoPago: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none">
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-[#1e1e1e] flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
          <button onClick={pagar} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-green-500 text-black font-semibold text-sm hover:bg-green-400 transition-colors disabled:opacity-50">
            {saving ? "Procesando..." : "Registrar Pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
