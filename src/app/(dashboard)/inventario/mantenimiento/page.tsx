"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SkeletonPage } from "@/components/Skeleton";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

type Equipo = {
  id: string; descripcion: string; marca: string | null; modelo: string | null;
  estado: string; cantidadTotal: number; tipo: string;
  categoria: { id: string; nombre: string; orden: number }; activo: boolean;
};

type Unidad = {
  id: string; equipoId: string; codigo: string | null; estado: string;
  notas: string | null; activo: boolean; createdAt: string;
  _count: { mantenimientos: number };
  mantenimientos: { fecha: string; proximoMantenimiento: string | null; tipo: string }[];
};

type Registro = {
  id: string; fecha: string; tipo: string; accionRealizada: string;
  estadoEquipo: string | null; comentarios: string | null;
  proximoMantenimiento: string | null; fotoEvidencia: string | null;
  unidad: { id: string; codigo: string | null } | null;
  equipo: { id: string; descripcion: string; marca: string | null; modelo: string | null; estado: string; categoria: { nombre: string } };
};

const TIPOS = ["PREVENTIVO", "CORRECTIVO", "ESTETICO", "FUNCIONAL"];
const TIPOS_LABEL: Record<string, string> = {
  PREVENTIVO: "Preventivo", CORRECTIVO: "Correctivo", ESTETICO: "Estético", FUNCIONAL: "Funcional",
};
const ESTADOS_EQUIPO = ["ACTIVO", "EN_MANTENIMIENTO", "DADO_DE_BAJA"];
const TIPO_COLORS: Record<string, string> = {
  PREVENTIVO: "bg-blue-900/40 text-blue-300",
  CORRECTIVO: "bg-red-900/40 text-red-300",
  ESTETICO: "bg-purple-900/40 text-purple-300",
  FUNCIONAL: "bg-green-900/40 text-green-300",
};
const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/30 text-green-400 border-green-900/50",
  EN_MANTENIMIENTO: "bg-yellow-900/30 text-yellow-400 border-yellow-900/50",
  DADO_DE_BAJA: "bg-red-900/30 text-red-400 border-red-900/50",
};
const ESTADO_COLORS: Record<string, string> = {
  ACTIVO: "text-green-400", EN_MANTENIMIENTO: "text-yellow-400", DADO_DE_BAJA: "text-red-400",
};

function fmtDate(s: string | null) {
  if (!s) return null;
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function diasDesde(s: string | null): number | null {
  if (!s) return null;
  return Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
}
function diasHasta(s: string | null): number | null {
  if (!s) return null;
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86400000);
}

function StatusDot({ lastDate, nextDate, total }: { lastDate: string | null; nextDate: string | null; total: number }) {
  if (total === 0) return <span className="w-2 h-2 rounded-full bg-gray-700 shrink-0" />;
  const hasta = diasHasta(nextDate);
  if (hasta !== null && hasta < 0) return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
  if (hasta !== null && hasta <= 30) return <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />;
  void lastDate;
}

function unidadLabel(u: Unidad, idx: number) {
  return u.codigo || `Unidad ${idx + 1}`;
}

const FORM_EMPTY = {
  fecha: new Date().toISOString().split("T")[0],
  tipo: "PREVENTIVO", accionRealizada: "", estadoEquipo: "",
  comentarios: "", proximoMantenimiento: "", fotoEvidencia: "",
};

async function comprimirImagen(file: File, maxW = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function MantenimientoContent() {
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlEquipoId = searchParams.get("equipoId");

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [allRegistros, setAllRegistros] = useState<Registro[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [selectedEquipoId, setSelectedEquipoId] = useState<string | null>(urlEquipoId);
  const [selectedUnidadId, setSelectedUnidadId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAddUnidad, setShowAddUnidad] = useState(false);
  const [editUnidadId, setEditUnidadId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [unidadForm, setUnidadForm] = useState({ codigo: "", estado: "ACTIVO", notas: "" });
  const [saving, setSaving] = useState(false);
  const [savingUnidad, setSavingUnidad] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [eqRes, regRes] = await Promise.all([
      fetch("/api/equipos?todos=true&tipo=PROPIO"),
      fetch("/api/mantenimiento"),
    ]);
    const [eqData, regData] = await Promise.all([eqRes.json(), regRes.json()]);
    setEquipos(eqData.equipos ?? []);
    setAllRegistros(regData.registros ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load units when equipment changes
  useEffect(() => {
    if (!selectedEquipoId) { setUnidades([]); setSelectedUnidadId(null); return; }
    fetch(`/api/equipos/${selectedEquipoId}/unidades`)
      .then(r => r.json())
      .then(d => setUnidades(d.unidades ?? []));
    setSelectedUnidadId(null);
    setShowForm(false);
    setShowAddUnidad(false);
  }, [selectedEquipoId]);

  // Build per-equipment maintenance summary from allRegistros
  const maintMap: Record<string, { lastDate: string | null; nextDate: string | null; totalRecords: number }> = {};
  for (const r of allRegistros) {
    const eid = r.equipo.id;
    if (!maintMap[eid]) maintMap[eid] = { lastDate: null, nextDate: null, totalRecords: 0 };
    maintMap[eid].totalRecords++;
    if (!maintMap[eid].lastDate) maintMap[eid].lastDate = r.fecha;
    if (r.proximoMantenimiento && !maintMap[eid].nextDate) maintMap[eid].nextDate = r.proximoMantenimiento;
  }

  const cats = Array.from(
    new Map(equipos.map(e => [e.categoria.id, e.categoria])).values()
  ).sort((a, b) => a.orden - b.orden);

  const selectedEquipo = equipos.find(e => e.id === selectedEquipoId);
  const selectedUnidad = unidades.find(u => u.id === selectedUnidadId);

  // Registros for the selected view (unit or full equipment)
  const viewRegistros = selectedUnidadId
    ? allRegistros.filter(r => r.unidad?.id === selectedUnidadId)
    : selectedEquipoId
      ? allRegistros.filter(r => r.equipo.id === selectedEquipoId && !r.unidad)
      : [];

  const propios = equipos.filter(e => e.activo);
  const vencidos = propios.filter(e => {
    const s = maintMap[e.id];
    return s?.nextDate && diasHasta(s.nextDate)! < 0;
  }).length;
  const proximos = propios.filter(e => {
    const s = maintMap[e.id];
    const h = diasHasta(s?.nextDate ?? null);
    return h !== null && h >= 0 && h <= 30;
  }).length;
  const sinRegistros = propios.filter(e => !maintMap[e.id] || maintMap[e.id].totalRecords === 0).length;

  function selectEquipo(id: string) {
    setSelectedEquipoId(id);
    router.replace(`/inventario/mantenimiento?equipoId=${id}`, { scroll: false });
  }

  async function guardar() {
    if (!selectedEquipoId || !form.accionRealizada.trim()) return;
    setSaving(true);
    const res = await fetch("/api/mantenimiento", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipoId: selectedEquipoId,
        unidadId: selectedUnidadId || null,
        fecha: form.fecha, tipo: form.tipo,
        accionRealizada: form.accionRealizada.trim(),
        estadoEquipo: form.estadoEquipo || null,
        comentarios: form.comentarios || null,
        proximoMantenimiento: form.proximoMantenimiento || null,
        fotoEvidencia: form.fotoEvidencia || null,
      }),
    });
    if (res.ok) {
      await loadData();
      // Refresh units
      if (selectedEquipoId) {
        const ur = await fetch(`/api/equipos/${selectedEquipoId}/unidades`, { cache: "no-store" });
        const ud = await ur.json();
        setUnidades(ud.unidades ?? []);
      }
      setShowForm(false);
      setForm(FORM_EMPTY);
    }
    setSaving(false);
  }

  async function generarUnidades() {
    if (!selectedEquipo) return;
    const n = selectedEquipo.cantidadTotal;
    for (let i = 1; i <= n; i++) {
      await fetch(`/api/equipos/${selectedEquipo.id}/unidades`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: `Unidad ${i}` }),
      });
    }
    const ur = await fetch(`/api/equipos/${selectedEquipo.id}/unidades`, { cache: "no-store" });
    const ud = await ur.json();
    setUnidades(ud.unidades ?? []);
  }

  async function saveUnidad() {
    if (!selectedEquipoId) return;
    setSavingUnidad(true);
    if (editUnidadId) {
      await fetch(`/api/equipos/${selectedEquipoId}/unidades/${editUnidadId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: unidadForm.codigo || null, estado: unidadForm.estado, notas: unidadForm.notas || null }),
      });
    } else {
      await fetch(`/api/equipos/${selectedEquipoId}/unidades`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: unidadForm.codigo || null, estado: unidadForm.estado, notas: unidadForm.notas || null }),
      });
    }
    const ur = await fetch(`/api/equipos/${selectedEquipoId}/unidades`, { cache: "no-store" });
    const ud = await ur.json();
    setUnidades(ud.unidades ?? []);
    setShowAddUnidad(false);
    setEditUnidadId(null);
    setUnidadForm({ codigo: "", estado: "ACTIVO", notas: "" });
    setSavingUnidad(false);
  }

  function startEditUnidad(u: Unidad) {
    setUnidadForm({ codigo: u.codigo ?? "", estado: u.estado, notas: u.notas ?? "" });
    setEditUnidadId(u.id);
    setShowAddUnidad(true);
  }

  async function deleteUnidad(unidadId: string) {
    if (!await confirm({ message: "¿Eliminar esta unidad? Se perderá su historial de mantenimiento.", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/equipos/${selectedEquipoId}/unidades/${unidadId}`, { method: "DELETE" });
    const ur = await fetch(`/api/equipos/${selectedEquipoId}/unidades`, { cache: "no-store" });
    const ud = await ur.json();
    setUnidades(ud.unidades ?? []);
    if (selectedUnidadId === unidadId) setSelectedUnidadId(null);
  }

  if (loading) return <SkeletonPage rows={6} cols={5} />;

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Mantenimiento de equipos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {propios.length} equipos propios
            {vencidos > 0 && <> · <span className="text-red-400 font-medium">{vencidos} vencido{vencidos !== 1 ? "s" : ""}</span></>}
            {proximos > 0 && <> · <span className="text-yellow-400">{proximos} próximo{proximos !== 1 ? "s" : ""}</span></>}
            {sinRegistros > 0 && <> · <span className="text-gray-600">{sinRegistros} sin historial</span></>}
          </p>
        </div>
        <Link href="/catalogo/equipos"
          className="text-xs text-gray-500 hover:text-gray-300 border border-[#222] px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
          Inv. equipos
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Equipos propios", value: propios.length, color: "text-white" },
          { label: "Vencidos", value: vencidos, color: vencidos > 0 ? "text-red-400" : "text-gray-600" },
          { label: "Próximos 30d", value: proximos, color: proximos > 0 ? "text-yellow-400" : "text-gray-600" },
          { label: "Sin historial", value: sinRegistros, color: sinRegistros > 0 ? "text-gray-400" : "text-gray-600" },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
            <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4 items-start">

        {/* ── LEFT: Equipment directory ── */}
        <div className="w-full md:w-64 shrink-0 space-y-3">
          {cats.map(cat => {
            const catEqs = equipos.filter(e => e.categoria.id === cat.id && e.activo);
            if (!catEqs.length) return null;
            return (
              <div key={cat.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-[#1a1a1a]">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{cat.nombre}</p>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  {catEqs.map(e => {
                    const s = maintMap[e.id];
                    const isSelected = selectedEquipoId === e.id;
                    return (
                      <button key={e.id} onClick={() => selectEquipo(e.id)}
                        className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-2 ${isSelected ? "bg-[#1a1a1a]" : "hover:bg-[#141414]"}`}>
                        <StatusDot
                          lastDate={s?.lastDate ?? null}
                          nextDate={s?.nextDate ?? null}
                          total={s?.totalRecords ?? 0}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate leading-tight ${isSelected ? "text-[#B3985B]" : "text-white"}`}>
                            {e.descripcion}
                          </p>
                          {(e.marca || e.modelo) && (
                            <p className="text-gray-600 text-[10px] truncate">{[e.marca, e.modelo].filter(Boolean).join(" ")}</p>
                          )}
                          <p className="text-[10px] text-gray-700 mt-0.5">
                            {e.cantidadTotal} unidad{e.cantidadTotal !== 1 ? "es" : ""}
                            {s && s.totalRecords > 0 && <> · {s.totalRecords} registros</>}
                          </p>
                          {s?.nextDate && diasHasta(s.nextDate)! < 0 && (
                            <p className="text-[9px] text-red-500 font-semibold">● vencido</p>
                          )}
                          {s?.nextDate && diasHasta(s.nextDate)! >= 0 && diasHasta(s.nextDate)! <= 30 && (
                            <p className="text-[9px] text-yellow-500">● próximo</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── RIGHT: Detail ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {!selectedEquipo ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-12 text-center">
              <p className="text-gray-500 text-sm">Selecciona un equipo de la lista</p>
            </div>
          ) : (
            <>
              {/* Equipment header */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-white font-semibold text-base">{selectedEquipo.descripcion}</h2>
                    {(selectedEquipo.marca || selectedEquipo.modelo) && (
                      <p className="text-gray-500 text-sm">{[selectedEquipo.marca, selectedEquipo.modelo].filter(Boolean).join(" ")}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${ESTADO_BADGE[selectedEquipo.estado] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                        {selectedEquipo.estado.replace(/_/g, " ")}
                      </span>
                      <span className="text-gray-600 text-xs">{selectedEquipo.cantidadTotal} unidades · {selectedEquipo.categoria.nombre}</span>
                    </div>
                  </div>
                </div>

                {/* ── UNIDADES ── */}
                <div className="border-t border-[#1a1a1a] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Unidades individuales</p>
                    <div className="flex items-center gap-2">
                      {unidades.length === 0 && (
                        <button onClick={generarUnidades}
                          className="text-[10px] text-[#B3985B] hover:text-white border border-[#B3985B]/30 px-2 py-1 rounded transition-colors">
                          Generar {selectedEquipo.cantidadTotal} unidades
                        </button>
                      )}
                      <button onClick={() => { setShowAddUnidad(v => !v); setEditUnidadId(null); setUnidadForm({ codigo: "", estado: "ACTIVO", notas: "" }); }}
                        className="text-[10px] text-gray-500 hover:text-white border border-[#222] px-2 py-1 rounded transition-colors">
                        + Agregar
                      </button>
                    </div>
                  </div>

                  {/* Add/Edit unit form */}
                  {showAddUnidad && (
                    <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3 mb-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="text-[10px] text-gray-600 mb-1 block">Código / N° serie / Etiqueta</label>
                          <input value={unidadForm.codigo} onChange={e => setUnidadForm(p => ({ ...p, codigo: e.target.value }))}
                            placeholder="Ej: SN-12345, Tag #3, Unidad A..."
                            className="w-full bg-[#111] border border-[#333] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-600 mb-1 block">Estado</label>
                          <Combobox
                            value={unidadForm.estado}
                            onChange={v => setUnidadForm(p => ({ ...p, estado: v }))}
                            options={ESTADOS_EQUIPO.map(s => ({ value: s, label: s.replace(/_/g, " ") }))}
                            className="w-full bg-[#111] border border-[#333] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="text-[10px] text-gray-600 mb-1 block">Notas</label>
                          <input value={unidadForm.notas} onChange={e => setUnidadForm(p => ({ ...p, notas: e.target.value }))}
                            placeholder="Observaciones de esta unidad..."
                            className="w-full bg-[#111] border border-[#333] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveUnidad} disabled={savingUnidad}
                          className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                          {savingUnidad ? "..." : editUnidadId ? "Actualizar" : "Agregar unidad"}
                        </button>
                        <button onClick={() => { setShowAddUnidad(false); setEditUnidadId(null); }}
                          className="text-gray-600 hover:text-white text-xs transition-colors px-2">Cancelar</button>
                      </div>
                    </div>
                  )}

                  {/* Units list */}
                  {unidades.length === 0 ? (
                    <p className="text-gray-700 text-xs italic">No hay unidades registradas. Usa "Generar unidades" para crearlas automáticamente.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {unidades.map((u, idx) => {
                        const lastMaint = u.mantenimientos[0];
                        const isSelected = selectedUnidadId === u.id;
                        const nextDate = lastMaint?.proximoMantenimiento ?? null;
                        const h = diasHasta(nextDate);
                        const overdue = h !== null && h < 0;
                        const soonDue = h !== null && h >= 0 && h <= 30;

                        return (
                          <button key={u.id}
                            onClick={() => setSelectedUnidadId(isSelected ? null : u.id)}
                            className={`text-left p-3 rounded-xl border transition-colors ${
                              isSelected
                                ? "border-[#B3985B]/50 bg-[#B3985B]/5"
                                : overdue
                                  ? "border-red-900/40 bg-[#0d0d0d] hover:border-red-800/60"
                                  : soonDue
                                    ? "border-yellow-900/40 bg-[#0d0d0d] hover:border-yellow-800/60"
                                    : "border-[#1e1e1e] bg-[#0d0d0d] hover:border-[#2a2a2a]"
                            }`}>
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <p className={`text-xs font-semibold truncate ${isSelected ? "text-[#B3985B]" : "text-white"}`}>
                                {unidadLabel(u, idx)}
                              </p>
                              <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                <button onClick={() => startEditUnidad(u)}
                                  className="text-[9px] text-gray-600 hover:text-[#B3985B] transition-colors">Editar</button>
                                <button onClick={() => deleteUnidad(u.id)}
                                  className="text-[9px] text-gray-600 hover:text-red-400 transition-colors">×</button>
                              </div>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${ESTADO_BADGE[u.estado] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                              {u.estado.replace(/_/g, " ")}
                            </span>
                            {u.notas && <p className="text-gray-600 text-[9px] mt-1 truncate">{u.notas}</p>}
                            <div className="mt-1.5 space-y-0.5">
                              {lastMaint ? (
                                <>
                                  <p className="text-[9px] text-gray-600">
                                    Último: {fmtDate(lastMaint.fecha)} · {u._count.mantenimientos} reg.
                                  </p>
                                  {nextDate && (
                                    <p className={`text-[9px] font-medium ${overdue ? "text-red-500" : soonDue ? "text-yellow-500" : "text-gray-600"}`}>
                                      {overdue ? `⚠ Vencido hace ${Math.abs(h!)}d` : soonDue ? `⚡ Próx: ${fmtDate(nextDate)}` : `Prox: ${fmtDate(nextDate)}`}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-[9px] text-gray-700">Sin registros</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Maintenance form */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">
                      {selectedUnidad ? `Historial · ${unidadLabel(selectedUnidad, unidades.indexOf(selectedUnidad))}` : "Historial general del equipo"}
                    </p>
                    <p className="text-gray-600 text-xs">{viewRegistros.length} registro{viewRegistros.length !== 1 ? "s" : ""}
                      {!selectedUnidadId && <> · registros sin unidad asignada</>}
                    </p>
                  </div>
                  <button onClick={() => { setShowForm(v => !v); setForm(FORM_EMPTY); }}
                    className="bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-xs px-3 py-2 rounded-lg transition-colors shrink-0">
                    {showForm ? "Cancelar" : "+ Registrar"}
                  </button>
                </div>

                {/* Form */}
                {showForm && (
                  <div className="p-5 border-b border-[#1a1a1a] bg-[#0d0d0d] space-y-3">
                    <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
                      Nuevo registro{selectedUnidad ? ` · ${unidadLabel(selectedUnidad, unidades.indexOf(selectedUnidad))}` : " · equipo general"}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Fecha *</label>
                        <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                          className="w-full bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Tipo *</label>
                        <Combobox
                          value={form.tipo}
                          onChange={v => setForm(p => ({ ...p, tipo: v }))}
                          options={TIPOS.map(t => ({ value: t, label: TIPOS_LABEL[t] }))}
                          className="w-full bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Estado resultante</label>
                        <Combobox
                          value={form.estadoEquipo}
                          onChange={v => setForm(p => ({ ...p, estadoEquipo: v }))}
                          options={[{ value: "", label: "Sin cambio" }, ...ESTADOS_EQUIPO.map(s => ({ value: s, label: s.replace(/_/g, " ") }))]}
                          className="w-full bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-gray-500 text-xs mb-1 block">Acción realizada *</label>
                        <textarea value={form.accionRealizada} onChange={e => setForm(p => ({ ...p, accionRealizada: e.target.value }))} rows={2}
                          placeholder="Describe detalladamente lo que se hizo..."
                          className="w-full bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] resize-none" />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Próximo mantenimiento</label>
                        <input type="date" value={form.proximoMantenimiento} onChange={e => setForm(p => ({ ...p, proximoMantenimiento: e.target.value }))}
                          className="w-full bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-gray-500 text-xs mb-1 block">Comentarios</label>
                        <input value={form.comentarios} onChange={e => setForm(p => ({ ...p, comentarios: e.target.value }))}
                          placeholder="Piezas cambiadas, costo, observaciones..."
                          className="w-full bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
                      </div>
                      {/* Foto de evidencia */}
                      <div className="md:col-span-3">
                        <label className="text-gray-500 text-xs mb-1 block">Foto de evidencia</label>
                        {form.fotoEvidencia ? (
                          <div className="flex items-center gap-3">
                            <img src={form.fotoEvidencia} alt="Evidencia" className="w-20 h-20 object-cover rounded-lg border border-[#333]" />
                            <button onClick={() => setForm(p => ({ ...p, fotoEvidencia: "" }))}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors">
                              Quitar foto
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer w-fit">
                            <div className="flex items-center gap-2 bg-[#111] border border-[#333] border-dashed rounded-lg px-4 py-3 hover:border-[#B3985B] transition-colors">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                              </svg>
                              <span className="text-xs text-gray-500">Subir foto (cámara o galería)</span>
                            </div>
                            <input type="file" accept="image/*" capture="environment" className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const base64 = await comprimirImagen(file);
                                setForm(p => ({ ...p, fotoEvidencia: base64 }));
                              }} />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={guardar} disabled={saving || !form.accionRealizada.trim()}
                        className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
                        {saving ? "Guardando..." : "Guardar registro"}
                      </button>
                      <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-sm px-3 transition-colors">Cancelar</button>
                    </div>
                  </div>
                )}

                {/* History list */}
                {viewRegistros.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-gray-500 text-sm">Sin registros{selectedUnidad ? ` para ${unidadLabel(selectedUnidad, unidades.indexOf(selectedUnidad))}` : ""}</p>
                    <button onClick={() => setShowForm(true)}
                      className="mt-2 text-[#B3985B] text-xs hover:underline">
                      Registrar el primer mantenimiento
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1a1a1a]">
                    {viewRegistros.map(r => {
                      const h = diasHasta(r.proximoMantenimiento);
                      const vencido = h !== null && h < 0;
                      const alerta = h !== null && h >= 0 && h <= 30;
                      return (
                        <div key={r.id} className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5 ${TIPO_COLORS[r.tipo] ?? "bg-[#222] text-gray-400"}`}>
                              {TIPOS_LABEL[r.tipo] ?? r.tipo}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm">{r.accionRealizada}</p>
                              {r.comentarios && <p className="text-gray-500 text-xs mt-1">{r.comentarios}</p>}
                              <div className="flex flex-wrap items-center gap-3 mt-2">
                                <span className="text-gray-600 text-xs">{fmtDate(r.fecha)}</span>
                                {r.estadoEquipo && (
                                  <span className={`text-xs font-medium ${ESTADO_COLORS[r.estadoEquipo] ?? "text-gray-400"}`}>
                                    → {r.estadoEquipo.replace(/_/g, " ")}
                                  </span>
                                )}
                                {r.proximoMantenimiento && (
                                  <span className={`text-xs ${vencido ? "text-red-400 font-semibold" : alerta ? "text-yellow-400" : "text-gray-500"}`}>
                                    {vencido ? "⚠ Vencido: " : alerta ? "⚡ Próximo: " : "Siguiente: "}
                                    {fmtDate(r.proximoMantenimiento)}
                                  </span>
                                )}
                              </div>
                              {r.fotoEvidencia && (
                                <a href={r.fotoEvidencia} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                                  <img src={r.fotoEvidencia} alt="Evidencia" className="w-16 h-16 object-cover rounded-lg border border-[#2a2a2a] hover:border-[#B3985B] transition-colors" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MantenimientoPage() {
  return (
    <Suspense fallback={<SkeletonPage rows={6} cols={5} />}>
      <MantenimientoContent />
    </Suspense>
  );
}
