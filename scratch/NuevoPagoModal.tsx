function NuevoPagoModal({
  personal, onClose, onSaved
}: {
  personal: PersonalRow[]; onClose: () => void; onSaved: (pago: PagoNomina) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    personalId: "",
    dias: "1",
    montoOverride: "",
    concepto: "Pago variable/destajo",
    periodo: (() => {
      const d = new Date();
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
    })()
  });

  const selectedPersona = personal.find(p => p.id === form.personalId);
  const tarifaBase = selectedPersona?.salario || 0;
  
  // Si escribe un monto, usa ese. Si no, multiplica tarifa base por días.
  const calcMonto = form.montoOverride 
    ? parseFloat(form.montoOverride) 
    : tarifaBase * (parseFloat(form.dias) || 0);

  async function guardar() {
    if (!form.personalId || calcMonto <= 0) { toast.error("Selecciona personal y verifica el monto"); return; }
    setSaving(true);
    const res = await fetch("/api/rrhh/nomina/variable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalId: form.personalId,
        monto: calcMonto,
        concepto: form.concepto,
        periodo: form.periodo,
      })
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      toast.success("Pago generado correctamente");
      onSaved(data.pago);
      onClose();
    } else {
      toast.error("Error al generar pago");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="p-5 border-b border-[#1e1e1e]">
          <h2 className="text-white font-semibold text-base">Nuevo Pago a Destajo</h2>
          <p className="text-gray-500 text-xs mt-1">Genera un pago manual en la nómina (ej. para freelance o extras)</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-gray-500 text-xs block mb-1">Personal</label>
            <select value={form.personalId} onChange={e => setForm(p => ({ ...p, personalId: e.target.value }))}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none">
              <option value="">Seleccionar persona...</option>
              {personal.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.salario ? `$${p.salario} base` : "Sin tarifa base"})</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Días trabajados</label>
              <input type="number" step="0.5" value={form.dias} onChange={e => setForm(p => ({ ...p, dias: e.target.value, montoOverride: "" }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Monto Final ($)</label>
              <input type="number" value={form.montoOverride || calcMonto} onChange={e => setForm(p => ({ ...p, montoOverride: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Concepto</label>
              <input value={form.concepto} onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Período</label>
              <input value={form.periodo} onChange={e => setForm(p => ({ ...p, periodo: e.target.value }))}
                placeholder="ej. 2026-W39"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-[#1e1e1e] flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
          <button onClick={guardar} disabled={saving || calcMonto <= 0}
            className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9aa67] transition-colors disabled:opacity-50">
            {saving ? "Creando..." : "Crear pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
