"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Hash, Users, Send, Plus, MessageSquare, X } from "lucide-react";
import { normalizarAmPm } from "@/lib/hora";
import { segmentarContenido, ENTIDAD_HREF, ENTIDAD_LABEL, type EntidadComentario } from "@/lib/comentarios";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface CanalResumen {
  id: string;
  tipo: string; // GENERAL | AREA | DIRECTO | GRUPO
  area: string | null;
  nombre: string;
  ultimoMensaje: { contenido: string; autor: string; createdAt: string } | null;
  noLeidos: number;
  updatedAt: string;
}

interface Mensaje {
  id: string;
  contenido: string;
  createdAt: string;
  autor: { id: string; name: string };
}

interface Usuario { id: string; name: string; area?: string | null }

interface ReferenciaResultado {
  tipo: EntidadComentario;
  id: string;
  nombre: string;
  sub?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtHora(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date().toDateString() === d.toDateString();
  const hora = normalizarAmPm(d.toLocaleString("es-MX", { hour: "numeric", minute: "2-digit" }));
  if (hoy) return hora;
  return normalizarAmPm(d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }));
}

function iniciales(nombre: string): string {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function IconoCanal({ tipo }: { tipo: string }) {
  if (tipo === "GENERAL") return <Hash strokeWidth={1.75} className="w-3.5 h-3.5" />;
  if (tipo === "AREA") return <Hash strokeWidth={1.75} className="w-3.5 h-3.5" />;
  if (tipo === "GRUPO") return <Users strokeWidth={1.75} className="w-3.5 h-3.5" />;
  return null;
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function MensajesPage() {
  const [canales, setCanales]       = useState<CanalResumen[] | null>(null);
  const [activoId, setActivoId]     = useState<string | null>(null);
  const [mensajes, setMensajes]     = useState<Mensaje[]>([]);
  const [usuarios, setUsuarios]     = useState<Usuario[]>([]);
  const [texto, setTexto]           = useState("");
  const [enviando, setEnviando]     = useState(false);
  const [sugUsuarios, setSugUsuarios]   = useState<Usuario[] | null>(null);
  const [sugRefs, setSugRefs]           = useState<ReferenciaResultado[] | null>(null);
  const [mencionesMap, setMencionesMap] = useState<Record<string, string>>({});
  const [referenciasMap, setReferenciasMap] = useState<Record<string, { tipo: EntidadComentario; id: string }>>({});
  const [nuevoAbierto, setNuevoAbierto] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const refsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargarCanales = useCallback(async () => {
    try {
      const r = await fetch("/api/canales", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setCanales(d.canales ?? []);
    } catch {
      setCanales([]);
    }
  }, []);

  const cargarMensajes = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/canales/${id}/mensajes`, { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setMensajes(d.mensajes ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    cargarCanales();
    fetch("/api/usuarios-activos").then((r) => r.json()).then((d) => setUsuarios(d.usuarios ?? [])).catch(() => {});
    const interval = setInterval(cargarCanales, 20000);
    return () => clearInterval(interval);
  }, [cargarCanales]);

  // Selecciona automáticamente "General" al cargar.
  useEffect(() => {
    if (canales && canales.length > 0 && !activoId) setActivoId(canales[0].id);
  }, [canales, activoId]);

  useEffect(() => {
    if (!activoId) return;
    cargarMensajes(activoId);
    const interval = setInterval(() => cargarMensajes(activoId), 8000);
    return () => clearInterval(interval);
  }, [activoId, cargarMensajes]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [mensajes]);

  const canalActivo = useMemo(() => canales?.find((c) => c.id === activoId) ?? null, [canales, activoId]);

  // ── Composer: autocompletado @usuario y #entidad ──────────────────────────

  function onChangeTexto(valor: string) {
    setTexto(valor);
    const cursor = textareaRef.current?.selectionStart ?? valor.length;
    const antes = valor.slice(0, cursor);

    const atMatch = antes.match(/@([^\s@#]{0,30})$/);
    const hashMatch = antes.match(/#([^\s@#]{0,30})$/);

    if (atMatch) {
      setSugRefs(null);
      const q = atMatch[1].toLowerCase();
      setSugUsuarios(usuarios.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 6));
      return;
    }
    setSugUsuarios(null);
    if (hashMatch && hashMatch[1].length >= 2) {
      const q = hashMatch[1];
      if (refsDebounce.current) clearTimeout(refsDebounce.current);
      refsDebounce.current = setTimeout(async () => {
        try {
          const r = await fetch(`/api/referencias/buscar?q=${encodeURIComponent(q)}`);
          const d = await r.json();
          setSugRefs(d.resultados ?? []);
        } catch {}
      }, 250);
      return;
    }
    setSugRefs(null);
  }

  function elegirMencion(u: Usuario) {
    const cursor = textareaRef.current?.selectionStart ?? texto.length;
    const antes = texto.slice(0, cursor);
    const despues = texto.slice(cursor);
    const nuevoAntes = antes.replace(/@([^\s@#]{0,30})$/, `@${u.name} `);
    setTexto(nuevoAntes + despues);
    setMencionesMap((prev) => ({ ...prev, [u.name]: u.id }));
    setSugUsuarios(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nuevoAntes.length, nuevoAntes.length);
    });
  }

  function elegirReferencia(r: ReferenciaResultado) {
    const label = `${ENTIDAD_LABEL[r.tipo]}: ${r.nombre}`;
    const cursor = textareaRef.current?.selectionStart ?? texto.length;
    const antes = texto.slice(0, cursor);
    const despues = texto.slice(cursor);
    const nuevoAntes = antes.replace(/#([^\s@#]{0,30})$/, `#${label} `);
    setTexto(nuevoAntes + despues);
    setReferenciasMap((prev) => ({ ...prev, [label]: { tipo: r.tipo, id: r.id } }));
    setSugRefs(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nuevoAntes.length, nuevoAntes.length);
    });
  }

  function escaparRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function contenidoParaGuardar(): string {
    let out = texto;
    for (const [name, id] of Object.entries(mencionesMap)) {
      out = out.replace(new RegExp(`@${escaparRegex(name)}(?=\\s|$)`, "g"), `@[${name}](${id})`);
    }
    for (const [label, ref] of Object.entries(referenciasMap)) {
      out = out.replace(new RegExp(`#${escaparRegex(label)}(?=\\s|$)`, "g"), `#[${label}](${ref.tipo}:${ref.id})`);
    }
    return out;
  }

  async function enviar() {
    const contenido = contenidoParaGuardar().trim();
    if (!contenido || enviando || !activoId) return;
    setEnviando(true);
    try {
      const r = await fetch(`/api/canales/${activoId}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido }),
      });
      if (r.ok) {
        setTexto("");
        setMencionesMap({});
        setReferenciasMap({});
        await cargarMensajes(activoId);
        cargarCanales();
      }
    } finally {
      setEnviando(false);
    }
  }

  async function abrirDirecto(usuarioId: string) {
    const r = await fetch("/api/canales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuarioId }) });
    if (r.ok) {
      const d = await r.json();
      setNuevoAbierto(false);
      await cargarCanales();
      setActivoId(d.canal.id);
    }
  }

  if (canales === null) {
    return <div className="p-6"><div className="h-96 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl animate-pulse" /></div>;
  }

  const generales = canales.filter((c) => c.tipo === "GENERAL" || c.tipo === "AREA");
  const directos   = canales.filter((c) => c.tipo === "DIRECTO" || c.tipo === "GRUPO");

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-1px)] max-h-screen">
      <div className="flex items-center gap-2.5 mb-4">
        <MessageSquare strokeWidth={1.75} className="w-5 h-5 text-[#B3985B]" />
        <h1 className="ms-h1">Mensajes</h1>
        <p className="text-[#555] text-xs">Chat interno — canales por área + directos y grupos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100%-3rem)]">
        {/* ── Sidebar de canales ── */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto py-2">
            <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold text-[#555] uppercase tracking-widest">Canales</p>
            {generales.map((c) => (
              <CanalItem key={c.id} c={c} activo={c.id === activoId} onClick={() => setActivoId(c.id)} />
            ))}

            <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
              <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest">Directos y grupos</p>
              <button onClick={() => setNuevoAbierto((v) => !v)} className="text-[#555] hover:text-[#B3985B] transition-colors" title="Nuevo directo">
                <Plus strokeWidth={2} className="w-3.5 h-3.5" />
              </button>
            </div>
            {nuevoAbierto && (
              <div className="px-3 pb-2">
                <NuevoDirecto usuarios={usuarios} onElegir={abrirDirecto} onCerrar={() => setNuevoAbierto(false)} />
              </div>
            )}
            {directos.length === 0 && !nuevoAbierto && (
              <p className="px-3 text-[11px] text-[#444]">Sin conversaciones directas aún</p>
            )}
            {directos.map((c) => (
              <CanalItem key={c.id} c={c} activo={c.id === activoId} onClick={() => setActivoId(c.id)} />
            ))}
          </div>
        </div>

        {/* ── Hilo del canal activo ── */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden flex flex-col">
          {canalActivo ? (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a]">
                <IconoCanal tipo={canalActivo.tipo} />
                <p className="text-sm font-bold text-white">{canalActivo.nombre}</p>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {mensajes.length === 0 ? (
                  <p className="text-[#444] text-sm text-center mt-10">Sin mensajes todavía — escribe el primero</p>
                ) : mensajes.map((m) => (
                  <div key={m.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[10px] font-semibold text-gray-400 shrink-0">
                      {iniciales(m.autor.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-white">{m.autor.name}</span>
                        <span className="text-[10px] text-[#444]">{fmtHora(m.createdAt)}</span>
                      </div>
                      <p className="text-[13px] text-gray-300 whitespace-pre-wrap break-words">
                        {segmentarContenido(m.contenido).map((s, i) => {
                          if (s.tipo === "mencion") return <span key={i} className="text-[#B3985B] font-medium">{s.texto}</span>;
                          if (s.tipo === "referencia") return (
                            <Link key={i} href={ENTIDAD_HREF[s.entidadTipo](s.entidadId)} className="text-blue-400 font-medium hover:underline">{s.texto}</Link>
                          );
                          return <span key={i}>{s.texto}</span>;
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative p-3 border-t border-[#1a1a1a]">
                <textarea
                  ref={textareaRef}
                  value={texto}
                  onChange={(e) => onChangeTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !sugUsuarios && !sugRefs) { e.preventDefault(); enviar(); }
                  }}
                  placeholder="Escribe un mensaje... @ para mencionar, # para taggear proyecto/trato/cotización/cliente/equipo"
                  rows={2}
                  className="ms-textarea w-full resize-none"
                />
                {sugUsuarios && sugUsuarios.length > 0 && (
                  <div className="absolute bottom-full mb-1 left-3 w-64 ms-dropdown z-10">
                    {sugUsuarios.map((u) => (
                      <button key={u.id} type="button" onMouseDown={(e) => { e.preventDefault(); elegirMencion(u); }} className="ms-dropdown-item w-full text-left">
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
                {sugRefs && sugRefs.length > 0 && (
                  <div className="absolute bottom-full mb-1 left-3 w-80 ms-dropdown z-10">
                    {sugRefs.map((r) => (
                      <button key={`${r.tipo}:${r.id}`} type="button" onMouseDown={(e) => { e.preventDefault(); elegirReferencia(r); }} className="ms-dropdown-item w-full text-left flex items-center justify-between gap-2">
                        <span className="truncate">{r.nombre}{r.sub ? <span className="text-[#555]"> · {r.sub}</span> : null}</span>
                        <span className="text-[9px] text-[#555] uppercase shrink-0">{ENTIDAD_LABEL[r.tipo]}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <button onClick={enviar} disabled={!texto.trim() || enviando} className="ms-btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Send strokeWidth={1.75} className="w-3.5 h-3.5" />
                    Enviar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[#444] text-sm">Elige un canal</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subcomponentes ───────────────────────────────────────────────────────────

function CanalItem({ c, activo, onClick }: { c: CanalResumen; activo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${activo ? "bg-[#1a1a1a]" : "hover:bg-[#151515]"}`}
    >
      <span className={activo ? "text-[#B3985B]" : "text-[#555]"}><IconoCanal tipo={c.tipo} /></span>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] truncate ${activo ? "text-white font-semibold" : "text-gray-300"}`}>{c.nombre}</p>
        {c.ultimoMensaje && (
          <p className="text-[10px] text-[#555] truncate">{c.ultimoMensaje.autor}: {c.ultimoMensaje.contenido}</p>
        )}
      </div>
      {c.noLeidos > 0 && (
        <span className="shrink-0 text-[9px] bg-[#B3985B] text-black px-1.5 py-0.5 rounded-full font-bold leading-none">
          {c.noLeidos > 9 ? "9+" : c.noLeidos}
        </span>
      )}
    </button>
  );
}

function NuevoDirecto({ usuarios, onElegir, onCerrar }: { usuarios: Usuario[]; onElegir: (id: string) => void; onCerrar: () => void }) {
  const [q, setQ] = useState("");
  const filtrados = usuarios.filter((u) => u.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar persona..."
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-2 py-1 text-[11px] text-white outline-none focus:border-[#B3985B]"
        />
        <button onClick={onCerrar} className="text-[#555] hover:text-white"><X strokeWidth={2} className="w-3.5 h-3.5" /></button>
      </div>
      <div className="max-h-40 overflow-y-auto">
        {filtrados.map((u) => (
          <button key={u.id} onClick={() => onElegir(u.id)} className="w-full text-left text-[11px] text-gray-300 hover:text-white px-1.5 py-1 rounded hover:bg-[#1a1a1a]">
            {u.name}
          </button>
        ))}
        {filtrados.length === 0 && <p className="text-[10px] text-[#444] px-1.5 py-1">Sin resultados</p>}
      </div>
    </div>
  );
}
