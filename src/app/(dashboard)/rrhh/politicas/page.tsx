"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

interface PoliticaListItem {
  id: string; titulo: string; categoria: string; resumen: string | null;
  version: number; estado: string; requiereAcuse: boolean; orden: number;
  publicadaEn: string | null; updatedAt: string;
  totalAcuses: number; aceptados: number; totalVersiones: number;
}
interface Version { id: string; version: number; titulo: string; nota: string | null; autorNombre: string | null; createdAt: string }
interface Acuse { id: string; version: number; personalNombre: string | null; token: string; aceptado: boolean; aceptadoNombre: string | null; aceptadoEn: string | null }
interface PoliticaFull {
  id: string; titulo: string; categoria: string; resumen: string | null; contenido: string;
  version: number; estado: string; requiereAcuse: boolean; orden: number; publicadaEn: string | null;
  versiones: Version[]; acuses: Acuse[];
}
interface PersonaLite { id: string; nombre: string; activo: boolean }

const CATEGORIAS = ["GENERAL", "CONDUCTA", "OPERACION", "SEGURIDAD", "RRHH", "GOBIERNO"];
const CAT_LABEL: Record<string, string> = {
  GENERAL: "General", CONDUCTA: "Código de conducta", OPERACION: "Operación",
  SEGURIDAD: "Seguridad", RRHH: "Recursos humanos", GOBIERNO: "Gobierno corporativo",
};
const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: "bg-gray-800 text-gray-400",
  PUBLICADA: "bg-green-900/30 text-green-300",
  ARCHIVADA: "bg-red-900/20 text-red-400",
};

const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";
const labelCls = "block text-xs text-gray-500 mb-1";

export default function PoliticasPage() {
  const [lista, setLista] = useState<PoliticaListItem[]>([]);
  const [personal, setPersonal] = useState<PersonaLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<PoliticaFull | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Campos de edición
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("GENERAL");
  const [resumen, setResumen] = useState("");
  const [contenido, setContenido] = useState("");
  const [requiereAcuse, setRequiereAcuse] = useState(true);

  const cargarLista = useCallback(async () => {
    const res = await fetch("/api/rrhh/politicas", { cache: "no-store" });
    const d = await res.json();
    setLista(d.politicas || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarLista();
    fetch("/api/rrhh/personal?activo=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPersonal((d.personal || d.data || []).filter((p: PersonaLite) => p.activo !== false)))
      .catch(() => {});
  }, [cargarLista]);

  const cargarDetalle = useCallback(async (id: string) => {
    const res = await fetch(`/api/rrhh/politicas/${id}`, { cache: "no-store" });
    const d = await res.json();
    const p: PoliticaFull = d.politica;
    setDetalle(p);
    setTitulo(p.titulo); setCategoria(p.categoria); setResumen(p.resumen || "");
    setContenido(p.contenido || ""); setRequiereAcuse(p.requiereAcuse);
    setPreview(false);
  }, []);

  function seleccionar(id: string) { setSelId(id); cargarDetalle(id); }

  async function crear() {
    const res = await fetch("/api/rrhh/politicas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: "Nueva política", categoria: "GENERAL", contenido: "# Título\n\nEscribe aquí el contenido…" }),
    });
    const d = await res.json();
    await cargarLista();
    if (d.politica?.id) seleccionar(d.politica.id);
  }

  async function guardar() {
    if (!detalle) return;
    setSaving(true);
    await fetch(`/api/rrhh/politicas/${detalle.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, categoria, resumen, contenido, requiereAcuse }),
    });
    setSaving(false); setMsg("Guardado"); setTimeout(() => setMsg(""), 1500);
    await cargarLista(); await cargarDetalle(detalle.id);
  }

  async function publicar() {
    if (!detalle) return;
    const nota = prompt("Nota de esta versión (opcional):") || "";
    setSaving(true);
    await guardarSilencioso();
    await fetch(`/api/rrhh/politicas/${detalle.id}/publicar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota }),
    });
    setSaving(false); setMsg("Publicada"); setTimeout(() => setMsg(""), 1500);
    await cargarLista(); await cargarDetalle(detalle.id);
  }

  async function guardarSilencioso() {
    if (!detalle) return;
    await fetch(`/api/rrhh/politicas/${detalle.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, categoria, resumen, contenido, requiereAcuse }),
    });
  }

  async function archivar() {
    if (!detalle) return;
    await fetch(`/api/rrhh/politicas/${detalle.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: detalle.estado === "ARCHIVADA" ? "BORRADOR" : "ARCHIVADA" }),
    });
    await cargarLista(); await cargarDetalle(detalle.id);
  }

  async function eliminar() {
    if (!detalle) return;
    if (!confirm(`¿Eliminar la política "${detalle.titulo}"? Se borrarán sus versiones y acuses.`)) return;
    await fetch(`/api/rrhh/politicas/${detalle.id}`, { method: "DELETE" });
    setSelId(null); setDetalle(null);
    await cargarLista();
  }

  const previewHtml = useMemo(() => marked.parse(contenido || "", { async: false }) as string, [contenido]);

  const porCategoria = useMemo(() => {
    const map: Record<string, PoliticaListItem[]> = {};
    lista.forEach((p) => { (map[p.categoria] ||= []).push(p); });
    return map;
  }, [lista]);

  return (
    <div className="flex gap-4 h-[calc(100vh-9rem)]">
      {/* Panel lista */}
      <div className="w-72 shrink-0 flex flex-col ms-card overflow-hidden">
        <div className="p-3 border-b border-[#222] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Políticas</h2>
          <button onClick={crear} className="ms-btn-primary text-xs px-2.5 py-1">+ Nueva</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {loading ? (
            <p className="text-gray-600 text-xs p-2">Cargando…</p>
          ) : lista.length === 0 ? (
            <p className="text-gray-600 text-xs p-2">Aún no hay políticas. Crea la primera.</p>
          ) : (
            CATEGORIAS.filter((c) => porCategoria[c]?.length).map((cat) => (
              <div key={cat}>
                <p className="text-[10px] uppercase tracking-widest text-gray-600 px-2 mb-1">{CAT_LABEL[cat]}</p>
                <div className="space-y-1">
                  {porCategoria[cat].map((p) => (
                    <button key={p.id} onClick={() => seleccionar(p.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors ${
                        selId === p.id ? "border-[#B3985B] bg-[#B3985B]/10" : "border-transparent hover:bg-[#141414]"
                      }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-white truncate">{p.titulo}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${ESTADO_BADGE[p.estado]}`}>{p.estado}</span>
                      </div>
                      {p.requiereAcuse && p.totalAcuses > 0 && (
                        <p className="text-[10px] text-gray-500 mt-0.5">{p.aceptados}/{p.totalAcuses} acuses · v{p.version}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Panel detalle / editor */}
      <div className="flex-1 min-w-0 ms-card overflow-hidden flex flex-col">
        {!detalle ? (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
            Selecciona o crea una política para editarla.
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-[#222] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded ${ESTADO_BADGE[detalle.estado]}`}>{detalle.estado}</span>
                <span className="text-xs text-gray-500">v{detalle.version}</span>
                {msg && <span className="text-xs text-green-400">{msg}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreview((v) => !v)} className="text-xs px-3 py-1.5 rounded-lg border border-[#333] text-gray-300 hover:text-white">
                  {preview ? "Editar" : "Vista previa"}
                </button>
                <button onClick={guardar} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg border border-[#333] text-gray-300 hover:text-white disabled:opacity-40">
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button onClick={publicar} disabled={saving} className="ms-btn-primary text-xs px-3 py-1.5">Publicar</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Título</label>
                  <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Categoría</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls}>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Resumen (opcional)</label>
                <input value={resumen} onChange={(e) => setResumen(e.target.value)} className={inputCls} placeholder="Una línea que describe de qué trata" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={requiereAcuse} onChange={(e) => setRequiereAcuse(e.target.checked)} className="accent-[#B3985B]" />
                Requiere acuse de recibo del equipo
              </label>

              <div>
                <label className={labelCls}>Contenido (markdown)</label>
                {preview ? (
                  <div className="politica-contenido bg-[#0d0d0d] border border-[#222] rounded-lg p-4 text-sm text-gray-200 min-h-[300px]"
                    dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} rows={18}
                    className={`${inputCls} font-mono text-xs leading-relaxed resize-y`}
                    placeholder={"# Título\n\n## Sección\n\n- Punto uno\n- Punto dos"} />
                )}
              </div>

              {/* Historial de versiones */}
              {detalle.versiones.length > 0 && (
                <div className="border-t border-[#222] pt-3">
                  <p className="text-xs font-semibold text-gray-400 mb-2">Historial de versiones</p>
                  <div className="space-y-1">
                    {detalle.versiones.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-xs text-gray-500 px-2 py-1.5 rounded bg-[#0d0d0d]">
                        <span>v{v.version} · {v.nota || "sin nota"}</span>
                        <span>{v.autorNombre || ""} · {new Date(v.createdAt).toLocaleDateString("es-MX")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acuses */}
              {detalle.requiereAcuse && (
                <AcusePanel politica={detalle} personal={personal} onChange={() => cargarDetalle(detalle.id)} />
              )}

              {/* Acciones destructivas */}
              <div className="border-t border-[#222] pt-3 flex items-center justify-between">
                <button onClick={archivar} className="text-xs text-gray-500 hover:text-white">
                  {detalle.estado === "ARCHIVADA" ? "Desarchivar" : "Archivar"}
                </button>
                <button onClick={eliminar} className="text-xs text-red-400 hover:text-red-300">Eliminar política</button>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .politica-contenido h1 { font-size: 1.4rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #fff; }
        .politica-contenido h2 { font-size: 1.15rem; font-weight: 700; margin: 0.9rem 0 0.4rem; color: #B3985B; }
        .politica-contenido h3 { font-size: 1rem; font-weight: 600; margin: 0.8rem 0 0.3rem; color: #fff; }
        .politica-contenido p { margin: 0.4rem 0; }
        .politica-contenido ul, .politica-contenido ol { margin: 0.4rem 0 0.4rem 1.25rem; }
        .politica-contenido ul { list-style: disc; }
        .politica-contenido ol { list-style: decimal; }
        .politica-contenido li { margin: 0.15rem 0; }
        .politica-contenido a { color: #B3985B; text-decoration: underline; }
        .politica-contenido strong { color: #fff; font-weight: 600; }
        .politica-contenido table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }
        .politica-contenido th, .politica-contenido td { border: 1px solid #333; padding: 0.35rem 0.55rem; }
        .politica-contenido code { background: #1a1a1a; padding: 0.1rem 0.3rem; border-radius: 4px; }
      `}</style>
    </div>
  );
}

function AcusePanel({ politica, personal, onChange }: { politica: PoliticaFull; personal: PersonaLite[]; onChange: () => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const yaAsignados = useMemo(() => new Set(politica.acuses.map((a) => a.personalNombre)), [politica.acuses]);

  function toggle(id: string) {
    setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function solicitar() {
    if (!sel.size) return;
    setBusy(true);
    await fetch(`/api/rrhh/politicas/${politica.id}/acuse`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalIds: Array.from(sel) }),
    });
    setBusy(false); setSel(new Set());
    onChange();
  }

  function copiarEnlace(token: string) {
    const url = `${window.location.origin}/politica/${token}`;
    navigator.clipboard.writeText(url);
    setCopiado(token); setTimeout(() => setCopiado(null), 1500);
  }

  const disponibles = personal.filter((p) => !yaAsignados.has(p.nombre));

  return (
    <div className="border-t border-[#222] pt-3 space-y-3">
      <p className="text-xs font-semibold text-gray-400">Acuse de recibo</p>

      {politica.estado !== "PUBLICADA" ? (
        <p className="text-xs text-amber-500/80">Publica la política para poder solicitar acuses.</p>
      ) : (
        <>
          {disponibles.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#222] rounded-lg p-3">
              <p className="text-[11px] text-gray-500 mb-2">Solicitar acuse a:</p>
              <div className="max-h-32 overflow-y-auto grid grid-cols-2 gap-1">
                {disponibles.map((p) => (
                  <label key={p.id} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="accent-[#B3985B]" />
                    <span className="truncate">{p.nombre}</span>
                  </label>
                ))}
              </div>
              <button onClick={solicitar} disabled={busy || !sel.size} className="ms-btn-primary text-xs px-3 py-1.5 mt-2 disabled:opacity-40">
                {busy ? "Enviando…" : `Solicitar acuse (${sel.size})`}
              </button>
            </div>
          )}

          {politica.acuses.length > 0 && (
            <div className="space-y-1">
              {politica.acuses.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-[#0d0d0d]">
                  <span className="text-gray-300 truncate">{a.personalNombre}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.aceptado ? (
                      <span className="text-green-400">✓ {a.aceptadoEn ? new Date(a.aceptadoEn).toLocaleDateString("es-MX") : ""}</span>
                    ) : (
                      <>
                        <span className="text-amber-500/80">pendiente v{a.version}</span>
                        <button onClick={() => copiarEnlace(a.token)} className="text-[#B3985B] hover:underline">
                          {copiado === a.token ? "¡Copiado!" : "Copiar enlace"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
