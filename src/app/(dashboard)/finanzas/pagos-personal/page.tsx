"use client";

import { useEffect, useState, useCallback } from "react";
import { BotonDescarga } from "@/components/BotonDescarga";
import Link from "next/link";
import { Combobox } from "@/components/Combobox";
import { FileText } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonalSlot {
  id: string;
  tecnicoId: string | null;
  tecnicoNombre: string | null;
  rolTecnicoId: string | null;
  rolNombre: string | null;
  participacion: string | null;
  fechaJornada: string | null;
  nivel: string | null;
  jornada: string | null;
  tarifaAcordada: number | null;
  notas?: string | null;
  estadoPago: string;
}

interface ProyectoCiclo {
  id: string;
  nombre: string;
  cliente: string;
  fechaEvento: string;
  presupuestoOp: number;
  personal: PersonalSlot[];
}

interface NominaPago {
  proyectoId: string;
  proyectoNombre: string;
  monto: number;
  estadoPago: string;
}

interface NominaRow {
  tecnicoId: string;
  tecnicoNombre: string;
  pagos: NominaPago[];
  total: number;
  todosPagados: boolean;
}

interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string | null;
}

interface CicloData {
  ciclo: string;
  desde: string;
  hasta: string;
  proyectos: ProyectoCiclo[];
  nomina: NominaRow[];
  cuentas: CuentaBancaria[];
  roles: { id: string; nombre: string }[];
  tecnicos: { id: string; nombre: string }[];
}

interface PagoEntrada {
  monto: string;
  metodoPago: string;
  cuentaOrigenId: string;
  referencia: string;
}

const DEFAULT_ENTRADA: PagoEntrada = {
  monto: "",
  metodoPago: "TRANSFERENCIA",
  cuentaOrigenId: "",
  referencia: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opts,
  });
}

function cicloActual(): string {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d.toISOString().slice(0, 10);
}

function prevCiclo(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function nextCiclo(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

const TIPO_LABELS: Record<string, string> = {
  MONTAJE: "Montaje",
  OPERACION: "Operación",
  DESMONTAJE: "Desmontaje",
  TRANSPORTE: "Transporte",
  OTRO: "Otro",
};

const TIPO_COLORS: Record<string, string> = {
  MONTAJE: "text-blue-400",
  OPERACION: "text-[#B3985B]",
  DESMONTAJE: "text-purple-400",
  TRANSPORTE: "text-cyan-400",
  OTRO: "text-gray-400",
};

const METODOS = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TARJETA", label: "Tarjeta" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────



import { MessageSquare } from "lucide-react";

function EditablePersonalRow({ pp, roles, tecnicos, pendingEdits, onEdit }: { 
  pp: PersonalSlot; 
  roles: { id: string; nombre: string }[]; 
  tecnicos: { id: string; nombre: string }[];
  pendingEdits: Partial<PersonalSlot>; 
  onEdit: (id: string, changes: Partial<PersonalSlot>, originalRow?: PersonalSlot) => void;
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
    <div className={`grid grid-cols-[1fr_1fr_90px_100px_72px] gap-2 px-4 py-2 border-b border-[#0d0d0d] last:border-0 items-center transition-colors ${hasPending ? 'bg-[#B3985B]/5' : 'hover:bg-[#111]'}`}>
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
          <p className={`text-sm truncate ${merged.tecnicoId ? "text-white" : "text-yellow-500 italic"}`}>
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
              className={`p-1 rounded-md transition-colors ${merged.notas ? 'text-[#B3985B] bg-[#B3985B]/10 hover:bg-[#B3985B]/20' : 'text-gray-600 hover:text-gray-400'}`}
              title={merged.notas || "Añadir nota o extra"}
            >
              <MessageSquare className="w-3 h-3" />
            </button>
            <p 
              className={`text-sm font-medium cursor-pointer text-right min-w-[50px] ${merged.tarifaAcordada != null ? "text-white" : "text-gray-600"}`}
              onClick={() => { if (pp.estadoPago !== "PAGADO") setEditingMonto(true); }}
            >
              {merged.tarifaAcordada != null ? fmt(merged.tarifaAcordada) : "—"}
            </p>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          pp.estadoPago === "PAGADO"
            ? "bg-green-900/40 text-green-400"
            : merged.tarifaAcordada != null
              ? "bg-yellow-900/30 text-yellow-400"
              : "text-gray-700"
        }`}>
          {pp.tecnicoId ? (pp.estadoPago === "PAGADO" ? "Pagado" : "Pend.") : "—"}
        </span>
      </div>
    </div>
  );
}


export default function PagosPersonalPage() {
  const [ciclo, setCiclo] = useState(cicloActual);
  const [pendingEdits, setPendingEdits] = useState<Record<string, Partial<PersonalSlot>>>({});
  const [savingBatch, setSavingBatch] = useState(false);

  const [data, setData] = useState<CicloData | null>(null);
  const [loading, setLoading] = useState(true);

  // Shared modal state
  const [pagoTarget, setPagoTarget] = useState<NominaRow[] | null>(null);
  const [selectedEventos, setSelectedEventos] = useState<Set<string>>(new Set());
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().split("T")[0]);
  const [pagoNotas, setPagoNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [generandoCxP, setGenerandoCxP] = useState<string | null>(null); // tecnicoId en proceso
  const [cxpCreadas, setCxpCreadas] = useState<Record<string, number>>({}); // tecnicoId → cantidad creada

  // Multi-entry state (single technician)
  const [pagoEntradas, setPagoEntradas] = useState<PagoEntrada[]>([{ ...DEFAULT_ENTRADA }]);

  // Single-entry state (bulk / pay-all)
  const [pagoMetodo, setPagoMetodo] = useState("TRANSFERENCIA");
  const [pagoCuenta, setPagoCuenta] = useState("");
  const [pagoReferencia, setPagoReferencia] = useState("");

  const handleEdit = useCallback((id: string, changes: Partial<PersonalSlot>, originalRow?: PersonalSlot) => {
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

        await fetch(`/api/proyectos/${proyectoId}/personal/${personalId}`, {
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


  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/pagos-personal?ciclo=${ciclo}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [ciclo]);

  useEffect(() => { load(); }, [load]);

  function abrirModalPago(rows: NominaRow[]) {
    const pendingRows = rows.map(r => {
      const pendingPagos = r.pagos.filter(p => p.estadoPago === "PENDIENTE");
      return { ...r, pagos: pendingPagos, total: pendingPagos.reduce((s, p) => s + p.monto, 0) };
    }).filter(r => r.pagos.length > 0);

    const initialSelected = new Set<string>();
    pendingRows.forEach(r => r.pagos.forEach(p => initialSelected.add(`${r.tecnicoId}-${p.proyectoId}`)));
    
    setPagoTarget(pendingRows);
    setSelectedEventos(initialSelected);
    setPagoFecha(new Date().toISOString().split("T")[0]);
    setPagoNotas("");
    
    if (pendingRows.length === 1) {
      setPagoEntradas([{ ...DEFAULT_ENTRADA, monto: String(pendingRows[0].total) }]);
    } else {
      setPagoMetodo("TRANSFERENCIA");
      setPagoCuenta("");
      setPagoReferencia("");
    }
  }

  function cerrarModal() {
    if (!guardando) setPagoTarget(null);
  }

  async function confirmarPago() {
    if (!pagoTarget) return;
    setGuardando(true);
    try {
      const isSingle = pagoTarget.length === 1;

      if (isSingle) {
        const row = pagoTarget[0];
        const selectedIds = row.pagos.filter(p => selectedEventos.has(`${row.tecnicoId}-${p.proyectoId}`)).map(p => p.proyectoId);
        if (selectedIds.length === 0) return;
        const checkedTotal = row.pagos.reduce((s, p) => selectedEventos.has(`${row.tecnicoId}-${p.proyectoId}`) ? s + p.monto : s, 0);

        const validEntradas = pagoEntradas
          .map((e) => ({
            ...e,
            monto: parseFloat(e.monto) || 0,
            cuentaOrigenId: e.cuentaOrigenId || null,
            referencia: e.referencia || null,
          }))
          .filter((e) => e.monto > 0);

        await fetch("/api/pagos-personal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tecnicoId: row.tecnicoId,
            proyectoIds: selectedIds,
            fecha: pagoFecha,
            notas: pagoNotas || null,
            totalOwed: checkedTotal,
            entradas: validEntradas,
          }),
        });
      } else {
        for (const row of pagoTarget) {
          const selectedIds = row.pagos.filter(p => selectedEventos.has(`${row.tecnicoId}-${p.proyectoId}`)).map(p => p.proyectoId);
          if (selectedIds.length === 0) continue;
          const checkedTotal = row.pagos.reduce((s, p) => selectedEventos.has(`${row.tecnicoId}-${p.proyectoId}`) ? s + p.monto : s, 0);

          await fetch("/api/pagos-personal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tecnicoId: row.tecnicoId,
              proyectoIds: selectedIds,
              fecha: pagoFecha,
              notas: pagoNotas || null,
              totalOwed: checkedTotal,
              entradas: [{
                monto: checkedTotal,
                metodoPago: pagoMetodo,
                cuentaOrigenId: pagoCuenta || null,
                referencia: pagoReferencia || null,
              }],
            }),
          });
        }
      }
      setPagoTarget(null);
      await load();
    } finally {
      setGuardando(false);
    }
  }

  async function generarCxP(row: NominaRow) {
    if (!confirm(`¿Generar nota por pagar para ${row.tecnicoNombre}?\nSe creará una CxP en Finanzas por cada proyecto pendiente.`)) return;
    setGenerandoCxP(row.tecnicoId);
    let creadas = 0;
    try {
      const pendientes = row.pagos.filter(p => p.estadoPago !== "PAGADO");
      for (const pago of pendientes) {
        const res = await fetch("/api/cuentas-pagar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipoAcreedor: "TECNICO",
            tecnicoId: row.tecnicoId,
            proyectoId: pago.proyectoId,
            concepto: `Honorarios — ${row.tecnicoNombre} · ${pago.proyectoNombre}`,
            monto: pago.monto,
            fechaCompromiso: ciclo, // miércoles del ciclo
          }),
        });
        if (res.ok) creadas++;
      }
      setCxpCreadas(prev => ({ ...prev, [row.tecnicoId]: creadas }));
    } finally {
      setGenerandoCxP(null);
    }
  }

  // Totals
  const totalPresupuestado = data?.proyectos.reduce((s, p) => s + p.presupuestoOp, 0) ?? 0;
  const totalAsignado = data?.proyectos.reduce(
    (s, p) => s + p.personal.reduce((ss, pp) => ss + (pp.tarifaAcordada ?? 0), 0), 0
  ) ?? 0;
  const totalPendiente = data?.nomina.filter((r) => !r.todosPagados).reduce((s, r) => s + r.total, 0) ?? 0;
  const totalPagado = data?.nomina.filter((r) => r.todosPagados).reduce((s, r) => s + r.total, 0) ?? 0;
  const proyectosEnCiclo = data?.proyectos ?? [];

  const cuentaOpts = [
    { value: "", label: "— Sin cuenta —" },
    ...(data?.cuentas ?? []).map(c => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") })),
  ];

  // Computed values for single-tech modal
  const totalEntradas = pagoEntradas.reduce((s, e) => s + (parseFloat(e.monto) || 0), 0);
  const singleRow = pagoTarget?.length === 1 ? pagoTarget[0] : null;
  const singleCheckedTotal = singleRow ? singleRow.pagos.reduce((s, p) => selectedEventos.has(`${singleRow.tecnicoId}-${p.proyectoId}`) ? s + p.monto : s, 0) : 0;
  const restante = singleRow ? singleCheckedTotal - totalEntradas : 0;
  const isFull = singleRow ? Math.abs(restante) <= 0.01 : false;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ms-h1">Pagos a Personal</h1>
          <p className="ms-subtitle mt-0.5">Ciclo semanal · miércoles de pago</p>
        </div>
        <div className="flex items-center gap-3">
          <BotonDescarga
            url={`/api/pagos-personal/pdf?ciclo=${ciclo}`}
            filename={`Pagos-personal-${ciclo}.pdf`}
            titulo={`Pagos a personal ${ciclo}`}
            className="flex items-center gap-2 ms-card px-4 py-2 hover:bg-[#222] transition-colors text-sm font-medium text-[#B3985B] border border-[#B3985B]/30"
          >
            <FileText className="w-4 h-4" /> PDF
          </BotonDescarga>
          <div className="flex items-center gap-2 ms-card px-3 py-2">
            <button onClick={() => setCiclo(prevCiclo(ciclo))} className="text-gray-400 hover:text-white px-1 transition-colors">‹</button>
            <div className="text-center">
              <p className="text-xs text-gray-500">Ciclo de pago</p>
              <input
                type="date"
                value={ciclo}
                onChange={e => setCiclo(e.target.value)}
                className="bg-transparent text-white text-sm font-semibold focus:outline-none text-center"
              />
            </div>
            <button onClick={() => setCiclo(nextCiclo(ciclo))} className="text-gray-400 hover:text-white px-1 transition-colors">›</button>
          </div>
        </div>
      </div>

      
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

      {/* ── Summary band ── */}
      {data && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="ms-stat-card">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Proyectos</p>
            <p className="ms-h1">{data.proyectos.length}</p>
            <p className="text-xs text-gray-600 mt-0.5">{fmtDate(data.desde, { weekday: undefined })} – {fmtDate(data.hasta, { weekday: undefined })}</p>
          </div>
          <div className="ms-stat-card">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Presupuesto operación</p>
            <p className="ms-h1">{fmt(totalPresupuestado)}</p>
            <p className="text-xs text-gray-600 mt-0.5">cotizado</p>
          </div>
          <div className="ms-stat-card">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total asignado</p>
            <p className={`text-2xl font-bold ${totalAsignado > totalPresupuestado ? "text-red-400" : "text-[#B3985B]"}`}>{fmt(totalAsignado)}</p>
            <p className={`text-xs mt-0.5 ${totalAsignado > totalPresupuestado ? "text-red-500" : "text-gray-600"}`}>
              {totalPresupuestado > 0 ? `${Math.round((totalAsignado / totalPresupuestado) * 100)}% del presupuesto` : "sin presupuesto"}
            </p>
          </div>
          <div className="ms-stat-card">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Por pagar</p>
            <p className="text-2xl font-bold text-yellow-400">{fmt(totalPendiente)}</p>
            {totalPagado > 0 && <p className="text-xs text-green-500 mt-0.5">{fmt(totalPagado)} ya pagado</p>}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-500">Cargando ciclo...</div>
      )}

      {!loading && data && data.proyectos.length === 0 && (
        <div className="ms-card p-10 text-center">
          <p className="text-gray-400 text-sm">No hay proyectos en este ciclo</p>
          <p className="text-gray-600 text-xs mt-1">{fmtDate(data.desde)} al {fmtDate(data.hasta)}</p>
        </div>
      )}

      {!loading && data && data.proyectos.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">

          {/* ── Left: Per-project breakdown ── */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Desglose por proyecto</h2>

            {proyectosEnCiclo.map((p) => {
              const totalPersonal = p.personal.reduce((s, pp) => s + (pp.tarifaAcordada ?? 0), 0);
              const sinAsignar = p.personal.filter((pp) => !pp.tecnicoId).length;
              const sinTarifa = p.personal.filter((pp) => pp.tecnicoId && pp.tarifaAcordada == null).length;
              const diff = totalPersonal - p.presupuestoOp;

              const grupos = new Map<string, PersonalSlot[]>();
              for (const pp of p.personal) {
                const key = `${pp.participacion ?? "OTRO"}|${pp.fechaJornada ?? ""}`;
                if (!grupos.has(key)) grupos.set(key, []);
                grupos.get(key)!.push(pp);
              }

              return (
                <div key={p.id} className="ms-table-wrapper">
                  <div className="px-5 py-3 bg-[#1a1a1a] flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <Link href={`/proyectos/${p.id}`} className="text-white font-semibold hover:text-[#B3985B] transition-colors text-sm">
                        {p.nombre}
                      </Link>
                      <p className="text-gray-500 text-xs">{p.cliente} · {fmtDate(p.fechaEvento, { weekday: "long", day: "numeric", month: "long" })}</p>
                    </div>
                    <div className="text-right">
                      {p.presupuestoOp > 0 && (
                        <p className="text-xs text-gray-500">Presupuesto: <span className="text-gray-300">{fmt(p.presupuestoOp)}</span></p>
                      )}
                      {sinAsignar > 0 && <p className="text-xs text-yellow-500">{sinAsignar} sin asignar</p>}
                      {sinTarifa > 0 && <p className="text-xs text-orange-400">{sinTarifa} sin tarifa</p>}
                    </div>
                  </div>

                  {p.personal.length === 0 ? (
                    <p className="text-gray-600 text-xs text-center py-4">Sin personal registrado</p>
                  ) : (
                    <div>
                      <div className="grid grid-cols-[1fr_1fr_90px_100px_72px] gap-2 px-4 py-1.5 border-b border-[#0d0d0d]">
                        {["Técnico", "Rol", "Tipo · Fecha", "Tarifa", "Estado"].map((h) => (
                          <p key={h} className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">{h}</p>
                        ))}
                      </div>

                      {Array.from(grupos.entries()).map(([key, slots]) => {
                        const [tipo, fecha] = key.split("|");
                        return (
                          <div key={key}>
                            <div className="px-4 py-1 bg-[#0d0d0d] flex items-center gap-2">
                              <span className={`text-[10px] font-semibold uppercase tracking-wider ${TIPO_COLORS[tipo] ?? "text-gray-400"}`}>
                                {TIPO_LABELS[tipo] ?? tipo}
                              </span>
                              {fecha && <span className="text-[10px] text-gray-600">{fmtDate(fecha)}</span>}
                              <span className="text-[10px] text-gray-700 ml-auto">{slots.length} técnico{slots.length !== 1 ? "s" : ""}</span>
                            </div>

                            {slots.map((pp) => (
                              <EditablePersonalRow
                                key={pp.id}
                                pp={pp}
                                roles={data.roles}
                                tecnicos={data.tecnicos}
                                pendingEdits={pendingEdits[pp.id] || {}}
                                onEdit={handleEdit}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="px-5 py-3 bg-[#0d0d0d] flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-4 text-xs">
                      <span className="text-gray-500">Total personal: <span className="text-white font-semibold">{fmt(totalPersonal)}</span></span>
                      {p.presupuestoOp > 0 && (
                        <span className={`${Math.abs(diff) < 1 ? "text-gray-500" : diff > 0 ? "text-red-400" : "text-green-400"}`}>
                          {diff > 0 ? `+${fmt(diff)} sobre presupuesto` : diff < 0 ? `${fmt(diff)} bajo presupuesto` : "= presupuesto"}
                        </span>
                      )}
                    </div>
                    <Link href={`/proyectos/${p.id}`} className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors">
                      Editar en proyecto →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right: Nómina semanal ── */}
          <div className="ms-table-wrapper sticky top-6">
            <div className="px-5 py-3 bg-[#1a1a1a] border-b border-[#222]">
              <p className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Nómina de la semana</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {data.nomina.length} técnico{data.nomina.length !== 1 ? "s" : ""}
                {" · "}miércoles {fmtDate(ciclo, { weekday: undefined, day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {data.nomina.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">Sin técnicos asignados en este ciclo</p>
            ) : (
              <div>
                {data.nomina.map((row) => (
                  <div key={row.tecnicoId} className={`border-b border-[#0d0d0d] last:border-0 ${row.todosPagados ? "opacity-60" : ""}`}>
                    <div className="px-5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white text-sm font-medium">{row.tecnicoNombre}</p>
                        <div className="flex items-center gap-3">
                          <BotonDescarga
                            url={`/api/pagos-personal/recibo?ciclo=${ciclo}&tecnico=${row.tecnicoId}`}
                            filename={`Recibo-${row.tecnicoNombre.replace(/\s+/g, "-")}-${ciclo}.pdf`}
                            titulo={`Recibo ${row.tecnicoNombre}`}
                            className="text-[#B3985B] hover:text-white transition-colors flex items-center justify-center p-1 rounded-md hover:bg-[#B3985B]/20"
                          >
                            <FileText className="w-4 h-4" />
                          </BotonDescarga>
                          <p className={`text-base font-bold ${row.todosPagados ? "text-green-400" : "text-[#B3985B]"}`}>
                            {fmt(row.total)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-0.5 mb-3">
                        {row.pagos.map((pago) => (
                          <div key={pago.proyectoId} className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{pago.proyectoNombre}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-300">{fmt(pago.monto)}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                pago.estadoPago === "PAGADO"
                                  ? "bg-green-900/30 text-green-400"
                                  : "bg-yellow-900/20 text-yellow-500"
                              }`}>
                                {pago.estadoPago === "PAGADO" ? "✓" : "Pend."}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {!row.todosPagados ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => abrirModalPago([row])}
                            className="w-full py-1.5 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold transition-colors"
                          >
                            Registrar pago · {fmt(row.total)}
                          </button>
                          {cxpCreadas[row.tecnicoId] != null ? (
                            <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-green-400">
                              <span>✓</span>
                              <span>{cxpCreadas[row.tecnicoId]} CxP generada{cxpCreadas[row.tecnicoId] !== 1 ? "s" : ""} en Finanzas</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => generarCxP(row)}
                              disabled={generandoCxP === row.tecnicoId}
                              className="w-full py-1.5 rounded-lg border border-[#333] hover:border-[#B3985B]/40 text-gray-500 hover:text-[#B3985B] text-xs transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                            >
                              {generandoCxP === row.tecnicoId ? "Generando..." : <><FileText strokeWidth={1.75} className="w-3.5 h-3.5" /> Generar nota por pagar (CxP)</>}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-green-500">
                          <span>✓</span>
                          <span>Pagado</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="px-5 py-3 bg-[#0d0d0d] border-t border-[#222]">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Pendiente de pago</span>
                    <span className="text-yellow-400 font-semibold">{fmt(totalPendiente)}</span>
                  </div>
                  {totalPagado > 0 && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Ya pagado</span>
                      <span className="text-green-500">{fmt(totalPagado)}</span>
                    </div>
                  )}
                  {totalPendiente > 0 && (
                    <button
                      onClick={() => abrirModalPago(data.nomina.filter((r) => !r.todosPagados))}
                      className="w-full mt-3 py-2 rounded-lg border border-[#B3985B]/40 hover:bg-[#B3985B]/10 text-[#B3985B] text-xs font-medium transition-colors"
                    >
                      Registrar pago a todos · {fmt(totalPendiente)}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Modal de pago ── */}
      {pagoTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div className={`bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full ${singleRow ? "max-w-lg" : "max-w-md"} p-6 max-h-[90vh] overflow-y-auto`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold">Registrar pago de nómina</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {pagoTarget.length === 1
                    ? pagoTarget[0].tecnicoNombre
                    : `${pagoTarget.length} técnicos`}
                </p>
              </div>
              <button onClick={cerrarModal} disabled={guardando}
                className="text-gray-600 hover:text-white text-lg leading-none disabled:opacity-40">✕</button>
            </div>

            {/* Resumen de a quién se paga */}
            <div className="bg-[#0d0d0d] rounded-xl p-3 mb-4 space-y-1.5 max-h-36 overflow-y-auto">
              {pagoTarget.map(row => {
                const checkedTotal = row.pagos.reduce((s, p) => selectedEventos.has(`${row.tecnicoId}-${p.proyectoId}`) ? s + p.monto : s, 0);
                return (
                <div key={row.tecnicoId}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{row.tecnicoNombre}</span>
                    <span className="text-sm text-[#B3985B] font-semibold">{fmt(checkedTotal)}</span>
                  </div>
                  {row.pagos.map(p => {
                    const key = `${row.tecnicoId}-${p.proyectoId}`;
                    const isChecked = selectedEventos.has(key);
                    return (
                    <div key={p.proyectoId} className="flex items-center justify-between pl-3 mt-1.5">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={isChecked} onChange={() => {
                          const next = new Set(selectedEventos);
                          if (isChecked) next.delete(key);
                          else next.add(key);
                          setSelectedEventos(next);
                          // Si es 1 solo row, actualizar el pagoEntradas a sugerir el nuevo total si no han escrito mucho o hay una sola entrada
                          if (pagoTarget.length === 1 && pagoEntradas.length === 1) {
                            const newTotal = row.pagos.reduce((s, p2) => next.has(`${row.tecnicoId}-${p2.proyectoId}`) ? s + p2.monto : s, 0);
                            setPagoEntradas([{ ...pagoEntradas[0], monto: String(newTotal) }]);
                          }
                        }} className="accent-[#B3985B] cursor-pointer w-3.5 h-3.5" />
                        <span className={`text-xs truncate max-w-[180px] transition-colors ${isChecked ? "text-gray-400 group-hover:text-gray-300" : "text-gray-600 line-through"}`}>{p.proyectoNombre}</span>
                      </label>
                      <span className={`text-xs transition-colors ${isChecked ? "text-gray-500" : "text-gray-700 line-through"}`}>{fmt(p.monto)}</span>
                    </div>
                  )})}
                </div>
              )})}
            </div>

            {/* Fecha (shared) */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">Fecha de pago *</label>
              <input
                type="date"
                value={pagoFecha}
                onChange={e => setPagoFecha(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>

            {singleRow ? (
              /* ── Multi-entry UI (single technician) ── */
              <>
                <div className="space-y-2 mb-3">
                  {pagoEntradas.map((entrada, i) => (
                    <div key={i} className="bg-[#0d0d0d] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pago {i + 1}</p>
                        {pagoEntradas.length > 1 && (
                          <button
                            onClick={() => setPagoEntradas(prev => prev.filter((_, j) => j !== i))}
                            className="text-gray-600 hover:text-red-400 text-sm transition-colors"
                          >✕</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Monto *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entrada.monto}
                            onChange={e => setPagoEntradas(prev => prev.map((x, j) => j === i ? { ...x, monto: e.target.value } : x))}
                            placeholder="0.00"
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Método</label>
                          <Combobox
                            value={entrada.metodoPago}
                            onChange={v => setPagoEntradas(prev => prev.map((x, j) => j === i ? { ...x, metodoPago: v } : x))}
                            options={METODOS}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Cuenta</label>
                          <Combobox
                            value={entrada.cuentaOrigenId}
                            onChange={v => setPagoEntradas(prev => prev.map((x, j) => j === i ? { ...x, cuentaOrigenId: v } : x))}
                            options={cuentaOpts}
                            placeholder="Sin cuenta"
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Referencia</label>
                          <input
                            value={entrada.referencia}
                            onChange={e => setPagoEntradas(prev => prev.map((x, j) => j === i ? { ...x, referencia: e.target.value } : x))}
                            placeholder="Folio, ref..."
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => setPagoEntradas(prev => [...prev, { ...DEFAULT_ENTRADA }])}
                    className="w-full py-2 border border-dashed border-[#333] hover:border-[#B3985B]/50 rounded-xl text-gray-500 hover:text-[#B3985B] text-xs transition-colors"
                  >
                    + Agregar otro pago
                  </button>
                </div>

                {/* Running total */}
                <div className="bg-[#0d0d0d] rounded-xl p-3 mb-4 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total adeudo</span>
                    <span className="text-white font-semibold">{fmt(singleCheckedTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Registrando</span>
                    <span className={`font-semibold ${totalEntradas > singleCheckedTotal ? "text-red-400" : "text-[#B3985B]"}`}>
                      {fmt(totalEntradas)}
                    </span>
                  </div>
                  {isFull && totalEntradas > 0 && (
                    <div className="flex justify-center pt-0.5">
                      <span className="text-xs text-green-400">✓ Pago completo — se marcará como pagado</span>
                    </div>
                  )}
                  {!isFull && restante > 0.01 && totalEntradas > 0 && (
                    <div className="flex justify-between text-xs pt-0.5">
                      <span className="text-yellow-500">Quedará pendiente</span>
                      <span className="text-yellow-400">{fmt(restante)}</span>
                    </div>
                  )}
                  {totalEntradas > singleCheckedTotal + 0.01 && (
                    <div className="flex justify-between text-xs pt-0.5">
                      <span className="text-red-400">Excede el adeudo</span>
                      <span className="text-red-400">{fmt(Math.abs(restante))}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── Single-entry UI (bulk pay-all) ── */
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Método de pago</label>
                    <Combobox value={pagoMetodo} onChange={setPagoMetodo} options={METODOS}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Cuenta bancaria</label>
                    <Combobox value={pagoCuenta} onChange={setPagoCuenta} options={cuentaOpts}
                      placeholder="Sin cuenta"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Referencia / Folio</label>
                  <input value={pagoReferencia} onChange={e => setPagoReferencia(e.target.value)}
                    placeholder="Núm. de referencia, folio..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
            )}

            {/* Notas (shared) */}
            <div className="mb-5">
              <label className="text-xs text-gray-500 block mb-1">Notas</label>
              <input
                value={pagoNotas}
                onChange={e => setPagoNotas(e.target.value)}
                placeholder="Opcional"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={cerrarModal}
                disabled={guardando}
                className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPago}
                disabled={guardando || !pagoFecha || (singleRow ? totalEntradas <= 0 : false)}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] disabled:opacity-40 transition-colors"
              >
                {guardando
                  ? "Registrando..."
                  : singleRow
                    ? isFull
                      ? `Confirmar pago · ${fmt(totalEntradas)}`
                      : `Registrar pago parcial · ${fmt(totalEntradas)}`
                    : `Confirmar pago · ${fmt(pagoTarget.reduce((s, r) => s + r.pagos.reduce((s2, p) => selectedEventos.has(`${r.tecnicoId}-${p.proyectoId}`) ? s2 + p.monto : s2, 0), 0))}`}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
