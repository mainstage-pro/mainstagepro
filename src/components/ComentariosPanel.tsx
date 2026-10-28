"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare, Send } from "lucide-react";
import { normalizarAmPm } from "@/lib/hora";
import { segmentarContenido, ENTIDAD_HREF, ENTIDAD_LABEL, type EntidadComentario } from "@/lib/comentarios";

interface Usuario { id: string; name: string }
interface ReferenciaResultado { tipo: EntidadComentario; id: string; nombre: string; sub?: string }

interface Comentario {
  id: string;
  contenido: string;
  createdAt: string;
  autor: { id: string; name: string };
}

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  const hora = normalizarAmPm(d.toLocaleString("es-MX", { hour: "numeric", minute: "2-digit" }));
  const hoy = new Date().toDateString() === d.toDateString();
  if (hoy) return `Hoy, ${hora}`;
  return normalizarAmPm(d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }));
}

function iniciales(nombre: string): string {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function escaparRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function ComentariosPanel({
  entidad, entidadId, usuarios,
}: { entidad: EntidadComentario; entidadId: string; usuarios: Usuario[] }) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mencionesMap, setMencionesMap] = useState<Record<string, string>>({});
  const [referenciasMap, setReferenciasMap] = useState<Record<string, { tipo: EntidadComentario; id: string }>>({});
  const [sugUsuarios, setSugUsuarios] = useState<Usuario[] | null>(null);
  const [sugRefs, setSugRefs] = useState<ReferenciaResultado[] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const refsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function cargar() {
    const r = await fetch(`/api/comentarios?entidad=${entidad}&entidadId=${entidadId}`);
    const d = await r.json();
    setComentarios(d.comentarios ?? []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, [entidad, entidadId]);

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
    const nuevoTexto = nuevoAntes + despues;
    setTexto(nuevoTexto);
    setMencionesMap((prev) => ({ ...prev, [u.name]: u.id }));
    setSugUsuarios(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const pos = nuevoAntes.length;
      textareaRef.current?.setSelectionRange(pos, pos);
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
      const pos = nuevoAntes.length;
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function contenidoParaGuardar(): string {
    let out = texto;
    for (const [name, id] of Object.entries(mencionesMap)) {
      const re = new RegExp(`@${escaparRegex(name)}(?=\\s|$)`, "g");
      out = out.replace(re, `@[${name}](${id})`);
    }
    for (const [label, ref] of Object.entries(referenciasMap)) {
      const re = new RegExp(`#${escaparRegex(label)}(?=\\s|$)`, "g");
      out = out.replace(re, `#[${label}](${ref.tipo}:${ref.id})`);
    }
    return out;
  }

  async function enviar() {
    const contenido = contenidoParaGuardar().trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/comentarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidad, entidadId, contenido }),
      });
      if (r.ok) {
        setTexto("");
        setMencionesMap({});
        setReferenciasMap({});
        await cargar();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#141414]">
        <div className="w-8 h-8 rounded-lg bg-[#B3985B]/10 border border-[#B3985B]/30 flex items-center justify-center shrink-0">
          <MessageSquare strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Comentarios</h2>
          <p className="text-[10px] text-gray-600 mt-0.5">Usa @ para mencionar y # para taggear proyecto/trato/cotización/cliente/equipo</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <p className="text-gray-600 text-sm">Cargando...</p>
        ) : comentarios.length === 0 ? (
          <p className="text-gray-600 text-sm">Sin comentarios todavía</p>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {comentarios.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[10px] font-semibold text-gray-400 shrink-0">
                  {iniciales(c.autor.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-white">{c.autor.name}</span>
                    <span className="ms-meta">{fmtFecha(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                    {segmentarContenido(c.contenido).map((s, i) => {
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
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => onChangeTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !sugUsuarios && !sugRefs) { e.preventDefault(); enviar(); }
            }}
            placeholder="Escribe un comentario... @nombre para mencionar, # para taggear proyecto/trato/cotización/cliente/equipo"
            rows={2}
            className="ms-textarea w-full resize-none"
          />
          {sugUsuarios && sugUsuarios.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 w-64 ms-dropdown z-10">
              {sugUsuarios.map((u) => (
                <button key={u.id} type="button" onMouseDown={(e) => { e.preventDefault(); elegirMencion(u); }} className="ms-dropdown-item w-full text-left">
                  {u.name}
                </button>
              ))}
            </div>
          )}
          {sugRefs && sugRefs.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 w-80 ms-dropdown z-10">
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
              Comentar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
