"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VersionMeta {
  id: string;
  version: number;
  generadaPor: string;
  generadaEn: string;
  notasSnapshot: string | null;
  puntosSnapshot: string[];
}

interface Sesion {
  id: string;
  numero: number;
  titulo: string;
  bloque: string;
  bloqueLetra: string;
  descripcion: string;
  objetivos: string[];
  puntosBase: string[];
  puntosEditados: string[];
  semana: number;
  fechaProgramada: string | null;
  duracion: number;
  impartidor: string;
  estado: string;
  notas: string | null;
  subArea: string | null;
  publicoObjetivo: string | null;
  prerrequisitos: string[];
  procedimiento: string[];
  erroresComunes: string[];
  checklistAplicacion: string[];
  recursos: string[];
  versiones: VersionMeta[];
  evaluacion: { id: string } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BLOQUE_COLORS: Record<string, string> = {
  A: "#6366F1", B: "#10B981", C: "#F59E0B",
  D: "#3B82F6", E: "#8B5CF6", F: "#EC4899",
  G: "#EF4444", H: "#14B8A6", I: "#c9a96a",
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:        { label: "Pendiente",       color: "#6b7280", bg: "#1a1a1a" },
  "en-preparacion": { label: "En preparación",  color: "#F59E0B", bg: "#1c1500" },
  lista:            { label: "Lista",            color: "#22c55e", bg: "#0a1f0a" },
  impartida:        { label: "Impartida",        color: "#c9a96a", bg: "#1a1200" },
};

function padNum(n: number) { return String(n).padStart(2, "0"); }

// ─── Draggable point item ─────────────────────────────────────────────────────

function SortablePoint({
  id, index, text, onEdit, onDelete,
}: {
  id: string; index: number; text: string;
  onEdit: (id: string, val: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setVal(text); }, [text]);

  function commit() {
    setEditing(false);
    if (val.trim() !== text) onEdit(id, val.trim() || text);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 group/item px-3 py-2 rounded-lg transition-colors hover:bg-[#1a1a1a]"
    >
      {/* Drag handle */}
      <button
        {...attributes} {...listeners}
        className="text-[#333] hover:text-[#555] cursor-grab active:cursor-grabbing shrink-0 touch-none"
        tabIndex={-1}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/>
          <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
          <circle cx="3" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/>
        </svg>
      </button>

      {/* Index */}
      <span className="text-[10px] font-mono shrink-0 w-5 text-right" style={{ color: "#c9a96a" }}>
        {padNum(index + 1)}
      </span>

      {/* Text / Input */}
      {editing ? (
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(text); setEditing(false); } }}
          className="flex-1 bg-[#222] border border-[#c9a96a]/50 rounded px-2 py-0.5 text-white text-sm focus:outline-none"
          autoFocus
        />
      ) : (
        <span
          onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 10); }}
          className="flex-1 text-sm cursor-text"
          style={{ color: "#d1d5db" }}
        >
          {text}
        </span>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(id)}
        className="opacity-0 group-hover/item:opacity-100 text-[#444] hover:text-red-400 transition-all text-lg leading-none shrink-0"
      >
        ×
      </button>
    </div>
  );
}

// ─── List field (editor de lista simple para la ficha) ───────────────────────

function ListField({
  items, onChange, placeholder, numbered = false,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  numbered?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] font-mono shrink-0 w-5 text-right" style={{ color: "#c9a96a" }}>
            {numbered ? padNum(i + 1) : "•"}
          </span>
          <input
            value={it}
            onChange={(e) => { const next = items.slice(); next[i] = e.target.value; onChange(next); }}
            placeholder={placeholder}
            className="flex-1 bg-[#0d0d0d] border rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-[#333] focus:outline-none focus:border-[#c9a96a]/50"
            style={{ borderColor: "#1e1e1e" }}
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-[#444] hover:text-red-400 transition-colors text-lg leading-none shrink-0"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ""])}
        className="text-xs font-medium transition-colors hover:text-[#c9a96a] px-1"
        style={{ color: "#6b7280" }}
      >
        + Agregar
      </button>
    </div>
  );
}

// ─── Navigation fix ───────────────────────────────────────────────────────────
// Claude's generated scripts can be broken (wrapped in DOMContentLoaded, wrong
// scope, wrong order, etc.). We strip them all and inject our own bulletproof
// implementation so navigation always works.

const NAV_SCRIPT = `
<script>
// Global nav state — must NOT be inside IIFE: onclick="goTo(cur-1)" needs to see these globals
var cur = 0;
var _slides = [];
var _dots   = [];
var _counter = null;

function init() {
  _slides  = Array.from(document.querySelectorAll('.slide'));
  _dots    = Array.from(document.querySelectorAll('.dot'));
  _counter = document.getElementById('slide-counter');
  if (!_slides.length) return;
  _slides.forEach(function(s, i) { s.style.setProperty('display', i === 0 ? 'flex' : 'none', 'important'); });
  _dots.forEach(function(d, i)   { d.style.opacity = i === 0 ? '1' : '0.3'; });
  if (_counter) _counter.textContent = '01 / ' + String(_slides.length).padStart(2,'0');
}

function goTo(n) {
  if (!_slides.length) init();
  if (!_slides.length) return;
  n = parseInt(n, 10);
  if (isNaN(n)) return;
  _slides[cur].style.setProperty('display', 'none', 'important');
  if (_dots[cur]) _dots[cur].style.opacity = '0.3';
  cur = ((n % _slides.length) + _slides.length) % _slides.length;
  _slides[cur].style.setProperty('display', 'flex', 'important');
  if (_dots[cur]) _dots[cur].style.opacity = '1';
  if (_counter) _counter.textContent =
    String(cur + 1).padStart(2,'0') + ' / ' + String(_slides.length).padStart(2,'0');
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(cur + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(cur - 1);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
</script>`;

async function fixNavigation(html: string): Promise<string> {
  if (!html) return html;

  // 1. Remove all existing <script>...</script> blocks from Claude's output
  let result = html.replace(/<script[\s\S]*?<\/script>/gi, "");

  // 2. Inject our bulletproof nav script before </body>
  if (result.includes("</body>")) {
    result = result.replace(/<\/body>/i, NAV_SCRIPT + "</body>");
  } else {
    result = result + NAV_SCRIPT;
  }

  // 3. Fetch real logo and embed as base64 data URL
  try {
    const res = await fetch("/logo-white.png");
    const buffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let binary = "";
    const chunk = 8192;
    for (let i = 0; i < uint8.length; i += chunk) {
      binary += String.fromCharCode(...uint8.subarray(i, i + chunk));
    }
    const dataUrl = `data:image/png;base64,${btoa(binary)}`;
    const imgTag = `<img src="${dataUrl}" alt="Mainstage Pro" style="height:28px;object-fit:contain;display:block;">`;

    // Replace placeholder used in new presentations
    result = result.split("__LOGO_SRC__").join(dataUrl);

    // Replace the SVG logo that Claude generates from the old prompt
    result = result.replace(
      /<svg[^>]*viewBox=['"]0 0 220 38['"][\s\S]*?<\/svg>/gi,
      imgTag
    );
  } catch {
    // Keep Claude's SVG / placeholder if logo fetch fails
  }

  return result;
}

// ─── Presentation Modal ───────────────────────────────────────────────────────

function PresentationModal({
  htmlContent, onClose, onDownload,
}: {
  htmlContent: string; onClose: () => void; onDownload: () => void;
}) {
  const [fixed, setFixed] = useState<string>("");

  useEffect(() => {
    fixNavigation(htmlContent).then(setFixed);
  }, [htmlContent]);

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#040404" }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: "#080808", borderBottom: "1px solid #1a1a1a" }}>
        <button
          onClick={onDownload}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:border-[#c9a96a] hover:text-[#c9a96a]"
          style={{ borderColor: "#333", color: "#6b7280" }}
        >
          ↓ Descargar HTML
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-xl leading-none transition-colors hover:bg-[#1a1a1a] hover:text-white"
          style={{ color: "#6b7280" }}
        >
          ×
        </button>
      </div>

      {/* iframe: key forces remount; srcDoc shows loader until fixed HTML is ready */}
      {fixed ? (
        <iframe
          key={fixed.length}
          className="flex-1 w-full border-none"
          srcDoc={fixed}
          title="Presentación de capacitación"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm" style={{ color: "#4b5563" }}>Cargando presentación...</span>
        </div>
      )}
    </div>
  );
}

// ─── Save indicator ───────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "unsaved";

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const map = {
    saving: { text: "Guardando...", color: "#6b7280" },
    saved:  { text: "Guardado ✓",  color: "#22c55e" },
    unsaved:{ text: "Sin guardar", color: "#F59E0B" },
  };
  const cfg = map[state as keyof typeof map];
  return <span className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.text}</span>;
}

// ─── Toast ───────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; message: string; type: "info" | "success" | "error" }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const show = useCallback((message: string, type: ToastMsg["type"] = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, show };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CapacitacionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Editable state
  const [puntos, setPuntos] = useState<{ id: string; text: string }[]>([]);
  const [notas, setNotas] = useState("");
  const [notasSave, setNotasSave] = useState<SaveState>("idle");
  const [puntosSave, setPuntosSave] = useState<SaveState>("idle");

  // Config
  const [fecha, setFecha] = useState("");
  const [duracion, setDuracion] = useState(60);
  const [impartidor, setImpartidor] = useState("Mauricio Hernández");
  const [estado, setEstado] = useState("pendiente");
  const [savingConfig, setSavingConfig] = useState(false);

  // Ficha del tema
  const [ficha, setFicha] = useState({
    subArea: "",
    publicoObjetivo: "",
    prerrequisitos: [] as string[],
    procedimiento: [] as string[],
    erroresComunes: [] as string[],
    checklistAplicacion: [] as string[],
    recursos: [] as string[],
  });
  const [fichaSave, setFichaSave] = useState<SaveState>("idle");
  const fichaTimer = useRef<NodeJS.Timeout | null>(null);

  // Accordions
  const [openPuntos, setOpenPuntos] = useState(true);
  const [openFicha, setOpenFicha] = useState(false);
  const [openNotas, setOpenNotas] = useState(true);
  const [openObjetivo, setOpenObjetivo] = useState(false);

  // Modal
  const [modalHtml, setModalHtml] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState("");

  const { toasts, show: showToast } = useToast();

  // Debounce refs
  const notasTimer = useRef<NodeJS.Timeout | null>(null);
  const puntosTimer = useRef<NodeJS.Timeout | null>(null);

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Load session ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/capacitacion/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Sesion) => {
        setSesion(data);
        const pts = data.puntosEditados.length > 0 ? data.puntosEditados : data.puntosBase;
        setPuntos(pts.map((t, i) => ({ id: `pt-${i}`, text: t })));
        setNotas(data.notas ?? "");
        setFecha(data.fechaProgramada ? data.fechaProgramada.split("T")[0] : "");
        setDuracion(data.duracion);
        setImpartidor(data.impartidor);
        setEstado(data.estado);
        setFicha({
          subArea: data.subArea ?? "",
          publicoObjetivo: data.publicoObjetivo ?? "",
          prerrequisitos: data.prerrequisitos ?? [],
          procedimiento: data.procedimiento ?? [],
          erroresComunes: data.erroresComunes ?? [],
          checklistAplicacion: data.checklistAplicacion ?? [],
          recursos: data.recursos ?? [],
        });
        setLoading(false);
      })
      .catch(() => { showToast("No se pudo cargar la sesión", "error"); router.push("/capacitacion"); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Auto-save notas ─────────────────────────────────────────────────────────
  function handleNotasChange(v: string) {
    setNotas(v);
    setNotasSave("unsaved");
    if (notasTimer.current) clearTimeout(notasTimer.current);
    notasTimer.current = setTimeout(async () => {
      setNotasSave("saving");
      await fetch(`/api/capacitacion/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas: v }),
      });
      setNotasSave("saved");
      setSesion((prev) => prev ? { ...prev, estado: prev.estado === "pendiente" ? "en-preparacion" : prev.estado } : prev);
      if (estado === "pendiente") setEstado("en-preparacion");
      setTimeout(() => setNotasSave("idle"), 2000);
    }, 1500);
  }

  // ── Auto-save ficha del tema ──────────────────────────────────────────────────
  function scheduleFichaSave(next: typeof ficha) {
    setFichaSave("unsaved");
    if (fichaTimer.current) clearTimeout(fichaTimer.current);
    fichaTimer.current = setTimeout(async () => {
      setFichaSave("saving");
      const payload = {
        subArea: next.subArea.trim() || null,
        publicoObjetivo: next.publicoObjetivo.trim() || null,
        prerrequisitos: next.prerrequisitos.map((s) => s.trim()).filter(Boolean),
        procedimiento: next.procedimiento.map((s) => s.trim()).filter(Boolean),
        erroresComunes: next.erroresComunes.map((s) => s.trim()).filter(Boolean),
        checklistAplicacion: next.checklistAplicacion.map((s) => s.trim()).filter(Boolean),
        recursos: next.recursos.map((s) => s.trim()).filter(Boolean),
      };
      await fetch(`/api/capacitacion/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSesion((prev) => prev ? { ...prev, ...payload } : prev);
      setFichaSave("saved");
      setTimeout(() => setFichaSave("idle"), 2000);
    }, 1000);
  }
  function updateFicha(partial: Partial<typeof ficha>) {
    setFicha((prev) => { const next = { ...prev, ...partial }; scheduleFichaSave(next); return next; });
  }

  // ── Auto-save puntos ────────────────────────────────────────────────────────
  function triggerPuntosSave(pts: { id: string; text: string }[]) {
    setPuntosSave("unsaved");
    if (puntosTimer.current) clearTimeout(puntosTimer.current);
    puntosTimer.current = setTimeout(async () => {
      setPuntosSave("saving");
      await fetch(`/api/capacitacion/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntosEditados: pts.map((p) => p.text) }),
      });
      setPuntosSave("saved");
      if (estado === "pendiente") setEstado("en-preparacion");
      setTimeout(() => setPuntosSave("idle"), 2000);
    }, 800);
  }

  function handlePuntoEdit(ptId: string, val: string) {
    const next = puntos.map((p) => p.id === ptId ? { ...p, text: val } : p);
    setPuntos(next);
    triggerPuntosSave(next);
  }

  function handlePuntoDelete(ptId: string) {
    const next = puntos.filter((p) => p.id !== ptId);
    setPuntos(next);
    triggerPuntosSave(next);
  }

  function handleAddPunto() {
    const newId = `pt-${Date.now()}`;
    const next = [...puntos, { id: newId, text: "Nuevo punto..." }];
    setPuntos(next);
    triggerPuntosSave(next);
  }

  function handleRestorePuntos() {
    if (!sesion) return;
    const next = sesion.puntosBase.map((t, i) => ({ id: `pt-base-${i}`, text: t }));
    setPuntos(next);
    triggerPuntosSave(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = puntos.findIndex((p) => p.id === active.id);
    const newIdx = puntos.findIndex((p) => p.id === over.id);
    const next = arrayMove(puntos, oldIdx, newIdx);
    setPuntos(next);
    triggerPuntosSave(next);
  }

  // ── Save config ──────────────────────────────────────────────────────────────
  async function saveConfig() {
    setSavingConfig(true);
    await fetch(`/api/capacitacion/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fechaProgramada: fecha ? new Date(fecha + "T10:00:00").toISOString() : null,
        duracion,
        impartidor,
        estado,
      }),
    });
    setSesion((prev) => prev ? { ...prev, estado, duracion, impartidor } : prev);
    setSavingConfig(false);
    showToast("Configuración guardada", "success");
  }

  // ── Generate (SSE streaming via Edge route) ───────────────────────────────
  async function handleGenerate() {
    if (!sesion) return;
    setGenerating(true);
    showToast("Generando presentación con Claude IA...", "info");

    try {
      // Build fecha string client-side (same as server used to do)
      const fechaStr = sesion.fechaProgramada
        ? new Date(sesion.fechaProgramada).toLocaleDateString("es-MX", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })
        : "Por programar";

      // POST session data in body — Edge route has no Prisma access
      const res = await fetch(`/api/capacitacion/${id}/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesionData: {
            numero: sesion.numero,
            titulo: sesion.titulo,
            bloque: sesion.bloque,
            fechaStr,
            duracion: sesion.duracion,
            impartidor,
            puntos: puntos.map((p) => p.text),
            notas,
            subArea: ficha.subArea,
            publicoObjetivo: ficha.publicoObjetivo,
            prerrequisitos: ficha.prerrequisitos,
            procedimiento: ficha.procedimiento,
            erroresComunes: ficha.erroresComunes,
            checklistAplicacion: ficha.checklistAplicacion,
            recursos: ficha.recursos,
          },
        }),
      });

      if (!res.ok || !res.body) {
        let msg = "Error al conectar con el servidor";
        try { const t = await res.text(); if (t) msg = t; } catch { /* ignore */ }
        throw new Error(msg);
      }

      // ── Stream reading ──────────────────────────────────────────────────
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let htmlContent = "";
      let doneSeen = false;
      let serverError: string | undefined;

      function parseLine(line: string) {
        if (!line.startsWith("data: ")) return;
        const raw = line.slice(6).trim();
        if (!raw) return;
        let ev: Record<string, unknown>;
        try { ev = JSON.parse(raw); } catch { return; }

        if (ev.type === "chunk" && typeof ev.text === "string") {
          htmlContent += ev.text;
        } else if (ev.type === "error") {
          serverError = typeof ev.message === "string" ? ev.message : "Error al generar presentación";
        } else if (ev.type === "done") {
          doneSeen = true;
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = done ? "" : (lines.pop() ?? "");
        lines.forEach(parseLine);
        if (done) break;
      }
      if (buffer.trim()) buffer.split("\n").forEach(parseLine);

      if (serverError) throw new Error(serverError);
      if (!doneSeen) throw new Error("La generación fue interrumpida (timeout). Intenta de nuevo.");

      // Clean HTML if needed
      if (!htmlContent.startsWith("<!DOCTYPE") && !htmlContent.startsWith("<!doctype")) {
        const match = htmlContent.match(/(<!DOCTYPE html[\s\S]*)/i);
        if (match) htmlContent = match[1];
      }

      // ── Guardar versión en DB (Node.js route) ──────────────────────────
      showToast("Guardando presentación...", "info");
      const saveRes = await fetch(`/api/capacitacion/${id}/versiones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent,
          notasSnapshot: notas,
          puntosSnapshot: puntos.map((p) => p.text),
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Error al guardar la presentación");

      const newVersion: VersionMeta = {
        id: saveData.versionId,
        version: saveData.version,
        generadaPor: impartidor,
        generadaEn: saveData.generadaEn,
        notasSnapshot: notas,
        puntosSnapshot: puntos.map((p) => p.text),
      };
      setSesion((prev) =>
        prev ? { ...prev, estado: "lista", versiones: [newVersion, ...prev.versiones] } : prev
      );
      setEstado("lista");
      showToast(`Presentación v${saveData.version} generada ✓`, "success");
      // Open in new tab — no iframe restrictions
      window.open(`/api/capacitacion/${id}/versiones/${saveData.versionId}/html`, "_blank");

    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "No se pudo generar la presentación. Intenta de nuevo.",
        "error"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── View version — opens in new tab as a real HTML page ─────────────────────
  function viewVersion(v: VersionMeta) {
    window.open(`/api/capacitacion/${id}/versiones/${v.id}/html`, "_blank");
  }

  function downloadHtml(html: string, filename: string) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="w-6 h-6 border-2 border-[#c9a96a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sesion) return null;

  const bloqueColor = BLOQUE_COLORS[sesion.bloqueLetra] ?? "#6b7280";
  const estadoCfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.pendiente;
  const hasChanges = sesion.puntosBase.join("|") !== puntos.map((p) => p.text).join("|");
  const currentVersions = sesion.versiones;

  return (
    <>
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-3 rounded-xl text-sm font-medium shadow-xl pointer-events-auto transition-all"
            style={{
              background: t.type === "error" ? "#1f0a0a" : t.type === "success" ? "#0a1f0a" : "#111",
              color: t.type === "error" ? "#f87171" : t.type === "success" ? "#4ade80" : "#d1d5db",
              border: `1px solid ${t.type === "error" ? "#7f1d1d" : t.type === "success" ? "#14532d" : "#262626"}`,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Presentation modal */}
      {modalHtml && (
        <PresentationModal
          htmlContent={modalHtml}
          onClose={() => setModalHtml(null)}
          onDownload={() => downloadHtml(modalHtml, `sesion-${padNum(sesion.numero)}-${modalTitle.replace(/\s/g, "-").toLowerCase()}.html`)}
        />
      )}

      <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: "#6b7280" }}>
            <a href="/capacitacion" className="hover:text-white transition-colors">Capacitación</a>
            <span>/</span>
            <span className="text-white">Sesión {padNum(sesion.numero)}</span>
          </nav>

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ background: `${bloqueColor}20`, color: bloqueColor, border: `1px solid ${bloqueColor}40` }}
                >
                  {sesion.bloque}
                </span>
                <span
                  className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                  style={{ background: estadoCfg.bg, color: estadoCfg.color }}
                >
                  {estadoCfg.label}
                </span>
              </div>
              <h1 className="ms-h1 leading-tight mb-1">
                <span style={{ color: "#c9a96a" }}>{padNum(sesion.numero)}.</span> {sesion.titulo}
              </h1>
              <p className="text-sm" style={{ color: "#6b7280" }}>{sesion.descripcion}</p>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-60 hover:opacity-90 active:scale-95 shrink-0"
              style={{ background: generating ? "#1a1200" : "#c9a96a", color: generating ? "#c9a96a" : "#000" }}
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#c9a96a] border-t-transparent rounded-full animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                  {currentVersions.length > 0 ? "Nueva versión" : "Generar presentación"}
                </>
              )}
            </button>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

            {/* ── Left column ──────────────────────────────────────────────── */}
            <div className="space-y-4">

              {/* SECCIÓN 1: Puntos */}
              <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#262626" }}>
                <button
                  onClick={() => setOpenPuntos((p) => !p)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#151515] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">Puntos de la sesión</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "#1a1a1a", color: "#c9a96a" }}>
                      {puntos.length}
                    </span>
                    <SaveIndicator state={puntosSave} />
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${openPuntos ? "rotate-180" : ""}`}
                    style={{ color: "#6b7280" }}
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openPuntos && (
                  <div className="px-2 pb-4 border-t" style={{ borderColor: "#1a1a1a" }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={puntos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                        <div className="mt-2 space-y-0.5">
                          {puntos.map((p, i) => (
                            <SortablePoint
                              key={p.id}
                              id={p.id}
                              index={i}
                              text={p.text}
                              onEdit={handlePuntoEdit}
                              onDelete={handlePuntoDelete}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    <div className="mt-3 flex items-center gap-3 px-3">
                      <button
                        onClick={handleAddPunto}
                        className="text-xs font-medium transition-colors hover:text-[#c9a96a]"
                        style={{ color: "#6b7280" }}
                      >
                        + Agregar punto
                      </button>
                      {hasChanges && (
                        <button
                          onClick={handleRestorePuntos}
                          className="text-xs transition-colors hover:text-white"
                          style={{ color: "#4b5563" }}
                        >
                          ↩ Restaurar originales
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 1.5: Ficha del tema */}
              <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#262626" }}>
                <button
                  onClick={() => setOpenFicha((p) => !p)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#151515] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">Ficha del tema</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: (ficha.publicoObjetivo.trim() || ficha.procedimiento.length || ficha.prerrequisitos.length) ? "#22c55e" : "#333" }}
                    />
                    <SaveIndicator state={fichaSave} />
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${openFicha ? "rotate-180" : ""}`}
                    style={{ color: "#6b7280" }}
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openFicha && (
                  <div className="px-5 pb-5 border-t space-y-5" style={{ borderColor: "#1a1a1a" }}>
                    <p className="text-[11px] mt-3 leading-relaxed" style={{ color: "#4b5563" }}>
                      La ficha da estructura al tema para que se sostenga en línea. La IA la integra al generar la presentación.
                    </p>

                    <div>
                      <label className="block text-[11px] font-medium mb-1.5" style={{ color: "#9ca3af" }}>Sub-área</label>
                      <input
                        value={ficha.subArea}
                        onChange={(e) => updateFicha({ subArea: e.target.value })}
                        placeholder="Ej: Prácticas y Capacitaciones Técnicas"
                        className="w-full bg-[#0d0d0d] border rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#333] focus:outline-none focus:border-[#c9a96a]/50"
                        style={{ borderColor: "#1e1e1e" }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium mb-1.5" style={{ color: "#9ca3af" }}>Público objetivo</label>
                      <textarea
                        value={ficha.publicoObjetivo}
                        onChange={(e) => updateFicha({ publicoObjetivo: e.target.value })}
                        placeholder="¿Para quién es este tema? Roles, nivel, prerrequisitos de contexto."
                        className="w-full bg-[#0d0d0d] border rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#333] resize-none focus:outline-none focus:border-[#c9a96a]/50 leading-relaxed"
                        style={{ borderColor: "#1e1e1e", minHeight: 64 }}
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium mb-1.5" style={{ color: "#9ca3af" }}>Prerrequisitos</label>
                      <ListField items={ficha.prerrequisitos} onChange={(next) => updateFicha({ prerrequisitos: next })} placeholder="Conocimiento o tema previo requerido" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium mb-1.5" style={{ color: "#9ca3af" }}>Procedimiento paso a paso</label>
                      <ListField items={ficha.procedimiento} onChange={(next) => updateFicha({ procedimiento: next })} placeholder="Paso del procedimiento" numbered />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium mb-1.5" style={{ color: "#9ca3af" }}>Errores comunes</label>
                      <ListField items={ficha.erroresComunes} onChange={(next) => updateFicha({ erroresComunes: next })} placeholder="Error frecuente a evitar" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium mb-1.5" style={{ color: "#9ca3af" }}>Checklist de aplicación</label>
                      <ListField items={ficha.checklistAplicacion} onChange={(next) => updateFicha({ checklistAplicacion: next })} placeholder="Punto verificable de aplicación" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium mb-1.5" style={{ color: "#9ca3af" }}>Recursos y enlaces</label>
                      <ListField items={ficha.recursos} onChange={(next) => updateFicha({ recursos: next })} placeholder="Recurso, módulo o enlace de apoyo" />
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: Notas del director */}
              <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#262626" }}>
                <button
                  onClick={() => setOpenNotas((p) => !p)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#151515] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">Notas personales</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: notas.trim() ? "#22c55e" : "#333" }}
                    />
                    <SaveIndicator state={notasSave} />
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${openNotas ? "rotate-180" : ""}`}
                    style={{ color: "#6b7280" }}
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openNotas && (
                  <div className="px-5 pb-5 border-t" style={{ borderColor: "#1a1a1a" }}>
                    <p className="text-[11px] mt-3 mb-2 leading-relaxed" style={{ color: "#4b5563" }}>
                      Escribe desde tu experiencia. Casos reales, anécdotas, énfasis que quieras destacar.
                      La IA los integrará de forma natural en la presentación.
                    </p>
                    <textarea
                      value={notas}
                      onChange={(e) => handleNotasChange(e.target.value)}
                      placeholder={"Ej: En el festival de Querétaro del año pasado tuvimos un caso con el rider que...\n/ Quiero que el equipo entienda que este punto es especialmente crítico porque...\n/ Una anécdota que ilustra bien este tema es..."}
                      className="w-full bg-[#0d0d0d] border rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#333] resize-none focus:outline-none focus:border-[#c9a96a]/50 transition-colors leading-relaxed"
                      style={{ borderColor: "#1e1e1e", minHeight: 180 }}
                      rows={8}
                    />
                  </div>
                )}
              </div>

              {/* SECCIÓN 3: Objetivo (cerrado por default) */}
              <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#262626" }}>
                <button
                  onClick={() => setOpenObjetivo((p) => !p)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#151515] transition-colors"
                >
                  <span className="text-sm font-semibold text-white">Objetivo de la sesión</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${openObjetivo ? "rotate-180" : ""}`}
                    style={{ color: "#6b7280" }}
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openObjetivo && (
                  <div className="px-5 pb-5 border-t space-y-3" style={{ borderColor: "#1a1a1a" }}>
                    <p className="text-sm mt-3 leading-relaxed" style={{ color: "#9ca3af" }}>{sesion.descripcion}</p>
                    <ul className="space-y-2">
                      {sesion.objetivos.map((o, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#6b7280" }}>
                          <span style={{ color: "#c9a96a" }} className="shrink-0 mt-0.5">◆</span>
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right column ─────────────────────────────────────────────── */}
            <div className="space-y-4">

              {/* Card: Configuración */}
              <div className="rounded-xl border p-5 space-y-4" style={{ background: "#111", borderColor: "#262626" }}>
                <h3 className="text-sm font-semibold text-white">Configuración</h3>

                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "#6b7280" }}>Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-[#0d0d0d] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a96a]/50"
                    style={{ borderColor: "#262626" }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "#6b7280" }}>Duración</label>
                  <select
                    value={duracion}
                    onChange={(e) => setDuracion(Number(e.target.value))}
                    className="w-full bg-[#0d0d0d] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                    style={{ borderColor: "#262626" }}
                  >
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos</option>
                    <option value={90}>90 minutos</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "#6b7280" }}>Impartidor</label>
                  <input
                    value={impartidor}
                    onChange={(e) => setImpartidor(e.target.value)}
                    className="w-full bg-[#0d0d0d] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a96a]/50"
                    style={{ borderColor: "#262626" }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "#6b7280" }}>Estado</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full bg-[#0d0d0d] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                    style={{ borderColor: "#262626" }}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en-preparacion">En preparación</option>
                    <option value="lista">Lista</option>
                    <option value="impartida">Impartida</option>
                  </select>
                </div>

                <button
                  onClick={saveConfig}
                  disabled={savingConfig}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ background: "#1a1a1a", color: "#c9a96a", border: "1px solid #333" }}
                >
                  {savingConfig ? "Guardando..." : "Guardar configuración"}
                </button>
              </div>

              {/* Card: Documentos descargables */}
              <div className="rounded-xl border p-5 space-y-2" style={{ background: "#111", borderColor: "#262626" }}>
                <h3 className="text-sm font-semibold text-white mb-3">Documentos</h3>
                <a
                  href={`/api/capacitacion/${id}/pdf`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:border-[#c9a96a] hover:text-[#c9a96a]"
                  style={{ border: "1px solid #262626", color: "#9ca3af" }}
                >
                  <span>PDF del módulo</span>
                  <span>↓</span>
                </a>
                <a
                  href={`/api/capacitacion/${id}/word`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:border-[#c9a96a] hover:text-[#c9a96a]"
                  style={{ border: "1px solid #262626", color: "#9ca3af" }}
                >
                  <span>Documento Word</span>
                  <span>↓</span>
                </a>
                {sesion.evaluacion ? (
                  <a
                    href={`/api/capacitacion/${id}/evaluacion/pdf`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:border-[#c9a96a] hover:text-[#c9a96a]"
                    style={{ border: "1px solid #262626", color: "#9ca3af" }}
                  >
                    <span>PDF del examen</span>
                    <span>↓</span>
                  </a>
                ) : (
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium"
                    style={{ border: "1px solid #1a1a1a", color: "#4b5563" }}
                  >
                    <span>PDF del examen</span>
                    <span>sin evaluación</span>
                  </div>
                )}
              </div>

              {/* Card: Historial de versiones */}
              <div className="rounded-xl border p-5" style={{ background: "#111", borderColor: "#262626" }}>
                <h3 className="text-sm font-semibold text-white mb-4">Presentaciones generadas</h3>

                {currentVersions.length === 0 ? (
                  <p className="text-xs leading-relaxed text-center py-4" style={{ color: "#4b5563" }}>
                    Aún no hay presentaciones generadas.<br/>
                    Completa las notas y genera la primera versión.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {currentVersions.map((v, i) => (
                      <div
                        key={v.id}
                        className="rounded-lg border p-3 space-y-2"
                        style={{ background: "#0d0d0d", borderColor: "#1e1e1e" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">Versión {v.version}</span>
                            {i === 0 && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "#1a1200", color: "#c9a96a" }}>
                                Actual
                              </span>
                            )}
                          </div>
                          <span className="text-[10px]" style={{ color: "#4b5563" }}>
                            {new Date(v.generadaEn).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                            {" · "}
                            {new Date(v.generadaEn).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px]" style={{ color: "#4b5563" }}>
                            {v.notasSnapshot ? "Con notas" : "Sin notas"} · {v.puntosSnapshot.length} puntos
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => viewVersion(v)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors hover:border-[#c9a96a] hover:text-[#c9a96a]"
                            style={{ border: "1px solid #262626", color: "#6b7280" }}
                          >
                            Ver
                          </button>
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/capacitacion/${id}/versiones/${v.id}`);
                              const data = await res.json();
                              if (res.ok) downloadHtml(
                                data.htmlContent,
                                `sesion-${padNum(sesion.numero)}-v${v.version}.html`
                              );
                            }}
                            className="py-1.5 px-3 rounded-lg text-xs font-medium transition-colors hover:border-[#333] hover:text-[#9ca3af]"
                            style={{ border: "1px solid #1e1e1e", color: "#4b5563" }}
                          >
                            ↓
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`¿Eliminar Versión ${v.version}? Esta acción no se puede deshacer.`)) return;
                              const res = await fetch(`/api/capacitacion/${id}/versiones/${v.id}`, { method: "DELETE" });
                              const data = await res.json();
                              if (res.ok) {
                                setSesion((prev) => {
                                  if (!prev) return prev;
                                  const newVersiones = prev.versiones.filter((x) => x.id !== v.id);
                                  return {
                                    ...prev,
                                    versiones: newVersiones,
                                    estado: data.remaining === 0 ? "en-preparacion" : prev.estado,
                                  };
                                });
                                if (data.remaining === 0) setEstado("en-preparacion");
                                showToast(`Versión ${v.version} eliminada`, "success");
                              } else {
                                showToast("Error al eliminar", "error");
                              }
                            }}
                            className="py-1.5 px-3 rounded-lg text-xs font-medium transition-colors hover:border-red-900 hover:text-red-500"
                            style={{ border: "1px solid #1e1e1e", color: "#4b5563" }}
                            title="Eliminar versión"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
