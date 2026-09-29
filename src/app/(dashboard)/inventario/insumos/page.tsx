"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { BackButton } from "@/components/BackButton";
import { AlertTriangle, ChevronDown, Plus, Pencil, Copy } from "lucide-react";

interface Insumo {
  id: string;
  nombre: string;
  descripcion: string | null;
  usoPrincipal: string | null;
  porQueNecesario: string | null;
  categoria: string;
  unidad: string;
  cantidadActual: number;
  minimo: number;
  dondeSeCompra: string | null;
  costoAprox: number | null;
  notas: string | null;
  revisadoEn: string | null;
  revisadoPor: string | null;
}

type Nivel = "HAY" | "BAJO" | "NO_HAY";

const UNIDADES = ["pieza", "rollo", "litro", "paquete", "caja", "par"];

function nivel(i: Insumo): Nivel {
  if (i.cantidadActual <= 0) return "NO_HAY";
  if (i.cantidadActual < i.minimo) return "BAJO";
  return "HAY";
}

const NIVEL_DOT: Record<Nivel, string> = {
  HAY: "bg-green-400",
  BAJO: "bg-orange-400",
  NO_HAY: "bg-red-500",
};
const NIVEL_LABEL: Record<Nivel, string> = {
  HAY: "Hay",
  BAJO: "Bajo mínimo",
  NO_HAY: "Se acabó",
};
const NIVEL_TEXT: Record<Nivel, string> = {
  HAY: "text-green-400",
  BAJO: "text-orange-400",
  NO_HAY: "text-red-400",
};

const VACIO = {
  nombre: "", descripcion: "", usoPrincipal: "", porQueNecesario: "",
  categoria: "GENERAL", unidad: "pieza", cantidadActual: "0", minimo: "1",
  dondeSeCompra: "", costoAprox: "", notas: "",
};

export default function InsumosPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [cantidadEdit, setCantidadEdit] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<null | { id?: string; form: typeof VACIO }>(null);
  const [guardando, setGuardando] = useState(false);

  async function load() {
    const r = await fetch("/api/insumos", { cache: "no-store" });
    const d = await r.json();
    setInsumos(d.insumos ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveCantidad(insumo: Insumo) {
    const raw = cantidadEdit[insumo.id];
    if (raw === undefined) return;
    const val = parseInt(raw, 10);
    if (isNaN(val) || val < 0) { setCantidadEdit(p => { const n = { ...p }; delete n[insumo.id]; return n; }); return; }
    if (val === insumo.cantidadActual) { setCantidadEdit(p => { const n = { ...p }; delete n[insumo.id]; return n; }); return; }
    const res = await fetch(`/api/insumos/${insumo.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidadActual: val }),
    });
    if (!res.ok) { toast.error("Error al guardar"); return; }
    setCantidadEdit(p => { const n = { ...p }; delete n[insumo.id]; return n; });
    await load();
  }

  async function guardar() {
    if (!modal) return;
    const { id, form } = modal;
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    setGuardando(true);
    const res = await fetch(id ? `/api/insumos/${id}` : "/api/insumos", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return; }
    setModal(null);
    await load();
  }

  async function eliminar(insumo: Insumo) {
    if (!await confirm({ message: `¿Quitar "${insumo.nombre}" de la lista de insumos?`, danger: true, confirmText: "Quitar" })) return;
    const res = await fetch(`/api/insumos/${insumo.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al quitar"); return; }
    await load();
  }

  function abrirEdicion(i: Insumo) {
    setModal({
      id: i.id,
      form: {
        nombre: i.nombre, descripcion: i.descripcion ?? "", usoPrincipal: i.usoPrincipal ?? "",
        porQueNecesario: i.porQueNecesario ?? "", categoria: i.categoria, unidad: i.unidad,
        cantidadActual: String(i.cantidadActual), minimo: String(i.minimo),
        dondeSeCompra: i.dondeSeCompra ?? "", costoAprox: i.costoAprox == null ? "" : String(i.costoAprox),
        notas: i.notas ?? "",
      },
    });
  }

  if (loading) return <div className="p-6 text-gray-600 text-sm">Cargando...</div>;

  const porComprar = insumos.filter(i => nivel(i) !== "HAY");
  const hay = insumos.length - porComprar.length;
  const bajo = insumos.filter(i => nivel(i) === "BAJO").length;
  const noHay = insumos.filter(i => nivel(i) === "NO_HAY").length;

  const categorias = [...new Set(insumos.map(i => i.categoria))].sort();

  function copiarListaCompra() {
    const texto = porComprar
      .map(i => `• ${i.nombre} — faltan ${Math.max(i.minimo - i.cantidadActual, 0)} ${i.unidad}${i.dondeSeCompra ? ` (${i.dondeSeCompra})` : ""}`)
      .join("\n");
    navigator.clipboard.writeText(`Insumos por comprar\n\n${texto}`);
    toast.success("Lista copiada");
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="mb-2"><BackButton /></div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Insumos de operación</h1>
          <p className="text-gray-600 text-xs">Consumibles que deben existir en bodega antes de salir a evento.</p>
        </div>
        <button
          onClick={() => setModal({ form: { ...VACIO } })}
          className="inline-flex items-center gap-1.5 text-xs text-black bg-[#B3985B] hover:bg-[#d4b068] font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus strokeWidth={2} className="w-3.5 h-3.5" /> Agregar insumo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Hay", value: hay, color: "text-green-400" },
          { label: "Bajo mínimo", value: bajo, color: bajo > 0 ? "text-orange-400" : "text-gray-600" },
          { label: "Se acabó", value: noHay, color: noHay > 0 ? "text-red-400" : "text-gray-600" },
        ].map(k => (
          <div key={k.label} className="ms-card p-3 text-center">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-gray-600 text-[10px] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {porComprar.length > 0 && (
        <div className="bg-red-900/10 border border-red-900/30 rounded-xl px-5 py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-red-400 text-sm font-semibold">
              <AlertTriangle strokeWidth={1.75} className="w-3.5 h-3.5 shrink-0" />
              Por comprar ({porComprar.length})
            </p>
            <button onClick={copiarListaCompra} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-xs transition-colors shrink-0">
              <Copy strokeWidth={1.75} className="w-3 h-3" /> Copiar
            </button>
          </div>
          <ul className="space-y-1">
            {porComprar.map(i => (
              <li key={i.id} className="text-xs text-gray-400">
                <span className="text-gray-200">{i.nombre}</span>
                {" — faltan "}
                <span className={NIVEL_TEXT[nivel(i)]}>{Math.max(i.minimo - i.cantidadActual, 0)} {i.unidad}</span>
                {i.dondeSeCompra && <span className="text-gray-600"> · {i.dondeSeCompra}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insumos.length === 0 && (
        <p className="text-gray-600 text-sm py-8 text-center">Aún no hay insumos registrados.</p>
      )}

      {categorias.map(cat => (
        <div key={cat} className="space-y-1.5">
          <p className="text-gray-600 text-[10px] uppercase tracking-wider">{cat}</p>
          {insumos.filter(i => i.categoria === cat).map(i => {
            const n = nivel(i);
            const abierto = expandido === i.id;
            return (
              <div key={i.id} className="ms-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${NIVEL_DOT[n]}`} />
                  <button onClick={() => setExpandido(abierto ? null : i.id)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm text-white truncate">{i.nombre}</p>
                    <p className={`text-[10px] ${NIVEL_TEXT[n]}`}>
                      {NIVEL_LABEL[n]} · mínimo {i.minimo} {i.unidad}
                    </p>
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={cantidadEdit[i.id] ?? String(i.cantidadActual)}
                    onChange={e => setCantidadEdit(p => ({ ...p, [i.id]: e.target.value }))}
                    onBlur={() => saveCantidad(i)}
                    onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="w-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-[#B3985B] shrink-0"
                  />
                  <button onClick={() => abrirEdicion(i)} className="text-gray-700 hover:text-white transition-colors shrink-0">
                    <Pencil strokeWidth={1.75} className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setExpandido(abierto ? null : i.id)} className="text-gray-700 hover:text-white transition-colors shrink-0">
                    <ChevronDown strokeWidth={1.75} className={`w-4 h-4 transition-transform ${abierto ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {abierto && (
                  <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-[#1a1a1a]">
                    {i.descripcion && <p className="text-xs text-gray-400">{i.descripcion}</p>}
                    {i.usoPrincipal && (
                      <div><p className="text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">Uso principal</p>
                        <p className="text-xs text-gray-300">{i.usoPrincipal}</p></div>
                    )}
                    {i.porQueNecesario && (
                      <div><p className="text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">Por qué es necesario</p>
                        <p className="text-xs text-gray-300">{i.porQueNecesario}</p></div>
                    )}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-gray-600 pt-1">
                      {i.dondeSeCompra && <span>Se compra en: <span className="text-gray-400">{i.dondeSeCompra}</span></span>}
                      {i.costoAprox != null && <span>Costo aprox: <span className="text-gray-400">${i.costoAprox}</span></span>}
                      {i.revisadoEn && (
                        <span>Última revisión: <span className="text-gray-400">
                          {new Date(i.revisadoEn).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                          {i.revisadoPor ? ` · ${i.revisadoPor}` : ""}
                        </span></span>
                      )}
                    </div>
                    {i.notas && <p className="text-[10px] text-gray-500 italic">{i.notas}</p>}
                    <button onClick={() => eliminar(i)} className="text-gray-700 hover:text-red-400 text-[10px] transition-colors">
                      Quitar de la lista
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setModal(null)}>
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-semibold text-base">{modal.id ? "Editar insumo" : "Nuevo insumo"}</h2>

            {([
              ["nombre", "Nombre", "text"],
              ["descripcion", "Descripción", "textarea"],
              ["usoPrincipal", "Uso principal", "textarea"],
              ["porQueNecesario", "Por qué es necesario", "textarea"],
              ["categoria", "Categoría", "text"],
              ["dondeSeCompra", "Dónde se compra", "text"],
              ["notas", "Notas", "textarea"],
            ] as const).map(([campo, label, tipo]) => (
              <div key={campo}>
                <label className="block text-gray-600 text-[10px] uppercase tracking-wider mb-1">{label}</label>
                {tipo === "textarea" ? (
                  <textarea
                    rows={2}
                    value={modal.form[campo]}
                    onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, [campo]: e.target.value } }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B] resize-none"
                  />
                ) : (
                  <input
                    value={modal.form[campo]}
                    onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, [campo]: e.target.value } }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                  />
                )}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-600 text-[10px] uppercase tracking-wider mb-1">Unidad</label>
                <select
                  value={modal.form.unidad}
                  onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, unidad: e.target.value } }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                >
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-600 text-[10px] uppercase tracking-wider mb-1">Mínimo en bodega</label>
                <input
                  type="number" min={0}
                  value={modal.form.minimo}
                  onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, minimo: e.target.value } }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              {!modal.id && (
                <div>
                  <label className="block text-gray-600 text-[10px] uppercase tracking-wider mb-1">Cantidad actual</label>
                  <input
                    type="number" min={0}
                    value={modal.form.cantidadActual}
                    onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, cantidadActual: e.target.value } }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
              )}
              <div>
                <label className="block text-gray-600 text-[10px] uppercase tracking-wider mb-1">Costo aprox.</label>
                <input
                  type="number" min={0}
                  value={modal.form.costoAprox}
                  onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, costoAprox: e.target.value } }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white text-sm transition-colors">Cancelar</button>
              <button
                onClick={guardar} disabled={guardando}
                className="text-sm text-black bg-[#B3985B] hover:bg-[#d4b068] disabled:opacity-50 font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
