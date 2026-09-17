const fs = require('fs');
const file = 'src/app/(dashboard)/finanzas/pagos-personal/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const editableRowComponent = `
function EditablePersonalRow({ pp, roles, proyectoId, onUpdated }: { pp: PersonalSlot; roles: { id: string; nombre: string }[]; proyectoId: string; onUpdated: () => void }) {
  const [editingRol, setEditingRol] = useState(false);
  const [rolVal, setRolVal] = useState(pp.rolTecnicoId || "");
  
  const [editingMonto, setEditingMonto] = useState(false);
  const [montoVal, setMontoVal] = useState(pp.tarifaAcordada?.toString() || "");

  const [saving, setSaving] = useState(false);

  async function saveChange(payload: Record<string, any>) {
    setSaving(true);
    try {
      await fetch(\`/api/proyectos/\${proyectoId}/personal/\${pp.id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const handleRolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    setRolVal(newVal);
    setEditingRol(false);
    if (newVal !== (pp.rolTecnicoId || "")) {
      saveChange({ rolTecnicoId: newVal || null });
    }
  };

  const handleMontoBlur = () => {
    setEditingMonto(false);
    const parsed = parseFloat(montoVal);
    const isValid = !isNaN(parsed) && parsed >= 0;
    const current = pp.tarifaAcordada;
    
    if (montoVal === "" && current != null) {
      saveChange({ tarifaAcordada: null });
    } else if (isValid && parsed !== current) {
      saveChange({ tarifaAcordada: parsed });
    } else {
      setMontoVal(current?.toString() || ""); // revert
    }
  };

  const handleMontoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={\`grid grid-cols-[1fr_1fr_90px_80px_72px] gap-2 px-4 py-2 border-b border-[#0d0d0d] last:border-0 items-center hover:bg-[#111] transition-colors \${saving ? 'opacity-50' : ''}\`}>
      <p className={\`text-sm truncate \${pp.tecnicoNombre ? "text-white" : "text-yellow-500 italic"}\`}>
        {pp.tecnicoNombre ?? "Sin asignar"}
      </p>
      
      {/* Rol Editable */}
      <div 
        className="-mx-1 px-1 py-0.5 rounded cursor-pointer hover:bg-[#222]"
        onClick={() => { if (!editingRol && pp.estadoPago !== "PAGADO") setEditingRol(true); }}
      >
        {editingRol ? (
          <select 
            autoFocus
            value={rolVal}
            onChange={handleRolChange}
            onBlur={() => setEditingRol(false)}
            className="w-full bg-[#1a1a1a] border border-[#333] text-white text-xs rounded px-1 py-0.5 focus:outline-none focus:border-[#B3985B]"
          >
            <option value="">Sin rol</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-gray-400 truncate">{pp.rolNombre ?? "—"}</p>
        )}
      </div>

      <p className="text-xs text-gray-500">{pp.jornada ?? "—"}</p>
      
      {/* Monto Editable */}
      <div 
        className="-mx-1 px-1 py-0.5 rounded cursor-pointer hover:bg-[#222] text-right"
        onClick={() => { if (!editingMonto && pp.estadoPago !== "PAGADO") setEditingMonto(true); }}
      >
        {editingMonto ? (
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            value={montoVal}
            onChange={e => setMontoVal(e.target.value)}
            onBlur={handleMontoBlur}
            onKeyDown={handleMontoKeyDown}
            className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm text-right rounded px-1 py-0.5 focus:outline-none focus:border-[#B3985B]"
            placeholder="0"
          />
        ) : (
          <p className={\`text-sm font-medium \${pp.tarifaAcordada != null ? "text-white" : "text-gray-600"}\`}>
            {pp.tarifaAcordada != null ? fmt(pp.tarifaAcordada) : "—"}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <span className={\`text-[10px] px-1.5 py-0.5 rounded-full font-medium \${
          pp.estadoPago === "PAGADO"
            ? "bg-green-900/40 text-green-400"
            : pp.tarifaAcordada != null
              ? "bg-yellow-900/30 text-yellow-400"
              : "text-gray-700"
        }\`}>
          {pp.tecnicoId ? (pp.estadoPago === "PAGADO" ? "Pagado" : "Pend.") : "—"}
        </span>
      </div>
    </div>
  );
}
`;

if (!code.includes('function EditablePersonalRow')) {
  code = code.replace(
    'export default function PagosPersonalPage',
    editableRowComponent + '\nexport default function PagosPersonalPage'
  );
}

// Replace the slots.map rendering
const oldRender = `{slots.map((pp) => (
                              <div key={pp.id} className="grid grid-cols-[1fr_1fr_90px_80px_72px] gap-2 px-4 py-2 border-b border-[#0d0d0d] last:border-0 items-center">
                                <p className={\`text-sm truncate \${pp.tecnicoNombre ? "text-white" : "text-yellow-500 italic"}\`}>
                                  {pp.tecnicoNombre ?? "Sin asignar"}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{pp.rolNombre ?? "—"}</p>
                                <p className="text-xs text-gray-500">{pp.jornada ?? "—"}</p>
                                <p className={\`text-sm font-medium text-right \${pp.tarifaAcordada != null ? "text-white" : "text-gray-600"}\`}>
                                  {pp.tarifaAcordada != null ? fmt(pp.tarifaAcordada) : "—"}
                                </p>
                                <div className="flex justify-end">
                                  <span className={\`text-[10px] px-1.5 py-0.5 rounded-full font-medium \${
                                    pp.estadoPago === "PAGADO"
                                      ? "bg-green-900/40 text-green-400"
                                      : pp.tarifaAcordada != null
                                        ? "bg-yellow-900/30 text-yellow-400"
                                        : "text-gray-700"
                                  }\`}>
                                    {pp.tecnicoId ? (pp.estadoPago === "PAGADO" ? "Pagado" : "Pend.") : "—"}
                                  </span>
                                </div>
                              </div>
                            ))}`;

const newRender = `{slots.map((pp) => (
                              <EditablePersonalRow
                                key={pp.id}
                                pp={pp}
                                roles={data.roles}
                                proyectoId={p.id}
                                onUpdated={load}
                              />
                            ))}`;

if (code.includes(oldRender)) {
  code = code.replace(oldRender, newRender);
  console.log("Successfully replaced render");
} else {
  console.log("Could not find oldRender block to replace");
}

fs.writeFileSync(file, code);
