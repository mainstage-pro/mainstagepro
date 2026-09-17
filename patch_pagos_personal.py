import re

with open("src/app/(dashboard)/finanzas/pagos-personal/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update EditablePersonalRow interface
content = content.replace(
    "onEdit: (id: string, changes: Partial<PersonalSlot>) => void;",
    "onEdit: (id: string, changes: Partial<PersonalSlot>, originalRow?: PersonalSlot) => void;"
)

# 2. Simplify change handlers in EditablePersonalRow
old_handlers = """  const handleRolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
  };"""

new_handlers = """  const handleRolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditingRol(false);
    onEdit(pp.id, { rolTecnicoId: e.target.value || null }, pp);
  };

  const handleTecnicoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditingTecnico(false);
    onEdit(pp.id, { tecnicoId: e.target.value || null }, pp);
  };

  const handleMontoBlur = () => {
    setEditingMonto(false);
    const parsed = parseFloat(montoVal);
    const current = pp.tarifaAcordada;
    
    if (montoVal === "") {
      onEdit(pp.id, { tarifaAcordada: null }, pp);
    } else if (!isNaN(parsed) && parsed >= 0) {
      onEdit(pp.id, { tarifaAcordada: parsed }, pp);
    } else {
      onEdit(pp.id, { tarifaAcordada: current }, pp);
      setMontoVal(current?.toString() || "");
    }
  };

  const handleNotasBlur = () => {
    setEditingNotas(false);
    onEdit(pp.id, { notas: notasVal }, pp);
  };"""

if old_handlers in content:
    content = content.replace(old_handlers, new_handlers)
else:
    print("Could not find old_handlers")

# 3. Enhance Notas UI in EditablePersonalRow
old_notas_ui = """      {/* Monto & Notas Editable */}
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
        ) : editingMonto ? ("""

new_notas_ui = """      {/* Monto & Notas Editable */}
      <div className="relative flex items-center justify-end gap-1.5 -mx-1 px-1 py-0.5 rounded hover:bg-[#222]">
        {editingNotas ? (
          <div className="absolute right-0 top-full mt-1 z-50 w-[250px] bg-[#111] border border-[#333] rounded-lg shadow-2xl p-2">
            <div className="text-[10px] text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Nota interna (Pago)</div>
            <textarea
              autoFocus
              value={notasVal}
              onChange={e => setNotasVal(e.target.value)}
              onBlur={handleNotasBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleNotasBlur();
                }
              }}
              className="w-full bg-[#1a1a1a] border border-[#222] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B] resize-none h-[60px]"
              placeholder="Escribe comentarios de uso interno..."
            />
          </div>
        ) : editingMonto ? ("""

if old_notas_ui in content:
    content = content.replace(old_notas_ui, new_notas_ui)
else:
    print("Could not find old_notas_ui")


# 4. Update handleEdit in the main component
old_handle_edit = """  const handleEdit = useCallback((id: string, changes: Partial<PersonalSlot>) => {
    setPendingEdits(prev => {
      const existing = prev[id] || {};
      const updated = { ...existing, ...changes };
      
      // Cleanup keys that map exactly to original data (no real change)
      // We can do a deep check if needed, but for now we just merge
      return { ...prev, [id]: updated };
    });
  }, []);"""

new_handle_edit = """  const handleEdit = useCallback((id: string, changes: Partial<PersonalSlot>, originalRow?: PersonalSlot) => {
    setPendingEdits(prev => {
      const existing = prev[id] || {};
      const updated = { ...existing, ...changes };
      
      if (originalRow) {
        const cleaned = { ...updated };
        let hasChanges = false;
        for (const key of Object.keys(cleaned)) {
          // Normalize null vs empty string for notas
          let updatedVal = cleaned[key as keyof PersonalSlot];
          let origVal = originalRow[key as keyof PersonalSlot];
          
          if (key === 'notas') {
            if (updatedVal === "") updatedVal = null;
            if (origVal === "") origVal = null;
          }
          
          if (updatedVal === origVal) {
            delete cleaned[key as keyof PersonalSlot];
          } else {
            hasChanges = true;
          }
        }
        
        if (!hasChanges) {
          const next = { ...prev };
          delete next[id];
          return next;
        }
        return { ...prev, [id]: cleaned };
      }
      
      return { ...prev, [id]: updated };
    });
  }, []);"""

if old_handle_edit in content:
    content = content.replace(old_handle_edit, new_handle_edit)
else:
    print("Could not find old_handle_edit")

with open("src/app/(dashboard)/finanzas/pagos-personal/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
