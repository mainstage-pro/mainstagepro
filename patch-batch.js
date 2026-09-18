const fs = require('fs');
const file = 'src/app/(dashboard)/finanzas/pagos-personal/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add notas and tecnicos to interfaces
if (!code.includes('notas?: string | null;')) {
  code = code.replace(
    'tarifaAcordada: number | null;',
    'tarifaAcordada: number | null;\n  notas?: string | null;'
  );
}

if (!code.includes('tecnicos: { id: string; nombre: string }[];')) {
  code = code.replace(
    'roles: { id: string; nombre: string }[];',
    'roles: { id: string; nombre: string }[];\n  tecnicos: { id: string; nombre: string }[];'
  );
}

// Replace EditablePersonalRow completely
const newEditableRow = `
import { MessageSquare } from "lucide-react";

function EditablePersonalRow({ pp, roles, tecnicos, pendingEdits, onEdit }: { 
  pp: PersonalSlot; 
  roles: { id: string; nombre: string }[]; 
  tecnicos: { id: string; nombre: string }[];
  pendingEdits: Partial<PersonalSlot>; 
  onEdit: (id: string, changes: Partial<PersonalSlot>) => void;
}) {
  const [editingRol, setEditingRol] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState(false);
  const [editingMonto, setEditingMonto] = useState(false);
  const [editingNotas, setEditingNotas] = useState(false);

  const merged = { ...pp, ...pendingEdits };
  
  const [montoVal, setMontoVal] = useState(merged.tarifaAcordada?.toString() || "");
  const [notasVal, setNotasVal] = useState(merged.notas || "");

  // Update local state when pendingEdits clear or change externally
  useEffect(() => {
    setMontoVal(merged.tarifaAcordada?.toString() || "");
    setNotasVal(merged.notas || "");
  }, [merged.tarifaAcordada, merged.notas]);

  const handleRolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    setEditingRol(false);
    if (newVal !== (pp.rolTecnicoId || "")) {
      onEdit(pp.id, { rolTecnicoId: newVal || null });
    } else {
      // Revert if matches original
      onEdit(pp.id, { rolTecnicoId: pp.rolTecnicoId });
    }
  };

  const handleTecnicoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    setEditingTecnico(false);
    if (newVal !== (pp.tecnicoId || "")) {
      onEdit(pp.id, { tecnicoId: newVal || null });
    } else {
      onEdit(pp.id, { tecnicoId: pp.tecnicoId });
    }
  };

  const handleMontoBlur = () => {
    setEditingMonto(false);
    const parsed = parseFloat(montoVal);
    const isValid = !isNaN(parsed) && parsed >= 0;
    const current = pp.tarifaAcordada;
    
    if (montoVal === "" && current != null) {
      onEdit(pp.id, { tarifaAcordada: null });
    } else if (isValid && parsed !== current) {
      onEdit(pp.id, { tarifaAcordada: parsed });
    } else {
      onEdit(pp.id, { tarifaAcordada: current }); // revert in pending
      setMontoVal(current?.toString() || "");
    }
  };

  const handleNotasBlur = () => {
    setEditingNotas(false);
    if (notasVal !== (pp.notas || "")) {
      onEdit(pp.id, { notas: notasVal });
    } else {
      onEdit(pp.id, { notas: pp.notas });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action();
      (e.target as HTMLElement).blur();
    }
  };

  const hasPending = Object.keys(pendingEdits).length > 0;
  
  // Resolve labels for display
  const displayRol = roles.find(r => r.id === merged.rolTecnicoId)?.nombre ?? pp.rolNombre ?? "—";
  const displayTecnico = tecnicos.find(t => t.id === merged.tecnicoId)?.nombre ?? pp.tecnicoNombre ?? "Sin asignar";

  return (
    <div className={\`grid grid-cols-[1fr_1fr_90px_100px_72px] gap-2 px-4 py-2 border-b border-[#0d0d0d] last:border-0 items-center transition-colors \${hasPending ? 'bg-[#B3985B]/5' : 'hover:bg-[#111]'}\`}>
      {/* Técnico Editable */}
      <div 
        className="-mx-1 px-1 py-0.5 rounded cursor-pointer hover:bg-[#222]"
        onClick={() => { if (!editingTecnico && pp.estadoPago !== "PAGADO") setEditingTecnico(true); }}
      >
        {editingTecnico ? (
          <select 
            autoFocus
            value={merged.tecnicoId || ""}
            onChange={handleTecnicoChange}
            onBlur={() => setEditingTecnico(false)}
            className="w-full bg-[#1a1a1a] border border-[#333] text-white text-xs rounded px-1 py-0.5 focus:outline-none focus:border-[#B3985B]"
          >
            <option value="">Sin asignar</option>
            {tecnicos.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        ) : (
          <p className={\`text-sm truncate \${merged.tecnicoId ? "text-white" : "text-yellow-500 italic"}\`}>
            {displayTecnico}
          </p>
        )}
      </div>
      
      {/* Rol Editable */}
      <div 
        className="-mx-1 px-1 py-0.5 rounded cursor-pointer hover:bg-[#222]"
        onClick={() => { if (!editingRol && pp.estadoPago !== "PAGADO") setEditingRol(true); }}
      >
        {editingRol ? (
          <select 
            autoFocus
            value={merged.rolTecnicoId || ""}
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
          <p className="text-xs text-gray-400 truncate">{displayRol}</p>
        )}
      </div>

      <p className="text-xs text-gray-500">{pp.jornada ?? "—"}</p>
      
      {/* Monto & Notas Editable */}
      <div className="flex items-center justify-end gap-1.5 -mx-1 px-1 py-0.5 rounded hover:bg-[#222]">
        {editingNotas ? (
          <input
            autoFocus
            type="text"
            value={notasVal}
            onChange={e => setNotasVal(e.target.value)}
            onBlur={handleNotasBlur}
            onKeyDown={(e) => handleKeyDown(e, handleNotasBlur)}
            className="w-[100px] bg-[#1a1a1a] border border-[#333] text-white text-[10px] rounded px-1 py-0.5 focus:outline-none focus:border-[#B3985B]"
            placeholder="Nota extra..."
          />
        ) : editingMonto ? (
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            value={montoVal}
            onChange={e => setMontoVal(e.target.value)}
            onBlur={handleMontoBlur}
            onKeyDown={(e) => handleKeyDown(e, handleMontoBlur)}
            className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm text-right rounded px-1 py-0.5 focus:outline-none focus:border-[#B3985B]"
            placeholder="0"
          />
        ) : (
          <>
            <button 
              onClick={() => { if (pp.estadoPago !== "PAGADO") setEditingNotas(true); }}
              className={\`p-1 rounded-md transition-colors \${merged.notas ? 'text-[#B3985B] bg-[#B3985B]/10 hover:bg-[#B3985B]/20' : 'text-gray-600 hover:text-gray-400'}\`}
              title={merged.notas || "Añadir nota o extra"}
            >
              <MessageSquare className="w-3 h-3" />
            </button>
            <p 
              className={\`text-sm font-medium cursor-pointer text-right min-w-[50px] \${merged.tarifaAcordada != null ? "text-white" : "text-gray-600"}\`}
              onClick={() => { if (pp.estadoPago !== "PAGADO") setEditingMonto(true); }}
            >
              {merged.tarifaAcordada != null ? fmt(merged.tarifaAcordada) : "—"}
            </p>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <span className={\`text-[10px] px-1.5 py-0.5 rounded-full font-medium \${
          pp.estadoPago === "PAGADO"
            ? "bg-green-900/40 text-green-400"
            : merged.tarifaAcordada != null
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

// Replace old function
const regex = /function EditablePersonalRow\(\{[^]*?return \([\s\S]*?;\n\}/m;
code = code.replace(regex, newEditableRow);

// Now update PagosPersonalPage state and render
code = code.replace(
  'const [ciclo, setCiclo] = useState(cicloActual);',
  'const [ciclo, setCiclo] = useState(cicloActual);\n  const [pendingEdits, setPendingEdits] = useState<Record<string, Partial<PersonalSlot>>>({});\n  const [savingBatch, setSavingBatch] = useState(false);\n'
);

// handleEdit callback
const handleEditFunc = `
  const handleEdit = useCallback((id: string, changes: Partial<PersonalSlot>) => {
    setPendingEdits(prev => {
      const existing = prev[id] || {};
      const updated = { ...existing, ...changes };
      
      // Cleanup keys that map exactly to original data (no real change)
      // We can do a deep check if needed, but for now we just merge
      return { ...prev, [id]: updated };
    });
  }, []);
  
  async function saveBatchChanges() {
    if (Object.keys(pendingEdits).length === 0) return;
    setSavingBatch(true);
    try {
      const promises = Object.entries(pendingEdits).map(async ([personalId, changes]) => {
        let proyectoId = "";
        data?.proyectos.forEach(p => {
          if (p.personal.some(pp => pp.id === personalId)) proyectoId = p.id;
        });
        if (!proyectoId) return;

        await fetch(\`/api/proyectos/\${proyectoId}/personal/\${personalId}\`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        });
      });
      await Promise.all(promises);
      setPendingEdits({});
      await load();
    } finally {
      setSavingBatch(false);
    }
  }
`;

code = code.replace(
  'const [pagoReferencia, setPagoReferencia] = useState("");',
  'const [pagoReferencia, setPagoReferencia] = useState("");\n' + handleEditFunc
);

// Add Save Button near Header or Summary Band
const saveBtnHtml = `
      {/* Floating Save Batch Button */}
      {Object.keys(pendingEdits).length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0d0d0d] border border-[#333] shadow-2xl rounded-xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div>
            <p className="text-white text-sm font-semibold">{Object.keys(pendingEdits).length} fila(s) con cambios</p>
            <p className="text-gray-400 text-xs">Sin guardar</p>
          </div>
          <button 
            onClick={saveBatchChanges}
            disabled={savingBatch}
            className="px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {savingBatch ? "Guardando..." : "Guardar todo"}
          </button>
        </div>
      )}
`;

code = code.replace(
  '{/* ── Summary band ── */}',
  saveBtnHtml + '\n      {/* ── Summary band ── */}'
);

// Update render map for EditablePersonalRow
const oldRenderCall = /<EditablePersonalRow[^]*?\/>/m;
const newRenderCall = `<EditablePersonalRow
                                key={pp.id}
                                pp={pp}
                                roles={data.roles}
                                tecnicos={data.tecnicos}
                                pendingEdits={pendingEdits[pp.id] || {}}
                                onEdit={handleEdit}
                              />`;
code = code.replace(oldRenderCall, newRenderCall);

// Fix grid-cols in header of table
code = code.replace(
  'grid grid-cols-[1fr_1fr_90px_80px_72px]',
  'grid grid-cols-[1fr_1fr_90px_100px_72px]'
);

// Make sure MessageSquare is imported
if (!code.includes('MessageSquare')) {
  code = code.replace('FileText', 'FileText, MessageSquare');
}

fs.writeFileSync(file, code);
