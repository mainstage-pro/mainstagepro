"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, ClipboardPaste, Trash2, ArrowRight, AlertTriangle, Check } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";
import { PerfilMultiSelect, usePerfilesCustom } from "@/components/crm/PerfilSelect";
import { parsePerfiles } from "@/lib/proceso/perfiles";
import { ORIGEN_LEAD_OPTIONS } from "@/lib/constants";
import type { CustomPerfil } from "@/lib/proceso/perfiles";

interface Entrada {
  id: string;
  textoOriginal: string;
  nombre: string | null;
  empresa: string | null;
  telefono: string | null;
  correo: string | null;
  perfilesProspecto: string | null;
  origenLead: string | null;
  notas: string | null;
  estado: string;
  clienteId: string | null;
  createdAt: string;
  duplicadoDe?: { id: string; nombre: string } | null;
}

const INPUT_CLS =
  "w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-2.5 py-1.5 text-[12px] text-white placeholder:text-[#3a3a3a] focus:outline-none focus:border-[#B3985B]/40 transition-colors";

export default function BandejaProspectosPage() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const { custom, agregar } = usePerfilesCustom();

  async function cargar() {
    const d = await fetch("/api/crm/bandeja-prospectos").then((r) => r.json());
    setEntradas(d.entradas ?? []);
  }
  useEffect(() => {
    cargar().finally(() => setLoading(false));
  }, []);

  const pendientes = useMemo(() => entradas.filter((e) => e.estado === "PENDIENTE"), [entradas]);
  const trasladadas = useMemo(() => entradas.filter((e) => e.estado === "TRASLADADO"), [entradas]);

  const lineasPreview = useMemo(
    () => pasteText.split("\n").map((l) => l.replace(/\r/g, "")).filter((l) => l.trim().length > 0),
    [pasteText],
  );

  async function registrar() {
    if (lineasPreview.length === 0) return;
    setRegistrando(true);
    const res = await fetch("/api/crm/bandeja-prospectos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineas: lineasPreview }),
    });
    setRegistrando(false);
    if (!res.ok) { toast.error("No se pudieron registrar las filas"); return; }
    const d = await res.json();
    setPasteOpen(false);
    setPasteText("");
    await cargar();
    toast.success(`${d.creadas} ${d.creadas === 1 ? "fila registrada" : "filas registradas"}`);
  }

  function actualizar(id: string, campos: Partial<Entrada>) {
    setEntradas((prev) => prev.map((e) => (e.id === id ? { ...e, ...campos } : e)));
  }

  async function eliminar(e: Entrada) {
    const ok = await confirm({ message: "¿Eliminar esta entrada de la bandeja?", danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    const res = await fetch(`/api/crm/bandeja-prospectos/${e.id}`, { method: "DELETE" });
    if (res.ok) { setEntradas((prev) => prev.filter((x) => x.id !== e.id)); toast.success("Entrada eliminada"); }
    else toast.error("No se pudo eliminar");
  }

  async function trasladar(e: Entrada, form: EditForm) {
    if (!form.nombre.trim()) { toast.error("Ponle un nombre antes de trasladar"); return; }
    const res = await fetch(`/api/crm/bandeja-prospectos/${e.id}/trasladar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "No se pudo trasladar"); return; }
    const d = await res.json();
    actualizar(e.id, { estado: "TRASLADADO", clienteId: d.clienteId });
    toast.success(`${form.nombre.trim()} trasladado a prospectos`);
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Bandeja de entrada</h1>
          <p className="ms-subtitle mt-0.5">
            {loading ? "Cargando…" : `${pendientes.length} ${pendientes.length === 1 ? "prospecto por categorizar" : "prospectos por categorizar"}`}
          </p>
        </div>
        <button onClick={() => setPasteOpen(true)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-lg bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808] transition-all">
          <ClipboardPaste size={15} /> Pegar lista
        </button>
      </div>

      {loading ? (
        <SkeletonPage rows={4} cols={2} />
      ) : pendientes.length === 0 && trasladadas.length === 0 ? (
        <div className="ms-empty-state flex flex-col items-center gap-2 py-16">
          <Inbox size={28} className="text-[#2a2a2a]" />
          <p className="text-gray-600 text-sm">Sin capturas todavía.</p>
          <p className="text-gray-700 text-[12px]">Pega tu lista de notas y registra cada fila como un prospecto por categorizar.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendientes.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pendientes.map((e) => (
                <EntradaCard key={e.id} entrada={e} custom={custom} onCustomCreated={agregar}
                  onTrasladar={(form) => trasladar(e, form)} onEliminar={() => eliminar(e)} />
              ))}
            </div>
          )}

          {trasladadas.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-700">Trasladadas a prospectos</p>
                <div className="h-px flex-1 bg-[#111]" />
              </div>
              <div className="space-y-2 opacity-60">
                {trasladadas.map((e) => (
                  <div key={e.id} className="rounded-xl border border-[#141414] bg-[#080808] p-3 flex items-center gap-3">
                    <Check size={13} className="text-emerald-500/70 shrink-0" />
                    <Link href={e.clienteId ? `/crm/clientes/${e.clienteId}` : "#"}
                      className="flex-1 min-w-0 text-[13px] text-gray-400 hover:text-white truncate">
                      {e.nombre || e.textoOriginal}
                    </Link>
                    <button onClick={() => eliminar(e)} className="p-1.5 rounded-lg text-[#333] hover:text-red-500/70 transition-colors" title="Quitar de la bandeja">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {pasteOpen && (
        <PasteModal
          text={pasteText} setText={setPasteText}
          count={lineasPreview.length} registrando={registrando}
          onClose={() => setPasteOpen(false)} onRegistrar={registrar}
        />
      )}
    </div>
  );
}

// ─── Modal de pegado masivo ──────────────────────────────────────────────────
function PasteModal({ text, setText, count, registrando, onClose, onRegistrar }: {
  text: string; setText: (v: string) => void; count: number; registrando: boolean;
  onClose: () => void; onRegistrar: () => void;
}) {
  const lineas = text.split("\n").map((l) => l.replace(/\r/g, "")).filter((l) => l.trim().length > 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-sm font-semibold">Pegar lista de prospectos</h2>
          <button onClick={onClose} className="text-[#444] hover:text-white text-xl leading-none transition-colors">×</button>
        </div>
        <p className="text-[12px] text-gray-500 mb-3">
          Pega tu lista (por ejemplo desde Notas del iPhone). Cada renglón se registra como una fila independiente,
          conservando el texto tal cual lo copiaste.
        </p>
        <textarea
          autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={10}
          placeholder={"Juan Pérez  55 1234 5678\nSalón Los Pinos  contacto@lospinos.mx\nDJ Andrés — recomendado por Ana"}
          className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-[#333] font-mono focus:outline-none focus:border-[#B3985B]/40 resize-y whitespace-pre"
        />
        {count > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">Vista previa · {count} {count === 1 ? "fila" : "filas"}</p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-[#161616] divide-y divide-[#141414]">
              {lineas.slice(0, 50).map((l, i) => (
                <div key={i} className="px-3 py-1.5 text-[12px] text-gray-400 font-mono whitespace-pre-wrap">{l}</div>
              ))}
              {lineas.length > 50 && <div className="px-3 py-1.5 text-[11px] text-gray-600">+{lineas.length - 50} más…</div>}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="ms-btn-secondary">Cancelar</button>
          <button onClick={onRegistrar} disabled={count === 0 || registrando}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-lg bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808] transition-all disabled:opacity-40">
            {registrando ? "Registrando…" : `Registrar ${count || ""} ${count === 1 ? "fila" : "filas"}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de entrada ──────────────────────────────────────────────────────
interface EditForm {
  nombre: string; empresa: string; telefono: string; correo: string;
  perfilesProspecto: string[]; origenLead: string; notas: string;
}

function EntradaCard({ entrada, custom, onCustomCreated, onTrasladar, onEliminar }: {
  entrada: Entrada;
  custom: CustomPerfil[];
  onCustomCreated: (p: CustomPerfil) => void;
  onTrasladar: (form: EditForm) => void;
  onEliminar: () => void;
}) {
  const [form, setForm] = useState<EditForm>({
    nombre: entrada.nombre ?? "",
    empresa: entrada.empresa ?? "",
    telefono: entrada.telefono ?? "",
    correo: entrada.correo ?? "",
    perfilesProspecto: parsePerfiles(entrada.perfilesProspecto),
    origenLead: entrada.origenLead ?? "",
    notas: entrada.notas ?? "",
  });
  const [guardando, setGuardando] = useState(false);

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function guardar(campos: Partial<EditForm>) {
    setGuardando(true);
    const res = await fetch(`/api/crm/bandeja-prospectos/${entrada.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    setGuardando(false);
    if (!res.ok) { /* se conserva el estado local; se reintenta al siguiente blur */ }
  }

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-3.5 flex flex-col gap-3">
      {/* Texto original */}
      <div className="rounded-lg bg-[#080808] border border-[#151515] px-2.5 py-2">
        <p className="text-[9px] uppercase tracking-wider text-[#333] mb-1">Texto original</p>
        <p className="text-[12px] text-gray-400 font-mono whitespace-pre-wrap leading-snug">{entrada.textoOriginal}</p>
      </div>

      {entrada.duplicadoDe && (
        <Link href={`/crm/clientes/${entrada.duplicadoDe.id}`}
          className="flex items-center gap-1.5 text-[11px] text-amber-400/80 hover:text-amber-300 bg-amber-950/20 border border-amber-900/30 rounded-lg px-2.5 py-1.5 transition-colors">
          <AlertTriangle size={12} className="shrink-0" />
          Posible duplicado: {entrada.duplicadoDe.nombre}
        </Link>
      )}

      {/* Campos editables */}
      <div className="grid grid-cols-2 gap-2">
        <input className={INPUT_CLS + " col-span-2"} placeholder="Nombre *" value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)} onBlur={() => guardar({ nombre: form.nombre })} />
        <input className={INPUT_CLS} placeholder="Teléfono" value={form.telefono}
          onChange={(e) => set("telefono", e.target.value)} onBlur={() => guardar({ telefono: form.telefono })} />
        <input className={INPUT_CLS} placeholder="Correo" value={form.correo}
          onChange={(e) => set("correo", e.target.value)} onBlur={() => guardar({ correo: form.correo })} />
        <input className={INPUT_CLS + " col-span-2"} placeholder="Empresa" value={form.empresa}
          onChange={(e) => set("empresa", e.target.value)} onBlur={() => guardar({ empresa: form.empresa })} />
      </div>

      <div>
        <p className="text-[9px] uppercase tracking-wider text-[#333] mb-1">Perfil</p>
        <PerfilMultiSelect value={form.perfilesProspecto} custom={custom} onCreated={onCustomCreated}
          onChange={(ids) => { set("perfilesProspecto", ids); guardar({ perfilesProspecto: ids }); }} />
      </div>

      <select className={INPUT_CLS} value={form.origenLead}
        onChange={(e) => { set("origenLead", e.target.value); guardar({ origenLead: e.target.value }); }}>
        <option value="">Origen…</option>
        {ORIGEN_LEAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <textarea className={INPUT_CLS + " resize-none"} rows={2} placeholder="Notas" value={form.notas}
        onChange={(e) => set("notas", e.target.value)} onBlur={() => guardar({ notas: form.notas })} />

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[9px] text-[#333]">{guardando ? "Guardando…" : ""}</span>
        <div className="flex items-center gap-1.5">
          <button onClick={onEliminar} className="p-1.5 rounded-lg text-[#444] hover:text-red-500/70 transition-colors" title="Eliminar">
            <Trash2 size={14} />
          </button>
          <button onClick={() => onTrasladar(form)} disabled={!form.nombre.trim()}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-emerald-800/40 text-emerald-400/90 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Trasladar a la lista de prospectos">
            Trasladar <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
